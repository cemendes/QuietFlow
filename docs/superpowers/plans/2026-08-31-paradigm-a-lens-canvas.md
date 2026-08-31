# 🌿 Paradigm A: The "Lens" Document Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every Markdown document in QuietFlow (e.g. `Customers/Acme Corp.md`) into an ADHD-optimized dual-zone "Lens Canvas" where action items are hoisted to the top and meeting notes live below, featuring auto-adaptive view folding, soft task hoisting, instant cognitive re-entry, non-destructive disk sync, and comprehensive Playwright menu crawling.

**Architecture:** 
1. Headless AST parser tokenizes documents into `DocumentSpan` records with soft-hoisting line offsets.
2. Non-destructive serializer `patchTaskInDocumentContent` mutates tasks without touching surrounding prose.
3. `LensDocumentCanvas.tsx` renders top task cards + bottom markdown prose with responsive view folding (`split` | `tasks` | `notes`) and auto-adaptation.
4. `VaultStore` persists per-document scroll depth, cursor positions, and lens modes for instant cognitive re-entry.
5. Global keyboard flow: `Cmd+O` (Fuzzy Quick Switcher), `Cmd+E` (Lens Cycle), `Cmd+N` (Contextual Note in Active Folder), `Cmd+Enter` (Quick Line Hoist).
6. Playwright autonomous crawler verifies all menus, modal options, lens toggles, and shortcuts without crashes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Zustand, gray-matter, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-paradigm-a-lens-canvas-design.md`

## Global Constraints
- Byte-for-Byte Invariant: Surrounding paragraphs, LaTeX math (`$$`), code blocks, and custom headers outside modified tasks MUST remain 100% byte-for-byte untouched during writes.
- Snapshot Guard: All file saves continue capturing snapshots in `<vault>/.quietflow/snapshots/<file>/<timestamp>.md` (2-minute debounce, 20-version retention).
- Offline & Local-First: Zero remote network calls; all storage is standard CommonMark/GFM on disk.
- Zero Version Bumps without explicit user confirmation.

---

### Task 1: Markdown AST Line-Span Tokenizer & Extended Types

**Files:**
- Modify: `src/core/markdown/types.ts`
- Modify: `src/core/markdown/parser.ts`
- Create: `tests/unit/hybrid-parser.test.ts`

**Interfaces:**
- Produces: `DocumentSpan`, `VaultDocument.spans`, `parseMarkdownDocument(content, filePath)`

- [ ] **Step 1: Write failing unit tests for mixed-prose and task spans**
```typescript
// tests/unit/hybrid-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';

