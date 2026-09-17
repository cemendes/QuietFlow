# Changelog

All notable changes to QuietFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Unified WYSIWYG Notes Editor (`MarkdownEditor.tsx`)**:
  - Unified Typora/Notion-style WYSIWYG notes editor with TipTap, markdown input shortcuts, and View Source toggle (`Cmd+/`).
- **View Source Raw Markdown Toggle & Shortcut (`MarkdownEditor.tsx`)**:
  - Added a "View Source" toggle button (`toolbar-source-toggle-btn`) with dynamic tooltips `View Markdown Source (Cmd+/)` and `View Rich Text (Cmd+/)`.
  - Added `Cmd+/` / `Ctrl+/` keyboard shortcut to seamlessly toggle between TipTap WYSIWYG rich text editing and raw markdown `<textarea>` editing.
  - Full two-way content synchronization between WYSIWYG ProseMirror document model and raw markdown source view.
  - Automatically disables formatting toolbar controls in raw markdown mode to prevent mismatched formatting operations.
- **Markdown Action Toolbar & Extended Syntax Support (`MarkdownEditor.tsx`)**:
  - Top formatting action toolbar equipped with quick-apply controls for Bold, Italic, Headings (H1, H2, H3), Bullet Lists, Numbered Lists, Task Checkboxes, Inline Code, Blockquotes, and Link Embeds.
  - Extended markdown and HTML preview parsing supporting headings (`#` through `######`), HTML headings (`<h1>` through `<h6>`), blockquotes (`> `), fenced code blocks, bullet lists, numbered lists, task checkboxes, inline code, bold, italic, strikethrough, and auto-linked URLs.
  - Smart link paste handler: automatically detects valid URLs on clipboard when text is selected in the note editor and wraps the selection into `[selectedText](url)`.
- **Paradigm A: The Lens Document Canvas (`LensDocumentCanvas.tsx`)**:
  - Dual-Zone Document Canvas for customer and project notes (`Acme Corp.md`) hosting actionable task cards at the top and freeform markdown prose notes below.
  - 3-Way Lens view switcher pills (`[ ✨ Split View | ✅ Tasks Only | 📝 Notes Only ]`) with instant view switching.
  - Auto-Adaptive Lenses: automatically defaults to Notes Only for 0-task docs and Tasks Only for 0-prose docs.
  - Soft Hoisting: frictionless note-taking with local edit buffering, debounced auto-saving, and synchronous flush-on-blur without cursor jumping.
  - Non-destructive task serializer (`patchTaskInDocumentContent`) maintaining exact line bounds and surrounding prose byte-for-byte.
- **Cognitive Re-entry State Engine**:
  - Per-document view memory retaining active lens mode, scroll position, and cursor across file switching.
  - Session state persistence: preserves `quietflow-last-active-file` and `quietflow-last-active-folder` across app restarts, resuming the exact folder, note, and active scope where the user left off instead of resetting to top.
- **Quick File Switcher (`QuickFileSwitcher.tsx`)**:
  - Spotlight modal triggered via `Cmd+O` for rapid fuzzy searching across customer folders and notes with arrow key navigation.
- **Contextual Keyboard Shortcuts**:
  - `Cmd+O`: opens Quick File Switcher.
  - `Cmd+E`: cycles active document lens modes (`Split` $\rightarrow$ `Tasks Only` $\rightarrow$ `Notes Only`).
- **Cross-View Note Backlinks**:
  - Document note badges on `TaskRow` and `KanbanCard` enabling 1-click navigation directly into the parent document canvas.
- **OpenWiki Knowledge Base & Automated Sync Workflow**:
  - Full 15-page grounded architectural and operational documentation under `openwiki/`.
  - Added `.github/workflows/openwiki-update.yml` for automated documentation updates on merge and scheduled cron.
  - Added `AGENTS.md` evidence index for coding agent navigation.

- **Build Date & Time in Settings**:
  - Added formatted build timestamp (`Build Date & Time`) to the Preferences "About & Status" panel.
  - Injected `__APP_VERSION__` global definition in `vite.config.ts` directly from `package.json` to keep frontend version metadata unified.
- **Development All-Desktops Window Visibility**:
  - Automatically enables `set_visible_on_all_workspaces(true)` in Rust debug builds on macOS (`npm run tauri dev`), allowing the development window to seamlessly follow across all Mission Control Desktops/Spaces without requiring an installed `.app` bundle.
  - Stripped out at compile time from production release builds (`debug_assertions = false`) to keep standard window lifecycle behavior intact.

