---
name: tauri-v2-desktop
description: Tauri v2 plugin standards, native IPC, ACL security capabilities, path handling, and browser fallback mocking.
---

# Tauri v2 Desktop Development Skill

## Core Principles
1. **Tauri v2 Plugin Standards**: Always configure permissions in `src-tauri/capabilities/default.json` when using `@tauri-apps/plugin-*` (`dialog`, `fs`, `global-shortcut`, `shell`).
2. **Native Rust IPC Fallback**: For critical OS features (e.g. folder selection, atomic file writes, notify watcher), expose direct `#[tauri::command]` handlers in `src-tauri/src/lib.rs`.
3. **Environment Agnostic / Browser Mocking**: Maintain graceful web fallbacks in `src/store/ipc.ts` with `isTauriEnvironment()` checks so UI, component tests, and Vite hot-reloading work smoothly in web browsers without breaking.
4. **Native macOS Overlay Chrome**: Support `data-tauri-drag-region` on top toolbars and avoid duplicating simulated traffic lights when running natively.
