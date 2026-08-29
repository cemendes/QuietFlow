# QuietFlow Project Rules & Development Invariants

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
- **Zero-Manual-Testing Gate**: Do not rely on asking the user to manually verify feature additions or navigation flows. Build autonomous, deterministic integration and E2E test suites (`tests/e2e/*.test.tsx`) using Vitest and React Testing Library that verify the complete user path, state transitions, and disk serialization.

## 6. Markdown Task Specification & Comments
- **Standard Format**: Tasks must support nested subtasks, unstructured notes, and timestamped activity comments:
  - Subtasks: `  - [ ] <title>` or `  - [x] <title>`
  - Notes: `  - Notes: <text>`
  - Comments: `  - Comment (<author>, <timestamp>): <text>` (defaults author to 'You' if omitted)
- **Serialization Preservation**: All updates to task status, tags, priority, notes, subtasks, and comments must be non-destructive to surrounding markdown content and headings.