### Changed
- **Unified Live-Editing Canvas (`MarkdownEditor.tsx`)**:
  - Merged separate Edit and Preview tabs into a single live-editing canvas with persistent CommonMark vault serialization.
- **Split View Reorder & Proportions (Notes 2/3 Left, Tasks 1/3 Right)**:
  - Reordered the side-by-side split layout in [LensDocumentCanvas.tsx](file:///Users/cemolive/code/quietflow/src/components/document/LensDocumentCanvas.tsx) so that the active note editor occupies 2/3 of the screen on the left (`lg:w-2/3`) and task action items occupy 1/3 on the right (`lg:w-1/3`).
  - Removed the rigid `max-w-[850px]` canvas container constraint in [LensDocumentCanvas.tsx](file:///Users/cemolive/code/quietflow/src/components/document/LensDocumentCanvas.tsx), allowing the document typing space to dynamically expand edge-to-edge with the window with independent scroll areas.
  - Updated [MarkdownEditor.tsx](file:///Users/cemolive/code/quietflow/src/components/editor/MarkdownEditor.tsx) container and textarea with `flex-1 min-h-0 h-full` so the typing area stretches to the bottom of the viewport.

### Fixed
- **Project Logos Rendering**:
  - Fixed broken `asset://` URI image loading in [logoService.ts](file:///Users/cemolive/code/quietflow/src/services/logoService.ts) by loading `.logos/` files via `ipc.readFile` as base64 data URIs.
  - Integrated project logos into the [LensDocumentCanvas.tsx](file:///Users/cemolive/code/quietflow/src/components/document/LensDocumentCanvas.tsx) note header breadcrumb bar with error fallbacks.
  - Fixed JSX syntax bug in [FolderItem.tsx](file:///Users/cemolive/code/quietflow/src/components/sidebar/FolderItem.tsx).
- **React Rules of Hooks Invariant in Canvas**:
  - Hoisted `folderIcon` hook declarations before conditional returns in [LensDocumentCanvas.tsx](file:///Users/cemolive/code/quietflow/src/components/document/LensDocumentCanvas.tsx), preventing hook count mismatch errors during empty-to-active canvas transitions.
- **Note Name Input Character Overwrite**:
  - Fixed an issue in [FolderItem.tsx](file:///Users/cemolive/code/quietflow/src/components/sidebar/FolderItem.tsx) and [FolderContextMenu.tsx](file:///Users/cemolive/code/quietflow/src/components/sidebar/FolderContextMenu.tsx) where an inline callback ref invoked `input.select()` on every keystroke re-render, causing sequential characters to replace one another.
  - Replaced inline callback refs with mount-only `useEffect` selection hooks that select the prefilled name once on creation, allowing uninterrupted sequential typing.
- **Preferences Header Version Synchronization**:
  - Fixed a version discrepancy where the Preferences modal header pill displayed a hardcoded `QuietFlow v0.1.0-alpha.3` while the About panel reported `v0.1.0-alpha.5`.
  - Replaced hardcoded strings across `SettingsModal`, `UpdateToast`, and updater mocks with the reactive, centralized `appVersion` state.
- **Window Dragging Inconsistency Across Views**:
  - Implemented a universal top window drag region (`data-tauri-drag-region`) in [App.tsx](file:///Users/cemolive/code/quietflow/src/App.tsx) across the main canvas.
  - Added `data-tauri-drag-region` to the header and empty state of [LensDocumentCanvas.tsx](file:///Users/cemolive/code/quietflow/src/components/document/LensDocumentCanvas.tsx) and navigation header in [TaskDetailPage.tsx](file:///Users/cemolive/code/quietflow/src/components/editor/TaskDetailPage.tsx).
  - Configured `-webkit-app-region: no-drag` in [index.css](file:///Users/cemolive/code/quietflow/src/index.css) for all interactive controls (buttons, inputs, links, textareas) inside draggable regions to prevent click event blocking on macOS.
  - Added comprehensive automated test suite `tests/e2e/window-drag-region.test.tsx` verifying draggable headers across all views.
- **Note Selection Freeze & Watcher Loop**:
  - Fixed infinite disk write loop in `saveDocumentProse` that duplicated task blocks upon save/blur.
  - Resolved `App.tsx` auto-initialization loop by stabilizing `useEffect` mount dependencies.
  - Replaced side-effect lens evaluation with pure reactive derivation during render.
- **Application Resilience & Error Boundaries**:
  - Added global and document canvas `ErrorBoundary` component to prevent white screen unmounting during render edge cases.
  - Normalized YAML frontmatter tags and added defensive array coercion across document tasks and AST components.

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
