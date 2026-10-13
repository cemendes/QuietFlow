# 🌿 Hybrid Notes & Tasks Document Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform QuietFlow into a unified, local-first Markdown knowledge base where rich freeform prose and actionable tasks coexist seamlessly in the exact same file with non-destructive two-way synchronization.

**Architecture:** Extend QuietFlow's Markdown AST parser with line-bounded `DocumentSpan` tokenization, non-destructive in-place task patching, a full-page distraction-free Live Preview Markdown editor with interactive inline `- [ ]` checkboxes, top-level mode switching (`Cmd+1` Tasks $\leftrightarrow$ `Cmd+2` Notes), and source document deep linking.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Zustand, gray-matter, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-hybrid-notes-tasks-design.md`

## Global Constraints
- Non-Destructive Invariant: Paragraphs, LaTeX math (`$$`), code blocks, and custom headers outside modified tasks MUST remain 100% byte-for-byte untouched during writes.
- Snapshot Invariant: All file saves continue capturing snapshots in `<vault>/.quietflow/snapshots/<file>/<timestamp>.md` with 2-minute debounce and 20-version retention.
- Offline & Local-First: Zero remote network calls for note editing; all operations use local filesystem IPC.
- Versioning Governance: Do NOT bump package versions or create release tags without explicit confirmation.

---

### Task 1: Markdown AST Line-Span Tokenizer & Extended Types

**Files:**
- Modify: `src/core/markdown/types.ts`
- Modify: `src/core/markdown/parser.ts`
- Create: `tests/unit/hybrid-parser.test.ts`

**Interfaces:**
- Produces: `DocumentSpan`, `VaultDocument.spans`, `parseMarkdownDocument(content: string, filePath?: string): VaultDocument`

- [ ] **Step 1: Write the failing unit tests for mixed-prose and task spans**

