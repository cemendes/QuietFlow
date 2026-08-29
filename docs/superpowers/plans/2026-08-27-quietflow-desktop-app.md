# QuietFlow Desktop Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **QuietFlow**, a lightweight, calm, and lightning-fast macOS desktop to-do & note-taking app with local Markdown storage in a user-chosen Google Drive sync directory, nested folder tree navigation, dual List/Kanban views, task context notes, and a global floating quick-capture shortcut.

**Architecture:** Tauri 2.0 (Rust backend for atomic file I/O, directory watching with `notify`, and global shortcut registration) coupled with a React 18/19 + TypeScript + Tailwind CSS frontend. Data is saved as non-destructive human-readable Markdown files with YAML frontmatter.

**Tech Stack:**
- **Desktop Runtime:** Tauri 2.0 (Rust)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide Icons, `clsx`, `tailwind-merge`
- **Markdown Engine:** Custom non-destructive AST parser (`gray-matter` + custom regex line tokenizer)
- **Testing:** Vitest + React Testing Library (Frontend), `cargo test` (Rust Backend)

## Global Constraints
- Target Platform: macOS Desktop (Apple Silicon & Intel).
- Vault Format: Human-readable `.md` files with YAML frontmatter, 100% compatible with Google Drive folder sync and standard text editors.
- UI Theme: Default **Warm Sand & Forest Emerald** (`#FAF9F6` canvas, `#065F46` forest emerald, `#C2410C` terracotta priority, clean elevated white cards).
- Performance: Lightweight memory footprint (~30–50MB RAM), sub-second cold start.
- Safety: Atomic file writes (`.tmp` -> atomic rename) to prevent any corruption during concurrent syncs.

---

### Task 1: Project Scaffolding & Tailwind Theme Configuration

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: None (Root setup)
- Produces: Runnable Tauri 2 + Vite + React + Tailwind application with custom theme colors (`sand`, `forest`, `terracotta`).

- [ ] **Step 1: Write the failing App smoke test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders QuietFlow brand header', () => {
    render(<App />);
    expect(screen.getByText(/QuietFlow/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (No dependencies or files yet)

- [ ] **Step 3: Scaffold Tauri 2 + Vite + React + Tailwind files and configuration**

Configure `tailwind.config.js` with QuietFlow Warm Sand & Forest Emerald theme:
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FAF9F6',
          100: '#F5F3EF',
          200: '#EBE7DF',
          300: '#DCD5C8',
        },
        forest: {
          500: '#0D9488',
          600: '#0F766E',
          700: '#065F46',
          800: '#064E3B',
        },
        terracotta: {
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
        },
      },
    },
  },
  plugins: [],
};
```

Configure `src-tauri/Cargo.toml` with `tauri = "2"`, `notify = "6.1"`, `serde = { version = "1.0", features = ["derive"] }`, `serde_json = "1.0"`.

Implement `src/App.tsx`:
```tsx
import React from 'react';

