---
name: quietflow-contribution-workflow
description: Pre-flight checks, testing standards, conventional commit formats, and interactive bug fix/PR lifecycle for QuietFlow.
---

# QuietFlow Contribution & Patch Workflow

Use this skill when preparing, reviewing, or verifying code changes and Pull Requests for QuietFlow.

## 1. The Mandatory 3-Step Pre-Flight Verification
Before committing or submitting a PR, every patch must pass all three checks cleanly:

```bash
# 1. Run all unit & component test suites (18+ suites)
npm test

# 2. Verify TypeScript types and production Vite bundle
npm run build

# 3. Verify Rust desktop backend compilation
cargo check --manifest-path src-tauri/Cargo.toml
```

## 2. Conventional Commit Syntax
Commits must follow the Conventional Commits specification:
- `feat(scope): add new feature or capability` (e.g. `feat(zen): add ambient circular glow`)
- `fix(scope): fix bug or unexpected behavior` (e.g. `fix(ring): resolve 100% SVG cap overlap`)
- `docs(scope): documentation or skill updates` (e.g. `docs: update ARCHITECTURE.md`)
- `test(scope): add or improve tests` (e.g. `test(slicer): add Gemini fallback unit test`)
- `chore(scope): dependencies or release bumping` (e.g. `chore(release): bump to v0.1.0-alpha.2`)

## 3. Pull Request Guidelines
- Always include automated unit/component tests for new features.
- If making UI changes, attach before/after screenshots to the PR description.
- Preserve neurodivergent accessibility invariants (Warm Sand `#FAF9F6` palette, zero cognitive clutter).

## 4. The Interactive Bug Fix & PR Lifecycle

When handling bug reports and fixes:
1. **Reproduce & Test**: Write a failing unit or E2E test in Vitest / Playwright before making source modifications.
2. **Implement & Verify**: Apply the fix and run the 3-step verification (`npm test`, `npm run build`, `cargo check`).
3. **Present Evidence First**: Present the passing test outputs and diffs to the user. Do NOT automatically bump versions or open PRs yet.
4. **User Confirmation Gate**: Ask the user: *"The bug is resolved and verified. Ready to bump version and create the PR?"*
5. **Version Bump & PR Creation**:
   - On approval, bump the patch / increment version across `package.json`, `Cargo.toml`, `tauri.conf.json`, and `SettingsModal.tsx` (e.g. `v0.1.0-alpha.1` $\rightarrow$ `v0.1.0-alpha.2`).
   - Create a feature branch: `git checkout -b fix/issue-name`.
   - Commit with Conventional Commits.
   - Use `gh pr create` to submit the Pull Request with a clear description and testing evidence.
