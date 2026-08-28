---
name: tauri-v2-desktop
description: Tauri v2 desktop application patterns, Rust IPC commands, atomic file writes, FSEvents watcher integration, macOS window vibrancy, and multi-platform packaging.
---

# Tauri v2 Desktop Skill

Use this skill when developing, debugging, or packaging the native Tauri desktop core.

## 1. Rust IPC & Atomic File Writes
- Always write to a `.tmp` file and rename atomically to protect data integrity:
  ```rust
  let tmp_path = format!("{}.tmp.{}", file_path, uuid::Uuid::new_v4());
  std::fs::write(&tmp_path, content)?;
  std::fs::rename(&tmp_path, file_path)?;
  ```

## 2. macOS Window Vibrancy & Drag Region
- Apply native macOS window styling in `src-tauri/tauri.conf.json`:
  ```json
  "titleBarStyle": "Overlay",
  "hiddenTitle": true
  ```
- Use `data-tauri-drag-region` on the header component to enable native window dragging.

## 3. macOS App Icon Squircle Standards
- Native macOS app icons must not be unmasked solid squares.
- Dimensions: 824px inner icon centered on a 1024x1024 transparent canvas.
- Radius: Standard Apple squircle corner radius (185px on 1024px canvas).
- Include subtle ambient drop shadow (`0 24px 48px rgba(0,0,0,0.28)`).
- Generate `.icns` using `iconutil -c icns icon.iconset`.

## 4. Multi-Platform Release CI
- Keep `.github/workflows/release.yml` configured with `tauri-apps/tauri-action@v0` to produce `.dmg` (macOS), `.exe` / `.msi` (Windows), and `.deb` / `.AppImage` (Linux) automatically on release tags (`v*`).
