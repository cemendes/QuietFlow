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
