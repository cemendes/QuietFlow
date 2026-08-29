use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct VaultWatcherState {
    pub watcher: Option<RecommendedWatcher>,
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

    // Spawn a background thread to process and debounce notify events with trailing debounce
    let path_str = vault_path.to_string();
    std::thread::spawn(move || {
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

            // Drain subsequent rapid events until 150ms of silence
            while let Ok(subsequent) = rx.recv_timeout(debounce_duration) {
                let _ = subsequent;
            }

            // Emit event to frontend once changes settle
            let _ = app.emit("vault://changed", &path_str);
        }
    });

    Ok(())
}
