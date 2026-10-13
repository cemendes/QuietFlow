---
type: integration
title: Auto-Updater & Release Management
description: Detailed technical documentation of QuietFlow's auto-updater architecture, including Minisign cryptographic signature verification, background checks, download progress tracking, zero-data-loss app relaunch, and browser mock fallbacks.
tags: [auto-updater, release-management, tauri-updater, minisign, security, testing]
verified:
  - by: openwiki/0.4.3
    at: 2026-08-31T14:53:08.961Z
sources:
  - id: openwiki-source-00ff4b2512b6dbfa268cbfa4
    resource: repo://src-tauri/capabilities/default.json
  - id: openwiki-source-8fb4609cef6e3bffc73c48ee
    resource: repo://src-tauri/src/lib.rs
  - id: openwiki-source-0abfee918aaf0d7e3ea712fc
    resource: repo://src-tauri/tauri.conf.json
  - id: openwiki-source-09bd3af3a0c8b0e5a0b59d3f
    resource: repo://src/components/updater/UpdateToast.tsx
  - id: openwiki-source-b7af618f827c5c88aded1b02
    resource: repo://src/utils/updater.ts
  - id: openwiki-source-8e33d2ce557f34d7b3a34397
    resource: repo://tests/updater/updater-simulation.test.ts
generated: { by: "openwiki/0.4.3", at: "2026-08-31T14:53:08.961Z" }
---

# Auto-Updater & Release Management

QuietFlow features an in-app auto-updater built on top of Tauri's official updater plugin (`@tauri-apps/plugin-updater` and `tauri-plugin-updater`). The auto-updater pipeline is designed for seamless background release checks, cryptographically verified updates, progress streaming, and zero-data-loss application restarts. For browser environments and automated test suites, the system provides a simulated mock updater fallback.

---

## Architecture & Tauri Configuration

The native desktop auto-updater is declared across Rust backend dependencies, capability grants, and Tauri bundle configuration.

```
+-------------------------------------------------------------------------+
|                              Tauri Desktop                              |
|                                                                         |
|  +--------------------+     IPC Bridge      +------------------------+  |
|  |  UpdateToast.tsx   |<------------------->| @tauri-apps/plugin-upd |  |
|  | (Top-center banner)|                     +------------------------+  |
|  +--------------------+                                 |               |
|            |                                            v               |
|            v                                +------------------------+  |
|  +--------------------+                     |  tauri-plugin-updater  |  |
|  |  updater.ts logic  |                     |     (Rust Backend)     |  |
|  +--------------------+                     +------------------------+  |
|            |                                            |               |
|            v                                            v               |
|  +--------------------+                     +------------------------+  |
|  | safeRelaunchApp()  |                     | Minisign Verification  |  |
|  | (Flushes state)    |                     | (Public Key Check)     |  |
|  +--------------------+                     +------------------------+  |
+-------------------------------------------------------------------------+
```

### Tauri Configuration & Permissions

1. **Artifact Generation & Endpoint**:
   In `src-tauri/tauri.conf.json`, the bundle settings activate update artifact generation (`createUpdaterArtifacts: true`). The updater plugin configuration registers the GitHub releases manifest endpoint:
   `https://github.com/cemendes/QuietFlow/releases/latest/download/latest.json`

2. **Cryptographic Minisign Verification**:
   To prevent binary tampering and man-in-the-middle attacks, updates are signed with Minisign. The public key is embedded in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`. Tauri verifies downloaded binaries against this signature prior to applying the update package.

3. **Backend & Capability Grants**:
   The Rust backend initializes the plugin in `src-tauri/src/lib.rs` via `.plugin(tauri_plugin_updater::Builder::new().build())`. Access rights are granted to the frontend window through `"updater:default"` in `src-tauri/capabilities/default.json`, enabling `allow-check`, `allow-download`, `allow-install`, and `allow-download-and-install`.

---

## Update Control Flow & Lifecycle

The auto-updater lifecycle manages checking for new releases, streaming download progress, flushing unwritten application data, and executing a safe process restart.

```mermaid
sequenceDiagram
    participant App as App Component
    participant Toast as UpdateToast UI
    participant Updater as src/utils/updater
    participant TauriPlugin as @tauri-apps/plugin-updater
    participant VaultStore as Vault Store / IPC
    participant NativeProc as @tauri-apps/plugin-process

    App->>Toast: Mounts on app startup
    Toast->>Toast: Check localStorage for version change (Changelog Pill)
    Toast->>Updater: checkForAppUpdate() (after 3s delay)
    alt Tauri Environment
        Updater->>TauriPlugin: check() (fetches latest.json & verifies Minisign)
        TauriPlugin-->>Updater: Update object (version, release notes)
    else Browser / Test Fallback
        Updater->>Updater: mockUpdaterInstance.check()
    end
    Updater-->>Toast: UpdateInfo | null
    Toast-->>Toast: Display "Update available vX.Y.Z" banner

    User->>Toast: Click update banner
    Toast->>Updater: downloadAndInstallUpdate(onProgress)
    alt Tauri Environment
        Updater->>TauriPlugin: update.downloadAndInstall()
        TauriPlugin-->>Updater: Progress events (Started, Progress, Finished)
    else Browser / Test Fallback
        Updater->>Updater: mockUpdaterInstance.downloadAndInstall()
    end
    Updater-->>Toast: Progress percent (0% to 100%)
    Toast-->>Toast: Set isReady status (auto relaunch in 1s or click)

    Toast->>Updater: safeRelaunchApp()
    Updater->>VaultStore: Flush active note (ipc.writeFileAtomic)
    alt Tauri Environment
        Updater->>NativeProc: relaunch()
    else Browser / Test Fallback
        Updater->>Updater: window.location.reload()
    end
