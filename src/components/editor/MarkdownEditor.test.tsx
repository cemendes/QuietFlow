import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownEditor } from './MarkdownEditor';

async function prosemirror() {
  const content = await screen.findByTestId('tiptap-editor-content');
  await waitFor(() => expect(content.querySelector('.ProseMirror')).not.toBeNull());
  return content.querySelector('.ProseMirror') as HTMLElement;
}

describe('MarkdownEditor — Enter to submit', () => {
  it('Enter calls onSubmit and does not add a line', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<MarkdownEditor value="primeira linha" onChange={onChange} onSubmit={onSubmit} />);
    const pm = await prosemirror();

    fireEvent.keyDown(pm, { key: 'Enter', code: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Shift+Enter adds a new line and does not submit', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<MarkdownEditor value="primeira linha" onChange={onChange} onSubmit={onSubmit} />);
    const pm = await prosemirror();

    fireEvent.keyDown(pm, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
    expect(pm.querySelectorAll('p').length).toBe(2);
  });

  it('without onSubmit, Enter keeps its usual new-line behaviour', async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="primeira linha" onChange={onChange} />);
    const pm = await prosemirror();

    fireEvent.keyDown(pm, { key: 'Enter', code: 'Enter' });

    expect(pm.querySelectorAll('p').length).toBe(2);
  });

  it('in source mode, Enter submits and Shift+Enter is left to the textarea', async () => {
    const onSubmit = vi.fn();
    render(<MarkdownEditor value="texto" onChange={() => {}} onSubmit={onSubmit} />);
    await prosemirror();
    fireEvent.click(screen.getByTestId('toolbar-source-toggle-btn'));
    const textarea = await screen.findByTestId('markdown-source-textarea');

    const shift = fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(shift).toBe(true); // not prevented: the textarea inserts the newline itself

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
