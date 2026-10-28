# Tasks Home & Section Folders Implementation Plan

> Steps use checkbox (`- [ ]`) syntax for tracking. TDD per task: failing test → confirm it fails → implement → confirm it passes → commit.

**Goal:** Give the Tasks section the same shape the Notes section already has — a landing grid of cards ("Todas as listas") scoped by the sidebar folder, where a card opens the item — and stop the two sections from sharing files by splitting the vault into `Tarefas/` and `Anotações/`.

**Decisions (Rogério, 2026-10-28):**
- In scope: Tasks landing grid. Out of scope for now: read-first/Edit mode on `TaskDetailPage`, "New folder" in the Tasks sidebar.
- Storage: separate section folders inside the vault (`<vault>/Tarefas/`, `<vault>/Anotações/`). Each section only ever sees its own folder.

**Tech Stack:** React, TypeScript, Zustand, Tailwind, Vitest + RTL, Playwright, Cypress smoke.

## Global Constraints
- Non-destructive Markdown: nothing in `parser.ts` / `serializer.ts` changes. Migration only *moves* files (`ipc.moveEntry`); it never rewrites their content.
- Palette: reuse the classes `NotesHome` already uses (sand / forest / terracotta). No new colors.
- Folder names on disk are fixed constants (`Tarefas`, `Anotações`) and do not follow the UI language, so switching language never "loses" a section.
- No version bump.

## Target architecture

```
<vault>/
├── Tarefas/            ← Tasks section root (sidebar tree, TasksHome, QuickCapture)
│   ├── Inbox.md        ← landing list for QuickCapture (moved from <vault>/Inbox.md)
│   └── <folders>/<lists>.md
├── Anotações/          ← Notes section root (sidebar tree, NotesHome, "Nova anotação")
└── .quietflow/         ← untouched (snapshots, config)
```

| | Notes (today) | Tasks (after) |
|---|---|---|
| Landing screen | `NotesHome` — grid of note cards | `TasksHome` — grid of list cards (name, folder, open/done counts, delete w/ confirm) |
| Sidebar root button | `selectNoteFolder(notesRoot)` | `selectTaskFolder(tasksRoot)` → grid |
| Sidebar folder click | `selectNoteFolder(path)` → grid filtered | `selectTaskFolder(path)` → grid filtered |
| Card click | `openNote(path)` → `LensDocumentCanvas` | `openTaskList(path)` → `TaskList` / `KanbanBoard` of that file |
| Create | "Nova anotação" (sidebar) → `Anotações/` | "Nova lista" button in the grid header → `Tarefas/<folder>/` |
| Aggregate view | — | "Ver todas as tarefas" button in the grid header → existing `selectFolder(scope)` list (keeps Focus buckets working across lists) |

## Migration (one-time, on `loadVault`)

Runs only when **neither** `Tarefas/` nor `Anotações/` exists yet (i.e. the first launch after this change). Pure planner + thin executor so the rule is unit-testable:

- Root-level `.md` file with ≥1 checklist task → `Tarefas/`; otherwise → `Anotações/`.
- Root-level folder: whole folder moves (never split). If any `.md` inside has a task → `Tarefas/`, else → `Anotações/`.
- Hidden entries (`.quietflow`, `.git`, …) and non-`.md` files stay where they are.
- Name collision at the destination → keep the file in place and log a warning (no overwrite, no rename).
- Afterwards, create whichever section folder is still missing, and `Tarefas/Inbox.md` if absent.

Known side effect: snapshot history is keyed by relative path, so moved files start a fresh history chain (old snapshots remain on disk in `.quietflow/`).

---

