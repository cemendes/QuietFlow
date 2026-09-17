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
});

