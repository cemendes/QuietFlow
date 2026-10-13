# Comprehensive UI Testing & Systematic Bug Hunt Design

## 1. Overview & Objectives

QuietFlow has developed into a multi-paradigm local-first productivity tool featuring:
1. Unified TipTap WYSIWYG notes editor with raw markdown source toggle (`Cmd+/`).
2. Split-Lens Document Canvas (Split View, Notes Only, Tasks Only).
3. Full-page Task Detail Canvas with subtasks, comments, and activity tracking.
4. Focus Header, Kanban boards, and Task Lists.
5. Project folder hierarchy, sidebar navigation, and context actions.
6. System dialogs (Quick Capture, Quick Switcher, Settings, Version History, Zen Theater).

As features have expanded, regressions, pointer overlay blocks (such as the window drag region intercepting clicks), and state desynchronizations can occur. The goal of this initiative is to create an **Autonomous UI Testing & Bug-Hunting Harness** using Playwright that clicks every single button, tests every interactive feature in an isolated sandbox, captures screenshots and console logs, generates a prioritized punch list of defects, and systematically remediates them.

---

## 2. Architecture & Sandbox Isolation

### 2.1 Isolated Test Vault Sandbox (`tests/fixtures/seed-vault.ts`)
To adhere to **Rule 3 (Storage & Vault Standards: Local-First & Non-Destructive)**, the crawler must never run destructive actions (delete note, delete task, rename folder) against the user's real Google Drive vault (`QuietFlowVault`).

Before the crawler executes, a deterministic sandbox vault is seeded in a temporary location (e.g. `/tmp/quietflow-test-vault`):
- Multiple project folders (`01 - Projects`, `02 - Areas`, `03 - Archive`).
- Sample markdown notes with YAML frontmatter, headings, mixed lists (tasks and bullets), and prose.
- Pre-existing tasks across statuses (`todo`, `in_progress`, `done`) with priorities, tags, subtasks, and timestamped comments.
- Test assets to verify folder icon and color selection.

### 2.2 Playwright Autonomous Runner (`tests/e2e/comprehensive-ui-audit.spec.ts`)
The runner connects to the local Tauri webview server (`http://localhost:1420`).
- **Global Error Sentry**:
  - Listens to `page.on('pageerror')` to trap unhandled JavaScript exceptions and React render crashes.
  - Listens to `page.on('console')` to capture `console.error` and `console.warn` occurrences (e.g. missing React keys, invalid CSS, IPC rejections).
- **Pointer Interaction Probe (`probeAction`)**:
  - Checks element visibility and hit-testing readiness.
  - Dispatches native user clicks / keystrokes.
  - Verifies DOM response and store updates.
  - Automatically captures high-resolution screenshots before and after state changes.

---

## 3. The 7-Area Interaction Matrix

The runner is partitioned into 7 modular suites covering the entire user journey:

### Suite 1: Sidebar & Vault Navigation
- **"My Vault" Button**: Click to load all vault tasks in `TaskList`.
- **"Inbox" Button**: Click to filter tasks to the Inbox scope.
- **Folder Expansion & Collapse**: Click folder chevron toggles; verify expansion state persistence.
- **New Project Button (`+`)**: Click create project button, submit new folder name, verify folder appears in tree and **does not** expand other collapsed folders.
- **Folder Context Menu (Right-Click)**:
  - Rename Folder: open prompt, submit new name, verify tree update.
  - Add Note: open prompt, create note, verify selection.
  - New Subfolder: create nested subfolder.
  - Choose Folder Icon: open emoji picker, select icon, verify rendered in sidebar.
- **Note Items & Note Context Menu**:
  - Note click: switch active document in canvas.
  - Right-click menu: Rename, Version History, Delete Note.
- **Sidebar Layout Controls**:
  - Collapse / expand toggle button (`sidebar-toggle-btn`).
  - Drag handle column resize.

### Suite 2: Top Focus Header & Global Controls
- **QuickAddBar**:
  - Text input typing and submit via Enter.
  - Date picker button: set due date, verify date chip, clear date.
  - Tag autocomplete: type `#`, verify autocomplete dropdown, select tag.
  - Cursor autofocus verification after adding task.
- **Focus Buckets**:
  - Click "All Tasks", "Now Only", and "Backlog" filter buttons; verify filtered task counts.
- **View Switcher**:
  - Toggle between Document Lens (`Cmd+1`), Task List (`Cmd+2`), and Kanban (`Cmd+3`).
- **Search & Tag Filter**:
  - Search input filtering tasks and notes in real time.

### Suite 3: Task List View
- **Task Row Actions**:
  - Status checkbox toggle (todo -> done -> todo) with completion animation.
  - Priority chip cycle (none -> low -> med -> high -> urgent).
  - Due date popover interaction.
  - Tag chips display and filtering.
- **Navigation**:
  - Click task title: navigates to full-page `TaskDetailPage`.
