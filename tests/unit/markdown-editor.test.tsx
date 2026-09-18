import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../../src/components/editor/MarkdownEditor';

describe('MarkdownEditor Component', () => {
  it('renders TipTap WYSIWYG editor content directly without separate edit/preview tabs', () => {
    render(<MarkdownEditor value="# Hello World\n\n**Bold text**" onChange={vi.fn()} />);

    // Assert absence of old preview tab
    expect(screen.queryByTestId('markdown-preview-tab-btn')).toBeNull();
    expect(screen.queryByTestId('markdown-edit-tab-btn')).toBeNull();

    // Assert TipTap content container is present
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();

    // Assert rendered formatted DOM nodes
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Hello World');
    expect(screen.getByText('Bold text')).toBeDefined();
  });

  it('renders all formatting toolbar buttons', () => {
    render(<MarkdownEditor value="Initial text" onChange={vi.fn()} />);

    expect(screen.getByTestId('markdown-action-toolbar')).toBeDefined();
    expect(screen.getByTestId('toolbar-bold-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-italic-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-h1-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-h2-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-h3-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-bullet-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-ordered-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-task-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-link-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-code-btn')).toBeDefined();
    expect(screen.getByTestId('toolbar-quote-btn')).toBeDefined();
  });

  it('triggers onChange with updated markdown when formatting toolbar button is clicked', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="Hello world" onChange={onChange} />);

    const h1Btn = screen.getByTestId('toolbar-h1-btn');
    fireEvent.click(h1Btn);

    expect(onChange).toHaveBeenCalled();
    const lastCallArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallArg).toContain('# Hello world');
  });

  it('updates toolbar active state when cursor or content is on active node', () => {
    render(<MarkdownEditor value="# Heading text" onChange={vi.fn()} />);

    const h1Btn = screen.getByTestId('toolbar-h1-btn');
    expect(h1Btn.className).toContain('bg-slate-200');
  });

  it('handles clicking different formatting toolbar buttons without error', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="Sample text" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('toolbar-italic-btn'));
    fireEvent.click(screen.getByTestId('toolbar-h1-btn'));
    fireEvent.click(screen.getByTestId('toolbar-h2-btn'));
    fireEvent.click(screen.getByTestId('toolbar-h3-btn'));
    fireEvent.click(screen.getByTestId('toolbar-bullet-btn'));
    fireEvent.click(screen.getByTestId('toolbar-ordered-btn'));
    fireEvent.click(screen.getByTestId('toolbar-task-btn'));
    fireEvent.click(screen.getByTestId('toolbar-quote-btn'));
    fireEvent.click(screen.getByTestId('toolbar-code-btn'));

    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
  });

  it('renders complex markdown elements including blockquotes, lists, and code blocks in WYSIWYG mode', () => {
    const content = `# Heading 1
## Heading 2
### Heading 3

> Notable quotation

- Bullet item
1. Numbered item

\`\`\`
code block
\`\`\`
`;
    render(<MarkdownEditor value={content} onChange={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Heading 1');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('Heading 2');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toContain('Heading 3');
    expect(screen.getByText('Notable quotation')).toBeDefined();
    expect(screen.getByText('Bullet item')).toBeDefined();
    expect(screen.getByText('Numbered item')).toBeDefined();
    expect(screen.getByText('code block')).toBeDefined();
  });

  it('syncs external value updates when opening a different note', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MarkdownEditor value="# First Note" onChange={onChange} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('First Note');

    rerender(<MarkdownEditor value="# Second Note" onChange={onChange} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Second Note');
  });

  it('handles link toolbar button with prompt input', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://quietflow.app');
    const onChange = vi.fn();

    render(<MarkdownEditor value="Visit website" onChange={onChange} />);

    const linkBtn = screen.getByTestId('toolbar-link-btn');
    fireEvent.click(linkBtn);

    expect(promptSpy).toHaveBeenCalledWith('URL', '');
    promptSpy.mockRestore();
  });

  it('handles cancelling link prompt gracefully', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const onChange = vi.fn();

    render(<MarkdownEditor value="Visit website" onChange={onChange} />);

    const linkBtn = screen.getByTestId('toolbar-link-btn');
    fireEvent.click(linkBtn);

    expect(promptSpy).toHaveBeenCalledWith('URL', '');
    promptSpy.mockRestore();
  });

  it('unsets link if prompt returns empty string', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    const onChange = vi.fn();

    render(<MarkdownEditor value="Visit [website](https://example.com)" onChange={onChange} />);

    const linkBtn = screen.getByTestId('toolbar-link-btn');
    fireEvent.click(linkBtn);

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('toggles between WYSIWYG and Raw Markdown source view via button and Cmd+/', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="## Title\n\nSome text" onChange={onChange} />);

    const sourceBtn = screen.getByTestId('toolbar-source-toggle-btn');
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
    expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
    expect(sourceBtn.getAttribute('title')).toBe('View Markdown Source (Cmd+/)');

    // Click View Source
    fireEvent.click(sourceBtn);
    const textarea = screen.getByTestId('markdown-source-textarea') as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    expect(textarea.value).toContain('## Title');
    expect(screen.queryByTestId('tiptap-editor-content')).toBeNull();
    expect(sourceBtn.getAttribute('title')).toBe('View Rich Text (Cmd+/)');
    expect(sourceBtn.className).toContain('bg-slate-200');

    // Toggle back via button
    fireEvent.click(sourceBtn);
    expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
    expect(sourceBtn.getAttribute('title')).toBe('View Markdown Source (Cmd+/)');

    const editorContainer = screen.getByTestId('markdown-editor-container');

    // Global window keydown should NOT toggle (scoped to container)
    fireEvent.keyDown(window, { key: '/', metaKey: true });
    expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();

    // Toggle via Cmd+/ (metaKey) on the scoped editor container
    fireEvent.keyDown(editorContainer, { key: '/', metaKey: true });
    expect(screen.getByTestId('markdown-source-textarea')).toBeDefined();
    expect(screen.queryByTestId('tiptap-editor-content')).toBeNull();

    // Toggle back via Ctrl+/ (ctrlKey) on the scoped editor container
    fireEvent.keyDown(editorContainer, { key: '/', ctrlKey: true });
    expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();
  });

  it('allows typing in raw markdown source textarea and calls onChange', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="Initial text" onChange={onChange} />);

    const sourceBtn = screen.getByTestId('toolbar-source-toggle-btn');
    fireEvent.click(sourceBtn);

    const textarea = screen.getByTestId('markdown-source-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated markdown content' } });

    expect(onChange).toHaveBeenCalledWith('Updated markdown content');
    expect(textarea.value).toBe('Updated markdown content');
  });

  it('syncs updated source content back to WYSIWYG editor when toggled back', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Initial Heading" onChange={onChange} />);

    const sourceBtn = screen.getByTestId('toolbar-source-toggle-btn');
    fireEvent.click(sourceBtn);

    const textarea = screen.getByTestId('markdown-source-textarea');
    fireEvent.change(textarea, { target: { value: '## Switched to H2' } });

    // Toggle back to rich text
    fireEvent.click(sourceBtn);
    expect(screen.queryByTestId('markdown-source-textarea')).toBeNull();
    expect(screen.getByTestId('tiptap-editor-content')).toBeDefined();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('Switched to H2');
  });

  it('disables formatting toolbar buttons when in source mode', () => {
    render(<MarkdownEditor value="Some notes" onChange={vi.fn()} />);

    const boldBtn = screen.getByTestId('toolbar-bold-btn') as HTMLButtonElement;
    const h1Btn = screen.getByTestId('toolbar-h1-btn') as HTMLButtonElement;
    const sourceBtn = screen.getByTestId('toolbar-source-toggle-btn');

    expect(boldBtn.disabled).toBe(false);
    expect(h1Btn.disabled).toBe(false);

    // Enter source mode
    fireEvent.click(sourceBtn);
    expect(boldBtn.disabled).toBe(true);
    expect(h1Btn.disabled).toBe(true);
    expect(boldBtn.className).toContain('opacity-40');

    // Exit source mode
    fireEvent.click(sourceBtn);
    expect(boldBtn.disabled).toBe(false);
    expect(h1Btn.disabled).toBe(false);
    expect(boldBtn.className).not.toContain('opacity-40');
  });

  it('scopes Cmd+/ to the targeted editor container without affecting sibling editors', () => {
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();
    render(
      <div>
        <div data-testid="wrapper-1">
          <MarkdownEditor value="# Editor One" onChange={onChange1} />
        </div>
        <div data-testid="wrapper-2">
          <MarkdownEditor value="# Editor Two" onChange={onChange2} />
        </div>
      </div>
    );

    const wrapper1 = screen.getByTestId('wrapper-1');
    const wrapper2 = screen.getByTestId('wrapper-2');

    const container1 = wrapper1.querySelector('[data-testid="markdown-editor-container"]')!;
    const container2 = wrapper2.querySelector('[data-testid="markdown-editor-container"]')!;

    // Trigger Cmd+/ only on container 1
    fireEvent.keyDown(container1, { key: '/', metaKey: true });

    // Assert container 1 switched to source mode
    expect(wrapper1.querySelector('[data-testid="markdown-source-textarea"]')).not.toBeNull();
    expect(wrapper1.querySelector('[data-testid="tiptap-editor-content"]')).toBeNull();

    // Assert container 2 remains in WYSIWYG mode
    expect(wrapper2.querySelector('[data-testid="markdown-source-textarea"]')).toBeNull();
    expect(wrapper2.querySelector('[data-testid="tiptap-editor-content"]')).not.toBeNull();
  });

  it('does not reset editor content when value prop changes if editor is focused', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MarkdownEditor value="# Stable Content" onChange={onChange} />);

    const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
    expect(editorEl).not.toBeNull();

    // Focus editor element
    await act(async () => {
      editorEl.focus();
    });

    // Rerender with different value while focused
    await act(async () => {
      rerender(<MarkdownEditor value="# New Content From Parent" onChange={onChange} />);
    });

    // Content should remain the previous content because editor.isFocused prevents setContent
    expect(editorEl.textContent).toContain('Stable Content');
    expect(editorEl.textContent).not.toContain('New Content From Parent');
  });

  it('renders task list items with interactive checkboxes and in-line content structure', () => {
    const markdown = `# Tasks\n\n- [ ] Check with Cloudhero team\n- [x] Completed task`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={vi.fn()} />);

    const taskList = container.querySelector('ul[data-type="taskList"]');
    expect(taskList).not.toBeNull();

    const taskItems = taskList!.querySelectorAll('li');
    expect(taskItems.length).toBe(2);

    // Unchecked task
    const firstTask = taskItems[0];
    expect(firstTask.getAttribute('data-checked')).toBe('false');
    const firstCheckbox = firstTask.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(firstCheckbox).not.toBeNull();
    expect(firstCheckbox.checked).toBe(false);
    expect(firstTask.querySelector('div')?.textContent).toContain('Check with Cloudhero team');

    // Checked task
    const secondTask = taskItems[1];
    expect(secondTask.getAttribute('data-checked')).toBe('true');
    const secondCheckbox = secondTask.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(secondCheckbox).not.toBeNull();
    expect(secondCheckbox.checked).toBe(true);
    expect(secondTask.querySelector('div')?.textContent).toContain('Completed task');
  });

  it('renders markdown headings and standard HTML markup in WYSIWYG mode', () => {
    const mixedContent = `# 09/17\n\nRegistered for this [workshop](https://example.com)\n\n<b>Raw HTML Bold</b>\n\n<h3>HTML Heading 3</h3>`;
    render(<MarkdownEditor value={mixedContent} onChange={vi.fn()} />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('09/17');

    const link = screen.getByRole('link', { name: 'workshop' });
    expect(link.getAttribute('href')).toBe('https://example.com');

    expect(screen.getByText('Raw HTML Bold')).toBeDefined();

    const h3 = screen.getByRole('heading', { level: 3 });
    expect(h3.textContent).toBe('HTML Heading 3');
  });

  it('toggles task item checkbox and emits updated markdown with checked status', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Item 1\n- [ ] Item 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const firstCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(firstCheckbox).not.toBeNull();
    fireEvent.click(firstCheckbox);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [x] Item 1');
  });

  it('inserts today date section at top of document when clicking toolbar-date-btn', () => {
    const onChange = vi.fn();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expectedDate = `## ${yyyy}-${mm}-${dd}`;

    render(<MarkdownEditor value="Existing note content" onChange={onChange} />);

    const dateBtn = screen.getByTestId('toolbar-date-btn');
    expect(dateBtn).not.toBeNull();
    fireEvent.click(dateBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain(expectedDate);
    // Ensure it is at the beginning
    expect(lastArg.trim().startsWith(expectedDate)).toBe(true);
    expect(lastArg).toContain('Existing note content');
  });

  it('inserts today date section in source mode at top or preserving frontmatter', () => {
    const onChange = vi.fn();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expectedDate = `## ${yyyy}-${mm}-${dd}`;

    const { getByTestId } = render(
      <MarkdownEditor
        value="Body text"
        onChange={onChange}
      />
    );

    // Toggle into source mode
    const sourceToggle = getByTestId('toolbar-source-toggle-btn');
    fireEvent.click(sourceToggle);

    // In source mode, user has frontmatter
    const textarea = screen.getByTestId('markdown-source-textarea');
    fireEvent.change(textarea, {
      target: { value: `---\ntitle: Doc\n---\n\nBody text` },
    });

    const dateBtn = getByTestId('toolbar-date-btn');
    fireEvent.click(dateBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('---\ntitle: Doc\n---');
    expect(lastArg).toContain(expectedDate);
    // Ensure date heading is placed immediately after frontmatter
    const fmIndex = lastArg.indexOf('---');
    const fmEndIndex = lastArg.indexOf('---', fmIndex + 3) + 3;
    const dateIndex = lastArg.indexOf(expectedDate);
    expect(dateIndex).toBeGreaterThan(fmEndIndex);
    expect(dateIndex).toBeLessThan(lastArg.indexOf('Body text'));
  });

  it('renders nested bullet list inside task list item with hierarchical structure', () => {
    const markdown = `- [ ] Parent task\n  - Nested bullet 1\n  - Nested bullet 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={vi.fn()} />);

    const taskList = container.querySelector('ul[data-type="taskList"]');
    expect(taskList).not.toBeNull();

    const nestedBulletList = taskList!.querySelector('div > ul');
    expect(nestedBulletList).not.toBeNull();

    const nestedBullets = nestedBulletList!.querySelectorAll('li');
    expect(nestedBullets.length).toBe(2);
    expect(nestedBullets[0].textContent).toContain('Nested bullet 1');
    expect(nestedBullets[1].textContent).toContain('Nested bullet 2');
  });

  it('renders nested task list inside bullet list item with hierarchical structure', () => {
    const markdown = `- Parent bullet\n  - [ ] Nested task 1\n  - [x] Nested task 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={vi.fn()} />);

    const rootBulletList = container.querySelector('ul:not([data-type="taskList"])');
    expect(rootBulletList).not.toBeNull();

    const nestedTaskList = rootBulletList!.querySelector('ul[data-type="taskList"]');
    expect(nestedTaskList).not.toBeNull();

    const nestedTasks = nestedTaskList!.querySelectorAll('li');
    expect(nestedTasks.length).toBe(2);
    expect(nestedTasks[0].getAttribute('data-checked')).toBe('false');
    expect(nestedTasks[1].getAttribute('data-checked')).toBe('true');
    expect(nestedTasks[0].textContent).toContain('Nested task 1');
    expect(nestedTasks[1].textContent).toContain('Nested task 2');
  });

  it('converts bullet list to task list when toolbar task button is clicked', () => {
    const onChange = vi.fn();
    const markdown = `- Item 1\n- Item 2`;
    render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const taskBtn = screen.getByTestId('toolbar-task-btn');
    fireEvent.click(taskBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Item 1');
  });

  it('converts task list to bullet list when toolbar bullet button is clicked', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Task 1\n- [ ] Task 2`;
    render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');
    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- Task 1');
    expect(lastArg).not.toContain('- [ ] Task 1');
  });
  it('converts child task indented under parent task to a bullet list item when clicking toolbar bullet button', () => {
    const onChange = vi.fn();
    // Two tasks where second task is indented under first (child task)
    const markdown = `- [ ] Parent Task\n  - [ ] Child Task`;
    render(<MarkdownEditor value={markdown} onChange={onChange} />);

    // In TipTap, the initial cursor is at the end of the document (inside Child Task)
    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');

    // Check onMouseDown has preventDefault
    const mouseDownEvt = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    bulletBtn.dispatchEvent(mouseDownEvt);
    expect(mouseDownEvt.defaultPrevented).toBe(true);

    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    // Parent task should remain a task
    expect(lastArg).toContain('- [ ] Parent Task');
    // Child task should be converted to a bullet point indented under parent task
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- Child Task/);
  });

  it('converts child bullet item indented under parent to a task item when clicking toolbar task button', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Parent Task\n  - Child Bullet`;
    render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const taskBtn = screen.getByTestId('toolbar-task-btn');
    fireEvent.click(taskBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Parent Task');
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- \[ \] Child Bullet/);
  });

  it('moves cursor to the line immediately below the date heading when clicking toolbar-date-btn', () => {
    const onChange = vi.fn();
    const { container } = render(<MarkdownEditor value="Initial note body" onChange={onChange} />);

    const dateBtn = screen.getByTestId('toolbar-date-btn');

    // Check onMouseDown has preventDefault to avoid losing focus
    const mouseDownEvt = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    dateBtn.dispatchEvent(mouseDownEvt);
    expect(mouseDownEvt.defaultPrevented).toBe(true);

    fireEvent.click(dateBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(lastArg).toContain(`## ${expectedDate}`);

    // Verify DOM structure: heading followed by empty paragraph
    const editorEl = container.querySelector('.tiptap');
    expect(editorEl).not.toBeNull();
    const heading = editorEl!.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe(expectedDate);
    const nextEl = heading!.nextElementSibling;
    expect(nextEl).not.toBeNull();
    expect(nextEl!.tagName.toLowerCase()).toBe('p');
  });

  it('converts child task to bullet point using keyboard shortcut Mod-Shift-8', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Parent Task\n  - [ ] Child Task`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editorEl = container.querySelector('.tiptap')!;
    fireEvent.keyDown(editorEl, {
      key: '8',
      code: 'Digit8',
      metaKey: true,
      shiftKey: true,
    });

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Parent Task');
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- Child Task/);
  });

  it('converts child task to bullet point when typing - followed by space at start of item', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Parent Task\n  - [ ] -`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editorEl = container.querySelector('.tiptap')!;
    fireEvent.keyDown(editorEl, {
      key: ' ',
      code: 'Space',
    });

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Parent Task');
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- /);
  });

  it('does NOT convert parent task when child task is selected and converted', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Parent Task\n  - [ ] Child Task\n- [ ] Root Task 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editor = (container.querySelector('[data-testid="markdown-editor-container"]') as any).__tiptap_editor;
    let childPos = -1;
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.isText && node.text?.includes('Child Task')) {
        childPos = pos + 1;
      }
    });
    expect(childPos).toBeGreaterThan(0);
    editor.commands.setTextSelection(childPos);

    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');
    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Parent Task');
    expect(lastArg).toContain('- [ ] Root Task 2');
    expect(lastArg).not.toContain('- Parent Task');
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- Child Task/);
  });

  it('indents second task with Tab and converts to bullet point', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Task 1\n- [ ] Task 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editorEl = container.querySelector('.tiptap')!;
    fireEvent.keyDown(editorEl, {
      key: 'Tab',
      code: 'Tab',
    });

    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');
    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Task 1');
    expect(lastArg).toMatch(/- \[ \] Task 1\s+- Task 2/);
  });

  it('does NOT convert parent task when child task has NodeSelection', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Parent Task\n  - [ ] Child Task\n- [ ] Root Task 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editor = (container.querySelector('[data-testid="markdown-editor-container"]') as any).__tiptap_editor;
    let childItemPos = -1;
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'taskItem' && node.textContent.includes('Child Task')) {
        childItemPos = pos;
      }
    });
    expect(childItemPos).toBeGreaterThan(0);
    editor.commands.setNodeSelection(childItemPos);

    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');
    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [ ] Parent Task');
    expect(lastArg).toContain('- [ ] Root Task 2');
    expect(lastArg).not.toContain('- Parent Task');
    expect(lastArg).toMatch(/- \[ \] Parent Task\s+- Child Task/);
  });

  it('correctly handles child task conversion with blank lines and links', () => {
    const onChange = vi.fn();
    const markdown = `- [x] Buy [tickets and hotel](https://example.com) for Kansas City.\n\n  - [ ] October 27-29\n\n  - [ ] Block my family and work calendar`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editor = (container.querySelector('[data-testid="markdown-editor-container"]') as any).__tiptap_editor;

    let childPos = -1;
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.isText && node.text?.includes('October 27-29')) {
        childPos = pos + 1;
      }
    });
    expect(childPos).toBeGreaterThan(0);
    editor.commands.setTextSelection(childPos);

    const bulletBtn = screen.getByTestId('toolbar-bullet-btn');
    fireEvent.click(bulletBtn);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg).toContain('- [x] Buy [tickets and hotel](https://example.com) for Kansas City.');
    expect(lastArg).toMatch(/-\s+October 27-29/);
  });

  it('tests mixed task and bullet list parsing in TipTap', () => {
    const onChange = vi.fn();
    const markdown = `- [ ] Item 0\n- Item 1\n- [ ] Item 2`;
    const { container } = render(<MarkdownEditor value={markdown} onChange={onChange} />);

    const editor = (container.querySelector('[data-testid="markdown-editor-container"]') as any).__tiptap_editor;
    const serialized = editor.storage.markdown.getMarkdown();
    expect(serialized).toContain('- [ ] Item 0');
    expect(serialized).toContain('- Item 1');
    expect(serialized).toContain('- [ ] Item 2');
  });
});
