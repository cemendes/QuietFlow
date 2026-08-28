pub mod vault;

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};
use vault::{SafeVaultWatcher, VaultWatcherState};


#[tauri::command]
fn start_watching_vault(
    app: AppHandle,
    watcher_state: State<'_, SafeVaultWatcher>,
    path: String,
) -> Result<(), String> {
    vault::start_vault_watcher(app, watcher_state.inner().clone(), &path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let watcher_state: SafeVaultWatcher = Arc::new(Mutex::new(VaultWatcherState::default()));

    tauri::Builder::default()
        .manage(watcher_state)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            vault::init_vault,
            vault::read_file,
            vault::write_file_atomic,
            vault::create_directory,
            vault::delete_entry,
            start_watching_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
