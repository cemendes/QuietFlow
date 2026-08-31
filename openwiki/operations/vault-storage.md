---
type: operational-guide
title: Vault File Storage & Custom Branding
description: Guide to vault storage layout on disk, atomic file management operations, snapshot versioning under .quietflow/snapshots, folder logo mapping in .logos/config.json, and sidebar context menu branding workflows.
tags: [vault, filesystem, storage, branding, snapshots, context-menu, rust, tauri]
verified:
  - by: openwiki/0.4.3
    at: 2026-08-31T14:53:08.961Z
sources:
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-ce983d55242880aeb21d0289
    resource: repo://src-tauri/src/vault/fs.rs
  - id: openwiki-source-f4c981cd2d69b0127c2ce43b
    resource: repo://src-tauri/src/vault/snapshots.rs
  - id: openwiki-source-41f378e2efa71d929b02c907
    resource: repo://src/components/sidebar/FolderContextMenu.tsx
  - id: openwiki-source-0ff23be3c9bd73522015ce99
    resource: repo://src/services/logoService.ts
  - id: openwiki-source-9623d14483f5718867bb334d
    resource: repo://src/store/vaultStore.ts
generated: { by: "openwiki/0.4.3", at: "2026-08-31T14:53:08.961Z" }
---

# Vault File Storage & Custom Branding

QuietFlow stores user content directly on the local filesystem as a plain directory hierarchy of Markdown documents, directories, and hidden metadata folders. This approach ensures transparent data ownership, Git compatibility, and human-readable files that can be edited in external tools.

This guide details the physical disk layout, Rust-backed filesystem operations (`src-tauri/src/vault/fs.rs`), versioning snapshots (`.quietflow/snapshots`), custom folder branding persistence (`.logos/config.json`), and sidebar context menu controls (`FolderContextMenu.tsx`).

---

## Vault Filesystem Architecture

A QuietFlow vault is a standard directory path containing user Markdown notes and subfolders, alongside hidden system directories managed by the backend.

```
<Vault Root>/
├── today.md                      # Auto-scaffolding focus note
├── Projects/                     # User subfolder
│   ├── Q3 Roadmap.md             # Markdown document
│   └── Architecture.md
├── Customers/
│   └── Acme Corp.md
├── .quietflow/                   # Vault metadata directory
│   └── snapshots/                # Revision backup storage
│       ├── Projects_Q3 Roadmap.md/
│       │   ├── 1740830400.md     # Pre-write snapshot (epoch timestamp)
│       │   └── 1740834000.md
│       └── today.md/
│           └── 1740826800.md
└── .logos/                       # Custom folder branding assets
    ├── config.json               # Relative path -> logo/emoji mapping
    └── Projects.png              # Persisted square PNG/SVG logo
```

### Directory Scaffolding & Initial Setup

When a vault path is loaded, `scan_directory_tree` (`src-tauri/src/vault/fs.rs`) scans the directory tree. If the designated vault directory does not exist on disk, QuietFlow automatically creates the directory structure using `fs::create_dir_all` and seeds a default `today.md` file containing starter task content.

```markdown
---
title: Today's Focus
---

# Tasks

- [ ] Welcome to QuietFlow! Add your first task above.
```

### Hidden File Filtering & Tree Ordering

During directory tree scanning:
1. **Dotfile Suppression**: Entries starting with `.` (such as `.git`, `.DS_Store`, `.quietflow`, and `.logos`) are filtered out during traversal to keep metadata directories invisible in the main note tree UI.
2. **Deterministic Ordering**: Directory children are sorted deterministically—directories are listed first in alphabetical order, followed by files in alphabetical order.

---

## Atomic File Management Operations

