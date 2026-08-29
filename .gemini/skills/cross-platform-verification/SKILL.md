---
name: cross-platform-verification
description: Guidelines for ensuring components, shortcuts, IPC calls, and responsive layouts function across macOS, Windows, Linux, and Web (PWA).
---

# Cross-Platform Verification Skill

Use this skill when developing or testing features across multiple operating systems and browser environments.

## 1. Dual-Engine IPC Branching
Always gate native desktop API calls with `isTauriEnvironment()`:
```ts
if (isTauriEnvironment()) {
  // Native Tauri Rust commands (invoke, plugin-dialog, etc.)
} else {
  // In-browser mock IPC & LocalStorage fallback
}
```

## 2. Cross-Platform Keyboard Shortcuts
- macOS uses `Meta` (`Cmd`), whereas Windows and Linux use `Ctrl`.
- Always check both keys:
  ```ts
  const isModifier = e.metaKey || e.ctrlKey;
  if (isModifier && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  ```
- All modals and overlays must listen for `Escape` to dismiss cleanly.

## 3. Responsive Layout Limits
- Desktop minimum window size is set to `800 x 550` in `tauri.conf.json`.
- When window width shrinks below `900px`, the sidebar must support collapsible icon-only mode (`w-16`).
- Avoid fixed horizontal overflow layouts.