```
*Figure 1: End-to-end control flow for background update checks, progress streaming, zero-data-loss document flushing, and application relaunch.*

---

## Utility Functions (`src/utils/updater.ts`)

The updater utility exposes safe abstractions over Tauri's plugin APIs with silent error handling and non-desktop fallbacks.

### 1. `checkForAppUpdate()`

Queries `@tauri-apps/plugin-updater` when running in a Tauri runtime (`isTauriEnvironment()`). Returns an `UpdateInfo` object containing `version`, `currentVersion`, `body` (release notes), and `date`. Non-critical network errors or missing release manifests (e.g. `404`, `Not Found`, `could not find latest`, `No updates`) are caught silently and resolved as `null`. In non-Tauri environments, it delegates to `mockUpdaterInstance.check()`.

### 2. `downloadAndInstallUpdate(onProgress?)`

Invokes `update.downloadAndInstall()` while listening to event hooks:
- **`Started`**: Records total byte size (`contentLength`) and emits `0%` progress.
- **`Progress`**: Accumulates chunk byte counts (`chunkLength`), calculates percentage (`Math.round((downloaded / total) * 100)`), and executes the `onProgress` callback.
- **`Finished`**: Emits `100%` progress once byte transfer and signature verification complete.

If a Minisign signature mismatch occurs (e.g. corrupted payload or signature mismatch), the plugin rejects the operation with an explicit error.

### 3. `safeRelaunchApp()` (Zero-Data-Loss Safe Relaunch)

To prevent data corruption or loss of unsaved editor content during updates, `safeRelaunchApp()` flushes active state prior to restarting:
1. Obtains `activeFile` from `useVaultStore.getState()`.
2. Reads current document content via IPC (`ipc.readFile(activeFile)`).
3. Writes document contents to disk atomically using `ipc.writeFileAtomic(activeFile, content)`.
4. Triggers native app relaunch via `@tauri-apps/plugin-process`'s `relaunch()`, or executes `window.location.reload()` in browser fallback mode.

---

## User Interface (`src/components/updater/UpdateToast.tsx`)

The `UpdateToast` component mounts inside `App.tsx` and renders compact top-center floating pill notifications positioned over the title bar area.

### Visual States & Interactions

| State | Appearance & Banner Text | User Action / Trigger |
| :--- | :--- | :--- |
| **Post-Update Changelog** | Dark Slate pill with emerald icon: `Updated to v0.1.0-alpha.4 · See changelog` | Opens `CHANGELOG.md` URL in external browser. Dismissible via `X`. |
| **Update Available** | Slate/Indigo pill with pulsing sparkles: `Update available · vX.Y.Z (Click to update)` | Triggered 3s after startup. Clicking starts download process. |
| **Downloading** | Dark Slate pill with animated spinner: `Updating... X%` + progress bar | Shows live progress percentage. Banner click ignored during download. |
| **Ready for Relaunch** | Emerald pill with check icon: `Restarting to apply vX.Y.Z...` | Triggers `safeRelaunchApp()` immediately or auto-relaunches after 1 second. |
| **Error / Signature Failure** | Rose red pill: `[Error Message] (Click to retry)` | Clicking clears error state and retries `downloadAndInstallUpdate`. |

### Post-Update Changelog Pill Logic

When the app launches, `UpdateToast` checks `localStorage.getItem('quietflow-last-seen-version')`. If `lastSeenVersion` exists and differs from `CURRENT_VERSION` (`0.1.0-alpha.4`), it presents an "Updated to vX.Y.Z" changelog pill and updates `localStorage` with `CURRENT_VERSION`.

---

## Browser Mock Updater & Development Simulation

For browser development, testing, and continuous integration, `src/utils/updater.ts` exports `MockUpdater` and `mockUpdaterInstance`.

### Mock Capabilities

- **State Configuration**: `mockUpdaterInstance.setMockState({ available, version, notes, corrupt })` allows tests to set mock version strings, release notes, or simulate signature corruptions.
- **Progress Simulation**: Simulates downloading a 12 MB payload across four progress increments (`10%`, `35%`, `70%`, `100%`) with 20ms delay pauses.
- **Signature Failure Simulation**: When `corrupt: true` is set, `downloadAndInstall` throws `"Minisign signature mismatch: signature is invalid or file is corrupted."`.

---

## Automated Test Coverage

The updater pipeline is thoroughly tested in `tests/updater/updater-simulation.test.ts` using Vitest:

- **Scenario A (Update Available & Progress Streaming)**: Verifies `checkForAppUpdate()` returns version `0.2.0-alpha.1` and `downloadAndInstallUpdate()` streams progress callbacks through `[10%, 35%, 70%, 100%]`.
- **Scenario B (Up-to-Date App)**: Confirms `checkForAppUpdate()` returns `null` when no update is available.
- **Scenario C (Corrupted Minisign Signature)**: Verifies that a tampered signature causes `downloadAndInstallUpdate()` to reject with a Minisign mismatch exception.
- **Scenario D (Zero-Data-Loss Relaunch)**: Mocks active vault document state in `useVaultStore` and asserts that document flushing completes successfully prior to calling `window.location.reload()`.
