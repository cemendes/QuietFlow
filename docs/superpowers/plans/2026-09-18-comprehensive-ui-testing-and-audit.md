# Comprehensive UI Testing & Systematic Bug Hunt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an exhaustive autonomous UI testing harness that tests every button, menu, input, modal, and view transition in QuietFlow within an isolated test vault, captures screenshots and error logs, compiles an actionable punch list of bugs, and systematically resolves every issue found.

**Architecture:** 
- A test sandbox generator (`tests/fixtures/seed-vault.ts`) seeds an isolated test vault in `/tmp/quietflow-test-vault` with rich test fixtures (folders, notes, frontmatter, tasks, subtasks, comments).
- A comprehensive Playwright test suite (`tests/e2e/comprehensive-ui-audit.spec.ts`) iterates through 7 functional suites, probing every UI element, checking pointer interception, asserting view changes, and logging all runtime errors/unhandled rejections.
- An automated audit collector generates `test-results/audit-punch-list.md` with screenshot evidence, categorized into P0 (blockers), P1 (broken interactions), P2 (console errors), and P3 (visual glitches).
- A systematic TDD remediation loop addresses each defect one-by-one, followed by dev server restarts and full regression checks.

**Tech Stack:** Playwright Chromium, Vitest, React Testing Library, TypeScript, Tailwind CSS, TipTap WYSIWYG, Tauri v2.