describe('Hybrid Markdown Parser (Document Spans)', () => {
  it('parses mixed prose, headings, code blocks, and tasks into contiguous spans', () => {
    const markdown = `# Architecture Notes\n\nDiscussion about Cloud Run.\n\n- [ ] Deliver SOW [high] #core\n  - [x] Security review\n- [x] Discovery call\n\n### Meeting Notes\nBudget approved for $120k.`;
    const doc = parseMarkdownDocument(markdown, 'customers/acme.md');

    expect(doc.tasks).toHaveLength(2);
    expect(doc.tasks[0].title).toBe('Deliver SOW');
    expect(doc.tasks[0].priority).toBe('high');
    expect(doc.spans).toBeDefined();
    expect(doc.spans.length).toBeGreaterThanOrEqual(4);

    const taskSpan = doc.spans.find(s => s.type === 'task' && s.taskId === doc.tasks[0].id);
    expect(taskSpan).toBeDefined();
  });

  it('correctly calculates word count and reading time', () => {
    const markdown = `A quick meeting note with ten words in total here.`;
    const doc = parseMarkdownDocument(markdown, 'notes/quick.md');
    expect(doc.wordCount).toBe(10);
    expect(doc.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/unit/hybrid-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/core/markdown/types.ts` and `src/core/markdown/parser.ts`**
Add `DocumentSpan` definition and span collector in the parser loop.

- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run tests/unit/hybrid-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/markdown/types.ts src/core/markdown/parser.ts tests/unit/hybrid-parser.test.ts
git commit -m "feat(markdown): add DocumentSpan tokenization and metrics calculation"
```

---

### Task 2: Non-Destructive In-Place Task Serializer

**Files:**
- Modify: `src/core/markdown/serializer.ts`
- Create: `tests/unit/hybrid-serializer.test.ts`

**Interfaces:**
- Produces: `patchTaskInDocumentContent(rawContent: string, task: TaskItem, originalTask: TaskItem): string`

- [ ] **Step 1: Write failing unit test for non-destructive task mutation**
```typescript
// tests/unit/hybrid-serializer.test.ts
import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';
import { patchTaskInDocumentContent } from '../../src/core/markdown/serializer';

describe('Hybrid Non-Destructive Serializer', () => {
  it('updates task completion state while preserving surrounding prose and indentation byte-for-byte', () => {
    const raw = `# Title\n\nIntro paragraph with special symbols: $E=mc^2$.\n\n- [ ] Refactor core engine\n  - [ ] Write tests\n\n### Meeting Notes\nClient approved $120k budget.`;
    const doc = parseMarkdownDocument(raw, 'test.md');
    const task = { ...doc.tasks[0], status: 'done' as const, subtasks: [{ ...doc.tasks[0].subtasks[0], status: 'done' as const }] };

    const patched = patchTaskInDocumentContent(raw, task, doc.tasks[0]);
    expect(patched).toContain('- [x] Refactor core engine');
    expect(patched).toContain('  - [x] Write tests');
    expect(patched).toContain('Intro paragraph with special symbols: $E=mc^2$.');
    expect(patched).toContain('### Meeting Notes\nClient approved $120k budget.');
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/unit/hybrid-serializer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `patchTaskInDocumentContent` in `src/core/markdown/serializer.ts`**
Replace only the exact line range `[startLine..endLine]` belonging to the modified task.

- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run tests/unit/hybrid-serializer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/markdown/serializer.ts tests/unit/hybrid-serializer.test.ts
git commit -m "feat(markdown): implement non-destructive in-place task patching"
```

---

### Task 3: Vault Store Cognitive State (Lens Modes, Re-Entry Memory & Flush-on-Blur)

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/vaultStore.ts`
- Test: `src/test/vaultStore.test.ts`

**Interfaces:**
- Produces: `lensViewMode: 'split' | 'tasks' | 'notes'`, `setLensViewMode(mode)`, `documentViewState: Record<string, { lensMode, scrollY, cursorPosition }>`, `saveDocumentProse(filePath, prose)`, `flushActiveDocument()`

- [ ] **Step 1: Write test for lens state, cognitive re-entry, and saveDocumentProse**
```typescript
// in src/test/vaultStore.test.ts
it('remembers lensViewMode and scroll position per document', () => {
  const store = getVaultStore();
  store.setLensViewMode('tasks', 'customers/acme.md');
  store.setDocumentScrollPosition('customers/acme.md', 320);

  expect(store.getDocumentViewState('customers/acme.md').lensMode).toBe('tasks');
  expect(store.getDocumentViewState('customers/acme.md').scrollY).toBe(320);
});
```

- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `src/store/types.ts` and `src/store/vaultStore.ts`**
Add lens state management, per-document re-entry cache, and synchronous `flushActiveDocument` action.

- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run src/test/vaultStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/store/ src/test/vaultStore.test.ts
git commit -m "feat(store): add cognitive re-entry memory and lens view state"
```

---

### Task 4: Build `LensDocumentCanvas.tsx` with Auto-Adaptive Folding

**Files:**
- Create: `src/components/document/LensDocumentCanvas.tsx`
- Create: `src/components/document/DocumentTaskCard.tsx`
- Test: `tests/e2e/lens-canvas.test.tsx`

**Interfaces:**
- Produces: `LensDocumentCanvas` with:
  - Header: 3-way toggle pill (`[ ✨ Split View | ✅ Tasks Only | 📝 Notes Only ]`), breadcrumb path, tags, and status indicator.
  - Auto-Adaptive Lens: Auto-defaults to `notes` if 0 tasks, `tasks` if 0 prose, and `split` if both.
  - Top Zone: Hoisted action items with interactive checkboxes, subtasks, priority badges, and due dates.
  - Divider: Subtle calm separator with 1-click collapse/expand.
  - Bottom Zone: Prose editor with Soft Hoisting (parses tasks on blur / 1.5s idle debounce) and `Cmd+Enter` line hoist.

- [ ] **Step 1: Write failing component tests in `tests/e2e/lens-canvas.test.tsx`**
Verify:
1. Auto-adapts view mode based on task/prose presence.
2. 3-way toggle smoothly collapses notes or task cards.
3. Checking a top task card marks task done in store.
4. Soft hoisting does not steal focus while typing prose.

- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/e2e/lens-canvas.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `LensDocumentCanvas.tsx` & `DocumentTaskCard.tsx`**
- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run tests/e2e/lens-canvas.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/document/ tests/e2e/lens-canvas.test.tsx
git commit -m "feat(ui): implement LensDocumentCanvas with auto-adaptive folding and soft hoisting"
```

---

### Task 5: Contextual Keyboard Navigation (`Cmd+O`, `Cmd+E`, `Cmd+N`)

**Files:**
- Create: `src/components/document/QuickFileSwitcher.tsx`
- Modify: `src/App.tsx`
- Test: `tests/e2e/keyboard-flow.test.tsx`

**Interfaces:**
- Produces:
  - `Cmd+O`: Fuzzy file switcher modal to jump between customer notes in 1 keystroke.
  - `Cmd+E`: 1-key cycle through `Split -> Tasks -> Notes` with a subtle HUD toast.
  - `Cmd+N`: Creates a new note *inside the currently active customer folder*.

- [ ] **Step 1: Write failing test for keyboard shortcuts in `tests/e2e/keyboard-flow.test.tsx`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `QuickFileSwitcher.tsx` and register shortcuts in `App.tsx`**
- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run tests/e2e/keyboard-flow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/document/QuickFileSwitcher.tsx src/App.tsx tests/e2e/keyboard-flow.test.tsx
git commit -m "feat(navigation): add Cmd+O quick switcher, Cmd+E lens cycle, and contextual Cmd+N"
```

---

### Task 6: Cross-View Backlinks (Kanban & Zen Theater to Lens Canvas)

**Files:**
- Modify: `src/components/kanban/TaskCard.tsx`
- Modify: `src/components/zen/ZenTheater.tsx`
- Test: `tests/e2e/cross-view-linking.test.tsx`

**Interfaces:**
- Consumes: `vaultStore.setActiveFile(task.filePath)`, `vaultStore.setActiveView('document')`

- [ ] **Step 1: Write failing test for clicking source note badge on task cards**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Add note chips to `TaskCard.tsx` and `ZenTheater.tsx` with click handlers**
- [ ] **Step 4: Run test to verify pass**
Run: `npx vitest run tests/e2e/cross-view-linking.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/kanban/TaskCard.tsx src/components/zen/ZenTheater.tsx tests/e2e/cross-view-linking.test.tsx
git commit -m "feat(navigation): add 1-click jump from Kanban/Zen tasks to Lens Document Canvas"
```

---

### Task 7: Playwright Autonomous Menu & Options Crawler Expansion

**Files:**
- Modify: `tests/e2e/autonomous-menu-crawler.spec.ts`
- Modify: `CHANGELOG.md`
- Test: `npm run test:autonomous` & `npm run test` & `npm run test:rust`

**Interfaces:**
- Crawls and asserts all new UI elements:
  - Lens Toggle Pills (`Split View`, `Tasks Only`, `Notes Only`).
  - Document Quick Switcher modal (`Cmd+O`) with fuzzy search and keyboard selection.
  - Document context actions ("Open in Obsidian", "Toggle Task Collapse").
  - Note creation (`Cmd+N`) inside customer folders.

- [ ] **Step 1: Update `tests/e2e/autonomous-menu-crawler.spec.ts` with Section for Document Lens & Menus**
```typescript
// Add to tests/e2e/autonomous-menu-crawler.spec.ts:
await recordAction('Lens', 'Toggle Lens Mode: Tasks Only', async () => {
  const tasksOnlyBtn = page.locator('button[data-testid="lens-tasks-only-btn"]');
  if (await tasksOnlyBtn.isVisible()) {
    await tasksOnlyBtn.click();
    await page.waitForTimeout(200);
  }
});

await recordAction('Navigation', 'Open Quick File Switcher (Cmd+O)', async () => {
  await page.keyboard.press('Meta+O');
  await page.waitForSelector('[data-testid="quick-file-switcher"]', { timeout: 3000 });
  await page.keyboard.press('Escape');
});
```

- [ ] **Step 2: Run Playwright Autonomous Menu Crawler**
Run: `npm run test:autonomous`
Expected: PASS (All menus, options, and lens states crawled without errors).

- [ ] **Step 3: Run full Vitest & Rust test suites**
Run: `npm run test && npm run test:rust`
Expected: 100% PASS.

- [ ] **Step 4: Update `CHANGELOG.md` and commit**
```bash
git add CHANGELOG.md tests/e2e/autonomous-menu-crawler.spec.ts
git commit -m "test(autonomous): expand Playwright menu crawler for Lens canvas and document options"
```