- **Bottom Inline Quick Add**:
  - Enter task at the bottom of the list; verify immediate inclusion.

### Suite 4: Kanban Board View
- **Column Controls**:
  - Column "+ Add Task" button in Backlog, To Do, In Progress, Done.
  - WIP Limit indicators and badges.
- **Drag-and-Drop Interaction**:
  - Drag card across columns; verify status update in store and markdown file.
- **Card Click Navigation**:
  - Click Kanban card; verify full-page `TaskDetailPage` mounts.

### Suite 5: Split-Lens Document Canvas & TipTap WYSIWYG
- **Lens Switcher Pills**:
  - Toggle [ ✨ Split View | ✅ Tasks Only | 📝 Notes Only ].
  - Verify auto-adaptive lens default on 0-task or 0-prose documents.
- **Document Task Cards**:
  - Inline checkbox toggle, title editing, priority cycle, delete task card.
  - Quick add task directly to document.
- **TipTap WYSIWYG Toolbar**:
  - Formatting buttons: Bold, Italic, H1, H2, H3, Bullet List, Numbered List, Task Checkbox, Blockquote, Inline Code, Link.
  - "Add Today's Date" button: verifies prepended `## YYYY-MM-DD` and autofocus in section.
  - Mixed lists: indent child bullet under task, indent child task under bullet, convert child task to bullet without altering parent task.
- **Raw Markdown View Source Toggle**:
  - Click `toolbar-source-toggle-btn` or press `Cmd+/`: verify switch to raw textarea and back with 100% two-way fidelity.

### Suite 6: Task Detail Full-Page Canvas
- **Header & Navigation**:
  - "<- Back to List", "Back to Note", "Back to Kanban" button clicks (verifying no drag-region interference).
  - "Mark as Done" toggle badge.
  - "Delete Task" button with confirmation.
- **Metadata Fields**:
  - Inline editable task title.
  - Priority dropdown, due date selector, tags management.
- **Task-Specific Notes**:
  - Rich-text editor for task notes; autosave and flush-on-blur.
- **Subtasks Hierarchy**:
  - Add subtask, toggle subtask checkbox, delete subtask.
- **Activity Log & Comments**:
  - Add activity comment, verify author ("You") and formatted timestamp.
- **Breadcrumbs**:
  - Click folder or file breadcrumb link to navigate back.

### Suite 7: Modals, Shortcuts & Overlays
- **Quick Capture Modal (`Cmd+Shift+C`)**:
  - Open modal, type task title with tags and priority, submit, verify task saved.
- **Quick File Switcher (`Cmd+O` / `Cmd+K`)**:
  - Search notes, navigate with arrow keys, press Enter to open note.
- **Settings Modal (`Cmd+,`)**:
  - AI & Magic Slicer tab: API key input.
  - Snapshots & Swap tab: snapshot retention settings.
  - Theme & Colors tab: switch between Sand, Olive, and Slate themes.
  - About & Status tab: verify version number and build timestamp.
- **Version History Modal**:
  - Inspect note snapshot revisions and preview restore.
- **Zen Theater Focus Modal**:
  - Open modal, toggle timer presets (5m, 15m, 25m), press Esc to exit.

---

## 4. Defect Classification & Punch List Output

All test outcomes and anomalies are written to `test-results/audit-punch-list.md`:

- **🔴 P0: Blocker (Crash / Unhandled Exception)**:
  - Uncaught page error, React Error Boundary mount, or broken application state.
- **🟠 P1: Broken Interaction (Dead Click / Hit-Test Blocked)**:
  - Button clicked but expected action/transition did not occur (e.g. click swallowed by invisible overlay).
- **🟡 P2: Console Warning / IPC Error**:
  - `console.error` logged or unexpected warning emitted during interaction.
- **🔵 P3: Visual / Layout Glitch**:
  - Element clipping, horizontal overflow, or misaligned typography.

Each entry includes:
1. Issue ID and severity.
2. Functional area & step-by-step reproduction path.
3. DOM selector and element label.
4. Expected behavior vs. actual behavior.
5. Screenshot file reference.
6. Captured console logs or error stack traces.

---

## 5. Systematic Remediation Workflow

1. **Review & Prioritize**: Present the punch list to Eduardo with visual screenshot artifacts.
2. **TDD Remediation**:
   - For each defect, create or update a deterministic unit/integration test in `tests/`.
   - Implement the targeted fix in the relevant component or store.
   - Verify the regression test passes.
   - Cleanly restart the Tauri local dev server (`npm run tauri dev`) per Rule 9.
3. **Re-Test Sweep**: Re-run the specific audit suite to verify resolution.
4. **Final Multi-Layer Preversion Gatekeeper**: Run `npm run test:rust`, `npm run test`, and `npm run test:autonomous`.
5. **Changelog**: Log every resolved bug under `## [Unreleased] -> ### Fixed` in `CHANGELOG.md`.