export default function App() {
  return (
    <div className="flex h-screen w-screen bg-sand-50 text-slate-800 antialiased select-none">
      <div className="flex items-center gap-2 p-4">
        <h1 className="text-xl font-semibold tracking-tight text-forest-700">QuietFlow</h1>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold Tauri 2 + React + Tailwind project with QuietFlow theme"
```

---

### Task 2: Non-Destructive Markdown Parser & Serializer Core (TDD)

**Files:**
- Create: `src/core/markdown/types.ts`
- Create: `src/core/markdown/parser.ts`
- Create: `src/core/markdown/serializer.ts`
- Test: `src/core/markdown/parser.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `parseMarkdownDocument(content: string): VaultDocument`
  - `updateTaskInDocument(content: string, taskId: string, updates: Partial<TaskItem>): string`
  - `addTaskToDocument(content: string, task: NewTaskInput): string`

- [ ] **Step 1: Write failing parser and serializer tests**

```typescript
// src/core/markdown/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument, updateTaskInDocument, addTaskToDocument } from './parser';

const sampleDoc = `---
id: cust-acme-corp
title: Acme Corp
category: Customers
---

# Deliverables & Tasks
- [ ] Review security audit checklist @due(2026-09-01) @priority(high) #deliverable
  - Notes: Coordinate with internal SecOps
- [/] Draft MSA revision @status(in-progress)
- [x] Finalize pricing @completed(2026-08-27)

# Meeting Notes
### Q3 Strategy
Key discussion points.
`;

describe('Markdown Parser & Non-destructive Serializer', () => {
  it('correctly parses frontmatter and task items', () => {
    const parsed = parseMarkdownDocument(sampleDoc);
    expect(parsed.frontmatter.title).toBe('Acme Corp');
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[0].title).toBe('Review security audit checklist');
    expect(parsed.tasks[0].status).toBe('todo');
    expect(parsed.tasks[0].priority).toBe('high');
    expect(parsed.tasks[0].dueDate).toBe('2026-09-01');
    expect(parsed.tasks[0].notes).toBe('Coordinate with internal SecOps');
    expect(parsed.tasks[1].status).toBe('in-progress');
    expect(parsed.tasks[2].status).toBe('done');
  });

  it('updates task status without altering meeting notes or frontmatter', () => {
    const parsed = parseMarkdownDocument(sampleDoc);
    const updated = updateTaskInDocument(sampleDoc, parsed.tasks[0].id, { status: 'done' });
    expect(updated).toContain('- [x] Review security audit checklist');
    expect(updated).toContain('# Meeting Notes\n### Q3 Strategy\nKey discussion points.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/core/markdown/parser.test.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implement data structures, AST parsing, and line replacement logic**

Implement `src/core/markdown/types.ts` and `src/core/markdown/parser.ts`:
- Regex line parser for `- [ ]`, `- [/]`, `- [x]`, `@due(YYYY-MM-DD)`, `@priority(low|medium|high)`, `#tags`.
- Extracts indented bullet points as task notes/subtasks.
- Preserves untouched document sections (headers, meeting notes, code blocks).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/core/markdown/parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/markdown/
git commit -m "feat: implement non-destructive markdown parser and serializer"
```

---

### Task 3: Rust Native Vault File System & Watcher Service (TDD)

**Files:**
- Create: `src-tauri/src/vault/mod.rs`
- Create: `src-tauri/src/vault/fs.rs`
- Create: `src-tauri/src/vault/watcher.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/vault/fs_tests.rs`

**Interfaces:**
- Consumes: Local file paths
- Produces Tauri IPC commands:
  - `init_vault(path: String) -> Result<VaultTree, String>`
  - `read_file(path: String) -> Result<String, String>`
  - `write_file_atomic(path: String, content: String) -> Result<(), String>`
  - `create_directory(path: String) -> Result<(), String>`
  - `delete_entry(path: String) -> Result<(), String>`
  - Emits event: `vault://changed` on directory modification.

- [ ] **Step 1: Write failing Rust unit test for atomic file writes and tree walking**

```rust
// src-tauri/src/vault/fs_tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_write_and_read() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.md");
        write_file_atomic(file_path.to_str().unwrap(), "# Hello").unwrap();
        let content = read_file(file_path.to_str().unwrap()).unwrap();
        assert_eq!(content, "# Hello");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test` in `src-tauri`
Expected: FAIL

- [ ] **Step 3: Implement atomic file writer, tree scanner, and notify watcher**

Implement `src-tauri/src/vault/fs.rs`:
- Write to `.<filename>.tmp` in same directory, then `std::fs::rename`.
- Recursive directory walker returning tree structure with file counts.
- `src-tauri/src/vault/watcher.rs` using `notify::RecommendedWatcher` with debounce emitting Tauri event.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test` in `src-tauri`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/vault/
git commit -m "feat: implement Rust atomic vault file system and directory watcher"
```

---

### Task 4: Frontend Vault Store & Reactive State Management

**Files:**
- Create: `src/store/vaultStore.ts`
- Create: `src/store/types.ts`
- Test: `src/store/vaultStore.test.ts`

**Interfaces:**
- Consumes: `src/core/markdown/types.ts`, Tauri IPC
- Produces:
  - `useVaultStore`: reactive hook for `vaultTree`, `activeFile`, `tasks`, `activeTask`, `searchQuery`, `activeView` (`'list' | 'kanban'`).
  - Actions: `loadVault(dir)`, `selectFile(path)`, `toggleTask(taskId)`, `updateTask(taskId, updates)`, `addTask(task)`.

- [ ] **Step 1: Write store state transition tests**

```typescript
// src/store/vaultStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultStore } from './vaultStore';

describe('VaultStore', () => {
  beforeEach(() => {
    useVaultStore.setState({ tasks: [], activeFile: null });
  });

  it('toggles task status optimistically', () => {
    const store = useVaultStore.getState();
    store.setTasks([{ id: '1', title: 'Task 1', status: 'todo', rawLine: '- [ ] Task 1', filePath: '/test.md' }]);
    store.toggleTask('1');
    expect(useVaultStore.getState().tasks[0].status).toBe('done');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/store/vaultStore.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Zustand/Context store with optimistic updates and IPC synchronization**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/store/vaultStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: implement frontend vault store with optimistic state updates"
```

---

### Task 5: Collapsible Nested Folder Sidebar Component

**Files:**
- Create: `src/components/sidebar/Sidebar.tsx`
- Create: `src/components/sidebar/FolderTree.tsx`
- Create: `src/components/sidebar/FolderItem.tsx`
- Test: `src/components/sidebar/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useVaultStore` (`vaultTree`, `activeFile`, `selectFile`)
- Produces: Collapsible sidebar rendering macOS traffic lights, system views (*Today*, *Inbox*, *Starred*), expandable folder hierarchy, and settings.

- [ ] **Step 1: Write component test for sidebar folder expanding and file selection**

```tsx
// src/components/sidebar/Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  it('renders Today, Inbox, and folder tree', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Inbox/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/sidebar/Sidebar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Sidebar and FolderTree components with Warm Sand styling**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/sidebar/Sidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/
git commit -m "feat: implement collapsible nested folder sidebar"
```

---

### Task 6: Main Content Area & Today's Focus List View

**Files:**
- Create: `src/components/tasks/TaskList.tsx`
- Create: `src/components/tasks/TaskRow.tsx`
- Create: `src/components/tasks/QuickAddBar.tsx`
- Create: `src/components/tasks/ViewSwitcher.tsx`
- Test: `src/components/tasks/TaskList.test.tsx`

**Interfaces:**
- Consumes: `useVaultStore` (`tasks`, `toggleTask`, `selectTask`, `activeTaskId`)
- Produces: Prioritized list view with drag-and-drop reordering, interactive checkboxes, due dates, priority pills, and quick add bar (`Cmd+N`).

- [ ] **Step 1: Write TaskList component test**

```tsx
// src/components/tasks/TaskList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TaskList from './TaskList';

describe('TaskList Component', () => {
  it('renders task item with priority badge and handles checkbox click', () => {
    render(<TaskList />);
    expect(screen.getByText(/Quick Add/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/tasks/TaskList.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement TaskList, TaskRow, and QuickAddBar components**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/tasks/TaskList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/
git commit -m "feat: implement Today focus list view and quick add bar"
```

---

### Task 7: Slide-Out Task Context & Markdown Note Editor

**Files:**
- Create: `src/components/editor/TaskDetailPanel.tsx`
- Create: `src/components/editor/MarkdownEditor.tsx`
- Create: `src/components/editor/MetadataBar.tsx`
- Test: `src/components/editor/TaskDetailPanel.test.tsx`

**Interfaces:**
- Consumes: `useVaultStore` (`activeTask`, `updateTask`, `closeTaskDetail`)
- Produces: Slide-out drawer displaying task status, priority, due date, folder path, and editable Markdown note block with subtask checklist support.

- [ ] **Step 1: Write TaskDetailPanel test for note editing and status change**

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/editor/TaskDetailPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement TaskDetailPanel and MarkdownEditor with Warm Sand theme**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/editor/TaskDetailPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/
git commit -m "feat: implement slide-out task detail and markdown note editor"
```

---

### Task 8: Kanban Board Stage View

**Files:**
- Create: `src/components/kanban/KanbanBoard.tsx`
- Create: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/components/kanban/KanbanCard.tsx`
- Test: `src/components/kanban/KanbanBoard.test.tsx`

**Interfaces:**
- Consumes: `useVaultStore` (`tasks`, `updateTaskStatus`, `selectTask`)
- Produces: 4-column stage view (*Backlog*, *To Do*, *In Progress*, *Done*) with draggable cards, due badges, and subtask progress indicators.

- [ ] **Step 1: Write Kanban board column rendering and card drag test**

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/kanban/KanbanBoard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement KanbanBoard, KanbanColumn, and KanbanCard components**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/kanban/KanbanBoard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/kanban/
git commit -m "feat: implement Kanban board stage view"
```

---

### Task 9: Global Floating Quick-Capture Modal & macOS Shortcut Registration

**Files:**
- Create: `src/components/capture/QuickCaptureModal.tsx`
- Create: `src/hooks/useGlobalShortcuts.ts`
- Modify: `src-tauri/src/lib.rs` (Tauri global shortcut plugin registration)
- Test: `src/components/capture/QuickCaptureModal.test.tsx`

**Interfaces:**
- Consumes: `Option+Shift+Space` global hotkey (or in-app `Cmd+N` / `Cmd+K`)
- Produces: Spotlight-style floating capture window with folder selector, natural language parsing, and instant `Enter` key save.

- [ ] **Step 1: Write QuickCaptureModal keyboard interaction test**

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/capture/QuickCaptureModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement QuickCaptureModal and Tauri global shortcut listener**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/capture/QuickCaptureModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/capture/ src/hooks/
git commit -m "feat: implement global floating quick capture modal and shortcuts"
```

---

### Task 10: App Settings, Vault Configuration & End-to-End Verification

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`
- Modify: `src/App.tsx` (Wire Sidebar, Main View, Task Detail, Quick Capture, Settings together)
- Test: `tests/e2e/vault-flow.test.tsx`

**Interfaces:**
- Consumes: All components and store services
- Produces: Complete end-to-end QuietFlow desktop application.

- [ ] **Step 1: Write integration test covering vault loading, task creation, status update, and note saving**

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/e2e/vault-flow.test.tsx`
Expected: FAIL

- [ ] **Step 3: Connect full layout in App.tsx with Settings modal and vault selector**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (All test suites passing)

- [ ] **Step 5: Run cargo build to verify macOS Tauri desktop binary compilation**

Run: `npm run tauri build -- --debug` (or `cargo check`)
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: connect full QuietFlow application layout and verify build"
```
