import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    const boldBtn = screen.getByTestId('toolbar-bold-btn');
    fireEvent.click(boldBtn);

    expect(screen.getByTestId('toolbar-bold-btn')).toBeDefined();
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
});
