# Design Specification: Unified WYSIWYG Notes Editor for QuietFlow

- **Date**: 2026-09-17
- **Status**: Approved by User
- **Component**: `src/components/editor/MarkdownEditor.tsx`, `src/components/document/LensDocumentCanvas.tsx`

---

## 1. Problem Statement & Motivation
Currently, QuietFlow's note editing experience uses separate "Edit" (plain `<textarea>`) and "Preview" (rendered HTML) tabs. Users must switch back and forth to see formatted text or verify headings, lists, and links. 

The goal is to merge edit and preview into a seamless, distraction-free Typora/Notion-style WYSIWYG rich text editor where:
1. Text is directly formatted on screen (bold looks bold, headings are prominent, lists are indented).
2. Typing standard Markdown shortcuts (e.g. `# `, `* `, `1. `, `> `, `**`) dynamically transforms the block/text into rich visual blocks and automatically hides syntax delimiters.
3. Disk files remain 100% standard CommonMark Markdown (`.md`), serialized non-destructively.
4. Users have an instant "View Source" toggle (`Cmd+/`) to inspect and edit the underlying raw Markdown text whenever desired.

---

## 2. Technical Architecture & Technology Choice

### 2.1 Engine Selection: TipTap (ProseMirror)
QuietFlow adopts **TipTap v2** (built on the ProseMirror engine) with headless styling and bidirectional markdown serialization:
- `@tiptap/react`: Core React wrapper and hook bindings (`useEditor`).
- `@tiptap/starter-kit`: Core schema, history (undo/redo), paragraph, headings (H1-H6), bold, italic, strike, bullet list, ordered list, blockquote, code block, and horizontal rule.
- `@tiptap/extension-link`: Link node with auto-linking and link editing capabilities.
- `@tiptap/extension-task-list` & `@tiptap/extension-task-item`: Task checkbox list rendering and keyboard navigation.
- `tiptap-markdown`: High-performance CommonMark parser and serializer for seamless two-way conversion between TipTap's JSON/ProseMirror document model and clean Markdown strings.

### 2.2 Data Flow & Storage Integration
- **Vault Read Path**:
  When a file is opened, `LensDocumentCanvas` passes `activeDocument.body` to `MarkdownEditor`. TipTap parses the Markdown into the document model upon initialization or file transition.
- **Vault Write Path**:
  When user types, TipTap emits `onUpdate`. `MarkdownEditor` serializes the document using `editor.storage.markdown.getMarkdown()` and calls `onChange(markdownText)`. This seamlessly feeds into `LensDocumentCanvas`'s debounced `saveDocumentProse` pipeline, saving to disk via Tauri IPC `write_file_atomic`.
- **Blur & Flush**:
  `onBlur` flushes any pending debounced save immediately to disk to guarantee zero data loss on navigation or app closure.

---

## 3. User Interface & Interaction Design

### 3.1 Editor Canvas & Styling
- Full-height, flexible container (`flex-1 min-h-0 h-full flex flex-col`).
- Styled using QuietFlow's calm sand/slate palette:
  - Background: clean white / soft sand background matching the canvas.
  - Headings: `font-semibold text-slate-800` (H1: 1.5rem, H2: 1.25rem, H3: 1.1rem).
  - Body text: `text-sm leading-relaxed text-slate-700`.
  - Blockquotes: `border-l-4 border-slate-300 pl-3 italic text-slate-600`.
  - Inline code: `px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800`.
  - Code blocks: `p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto`.
  - Links: `text-emerald-600 underline underline-offset-2 hover:text-emerald-700 cursor-pointer`.

### 3.2 Action Toolbar
Positioned at the top of the editor:
- **Formatting Actions**:
  - `Bold` (`Cmd+B`): Toggles strong mark.
  - `Italic` (`Cmd+I`): Toggles emphasis mark.
  - `H1`, `H2`, `H3`: Toggles heading levels 1, 2, 3.
  - `Bullet List`: Toggles unordered list.
  - `Numbered List`: Toggles ordered list.
  - `Task List`: Toggles task checklist.
  - `Blockquote`: Toggles quote block.
  - `Inline Code`: Toggles code mark.
  - `Link`: Prompts or embeds URL on selected text.
- **Active State Highlighting**:
  - Buttons actively highlight (e.g. `bg-slate-200 text-slate-900 shadow-sm`) when the cursor is positioned within text matching that style.
- **View Source Toggle**:
  - Right-aligned button with code icon (`</>`) labeled `Source` and shortcut hint `Cmd+/`.
  - Clicking or pressing `Cmd+/` flips between WYSIWYG mode and raw Markdown `<textarea>` mode.
  - Synchronization is immediate: when switching modes, the latest markdown is parsed or serialized seamlessly without loss.

### 3.3 Typing Shortcuts (Markdown Input Rules)
- Typing `# ` at the start of a line transforms it into an H1.
- Typing `## ` turns into an H2; `### ` turns into an H3.
- Typing `- ` or `* ` turns into a bullet list item.
- Typing `1. ` turns into a numbered list item.
- Typing `[ ] ` turns into a task checkbox.
- Typing `> ` turns into a blockquote.
- Typing `**bold**` or `*italic*` creates formatted marks with syntax markers removed.
- Selecting text and pasting a URL embeds the URL as a markdown link over that text.

---

## 4. Error Handling & Edge Cases
1. **Unrecognized / Complex HTML**: Any arbitrary HTML in existing notes is preserved as raw text nodes or sanitized blocks, ensuring zero content drops.
2. **Empty Notes**: Empty bodies render a clean placeholder ("Type your notes here, or type # for headings, - for lists...").
3. **Rapid Switching**: File transitions safely unmount or re-populate the editor using `lastLoadedFileRef` to prevent cross-file content leakage.
4. **Zero-Loss Source Toggling**: Switching between WYSIWYG and Source mode guarantees state equality: `WYSIWYG -> getMarkdown() -> Source textarea -> onChange -> WYSIWYG setContent()`.

---

## 5. Verification & Testing Strategy
- **Unit & Integration Suite (`tests/unit/markdown-editor.test.tsx`)**:
  - Verify initialization with markdown strings and rendering of TipTap rich DOM elements.
  - Verify markdown serialization on user input matches CommonMark format.
  - Verify toolbar formatting button commands and active state toggling.
  - Verify View Source toggle button and `Cmd+/` shortcut.
  - Verify smart link pasting over selections.
- **Multi-Layer Preversion Gatekeeper (`npm run preversion`)**:
  - Rust tests (`npm run test:rust`).
  - TypeScript build (`npm run build`).
  - Vitest test suite (`npm run test`).
  - Playwright Autonomous Menu Crawler (`npm run test:autonomous`) confirming zero runtime crashes or console errors.
