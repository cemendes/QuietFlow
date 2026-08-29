use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct VaultNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub children: Vec<VaultNode>,
    #[serde(rename = "fileCount")]
    pub file_count: usize,
}

pub type VaultTree = VaultNode;

/// Recursively scans a directory path and builds a VaultTree hierarchy.
pub fn scan_directory_tree(dir_path: &Path) -> Result<VaultNode, String> {
    if !dir_path.exists() {
        fs::create_dir_all(dir_path)
            .map_err(|e| format!("Failed to create vault directory '{}': {}", dir_path.display(), e))?;
        
        // Create default today.md
        let today_path = dir_path.join("today.md");
        let initial_today_content = "---\ntitle: Today's Focus\n---\n\n# Tasks\n\n- [ ] Welcome to QuietFlow! Add your first task above.\n";
        let _ = fs::write(&today_path, initial_today_content);
    }
    if !dir_path.is_dir() {
        return Err(format!("Path '{}' is not a directory", dir_path.display()));
    }

    let name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir_path.to_string_lossy().to_string());

    let mut children = Vec::new();
    let mut file_count = 0;

    let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;

    for entry_result in entries {
        let entry = entry_result.map_err(|e| e.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Ignore hidden files and system directories like .git, .DS_Store, .tmp files
        if file_name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            let child_node = scan_directory_tree(&path)?;
            file_count += child_node.file_count;
            children.push(child_node);
        } else {
            // Count and include Markdown files or text files
            file_count += 1;
            children.push(VaultNode {
                name: file_name,
                path: path.to_string_lossy().to_string(),
                is_directory: false,
                children: Vec::new(),
                file_count: 0,
            });
        }
    }

    // Sort children: directories first alphabetically, then files alphabetically
    children.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(VaultNode {
        name,
        path: dir_path.to_string_lossy().to_string(),
        is_directory: true,
        children,
        file_count,
    })
}

/// Reads the contents of a file as UTF-8 string.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", path, e))
}

/// Atomically writes content to a file.
/// Writes to a temporary file `.<filename>.tmp` in the same directory first, then renames.
#[tauri::command]
pub fn write_file_atomic(path: String, content: String) -> Result<(), String> {
    let target_path = PathBuf::from(&path);
    let parent = target_path
        .parent()
        .ok_or_else(|| format!("Invalid file path: '{}'", path))?;

    if !parent.exists() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory '{}': {}", parent.display(), e))?;
    }

    let file_name = target_path
        .file_name()
        .ok_or_else(|| format!("Invalid file name: '{}'", path))?
        .to_string_lossy();

    let temp_file_name = format!(".{}.{}.tmp", file_name, uuid::Uuid::new_v4());
    let temp_path = parent.join(temp_file_name);

    // Write content to temporary file
    {
        let mut file = fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp file '{}': {}", temp_path.display(), e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write to temp file '{}': {}", temp_path.display(), e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync temp file '{}': {}", temp_path.display(), e))?;
    }

    // Atomic rename
    fs::rename(&temp_path, &target_path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("Failed to rename temp file to '{}': {}", target_path.display(), e)
    })?;

    Ok(())
}

/// Creates a new directory at the specified path, including parents if needed.
#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        fs::create_dir_all(dir_path)
            .map_err(|e| format!("Failed to create directory '{}': {}", path, e))?;
    }
    Ok(())
}

/// Deletes a file or directory entry at the specified path.
#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let entry_path = Path::new(&path);
    if !entry_path.exists() {
        return Ok(());
    }

    if entry_path.is_dir() {
        fs::remove_dir_all(entry_path)
            .map_err(|e| format!("Failed to remove directory '{}': {}", path, e))?;
    } else {
        fs::remove_file(entry_path)
            .map_err(|e| format!("Failed to remove file '{}': {}", path, e))?;
    }
    Ok(())
}

/// Moves a file or directory to a new target destination.
#[tauri::command]
pub fn move_entry(source_path: String, destination_path: String) -> Result<(), String> {
    let src = Path::new(&source_path);
    let dest = Path::new(&destination_path);

    if !src.exists() {
        return Err(format!("Source path '{}' does not exist", source_path));
    }

    // If destination parent directory doesn't exist, create it
    if let Some(parent) = dest.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }

    fs::rename(src, dest).map_err(|e| format!("Failed to move '{}' to '{}': {}", source_path, destination_path, e))
}

/// Initializes and returns the scanned directory tree for the given vault path.
#[tauri::command]
pub fn init_vault(path: String) -> Result<VaultTree, String> {
    let dir_path = Path::new(&path);
    scan_directory_tree(dir_path)
}
