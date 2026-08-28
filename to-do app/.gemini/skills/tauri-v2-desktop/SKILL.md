---
name: tauri-v2-desktop
description: Best practices, architecture patterns, and troubleshooting for Tauri v2 apps with React, TypeScript, native plugins, IPC commands, and ACL security capabilities.
---

# Tauri v2 Desktop Skill

Use this skill when developing, refactoring, or debugging Tauri v2 features, plugins, IPC commands, and native desktop capabilities.

## 1. Tauri v2 Plugin & Import Standards
Tauri v2 uses modular scoped packages (`@tauri-apps/plugin-*`) rather than monolithic v1 APIs:

- **Filesystem**: `@tauri-apps/plugin-fs` (`readTextFile`, `writeTextFile`, `readDir`, `mkdir`, `remove`, `exists`)
- **Dialogs**: `@tauri-apps/plugin-dialog` (`open`, `save`, `message`, `ask`, `confirm`)
- **Global Shortcuts**: `@tauri-apps/plugin-global-shortcut` (`register`, `unregister`, `isRegistered`)
- **Shell / Process**: `@tauri-apps/plugin-shell` (`Command`, `open`)
- **Core IPC**: `@tauri-apps/api/core` (`invoke`)

## 2. Capabilities & Permissions (ACL in v2)
In Tauri v2, all plugin access requires explicit configuration in `src-tauri/capabilities/default.json` or `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for QuietFlow",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-dir",
    "fs:allow-mkdir",
    "fs:allow-exists",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "global-shortcut:default",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister"
  ]
}
```

## 3. Environment Fallbacks & Web Mocking
When developing web/browser preview mode alongside the Tauri desktop app:
- Always check execution environment before calling native APIs:
  ```ts
  export function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }
  ```
- Provide clean in-memory or localStorage mock implementations for web preview mode to prevent browser crashes during development and testing.

## 4. Path Normalization & Cross-Platform FS
- Always normalize file paths across Windows (`\`), macOS, and Linux (`/`).
- Avoid hardcoding separator characters; trim trailing slashes before concatenating paths.
- Handle file encoding (UTF-8) and frontmatter boundaries gracefully when reading/writing Markdown notes.
