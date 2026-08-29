# Changelog

All notable changes to QuietFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0-alpha.5] - 2026-08-29

### Added
- **Vault Snapshots & Swap Recovery Engine**:
  - Automatic rate-limited pre-write snapshots (every 2 minutes per file) before saving edits, stored in `.quietflow/snapshots/`.
  - Rolling retention policy: keeps the last 20 snapshots per note with a 14-day expiration auto-pruning window.
  - Portable and hidden: backups travel with the vault across cloud drives while staying hidden from sidebar navigation.
- **Proactive File Corruption Guard & Recovery Banner**:
  - Automatically detects empty (0-byte) or damaged note files and presents an instant recovery banner: *"Empty or Corrupted File Detected. [Restore from Snapshot]"*.
- **Note Version History Modal & Settings Tab**:
  - Right-click any note in the sidebar $\rightarrow$ **"Version History"** to preview snapshot revisions, timestamps, file sizes, and 1-click restore.
  - Manual **"Snapshot Now"** button to capture on-demand snapshots.
  - Dedicated **"Snapshots & Swap"** information panel in Settings.
- **Full-Page Task Detail View**:
  - Dedicated full-canvas task view with markdown notes editor and chronologically sorted comments feed.
- **Autonomous Menu Crawler & State Exploration Engine**:
  - Dynamic 17-state Playwright crawler testing all system views, focus filters, folder/note right-click context menus, and preferences tabs.
- **Chaos Monkey Stress Test Harness**:
  - Gremlins.js stress testing harness firing 1,000 rapid randomized user actions at ~59 actions/sec with 0 unhandled exceptions.
- **Markdown Parser Fuzzing & Robustness Suite**:
  - 100-iteration synthetic garbage fuzzer, deep subtask nesting tests, and preservation of URL fragments (`#section`) and issue tags (`#45`).
- **Rust Backend Testing in CI & Pre-Version Gatekeeper**:
  - Added native `cargo test` step to GitHub Actions CI workflow.
  - Release gatekeeper hook (`npm run preversion`) verifying Rust backend tests, Vitest suite, and Playwright autonomous crawler before version bumps.
- **Dynamic Version & Dev Build Indicator**:
  - Displays runtime app bundle version with Git commit SHA badge in local development.

### Fixed
- **Markdown Tag Parsing**: Fixed regex tag extraction so URL anchors (`http://...#section`) and numerical issue numbers (`[PR #45]`) are preserved in task titles instead of being stripped as `#tags`.
- **Archive Modal Escape Dismissal**: Added `Escape` key listener to `ArchiveModal.tsx` for consistent keyboard navigation.
- **Settings Modal Version Display**: Replaced hardcoded version label with dynamic `@tauri-apps/api/app` `getVersion()` query.

---

## [0.1.0-alpha.4] - 2026-08-28

### Added
- **Vault Location Auto-Recovery**: Automatically restores and maintains selected vault directory across restarts and dev builds without losing state.
- **Immediate Logo & Icon Display**: Instant reactive rendering of company logos and emojis in folder rows with zero latency.
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
