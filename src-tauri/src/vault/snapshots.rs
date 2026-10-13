use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct SnapshotMetadata {
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "snapshotPath")]
    pub snapshot_path: String,
    #[serde(rename = "taskCount")]
    pub task_count: usize,
}

const SNAPSHOT_DIR_NAME: &str = ".quietflow/snapshots";
const RATE_LIMIT_SECONDS: u64 = 120; // 2 minutes between automatic snapshots per file
const MAX_SNAPSHOTS_PER_FILE: usize = 20;
const MAX_AGE_DAYS: u64 = 14;

/// Generates a safe subpath folder name for a given relative file path.
fn sanitize_relative_path(relative_path: &str) -> String {
    relative_path
        .trim_start_matches('/')
        .replace(['/', '\\', ':'], "_")
}

/// Helper to get the snapshot storage directory for a specific file.
pub fn get_file_snapshot_dir(vault_path: &Path, relative_path: &str) -> PathBuf {
    let sanitized = sanitize_relative_path(relative_path);
    vault_path.join(SNAPSHOT_DIR_NAME).join(sanitized)
}

/// Counts tasks in markdown content (heuristic: lines matching `- [ ]`, `- [x]`, etc.).
fn count_tasks_in_content(content: &str) -> usize {
    content
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();
            trimmed.starts_with("- [ ]")
                || trimmed.starts_with("- [x]")
                || trimmed.starts_with("- [X]")
                || trimmed.starts_with("- [/]")
        })
        .count()
}

/// Creates a pre-write snapshot if the target file exists, is >0 bytes, and >= 2 mins have elapsed.
pub fn create_pre_write_snapshot_if_needed(vault_path: &Path, file_path: &Path) -> Result<Option<SnapshotMetadata>, String> {
    if !file_path.exists() {
        return Ok(None);
    }

    let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
    if metadata.len() == 0 {
        return Ok(None);
    }

    let relative_path = match file_path.strip_prefix(vault_path) {
        Ok(rel) => rel.to_string_lossy().to_string(),
        Err(_) => file_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
    };

    // Ignore snapshots of files already inside .quietflow
    if relative_path.starts_with(".quietflow") || relative_path.starts_with('.') {
        return Ok(None);
    }

    let snapshot_dir = get_file_snapshot_dir(vault_path, &relative_path);

    // Check rate limit: find newest snapshot in directory
    if snapshot_dir.exists() {
        if let Ok(entries) = fs::read_dir(&snapshot_dir) {
            let mut newest_time: Option<SystemTime> = None;
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if let Ok(modified) = meta.modified() {
                        newest_time = match newest_time {
                            Some(t) if modified > t => Some(modified),
                            None => Some(modified),
                            _ => newest_time,
                        };
                    }
                }
            }

            if let Some(t) = newest_time {
                if let Ok(elapsed) = SystemTime::now().duration_since(t) {
                    if elapsed.as_secs() < RATE_LIMIT_SECONDS {
                        return Ok(None); // Rate limit active, skip creating snapshot
                    }
                }
            }
        }
    }

    // Read current content to snapshot
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let task_count = count_tasks_in_content(&content);

    fs::create_dir_all(&snapshot_dir)
        .map_err(|e| format!("Failed to create snapshot directory '{}': {}", snapshot_dir.display(), e))?;

    let now_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let snapshot_id = format!("{}", now_epoch);
    let snapshot_file_name = format!("{}.md", snapshot_id);
    let snapshot_path = snapshot_dir.join(&snapshot_file_name);

    fs::write(&snapshot_path, &content)
        .map_err(|e| format!("Failed to write snapshot '{}': {}", snapshot_path.display(), e))?;

    // Asynchronously or inline prune old snapshots for this file
    let _ = prune_file_snapshots(&snapshot_dir, MAX_SNAPSHOTS_PER_FILE, MAX_AGE_DAYS);

    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "note.md".to_string());

    Ok(Some(SnapshotMetadata {
        id: snapshot_id.clone(),
        timestamp: snapshot_id,
        file_name,
        relative_path,
        size_bytes: content.len() as u64,
        snapshot_path: snapshot_path.to_string_lossy().to_string(),
        task_count,
    }))
}

/// Lists all available snapshots for a given relative note path, newest first.
pub fn list_snapshots(vault_path: &Path, relative_path: &str) -> Result<Vec<SnapshotMetadata>, String> {
    let snapshot_dir = get_file_snapshot_dir(vault_path, relative_path);
    if !snapshot_dir.exists() {
        return Ok(Vec::new());
    }

    let mut snapshots = Vec::new();
    let entries = fs::read_dir(&snapshot_dir).map_err(|e| e.to_string())?;

    for entry_result in entries {
        let entry = entry_result.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            if let Ok(content) = fs::read_to_string(&path) {
                let id = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let task_count = count_tasks_in_content(&content);
                let meta = entry.metadata().map_err(|e| e.to_string())?;

                snapshots.push(SnapshotMetadata {
                    id: id.clone(),
                    timestamp: id,
                    file_name: relative_path.split('/').last().unwrap_or(relative_path).to_string(),
                    relative_path: relative_path.to_string(),
                    size_bytes: meta.len(),
                    snapshot_path: path.to_string_lossy().to_string(),
                    task_count,
                });
            }
        }
    }

    // Sort newest first (highest timestamp string or numeric value)
    snapshots.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(snapshots)
}