All write operations in QuietFlow route through atomic file procedures implemented in Rust to prevent corruption caused by power loss, unexpected process termination, or concurrent writes.

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
sequenceDiagram
    participant UI as React Sidebar / Store
    participant Rust as Tauri Rust Backend
    participant Snap as Snapshot Engine
    participant Disk as Local Filesystem

    UI->>Rust: write_file_atomic(path, content)
    Rust->>Disk: Check if target exists & parent exists
    alt Target File Exists (>0 bytes)
        Rust->>Snap: create_pre_write_snapshot_if_needed()
        Snap->>Disk: Save backup to .quietflow/snapshots/
    end
    Rust->>Disk: Write content to temp file (.<filename>.<uuid>.tmp)
    Rust->>Disk: Flush buffers with sync_all()
    Rust->>Disk: Atomic rename temp file to target path
    Disk-->>Rust: Success
    Rust-->>UI: Operation Complete
```
*Sequence flow showing atomic write execution with pre-write snapshotting and buffer synchronization.*

### Atomic File Write Pipeline (`write_file_atomic`)

When writing content to a note:
1. **Parent Directory Guarantee**: The backend checks for the parent directory and executes `fs::create_dir_all` if missing.
2. **Pre-Write Snapshot Trigger**: If the destination file already exists and contains non-zero data, `create_pre_write_snapshot_if_needed` is invoked before modifying the file.
3. **Temporary Buffer**: Content is written to a hidden temporary file named `.<filename>.<uuid>.tmp` within the same parent directory.
4. **Buffer Flushing**: `file.sync_all()` is executed to ensure all written bytes are committed from OS cache to physical disk.
5. **Atomic Rename**: `fs::rename` replaces the target file atomically. If renaming fails, the temporary file is deleted.

### Filesystem Helper Commands

| Rust Command (`src-tauri/src/vault/fs.rs`) | Purpose | Behavior |
| :--- | :--- | :--- |
| `init_vault(path)` | Scans or bootstraps vault root | Creates directory and initial `today.md` if missing; returns sorted `VaultTree`. |
| `read_file(path)` | Reads file content | Reads text file as UTF-8 string. |
| `write_file_atomic(path, content)` | Writes file safely | Creates parent directories, triggers snapshot, writes `.tmp`, syncs, and renames. |
| `create_directory(path)` | Directory creation | Calls `fs::create_dir_all` for nested path creation. |
| `delete_entry(path)` | Deletes file or folder | Removes file via `fs::remove_file` or folder tree via `fs::remove_dir_all`. |
| `move_entry(source, destination)` | Renames or moves entry | Creates parent directories if needed and renames path via `fs::rename`. |

---

## Snapshot Storage & History (`.quietflow/snapshots`)

QuietFlow provides automatic revision protection without requiring Git repository setup. Historical revisions are stored under `<vaultPath>/.quietflow/snapshots/`.

### Snapshot Directory Layout & Path Sanitization

For every file in the vault, snapshot files are stored in a subdirectory named after the note's sanitized relative path:
- Function: `get_file_snapshot_dir` in `src-tauri/src/vault/snapshots.rs`
- Relative path sanitization: Strips leading slashes and replaces `/`, `\`, and `:` with `_`.
- Example: Note `Projects/Roadmap.md` maps to `<vault>/.quietflow/snapshots/Projects_Roadmap.md/`.

### Pre-Write Automatic Snapshot Policy

When `write_file_atomic` is invoked, `create_pre_write_snapshot_if_needed` runs under the following rules:
- **Exclusions**: New files (0 bytes), empty files, or files inside hidden directories (`.quietflow`, `.logos`, etc.) are skipped.
- **Rate Limit**: A 120-second (`RATE_LIMIT_SECONDS`) cooldown per file prevents snapshot bloat during rapid typing. If the newest snapshot in the note's snapshot directory was created less than 2 minutes ago, automatic creation is bypassed.
- **Task Analysis**: Markdown content is scanned for task checkmarks (`- [ ]`, `- [x]`, `- [X]`, `- [/]`) to store task counts in `SnapshotMetadata`.
- **Naming**: Snapshots are saved as `<epoch_timestamp>.md`.

### Snapshot Pruning & Retention

The backend enforces retention limits via `prune_file_snapshots`:
- **Maximum Count**: Keeps up to 20 snapshots (`MAX_SNAPSHOTS_PER_FILE`) per file. Oldest snapshots exceeding this count are deleted.
- **Maximum Age**: Automatically purges snapshots older than 14 days (`MAX_AGE_DAYS`).

### Version Restoration (`restore_snapshot`)

When restoring a historical revision via `restore_snapshot_cmd`:
1. The requested snapshot file `<snapshot_id>.md` is read from `.quietflow/snapshots/`.
2. Content is written to a temporary restore file `.<restoring>.<snapshot_id>.<uuid>.tmp` in the target folder.
3. `fs::rename` atomically overwrites the corrupted or current note file with the historical content.

---

## Folder Branding & Custom Logos (`.logos/config.json`)

QuietFlow enables custom branding on folders through emojis or custom image logos (PNG, SVG, WebP, JPG). All branding configuration is stored inside the vault, allowing folder branding to sync across machines or cloud drives.

### Logo Mapping Schema (`.logos/config.json`)

The mapping file `<vaultPath>/.logos/config.json` stores relative folder paths paired with logo filenames or raw emoji characters:

```json
{
  "Projects": "Projects.png",
  "Customers/Acme Corp": "Acme Corp.svg",
  "Personal/Finance": "💼"
}
```

### Path Normalization (`getFolderRelativePath`)

Folder paths are converted to relative vault paths using `getFolderRelativePath` in `src/services/logoService.ts`. This strips the leading `vaultPath` and slashes, keeping `config.json` relative and portable.

### Logo Persistence Flow (`persistFolderLogo` & `persistFolderEmoji`)

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
    A["User Selects Custom Logo or Emoji in FolderContextMenu"] --> B{"Is Image or Emoji?"}
    
    B -- "Custom Image (PNG/SVG)" --> C["Canvas 128x128 Downscale & Center-Crop"]
    C --> D["Write File to .logos/<folderName>.<ext>"]
    D --> E["Update .logos/config.json via Atomic Write"]
    
    B -- "Preset / Custom Emoji" --> F["Update .logos/config.json via Atomic Write"]
    
    E --> G["Update localStorage ('folder-icon-<folderPath>')"]
    F --> G
    G --> H["Update vaultStore State for Instant UI Render"]
```
*Flowchart illustrating folder logo processing, disk persistence, and multi-tier caching.*

