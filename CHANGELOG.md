# Changelog

All notable changes to QuietFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0-alpha.3] - 2026-08-28

### Added
- **Vault-Synced Folder Logos**: Save and load custom company logos and emojis directly from `<vault>/.logos/` indexed by `<vault>/.logos/config.json`.
- **Cloud Vault Sync Compatibility**: Folder logos sync seamlessly across devices via cloud storage providers (Google Drive, iCloud, Dropbox, Syncthing) with automatic fallback cache.
- **Git Vault Protection**: `.logos/` and vault test assets are explicitly ignored in `.gitignore` to prevent private assets or notes from entering Git repositories.
- **Folder-Level Task Aggregation**: Selecting a folder row aggregates and displays all tasks across every markdown note inside that folder on both List View and Kanban Board.
- **Folder & Note Selection Highlight**: Active folder and note rows now clearly highlight with an emerald-accented background in the sidebar navigation.
- **Clean Breadcrumbs in Drawer**: Replaced raw file system paths in the task slide-over drawer with formatted location tags (`📁 [Folder] / 📄 [Note]`).
- **Kanban Focus Bucket Controls**: Integrated Focus header tabs (`All Tasks`, `Now Only`, `Backlog`) and completed task progress ring in Kanban mode.
- **In-App Automatic Software Updates**: Native self-updater powered by Tauri 2.0 and Minisign Ed25519 cryptographic signing with GitHub Releases integration.
- **Update Notifications & UI**: Non-intrusive `UpdateToast` alert and interactive "Check for Updates" panel with real-time download progress bar in Settings > About.
- **Right-Click Context Menu for Notes**: Rename, emoji picker, custom logo upload, and delete options for note rows.
- **Cognitive Re-entry Breadcrumb Banner**: Restores context and working memory trail across folders and active tasks.
- **Simulated Upgrade Test Suites**: 4 lifecycle and security upgrade test scenarios.

### Changed
- **Terminology Alignment**: Updated the 3rd focus filter tab from `"Later / Backlog"` to `"Backlog"` to match the 1st Kanban column.
- **Header Title Capitalization**: Automatically capitalizes folder and note titles in both List View and Kanban Board (`today` $\rightarrow$ `Today's Focus`, `inbox` $\rightarrow$ `📥 Inbox`).
- **Folder List Clean View**: Removed distracting numeric note count badges from folder rows for a cleaner, calmer sidebar interface.
- **Folder Text Full Width Layout**: Folder names now expand naturally across the full width of the sidebar without getting prematurely truncated or squished.
- **Default Vault Path**: Automatically points to `$HOME/Documents/QuietFlowVault` on first launch for zero-friction macOS sandbox initialization.
- **ISO Note Naming Scheme**: Notes created inside folders now default to `YYYY-MM-DD.md` (e.g. `2026-08-28.md`).
- **Collision Suffix Generator**: Duplicate dates inside the same folder now append short random alphanumeric suffixes (e.g. `2026-08-28-a3f9`).

### Fixed
- **Kanban Drag-and-Drop Disk Persistence**: Card movement between all 4 Kanban columns (`Backlog`, `To Do`, `In Progress`, `Done`) immediately syncs `@status(...)` and checkboxes to disk across all note files.
- **Inline Rename & Creation Text Selection**: Pre-filled note names now reliably appear highlighted (`select()`) for instant overwrite or Enter confirmation.
- **Untitled Task Fallback**: Added interactive placeholder (`Untitled task (click to edit)`) and auto-focus for blank tasks.
- **Folder Context Menu Dismissal**: Added global outside click and `Escape` key listeners to immediately dismiss popup menus.
- **WiX Installer Build Error**: Configured NSIS installer target for Windows runners.

---

## [0.1.0-alpha.2] - 2026-08-28

### Added
- Multi-platform GitHub Actions build pipeline for macOS Universal (`.dmg`), Windows (`.exe`), and Linux (`.deb` / `.AppImage`).
- Initial alpha release of QuietFlow desktop task and note manager.