/// Restores a snapshot over the target file using atomic write.
pub fn restore_snapshot(vault_path: &Path, relative_path: &str, snapshot_id: &str) -> Result<(), String> {
    let snapshot_dir = get_file_snapshot_dir(vault_path, relative_path);
    let snapshot_file = snapshot_dir.join(format!("{}.md", snapshot_id));

    if !snapshot_file.exists() {
        return Err(format!("Snapshot '{}' not found at '{}'", snapshot_id, snapshot_file.display()));
    }

    let content = fs::read_to_string(&snapshot_file)
        .map_err(|e| format!("Failed to read snapshot file: {}", e))?;

    let target_file = vault_path.join(relative_path.trim_start_matches('/'));

    // Write restored content atomically to target
    if let Some(parent) = target_file.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }

    let temp_name = format!(".restoring.{}.{}.tmp", snapshot_id, uuid::Uuid::new_v4());
    let temp_path = target_file.parent().unwrap_or(vault_path).join(temp_name);

    {
        let mut file = fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp restore file: {}", e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write restore file: {}", e))?;
        file.sync_all().map_err(|e| e.to_string())?;
    }

    fs::rename(&temp_path, &target_file).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("Failed to rename restored file: {}", e)
    })?;

    Ok(())
}

/// Prunes old snapshots for a specific note folder.
pub fn prune_file_snapshots(snapshot_dir: &Path, max_count: usize, max_age_days: u64) -> Result<(), String> {
    if !snapshot_dir.exists() {
        return Ok(());
    }

    let max_age_duration = Duration::from_secs(max_age_days * 24 * 60 * 60);
    let now = SystemTime::now();

    let mut snapshot_files = Vec::new();
    if let Ok(entries) = fs::read_dir(snapshot_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
                if let Ok(meta) = entry.metadata() {
                    let modified = meta.modified().unwrap_or(UNIX_EPOCH);
                    // Check age expiration
                    if let Ok(age) = now.duration_since(modified) {
                        if age > max_age_duration {
                            let _ = fs::remove_file(&path);
                            continue;
                        }
                    }
                    snapshot_files.push((path, modified));
                }
            }
        }
    }

    // If count exceeds max_count, delete oldest
    snapshot_files.sort_by(|a, b| b.1.cmp(&a.1)); // Newest first
    if snapshot_files.len() > max_count {
        for (path_to_remove, _) in &snapshot_files[max_count..] {
            let _ = fs::remove_file(path_to_remove);
        }
    }

    Ok(())
}
#[tauri::command]
pub fn list_snapshots_cmd(vault_path: String, file_path: String) -> Result<Vec<SnapshotMetadata>, String> {
    let vp = Path::new(&vault_path);
    let fp = Path::new(&file_path);
    let relative = match fp.strip_prefix(vp) {
        Ok(rel) => rel.to_string_lossy().to_string(),
        Err(_) => file_path.clone(),
    };
    list_snapshots(vp, &relative)
}

/// Tauri Command: Restores a snapshot over a target file.
#[tauri::command]
pub fn restore_snapshot_cmd(vault_path: String, file_path: String, snapshot_id: String) -> Result<(), String> {
    let vp = Path::new(&vault_path);
    let fp = Path::new(&file_path);
    let relative = match fp.strip_prefix(vp) {
        Ok(rel) => rel.to_string_lossy().to_string(),
        Err(_) => file_path.clone(),
    };
    restore_snapshot(vp, &relative, &snapshot_id)
}

/// Tauri Command: Explicitly creates a manual snapshot of a file (bypassing rate limit).
#[tauri::command]
pub fn create_manual_snapshot_cmd(vault_path: String, file_path: String) -> Result<SnapshotMetadata, String> {
    let vp = Path::new(&vault_path);
    let fp = Path::new(&file_path);

    if !fp.exists() {
        return Err(format!("File '{}' does not exist", file_path));
    }

    let relative = match fp.strip_prefix(vp) {
        Ok(rel) => rel.to_string_lossy().to_string(),
        Err(_) => file_path.clone(),
    };

    let snapshot_dir = get_file_snapshot_dir(vp, &relative);
    fs::create_dir_all(&snapshot_dir).map_err(|e| e.to_string())?;

    let content = fs::read_to_string(fp).map_err(|e| e.to_string())?;
    let task_count = count_tasks_in_content(&content);

    let now_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let snapshot_id = format!("{}", now_epoch);
    let snapshot_path = snapshot_dir.join(format!("{}.md", snapshot_id));

    fs::write(&snapshot_path, &content).map_err(|e| e.to_string())?;
    let _ = prune_file_snapshots(&snapshot_dir, MAX_SNAPSHOTS_PER_FILE, MAX_AGE_DAYS);

    let file_name = fp
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "note.md".to_string());

    Ok(SnapshotMetadata {
        id: snapshot_id.clone(),
        timestamp: snapshot_id,
        file_name,
        relative_path: relative,
        size_bytes: content.len() as u64,
        snapshot_path: snapshot_path.to_string_lossy().to_string(),
        task_count,
    })
}
