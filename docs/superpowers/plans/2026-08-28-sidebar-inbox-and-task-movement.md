# Sidebar Simplification, Inbox Routing & Task Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the left sidebar by removing redundant "Today" and "Starred" sections (keeping only "Inbox" and the folder tree), fix Inbox view switching so clicking Inbox filters and displays tasks from `Inbox.md` on the main canvas, and implement direct drag-and-drop task movement from List and Kanban views onto sidebar folders and note files.

**Architecture:** 
1. **Sidebar Streamlining (`Sidebar.tsx`):** Remove Today and Starred navigation buttons. Retain `Inbox` button with real-time active task counter badge.
2. **Inbox Selection & Isolation (`Sidebar.tsx` & `vaultStore.ts`):** When clicking Inbox, ensure `Inbox.md` is selected (auto-created at vault root if missing) and main canvas dynamically renders its tasks and updates the header to "📥 Inbox".
3. **Task Move Store Action (`vaultStore.ts`):** Create `moveTask(taskId, sourcePath, destPath)` to atomically delete the task from the source Markdown file and append it to the destination Markdown file.
4. **Drag-and-Drop Task Movement (`TaskRow.tsx`, `KanbanCard.tsx`, `FolderItem.tsx`):** Attach task drag payloads in `TaskRow` and `KanbanCard`. Add drag-over and drop handlers in `FolderItem` for both note files (`.md`) and directory nodes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Vitest, React Testing Library.

---

### Task 1: Store `moveTask` Action Across Markdown Files
- [ ] Step 1: Write failing unit tests for `moveTask` in `src/store/vaultStore.test.ts`
- [ ] Step 2: Run test to verify it fails (`npm test src/store/vaultStore.test.ts`)
- [ ] Step 3: Implement `moveTask` in `vaultStore.ts` and export in store types
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit changes

### Task 2: Sidebar Streamlining (Remove Today & Starred, Retain Inbox)
- [ ] Step 1: Write failing test in `Sidebar.test.tsx` ensuring Today and Starred are absent and Inbox navigates to `Inbox.md`
- [ ] Step 2: Run test to verify it fails (`npm test src/components/sidebar/Sidebar.test.tsx`)
- [ ] Step 3: Update `Sidebar.tsx` to remove Today & Starred, retain Inbox, and wire Inbox click to `Inbox.md`
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit changes

### Task 3: Drag-and-Drop Task Movement to Sidebar Folders & Notes
- [ ] Step 1: Write failing test in `src/components/sidebar/FolderItemTaskDrop.test.tsx`
- [ ] Step 2: Run test to verify it fails (`npm test src/components/sidebar/FolderItemTaskDrop.test.tsx`)
- [ ] Step 3: Make TaskRow and KanbanCard draggable with `application/json` payload and add drop listener to `FolderItem.tsx`
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit changes

### Task 4: Full Multi-Platform Verification
- [ ] Step 1: Run complete Vitest suite (`npm test`)
- [ ] Step 2: Run TypeScript check and production bundle (`npm run build`)
- [ ] Step 3: Run desktop backend check (`cargo check --manifest-path src-tauri/Cargo.toml`)