1. **Emoji Persistence**: `persistFolderEmoji` records the emoji character under its relative folder path in `config.json` and updates `localStorage`.
2. **Image Persistence & Client Downscaling**:
   - `FolderContextMenu.tsx` processes image uploads using an HTML5 Canvas.
   - Images are center-cropped and downscaled to a clean `128x128` square PNG.
   - `persistFolderLogo` writes the asset file to `<vaultPath>/.logos/<folderName>.<ext>` using atomic file writes.
   - Relative configuration mappings are saved to `.logos/config.json`.

### Multi-Tier Icon Resolution Strategy (`resolveFolderIcon`)

To ensure zero UI latency while maintaining accuracy across desktop restarts, icon resolution operates across three tiers:

1. **Tier 1: LocalStorage Cache** (`folder-icon-<folderPath>`): Immediate lookup for instant UI rendering without waiting for disk I/O.
2. **Tier 2: In-Memory Logo Config**: Resolves direct emoji characters or cached base64 data URLs mapped in `LogoConfig`.
3. **Tier 3: Disk / Tauri Asset Resolution**:
   - In Tauri, uses `convertFileSrc` to generate a local asset URL for `<vaultPath>/.logos/<fileName>`.
   - Fallback reads raw file content via IPC and formats it as `data:image/svg+xml;utf8,...` or `data:image/png;base64,...`.
   - Caches the resolved URL back to `localStorage`.

---

