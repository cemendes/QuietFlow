---
name: quietflow-contribution-workflow
description: Pre-flight checks, testing standards, conventional commit formats, and PR guidelines for contributing patches to QuietFlow.
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
