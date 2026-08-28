use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct VaultWatcherState {
    pub watcher: Option<RecommendedWatcher>,
}

impl Default for VaultWatcherState {
    fn default() -> Self {
        Self { watcher: None }
    }
}

pub type SafeVaultWatcher = Arc<Mutex<VaultWatcherState>>;

/// Starts watching the specified vault directory path and emits `vault://changed` event to the Tauri app handle on modifications.
pub fn start_vault_watcher(
    app: AppHandle,
    state: SafeVaultWatcher,
    vault_path: &str,
) -> Result<(), String> {
    let path = Path::new(vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Invalid vault path to watch: {}", vault_path));
    }

    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    {
        let mut state_guard = state
            .lock()
            .map_err(|e| format!("Failed to lock watcher state: {}", e))?;
        state_guard.watcher = Some(watcher);
    }

    // Spawn a background thread to process and debounce notify events
    let path_str = vault_path.to_string();
    std::thread::spawn(move || {
        let mut last_event_time = Instant::now() - Duration::from_millis(500);
        let debounce_duration = Duration::from_millis(150);

        while let Ok(event) = rx.recv() {
            // Filter out temporary and hidden files
            let should_ignore = event.paths.iter().all(|p| {
                p.file_name()
                    .map(|n| n.to_string_lossy().starts_with('.'))
                    .unwrap_or(false)
            });

            if should_ignore {
                continue;
            }

            let now = Instant::now();
            if now.duration_since(last_event_time) >= debounce_duration {
                last_event_time = now;
                // Emit event to frontend
                let _ = app.emit("vault://changed", &path_str);
            }
        }
    });

    Ok(())
}
