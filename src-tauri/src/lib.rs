pub mod vault;

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use vault::{SafeVaultWatcher, VaultWatcherState};


use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn start_watching_vault(
    app: AppHandle,
    watcher_state: State<'_, SafeVaultWatcher>,
    path: String,
) -> Result<(), String> {
    vault::start_vault_watcher(app, watcher_state.inner().clone(), &path)
}

#[tauri::command]
async fn pick_vault_folder(app: AppHandle) -> Result<Option<String>, String> {
    let folder_path = app
        .dialog()
        .file()
        .set_title("Select QuietFlow Vault Directory")
        .blocking_pick_folder();

    Ok(folder_path.map(|p| p.to_string()))
}

#[tauri::command]
fn get_saved_vault_path(app: AppHandle) -> String {
    use std::fs;
    let config_dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
            std::path::PathBuf::from(format!("{}/Library/Application Support/QuietFlow", home))
        });
    let config_file = config_dir.join("vault_path.txt");
    if config_file.exists() {
        if let Ok(saved) = fs::read_to_string(&config_file) {
            let trimmed = saved.trim().to_string();
            if !trimmed.is_empty() && std::path::Path::new(&trimmed).exists() {
                return trimmed;
            }
        }
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    format!("{}/Documents/QuietFlowVault", home)
}

#[tauri::command]
fn set_saved_vault_path(app: AppHandle, path: String) -> Result<(), String> {
    use std::fs;
    let config_dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
            std::path::PathBuf::from(format!("{}/Library/Application Support/QuietFlow", home))
        });
    if !config_dir.exists() {
        let _ = fs::create_dir_all(&config_dir);
    }
    let config_file = config_dir.join("vault_path.txt");
    fs::write(config_file, path.trim()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_default_vault_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    format!("{}/Documents/QuietFlowVault", home)
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            vault::init_vault,
            vault::read_file,
            vault::write_file_atomic,
            vault::create_directory,
            vault::delete_entry,
            vault::move_entry,
            start_watching_vault,
            pick_vault_folder,
            get_saved_vault_path,
            set_saved_vault_path,
            get_default_vault_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
