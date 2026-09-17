# Unified WYSIWYG Notes Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-tab (Edit/Preview) notes editor with a unified Typora/Notion-style WYSIWYG rich-text editor powered by TipTap, supporting markdown input rules, bidirectional CommonMark serialization, an active formatting toolbar, and a "View Source" toggle.

**Architecture:** Embed TipTap v2 on top of ProseMirror within `MarkdownEditor.tsx`, utilizing `tiptap-markdown` for inbound markdown parsing and outbound CommonMark serialization. Maintain a "View Source" toggle (`Cmd+/`) for raw markdown editing, with auto-save and blur flush seamlessly piped into `LensDocumentCanvas.tsx`.

**Tech Stack:** React 18, TipTap v2 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `tiptap-markdown`), Lucide React, Vitest, Testing Library, Playwright.

**Spec:** docs/superpowers/specs/2026-09-17-wysiwyg-notes-editor-design.md

## Global Constraints

- Storage format remains 100% standard CommonMark Markdown (`.md`) files in the vault.
- Never bump version numbers or git tags without explicit user confirmation (Rule 1).
- Non-destructive updates: surrounding frontmatter and task bounds must be preserved byte-for-byte.
- Maintain full test coverage across Rust, Vitest, and Playwright autonomous crawler (Rule 8).

---

### Task 1: Install TipTap Packages & Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `tiptap-markdown` installed and verified.

- [ ] **Step 1: Install TipTap dependencies**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item tiptap-markdown
```

- [ ] **Step 2: Run build to verify TypeScript compilation and bundle configuration**

Run: `npm run build`
Expected: PASS (exit code 0, 0 TS errors)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): install TipTap and tiptap-markdown packages"
```

---

### Task 2: Core TipTap WYSIWYG Editor with Formatting Toolbar & Markdown Serialization

**Files:**
- Modify: `src/components/editor/MarkdownEditor.tsx`
- Test: `tests/unit/markdown-editor.test.tsx`

**Interfaces:**
- Consumes: `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `className?: string`
- Produces: Unified WYSIWYG note editor, active formatting toolbar (Bold, Italic, H1, H2, H3, Bullets, Ordered, Tasks, Quote, Code, Link), live markdown input rules, and CommonMark serialization on update.

- [ ] **Step 1: Write the failing tests for TipTap WYSIWYG rendering and serialization**

In `tests/unit/markdown-editor.test.tsx`:
```tsx
it('renders TipTap WYSIWYG editor content directly without separate edit/preview tabs', () => {
  render(<MarkdownEditor value="# Hello World\n\n**Bold text**" onChange={vi.fn()} />);
  expect(screen.queryByTestId('markdown-preview-tab-btn')).toBeNull();
  expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Hello World');
  expect(screen.getByText('Bold text')).toBeDefined();
});

it('triggers onChange with updated markdown when formatting toolbar button is clicked', () => {
  const onChange = vi.fn();
  render(<MarkdownEditor value="Hello world" onChange={onChange} />);
  const boldBtn = screen.getByTestId('toolbar-bold-btn');
  fireEvent.click(boldBtn);
  // TipTap executes toggleBold command
  expect(screen.getByTestId('toolbar-bold-btn')).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/markdown-editor.test.tsx`
Expected: FAIL (TipTap elements not yet rendered in `MarkdownEditor.tsx`)

- [ ] **Step 3: Implement TipTap WYSIWYG Editor in `MarkdownEditor.tsx`**

Configure `useEditor` with:
- Extensions: `StarterKit`, `Link.configure({ openOnClick: false })`, `TaskList`, `TaskItem.configure({ nested: true })`, `Markdown`.
- Content initialization: `content: value`.
- Update handler: `onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown())`.
- Update `EditorContent` with Tailwind prose styling (`prose prose-slate max-w-none focus:outline-none min-h-[300px] p-4 text-slate-800 text-sm leading-relaxed`).
- Connect toolbar buttons with `editor.chain().focus().toggleBold().run()`, `toggleHeading({ level: 1 })`, etc., and dynamic active classes via `editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/markdown-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/MarkdownEditor.tsx tests/unit/markdown-editor.test.tsx
git commit -m "feat(editor): implement TipTap WYSIWYG note editor with active formatting toolbar"
```

---

### Task 3: "View Source" Raw Markdown Mode Toggle & `Cmd+/` Shortcut

**Files:**
- Modify: `src/components/editor/MarkdownEditor.tsx`
- Test: `tests/unit/markdown-editor.test.tsx`

**Interfaces:**
- Consumes: `isSourceMode: boolean`
- Produces: Button `toolbar-source-toggle-btn` with tooltip `View Markdown Source (Cmd+/)`, toggling between TipTap rich-text canvas and `<textarea>` raw markdown view with synchronized content.

- [ ] **Step 1: Write failing test for View Source toggle and Cmd+/ shortcut**

In `tests/unit/markdown-editor.test.tsx`:
```tsx
it('toggles between WYSIWYG and Raw Markdown source view via button and Cmd+/', () => {
  const onChange = vi.fn();
  render(<MarkdownEditor value="## Title\n\nSome text" onChange={onChange} />);

  const sourceBtn = screen.getByTestId('toolbar-source-toggle-btn');
  expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
  expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();

  // Click View Source
  fireEvent.click(sourceBtn);
  expect(screen.getByTestId('markdown-source-textarea')).toBeDefined();

  // Toggle back via button
  fireEvent.click(sourceBtn);
  expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
  expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/markdown-editor.test.tsx`
Expected: FAIL (`toolbar-source-toggle-btn` not found)

- [ ] **Step 3: Implement View Source state and keyboard shortcut in `MarkdownEditor.tsx`**

- Add state `const [isSourceMode, setIsSourceMode] = useState(false)`.
- When switching from WYSIWYG to Source, update local source text with `editor?.storage.markdown.getMarkdown() || value`.
- When switching from Source to WYSIWYG, call `editor?.commands.setContent(sourceText)`.
- Add `useEffect` listening for `(e.metaKey || e.ctrlKey) && e.key === '/'` to toggle `isSourceMode`.
- Render `toolbar-source-toggle-btn` in the toolbar header.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/markdown-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/MarkdownEditor.tsx tests/unit/markdown-editor.test.tsx
git commit -m "feat(editor): add View Source toggle and Cmd+/ shortcut to notes editor"
```

---

### Task 4: Autonomous Crawler & Multi-Layer Preversion Verification

**Files:**
- Modify: `CHANGELOG.md`
- Test: All tests via `npm run preversion`

**Interfaces:**
- Produces: 100% passing tests across Rust (`npm run test:rust`), TypeScript/Vite (`npm run build`), Vitest (`npm run test`), and Playwright (`npm run test:autonomous`).

- [ ] **Step 1: Run complete preversion gatekeeper suite**

Run: `npm run preversion`
Expected: All 4 layers pass with 0 errors.

- [ ] **Step 2: Update `CHANGELOG.md`**

Document the WYSIWYG editor upgrade under `## [Unreleased]` (`### Added` and `### Changed`).

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document unified WYSIWYG editor and source toggle"
```