### Task 1: Section folder helpers
**Files:** Create `src/core/vault/sections.ts`, `src/core/vault/sections.test.ts`
- [ ] `SECTION_FOLDERS = { tasks: 'Tarefas', notes: 'Anotações' }`
- [ ] `sectionRoot(vaultPath, section)`, `sectionOfPath(path, vaultPath): AppSection | null` (separator-aware, reuse `utils/paths`)
- [ ] `sectionSubtree(tree, vaultPath, section): VaultNode | null`
- [ ] Tests: Windows `\` and `/` paths, nested paths, paths outside both sections.

### Task 2: Migration planner + executor
**Files:** Create `src/core/vault/migrateSections.ts`, `src/core/vault/migrateSections.test.ts`
- [ ] `planSectionMigration(tree, readFile) → Promise<{ from, to }[]>` implementing the rules above
- [ ] `runSectionMigration(vaultPath, tree, ipc)` — no-op when either section folder exists; skips collisions
- [ ] Tests: task file → Tarefas, prose-only file → Anotações, folder with one task file moves whole to Tarefas, hidden dirs untouched, collision skipped, second run is a no-op, file content byte-identical after move.

### Task 3: Store — section-scoped navigation
**Files:** Modify `src/store/vaultStore.ts`, `src/store/types.ts`, `src/store/vaultStore.test.ts`, `tests/unit/section-separation.test.tsx`
- [ ] `loadVault`: run migration, ensure folders + `Tarefas/Inbox.md`, refresh tree; notes selection defaults to `notesRoot`, tasks selection defaults to `tasksRoot` (grid), not Inbox
- [ ] New actions `selectTaskFolder(path | null)` (no file, no tasks loaded — mirrors `selectNoteFolder`) and `openTaskList(filePath)` (sets section `tasks`, `activeView: 'list'`, `selectFile`)
- [ ] `setSection('tasks')` with no remembered file → `selectTaskFolder(rememberedFolder ?? tasksRoot)`
- [ ] Tests for each, plus "switching sections never shows the other section's files".

### Task 4: Mock vault layout
**Files:** Modify `src/store/ipc.ts` (`seedDefaultMockFiles`)
- [ ] Seed under `/MockVault/Tarefas/…` (today.md, Customers/…) and add one prose note under `/MockVault/Anotações/` so the browser dev server shows both sections populated.

### Task 5: `TasksHome` component
**Files:** Create `src/components/tasks/TasksHome.tsx`, `src/components/tasks/TasksHome.test.tsx`; modify `src/components/tasks/index.ts`, `src/i18n/en.ts`, `src/i18n/pt-BR.ts`
- [ ] Extract the card + inline delete-confirm markup from `NotesHome` into `src/components/common/HomeCard.tsx`; `NotesHome` uses it unchanged visually (its tests must still pass)
- [ ] Grid of lists under the selected task folder; each card: display name (`formatDateName`), folder label, "N abertas · M concluídas" (read + parse each file; recompute when `vaultTree` changes)
- [ ] Header: title ("Todas as listas" or folder name), count, "Nova lista" (creates `Nova lista[ N].md` in the current folder and opens it), "Ver todas as tarefas"
- [ ] Empty state mirrors NotesHome
- [ ] i18n keys: `tasksHome.allLists`, `tasksHome.count`, `tasksHome.empty`, `tasksHome.newList`, `tasksHome.newListName`, `tasksHome.viewAll`, `tasksHome.openDone`, `tasksHome.deleteList`, `tasksHome.deleteConfirm`
- [ ] Tests: renders one card per list in scope, folder filter, counts, open card → `openTaskList`, delete confirm → `deleteEntry`, new list created in current folder.

### Task 6: Wire into App, Sidebar and pickers
**Files:** Modify `src/App.tsx`, `src/components/sidebar/Sidebar.tsx`, `src/components/capture/QuickCaptureModal.tsx`, `src/components/document/QuickFileSwitcher.tsx`, related tests
- [ ] `App`: tasks branch renders `TasksHome` when no `activeFile` and the tasks scope is a folder selected via `selectTaskFolder`; list/kanban/detail otherwise. `handleNewNote` creates inside `Anotações/`
- [ ] `Sidebar`: `FolderTree` gets `sectionSubtree(...)` for the current section; root button / folder clicks call `selectTaskFolder` in Tasks; "Nova pasta" creates inside `Anotações/`; collapsed icons use the section subtree
- [ ] `TaskList` / `KanbanBoard` header: back link "← Todas as listas" when a single file is open
- [ ] `QuickCaptureModal`: file picker lists only `Tarefas/` files, defaults to `Tarefas/Inbox.md`
- [ ] `QuickFileSwitcher`: opens task files with `openTaskList`, note files with `openNote` (via `sectionOfPath`)

### Task 7: E2E + full verification
**Files:** Modify `tests/e2e/*.test.tsx` that assume root paths, `cypress/e2e/smoke.cy.ts`, `tests/e2e/playwright-user-journey.spec.ts`
- [ ] Update path fixtures to the new layout; add a journey: Tarefas → grid → open list → add task → back → card counts updated
- [ ] `npm test`, `npm run build`, `cargo check --manifest-path src-tauri/Cargo.toml`, Playwright, preview check in the browser