## Sidebar Context Menu & Folder Operations

The `FolderContextMenu` component (`src/components/sidebar/FolderContextMenu.tsx`) provides quick file and directory actions directly from the sidebar tree view.

```
+-----------------------------------+
| ✏️  Rename                        |
| 📝 Add Note                       |
| 📁 New Subfolder                  |
| --------------------------------- |
| 😀 Choose Folder Icon             |
|    [ 💼  🚀  ⭐  🔥  🎯 ]         |
|    [ 🌿  💡  📌  📦  ⚡ ]         |
| 🖼️  Upload Company Logo           |
|    Square PNG/SVG, <500KB         |
| --------------------------------- |
| 🗑️  Delete                        |
+-----------------------------------+
```

### Context Menu Actions Summary

- **Rename**: Toggles inline text input. Preserves `.md` extensions on file rename and triggers `ipc.moveEntry`.
- **Add Note**: Prompts for a note name within the target folder and creates the file with a default template.
- **Add Subfolder**: Prompts for a folder name and calls `ipc.createDirectory`.
- **Version History** (Files only): Opens the `FileHistoryModal` to inspect and restore snapshots from `.quietflow/snapshots`.
- **Choose Folder Icon**: Displays preset emojis (`💼`, `🚀`, `⭐`, `🔥`, `🎯`, `🌿`, `💡`, `📌`, `📦`, `⚡`). Selecting an emoji invokes `persistFolderEmoji`.
- **Upload Company Logo**: Accepts image files (`png`, `jpeg`, `svg`, `webp`), displays size warnings if >2MB, downscales to `128x128` PNG square via Canvas, and triggers `persistFolderLogo`.
- **Delete**: Calls `ipc.deleteEntry` (`fs::remove_file` or `fs::remove_dir_all`).

---

## Git Protection & Dotfile Safety

QuietFlow vaults are designed to work smoothly inside Git repositories. To protect private metadata and custom branding binaries from accidentally clogging Git histories, `.gitignore` explicitly excludes folder branding assets:

```gitignore
# Local User Vaults & Personal Notes
.logos/
**/.logos/
```

Additionally, because Rust's `scan_directory_tree` ignores all files and folders starting with a dot, `.quietflow/` and `.logos/` remain clean metadata locations that do not interfere with standard user note hierarchies.

---

## Testing Strategy & Verification

Vault filesystem safety, snapshot creation, and branding persistence are thoroughly tested in backend Rust unit tests and frontend Vitest suites:

- **Backend Filesystem Operations** (`src-tauri/src/vault/fs_tests.rs`):
  - `test_atomic_write_and_read`: Verifies UTF-8 atomic file writes and reads.
  - `test_create_directory_and_scan_tree`: Verifies directory structure scanning and tree creation.
  - `test_atomic_write_creates_parent_directory_if_missing`: Ensures nested paths automatically construct missing parent folders.
  - `test_scan_directory_ignores_hidden_files`: Asserts `.DS_Store` and dotfiles are omitted from scanned `VaultTree`.
  - `test_delete_entry`: Tests deletion of single files and recursive directory removal.

- **Backend Snapshot Engine** (`src-tauri/src/vault/snapshots_tests.rs`):
  - `test_create_snapshot_and_list`: Verifies pre-write snapshot generation and task count heuristics.
  - `test_simulate_file_corruption_and_atomic_restore`: Simulates file truncation/corruption and asserts full restoration from historical snapshots.

- **Frontend Branding Service** (`src/services/logoService.test.ts`):
  - `getFolderRelativePath`: Validates relative path calculation from absolute paths.
  - `saveLogoConfig` & `loadLogoConfig`: Tests persistence to `.logos/config.json`.
  - `resolveFolderIcon`: Tests emoji, data URL, and `localStorage` fallback resolution.
  - `persistFolderLogo` & `persistFolderEmoji`: Asserts folder logo creation, image data writing, and `localStorage` caching.