**Spec:** [`docs/superpowers/specs/2026-09-18-comprehensive-ui-testing-and-audit-design.md`](file:///Users/cemolive/code/quietflow/docs/superpowers/specs/2026-09-18-comprehensive-ui-testing-and-audit-design.md)

## Global Constraints
- Never auto-bump versions or create git tags without explicit confirmation ([Rule 1](file:///Users/cemolive/code/quietflow/AGENTS.md#1-versioning--release-governance)).
- Storage & Vault Standards: Isolated test sandbox MUST be used for mutative/destructive crawler actions so user's real Google Drive vault is never touched ([Rule 3](file:///Users/cemolive/code/quietflow/AGENTS.md#3-storage--vault-standards)).
- HTML5 Drag-and-Drop: `"dragDropEnabled": false` in `tauri.conf.json`, `e.stopPropagation()` on nested drop targets ([Rule 4](file:///Users/cemolive/code/quietflow/AGENTS.md#4-tauri-desktop-development-invariants)).
- Cleanly restart local development server (`npm run tauri dev`) after every code fix ([Rule 9](file:///Users/cemolive/code/quietflow/AGENTS.md#9-local-development-server-lifecycle)).
- Maintain `CHANGELOG.md` under `## [Unreleased]` ([Rule 2](file:///Users/cemolive/code/quietflow/AGENTS.md#2-changelog-maintenance-changelogmd)).

---

### Task 1: Isolated Test Vault Sandbox Generator

**Files:**
- Create: `tests/fixtures/seed-vault.ts`
- Test: `tests/unit/seed-vault.test.ts`

**Interfaces:**
- Produces: `createTestVault(baseDir?: string): Promise<{ vaultPath: string, cleanup: () => Promise<void> }>`

- [ ] **Step 1: Write failing unit test for `seed-vault.ts`**

```typescript
// tests/unit/seed-vault.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTestVault } from '../fixtures/seed-vault';

describe('createTestVault', () => {
  let cleanupFn: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanupFn) {
      await cleanupFn();
      cleanupFn = null;
    }
  });

  it('generates an isolated test vault with project folders and markdown notes', async () => {
    const { vaultPath, cleanup } = await createTestVault();
    cleanupFn = cleanup;

    expect(fs.existsSync(vaultPath)).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, '01 - Projects'))).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, '01 - Projects', 'Q4 Roadmap.md'))).toBe(true);
    
    const content = fs.readFileSync(path.join(vaultPath, '01 - Projects', 'Q4 Roadmap.md'), 'utf-8');
    expect(content).toContain('- [ ] Launch beta release');
    expect(content).toContain('  - Notes: Beta release checklist');
    expect(content).toContain('  - Comment (You, 2026-09-18 10:00): Ready for QA');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seed-vault.test.ts`
Expected: FAIL ("Cannot find module '../fixtures/seed-vault'")

- [ ] **Step 3: Implement `tests/fixtures/seed-vault.ts`**

Implement deterministic fixture generator creating:
- Folders: `01 - Projects`, `02 - Areas`, `03 - Archive`, `Inbox`
- Files: `Q4 Roadmap.md`, `Meeting Notes.md`, `Personal Goals.md` with tasks, subtasks, notes, comments, tags (`#work`, `#personal`, `#urgent`), and headings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seed-vault.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/seed-vault.ts tests/unit/seed-vault.test.ts
git commit -m "test: implement isolated test vault sandbox generator"
```

---

### Task 2: Core Audit Runner, Error Sentry & Reporter Infrastructure

**Files:**
- Create: `tests/e2e/comprehensive-ui-audit.spec.ts`
- Create: `tests/e2e/helpers/audit-reporter.ts`
- Modify: `package.json:14` (add script `"test:audit": "playwright test tests/e2e/comprehensive-ui-audit.spec.ts"`)

**Interfaces:**
- Produces: `AuditReporter` class with `recordElementTest(elementInfo)`, `logError(err)`, `saveScreenshot(page, name)`, `generateMarkdownReport(outputPath)`.

- [ ] **Step 1: Implement `tests/e2e/helpers/audit-reporter.ts`**

Provides structured tracking for:
- Elements tested (button, input, toggle, context menu)
- Captured console errors & unhandled page exceptions
- Before / after screenshot captures saved to `test-results/audit-screenshots/`
- Markdown report compilation to `test-results/audit-punch-list.md`

- [ ] **Step 2: Scaffold `tests/e2e/comprehensive-ui-audit.spec.ts` with Sentry listeners**

Attach `page.on('pageerror')` and `page.on('console')`, initialize test vault, configure 1280x850 viewport.

- [ ] **Step 3: Add `test:audit` script to `package.json`**

- [ ] **Step 4: Verify initial audit runner runs and exits cleanly**

Run: `npm run test:audit`
Expected: Passes with initial setup reporting 0 errors.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/helpers/audit-reporter.ts tests/e2e/comprehensive-ui-audit.spec.ts package.json
git commit -m "test: scaffold comprehensive UI audit runner and reporting sentry"
```

---

### Task 3: Suites 1 & 2 — Sidebar, Navigation, Focus Header & Global Controls

**Files:**
- Modify: `tests/e2e/comprehensive-ui-audit.spec.ts`

- [ ] **Step 1: Write Suite 1 tests (Sidebar & Navigation)**
  - Test "My Vault" button click and task loading.
  - Test "Inbox" button click.
  - Test folder chevron expansion / collapse.
  - Test "New Project" (+) button: open modal, create folder, assert existing collapsed folders do not expand.
  - Test folder context menu (right click): Rename, Add Note, New Subfolder, Choose Icon.
  - Test note item selection and note right-click context menu (Rename, Version History, Delete).
  - Test sidebar toggle button (`sidebar-toggle-btn`).

- [ ] **Step 2: Write Suite 2 tests (Top Focus Header & Global Controls)**
  - Test QuickAddBar: typing task title, date button, cursor autofocus, tag autocomplete.
  - Test Focus Buckets: "All Tasks", "Now Only", "Backlog" buttons.
  - Test View Switcher: Document Lens, Task List, Kanban view buttons.
  - Test Search & Tag Filter input.

- [ ] **Step 3: Run Suites 1 & 2 and record findings**

Run: `npx playwright test tests/e2e/comprehensive-ui-audit.spec.ts -g "Suite 1|Suite 2"`
Expected: Executes actions, logs any failures or console errors to report.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/comprehensive-ui-audit.spec.ts
git commit -m "test: implement Suite 1 and Suite 2 in comprehensive audit"
```

---

### Task 4: Suites 3 & 4 — Task List View & Kanban Board View

**Files:**
- Modify: `tests/e2e/comprehensive-ui-audit.spec.ts`

- [ ] **Step 1: Write Suite 3 tests (Task List View)**
  - Test task completion checkbox toggle (todo -> done -> todo).
  - Test priority chip cycling (none -> low -> med -> high -> urgent).
  - Test due date popover selection.
  - Test clicking task row title navigates to `TaskDetailPage`.
  - Test inline quick add at bottom of task list.

- [ ] **Step 2: Write Suite 4 tests (Kanban Board View)**
  - Switch to Kanban view (`aria-label="Kanban View"`).
  - Test column "+ Add Task" button in Backlog, To Do, In Progress, Done.
  - Test WIP Limit indicators.
  - Test card drag-and-drop between columns.
  - Test card click navigates to `TaskDetailPage`.

- [ ] **Step 3: Run Suites 3 & 4 and record findings**

Run: `npx playwright test tests/e2e/comprehensive-ui-audit.spec.ts -g "Suite 3|Suite 4"`
Expected: Executes actions, captures screenshots, logs any issues.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/comprehensive-ui-audit.spec.ts
git commit -m "test: implement Suite 3 and Suite 4 in comprehensive audit"
```

---

### Task 5: Suite 5 — Split-Lens Document Canvas & TipTap WYSIWYG Editor

**Files:**
- Modify: `tests/e2e/comprehensive-ui-audit.spec.ts`

- [ ] **Step 1: Write Suite 5 tests (Lens Switcher & Task Cards)**
  - Test lens switcher pills: Split View, Tasks Only, Notes Only.
  - Test document task card: checkbox toggle, title editing, priority cycle, quick add to document.

- [ ] **Step 2: Write Suite 5 tests (TipTap WYSIWYG Toolbar & Mixed Lists)**
  - Test toolbar buttons: Bold, Italic, H1, H2, H3, Bullet List, Numbered List, Task List, Blockquote, Code, Link.
  - Test "Add Today's Date" button: verifies `## YYYY-MM-DD` inserted and cursor focused.
  - Test hierarchical mixed list: convert child task to bullet, indent child bullet under parent task, verify parent task is NOT converted to bullet.
  - Test View Source toggle (`Cmd+/` or button): switch to raw markdown textarea and back, verify bidirectional content preservation.

- [ ] **Step 3: Run Suite 5 and record findings**

Run: `npx playwright test tests/e2e/comprehensive-ui-audit.spec.ts -g "Suite 5"`
Expected: Executes actions, captures editor state, logs issues.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/comprehensive-ui-audit.spec.ts
git commit -m "test: implement Suite 5 TipTap WYSIWYG and Lens Canvas in comprehensive audit"
```

---

### Task 6: Suites 6 & 7 — Task Detail Full-Page Canvas & Modals/Overlays

**Files:**
- Modify: `tests/e2e/comprehensive-ui-audit.spec.ts`

- [ ] **Step 1: Write Suite 6 tests (Task Detail Full-Page Canvas)**
  - Test header navigation buttons: "<- Back to List", "Back to Note", "Back to Kanban" (verifying no drag-region interference).
  - Test "Mark as Done" toggle badge.
  - Test "Delete Task" button.
  - Test inline editable title, priority dropdown, due date picker, tags tagger.
  - Test task-specific notes editor.
  - Test subtasks: add subtask, toggle subtask checkbox, delete subtask.
  - Test comments: write comment, submit, verify author ("You") and timestamp.
  - Test breadcrumb links.

- [ ] **Step 2: Write Suite 7 tests (Modals, Shortcuts & Overlays)**
  - Test Quick Capture modal (`Cmd+Shift+C`): open, enter task, submit, verify task saved.
  - Test Quick Switcher (`Cmd+O` / `Cmd+K`): search note, navigate with arrows, open.
  - Test Settings modal (`Cmd+,`): all tabs (AI & Slicer, Snapshots & Swap, Theme switcher, About & Status).
  - Test Version History modal: open from note menu, inspect snapshot revisions.
  - Test Zen Theater modal: toggle timer presets (5m, 15m, 25m), exit via Esc.

- [ ] **Step 3: Run Suites 6 & 7 and record findings**

Run: `npx playwright test tests/e2e/comprehensive-ui-audit.spec.ts -g "Suite 6|Suite 7"`
Expected: Executes actions, captures screenshots.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/comprehensive-ui-audit.spec.ts
git commit -m "test: implement Suite 6 and Suite 7 in comprehensive audit"
```

---

### Task 7: Execute Full Comprehensive Audit Sweep & Generate Punch List

**Files:**
- Output: `test-results/audit-punch-list.md`
- Output: `test-results/audit-screenshots/*.png`

- [ ] **Step 1: Run the full comprehensive audit suite**

Run: `npm run test:audit`
Expected: Executes all 7 suites (~80+ element actions), writes markdown punch list and screenshot directory.

- [ ] **Step 2: Analyze `test-results/audit-punch-list.md` and catalog all discovered defects**

Group discovered issues into P0 (blockers), P1 (broken interactions), P2 (console errors), P3 (visual/layout).

- [ ] **Step 3: Commit initial audit punch list and test runner**

```bash
git add test-results/audit-punch-list.md package.json
git commit -m "test: execute full UI audit and catalog discovered bugs"
```

---

### Task 8: Systematic Bug Remediation Loop

**Files:**
- Modify: Relevant application components in `src/components/` and stores in `src/store/`
- Test: Regression tests in `tests/`

- [ ] **Step 1: Fix all P0 Blockers & Crashes (if any)**
  - Write targeted unit/integration test.
  - Implement fix.
  - Restart local dev server (`npm run tauri dev`).
  - Verify test passes.

- [ ] **Step 2: Fix all P1 Broken Interactions (Dead clicks, event interception, bad state transitions)**
  - E.g., TipTap child bullet conversion altering parent task, empty task right panel behavior, new project folder tree expansion.
  - Write targeted test.
  - Implement fix.
  - Restart local dev server (`npm run tauri dev`).
  - Verify test passes.

- [ ] **Step 3: Fix all P2 Console Warnings & React Prop Errors**
  - E.g., missing keys, invalid event handler types.
  - Apply fixes, verify clean console logs during test run.

- [ ] **Step 4: Fix all P3 Visual / Layout Glitches**
  - Adjust styling, spacing, or truncation.

- [ ] **Step 5: Re-run full audit suite to verify 0 remaining defects**

Run: `npm run test:audit`
Expected: 100% of actions PASS, 0 P0/P1/P2 defects remaining in punch list.

- [ ] **Step 6: Commit all bug fixes**

```bash
git add src/ tests/
git commit -m "fix: systematically resolve all defects identified in UI audit"
```

---

### Task 9: Final Multi-Layer Verification Gatekeeper & Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run Rust backend test suite**

Run: `npm run test:rust`
Expected: PASS

- [ ] **Step 2: Run Vitest unit & integration test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 3: Run autonomous crawler test suite**

Run: `npm run test:autonomous`
Expected: PASS

- [ ] **Step 4: Update `CHANGELOG.md`**

Document all bugfixes under `## [Unreleased] -> ### Fixed`.

- [ ] **Step 5: Commit and cleanly restart local server**

```bash
git add CHANGELOG.md
git commit -m "docs: record audit bugfixes in changelog"
```
Restart Tauri dev server cleanly (`npm run tauri dev`).
