# Design Document: QuietFlow Sidebar Simplification, Inbox Routing & Task Drag-and-Drop Movement

**Date:** 2026-08-28  
**Status:** Approved by User  
**App Name:** **QuietFlow**  

---

## 1. Problem & Goals

1. **Redundant Sidebar Navigation:** With "Today / All Tasks / Focus Buckets" now built directly into the central header (`FocusHeader`), the sidebar items for `Today` and `Starred` create duplicate visual clutter.
2. **Inbox Isolation & View Switching:** Clicking `Inbox` on the sidebar must reliably filter and display only unfiled/inbox tasks from `Inbox.md` on the main canvas with a dedicated "📥 Inbox" header.
3. **Task Movement Friction:** Currently, tasks cannot be moved between notes or from the Inbox into specific project folders. Users need direct drag-and-drop capability from both List and Kanban views directly onto sidebar notes and folders.

---

## 2. User Experience & Architecture

### 2.1 Streamlined Sidebar Navigation
- **Top Quick Dock:** Retain ONLY `📥 Inbox` with an unread badge count of active inbox tasks.
- **Removed:** `Today` and `Starred` system items (since Today's Focus is always the default central view).
- **Body:** Full collapsible filesystem `📁 Folders` tree.
- **Footer:** `🗄️ Archive` and `⚙️ Settings`.

### 2.2 Inbox-Centric View Flow
- Clicking `📥 Inbox` in the sidebar:
  - If `Inbox.md` exists in the vault root, selects it as `activeFile` and renders its tasks.
  - If `Inbox.md` does not yet exist, auto-creates it with `---\ntitle: Inbox\n---\n\n# Tasks\n` and selects it.
  - The main canvas header updates cleanly to **"📥 Inbox"**.

### 2.3 Direct Task Drag-and-Drop Movement
- **Drag Source:**
  - Both `TaskRow` (in List View) and `KanbanCard` (in Kanban View) set drag data payload:
    `event.dataTransfer.setData('application/json', JSON.stringify({ type: 'task', taskId: task.id, sourceFilePath: task.filePath }))`.
- **Drop Target in Sidebar (`FolderItem.tsx`):**
  - **Dropping onto a Note File (`.md`):**
    - Calls new store action: `moveTask(taskId, sourceFilePath, destinationFilePath)`.
    - Atomically deletes the task from `sourceFilePath` and appends it to `destinationFilePath`.
    - Shows subtle emerald drop ring on the file item during hover.
  - **Dropping onto a Folder:**
    - Resolves the folder's primary note (e.g. `FolderName/FolderName.md` or the first `.md` file inside).
    - If empty, auto-creates `FolderName.md` inside that folder and moves the task into it.

---

## 3. Data Flow & Store Actions

### `useVaultStore.moveTask(taskId: string, sourcePath: string, destPath: string)`
1. Optimistically updates `tasks` in memory (reassigning `task.filePath = destPath`).
2. Reads `sourcePath`, removes the task line + associated notes/subtasks via `deleteTaskFromDocument`.
3. Reads `destPath`, appends task using `addTaskToDocument`.
4. Executes atomic writes to both files via `writeVaultFile`.
5. Refreshes active document if `activeFile` equals `sourcePath` or `destPath`.

---

## 4. Verification Plan

1. **Unit Tests:**
   - Test `moveTask` across documents in `src/store/vaultStore.test.ts`.
   - Test dragging tasks onto folder and file items in `src/components/sidebar/Sidebar.test.tsx` and `FolderItem.test.tsx`.
2. **Integration Tests:**
   - Verify clicking `Inbox` in sidebar properly scopes tasks to `Inbox.md`.
   - Verify dragging from List and Kanban views updates disk files and UI immediately.
3. **Full Platform Validation:**
   - `npm test` (all test suites passing).
   - `npm run build` (zero TypeScript errors).
   - `cargo check --manifest-path src-tauri/Cargo.toml` (desktop backend check).