```typescript
// tests/unit/hybrid-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';

describe('Hybrid Markdown Parser (Document Spans)', () => {
  it('parses mixed prose, headings, code blocks, and tasks into contiguous spans', () => {
    const markdown = `# Architecture Notes\n\nThis is a conceptual paragraph discussing the design.\n\n## Action Items\n- [ ] Implement AST spans [high] #core\n  - [x] Write types\n  - [ ] Add tests\n- [x] Initial setup\n\n\`\`\`typescript\nconst code = true;\n\`\`\`\n\nFinal thoughts.`;

    const doc = parseMarkdownDocument(markdown, 'notes/architecture.md');

    expect(doc.tasks).toHaveLength(2);
    expect(doc.tasks[0].title).toBe('Implement AST spans');
    expect(doc.tasks[0].priority).toBe('high');
    expect(doc.tasks[0].subtasks).toHaveLength(2);

    expect(doc.spans).toBeDefined();
    expect(doc.spans.length).toBeGreaterThanOrEqual(5);

    const taskSpan = doc.spans.find(s => s.type === 'task' && s.taskId === doc.tasks[0].id);
    expect(taskSpan).toBeDefined();
    expect(taskSpan?.startLine).toBe(5);
  });

  it('ignores checklist items inside fenced code blocks', () => {
    const markdown = `Here is example code:\n\n\`\`\`markdown\n- [ ] This is not a real task\n\`\`\`\n\n- [ ] This is a real task`;
    const doc = parseMarkdownDocument(markdown, 'test.md');
    expect(doc.tasks).toHaveLength(1);
    expect(doc.tasks[0].title).toBe('This is a real task');
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/unit/hybrid-parser.test.ts`
Expected: FAIL (spans not defined on `VaultDocument`)

- [ ] **Step 3: Update `src/core/markdown/types.ts` and `src/core/markdown/parser.ts`**
Add `DocumentSpan` definition and span collector in the parser loop:

```typescript
// In src/core/markdown/types.ts:
export interface DocumentSpan {
  id: string;
  type: 'heading' | 'prose' | 'code' | 'task' | 'callout' | 'thematic-break';
  rawText: string;
  startLine: number;
  endLine: number;
  taskId?: string;
}

export interface VaultDocument {
  filePath: string;
  frontmatter: Frontmatter;
  tasks: TaskItem[];
  spans: DocumentSpan[];
  rawContent: string;
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  lastModified: number;
}
```

Implement span tracking in `src/core/markdown/parser.ts` tokenization loop.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/unit/hybrid-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/markdown/types.ts src/core/markdown/parser.ts tests/unit/hybrid-parser.test.ts
git commit -m "feat(markdown): add DocumentSpan tokenization and mixed-content parsing"
```

---

### Task 2: Non-Destructive In-Place Task & Document Serializer

**Files:**
- Modify: `src/core/markdown/serializer.ts`
- Create: `tests/unit/hybrid-serializer.test.ts`

**Interfaces:**
- Consumes: `VaultDocument`, `TaskItem`, `DocumentSpan`
- Produces: `patchTaskInDocumentContent(rawContent: string, task: TaskItem, originalTask: TaskItem): string`

- [ ] **Step 1: Write the failing tests for non-destructive task mutation**

```typescript
// tests/unit/hybrid-serializer.test.ts
import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';
import { patchTaskInDocumentContent } from '../../src/core/markdown/serializer';

describe('Hybrid Non-Destructive Serializer', () => {
  it('updates task completion state while preserving surrounding prose and indentation byte-for-byte', () => {
    const raw = `# Title\n\nIntro paragraph with special symbols: $E=mc^2$.\n\n- [ ] Refactor core engine\n  - [ ] Write tests\n\nOutro paragraph.`;
    const doc = parseMarkdownDocument(raw, 'test.md');
    const task = { ...doc.tasks[0], status: 'done' as const, subtasks: [{ ...doc.tasks[0].subtasks[0], status: 'done' as const }] };

    const patched = patchTaskInDocumentContent(raw, task, doc.tasks[0]);
    expect(patched).toContain('- [x] Refactor core engine');
    expect(patched).toContain('  - [x] Write tests');
    expect(patched).toContain('Intro paragraph with special symbols: $E=mc^2$.');
    expect(patched).toContain('Outro paragraph.');
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/unit/hybrid-serializer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `patchTaskInDocumentContent` in `src/core/markdown/serializer.ts`**
Locate the task's exact line index span and replace only lines `[startLine..endLine]` with the serialized task block.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/unit/hybrid-serializer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/markdown/serializer.ts tests/unit/hybrid-serializer.test.ts
git commit -m "feat(markdown): implement non-destructive in-place task patching"
```

---

### Task 3: Vault Store Reactive State & Document Management

**Files:**
- Modify: `src/store/vaultStore.ts`
- Test: `src/test/vaultStore.test.ts`

**Interfaces:**
- Produces: `activeMode: 'tasks' | 'notes'`, `setActiveMode(mode)`, `activeDocumentPath: string | null`, `setActiveDocument(path)`, `updateActiveDocumentContent(content)`

- [ ] **Step 1: Write the failing tests in `src/test/vaultStore.test.ts`**
Verify `activeMode` switching and `activeDocument` content mutations.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run src/test/vaultStore.test.ts`

- [ ] **Step 3: Implement store additions in `src/store/vaultStore.ts`**
Add `activeMode`, `activeDocumentPath`, `setActiveMode`, `setActiveDocument`, `saveDocumentContent`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/vaultStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/store/vaultStore.ts src/test/vaultStore.test.ts
git commit -m "feat(store): add activeMode and document management state"
```

---

### Task 4: Primary Top-Level Mode Switcher (`Cmd+1` / `Cmd+2`)

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/App.tsx`
- Test: `tests/e2e/mode-switcher.test.tsx`

**Interfaces:**
- Consumes: `vaultStore.activeMode`, `vaultStore.setActiveMode`

- [ ] **Step 1: Write the failing component test for header mode switcher**
Verify rendering of `📋 Tasks` / `📝 Notes` pills and global keyboard shortcuts `Cmd+1` / `Cmd+2`.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/e2e/mode-switcher.test.tsx`

- [ ] **Step 3: Update `Header.tsx` and keyboard listener in `App.tsx`**
Implement the styled segmented control with badge counters and shortcut handlers.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/e2e/mode-switcher.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/layout/Header.tsx src/App.tsx tests/e2e/mode-switcher.test.tsx
git commit -m "feat(ui): add primary top-level Tasks vs Notes mode switcher"
```

---

### Task 5: Notes Mode Layout (Vault Sidebar & Document Meta Rail)

**Files:**
- Create: `src/components/notes/VaultSidebar.tsx`
- Create: `src/components/notes/DocumentMetaRail.tsx`
- Create: `src/components/notes/NotesLayout.tsx`
- Test: `tests/e2e/notes-layout.test.tsx`

**Interfaces:**
- Produces: `NotesLayout` containing `VaultSidebar`, `DocumentEditor` placeholder, `DocumentMetaRail`.

- [ ] **Step 1: Write the failing tests in `tests/e2e/notes-layout.test.tsx`**
Verify file tree rendering, folder expansion, search filtering, and outline (TOC) rendering.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/e2e/notes-layout.test.tsx`

- [ ] **Step 3: Implement `VaultSidebar.tsx`, `DocumentMetaRail.tsx`, and `NotesLayout.tsx`**
Include right-click context menus (New Note, New Folder, Rename, Delete) and active note highlighting.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/e2e/notes-layout.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/notes/ tests/e2e/notes-layout.test.tsx
git commit -m "feat(notes): create VaultSidebar and DocumentMetaRail components"
```

---

### Task 6: Live Preview Document Editor with Interactive Tasks

**Files:**
- Create: `src/components/notes/DocumentEditor.tsx`
- Create: `src/components/notes/InlineTaskItem.tsx`
- Test: `tests/e2e/document-editor.test.tsx`

**Interfaces:**
- Consumes: `vaultStore.activeDocumentPath`, `vaultStore.toggleTaskStatus`
- Produces: Live Preview Markdown canvas with inline interactive task checkboxes.

- [ ] **Step 1: Write failing tests for DocumentEditor**
Verify rendering of prose, headings, code blocks, and interactive `- [ ]` checkboxes that trigger task toggle on click.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/e2e/document-editor.test.tsx`

- [ ] **Step 3: Implement `DocumentEditor.tsx` and `InlineTaskItem.tsx`**
Implement centered 800px max-width prose canvas, debounced auto-save, inline task checkboxes, priority badges, and subtask hierarchy.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/e2e/document-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/notes/DocumentEditor.tsx src/components/notes/InlineTaskItem.tsx tests/e2e/document-editor.test.tsx
git commit -m "feat(notes): implement Live Preview DocumentEditor with interactive inline tasks"
```

---

### Task 7: Cross-View Deep Linking (Kanban & Zen Theater to Document)

**Files:**
- Modify: `src/components/kanban/TaskCard.tsx`
- Modify: `src/components/zen/ZenTheater.tsx`
- Test: `tests/e2e/deep-linking.test.tsx`

**Interfaces:**
- Consumes: `vaultStore.setActiveMode('notes')`, `vaultStore.setActiveDocument(task.filePath)`

- [ ] **Step 1: Write failing tests for source note deep-linking**
Verify clicking source note badge on Kanban card switches to `notes` mode and selects the note.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/e2e/deep-linking.test.tsx`

- [ ] **Step 3: Implement source note chip and click handlers**
Add note badges to `TaskCard.tsx` and `ZenTheater.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/e2e/deep-linking.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/kanban/TaskCard.tsx src/components/zen/ZenTheater.tsx tests/e2e/deep-linking.test.tsx
git commit -m "feat(navigation): add cross-view deep linking from Kanban and Zen to parent notes"
```

---

### Task 8: Full Autonomous Integration & Regression Verification

**Files:**
- Create: `tests/e2e/notes-mode-full.test.tsx`
- Test: `npm run test`

- [ ] **Step 1: Write full end-to-end integration test**
Simulate complete user lifecycle: create new note $\rightarrow$ type prose & tasks $\rightarrow$ switch to Kanban $\rightarrow$ drag task to done $\rightarrow$ switch back to Notes $\rightarrow$ verify `- [x]` rendered.

- [ ] **Step 2: Run full automated test suite**
Run: `npm run test`
Expected: All tests pass (0 failures).

- [ ] **Step 3: Run Rust backend tests**
Run: `npm run test:rust`
Expected: All tests pass.

- [ ] **Step 4: Update CHANGELOG.md and commit**
```bash
git add CHANGELOG.md tests/e2e/notes-mode-full.test.tsx
git commit -m "test(e2e): verify full hybrid notes and tasks lifecycle across all views"
```
