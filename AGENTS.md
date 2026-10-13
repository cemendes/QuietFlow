<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

# QuietFlow Agent Development Invariants & Rules

## 1. Versioning & Release Governance
- **Never Auto-Bump**: NEVER bump version numbers (`package.json`, `Cargo.toml`, `tauri.conf.json`) or create version tags (`v*`) without asking the user for explicit confirmation first.
- **Release Triggering**: Releases are strictly triggered by version tags (`git tag vX.Y.Z`). Routine code pushes to `main` must NOT trigger production release builds.
- **Confirmation Prompt**: Always prompt the user after fixing bugs or implementing features: *"Would you like to bump the version and publish a new release now, or continue making changes under the current version?"*

## 2. Changelog Maintenance (`CHANGELOG.md`)
- Maintain `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standards.
- Every bugfix, feature addition, or behavior change must be documented under `## [Unreleased]` categorized by:
  - `### Added`
  - `### Changed`
  - `### Fixed`
- When the user approves a version bump, convert `[Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.

## 3. Storage & Vault Standards
- **Default Location**: Fresh vault initializations MUST default to `$HOME/Documents/QuietFlowVault`.
- **Local-First & Non-Destructive**: Never perform destructive operations on vault markdown files. In-place app upgrades or uninstalls must preserve all user vaults and settings.

## 4. Tauri Desktop Development Invariants
- **HTML5 Drag-and-Drop**: In Tauri 2.0 applications with internal drag-and-drop (e.g., Kanban boards, moving tasks between folders/notes), `"dragDropEnabled": false` MUST be explicitly declared in `tauri.conf.json` (`app.windows[].dragDropEnabled`) so the webview does not swallow DOM drag/drop events.
- **Event Propagation**: All nested drop targets (e.g. folders and files) must call `e.stopPropagation()` in `onDrop` and `onDragEnter` to prevent double-firing on parent containers.

## 5. Autonomous Verification Invariant
- **Zero-Manual-Testing Gate**: Do not rely on asking the user to manually verify feature additions or navigation flows. Build autonomous, deterministic integration and E2E test suites (`tests/e2e/*.test.tsx`) using Vitest, React Testing Library, and Playwright.
- **Playwright Menu & View State Crawler**: All new menus, view toggles, dialogs, and navigation states must be integrated into `tests/e2e/autonomous-menu-crawler.spec.ts` (`npm run test:autonomous`) to verify exhaustive coverage without unhandled console errors or runtime crashes.

## 6. Markdown Task Specification & Notes Engine
- **Standard Format**: Tasks support nested subtasks, unstructured notes, and timestamped activity comments:
  - Subtasks: `  - [ ] <title>` or `  - [x] <title>`
  - Notes: `  - Notes: <text>`
  - Comments: `  - Comment (<author>, <timestamp>): <text>` (defaults author to 'You' if omitted)
- **Serialization Preservation**: All updates to task status, tags, priority, notes, subtasks, and comments must be non-destructive to surrounding markdown content, prose paragraphs, and headings.

## 7. Vault Snapshots & Swap Safety Engine
- **Pre-Write Snapshots**: All atomic note writes (`write_file_atomic`) MUST capture a previous version snapshot in `<vault>/.quietflow/snapshots/<relative_path>/<unix_timestamp>.md` (rate-limited to at most once every 2 minutes per file).
- **Rolling Retention & Pruning**: Enforce a maximum of 20 snapshots per note and auto-prune snapshots older than 14 days on startup/write.
- **Hidden Storage**: The `.quietflow/` directory must always be ignored by vault directory scanners (`scan_directory_tree`) so backups never clutter user note counts.
- **Proactive Corruption Guard**: If a note opens with 0 bytes or unparseable corruption, the UI must display a recovery banner allowing 1-click snapshot restore.

## 8. Multi-Layer Preversion Gatekeeper
- **Never Skip Test Layers**: Before bumping versions or creating release tags, run `npm run preversion` to verify:
  1. Rust backend tests (`npm run test:rust` / `cargo test`)
  2. Vitest unit, component, fuzzing, and corruption simulation tests (`npm run test`)
  3. Playwright autonomous menu and state crawler (`npm run test:autonomous`)

## 9. Local Development Server Lifecycle
- **Always Restart After Changes**: Whenever frontend or backend code changes are made (especially state stores, IPC, or UI components), cleanly restart the local development server (`npm run tauri dev`). Never leave a stale Vite server running across code edits, which causes HMR desynchronization and data loading failures (such as tasks failing to load from the vault).

