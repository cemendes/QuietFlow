import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LensDocumentCanvas } from '../../src/components/document/LensDocumentCanvas';
import { useVaultStore } from '../../src/store/vaultStore';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';
import { ipc } from '../../src/store/ipc';

vi.mock('../../src/store/ipc', () => ({
  ipc: {
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('- [ ] Deliver SOW @priority(high) #core\n  - [x] Security review\n  - [ ] Legal approval\n- [x] Initial discovery call\n'),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
  },
}));

describe('LensDocumentCanvas', () => {
  const sampleMarkdown = `---
title: Acme Corp Migration
tags: [client/acme, roadmap]
---

- [ ] Deliver SOW @priority(high) #core
  - [x] Security review
  - [ ] Legal approval
- [x] Initial discovery call

### Meeting Notes
Discussed $120k budget approval.
`;

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    const doc = parseMarkdownDocument(sampleMarkdown, 'Customers/Acme Corp.md');
    useVaultStore.setState({
      activeFile: 'Customers/Acme Corp.md',
      activeDocument: doc,
      tasks: doc.tasks,
      lensViewMode: 'split',
    });
  });

  it('shows only the notes editor: no task cards, task zone or lens toggles', () => {
    render(<LensDocumentCanvas />);

    expect(screen.getByTestId('bottom-notes-zone')).toBeDefined();
    expect(screen.queryByTestId('top-tasks-zone')).toBeNull();
    expect(screen.queryByTestId('document-task-card-task-deliver-sow')).toBeNull();
    expect(screen.queryByTestId('lens-split-btn')).toBeNull();
    expect(screen.queryByTestId('lens-tasks-only-btn')).toBeNull();
    expect(screen.queryByTestId('lens-notes-only-btn')).toBeNull();
  });

  it('displays error notice when reading a document fails', () => {
    useVaultStore.setState({
      activeFile: 'Corrupted.md',
      activeDocument: null,
      error: 'Failed to read file: Corrupted.md',
    });

    render(<LensDocumentCanvas />);

    expect(screen.getByText('Unable to load document')).toBeDefined();
    expect(screen.getByText('Failed to read file: Corrupted.md')).toBeDefined();
  });

  it('switches notes cleanly when activeFile changes', async () => {
    const { rerender } = render(<LensDocumentCanvas />);
    expect(screen.getByText('Acme Corp Migration')).toBeDefined();

    const note2Markdown = `---
title: WellSky Workshop
---

### Architecture
DevDay presentation details.`;
    const doc2 = parseMarkdownDocument(note2Markdown, 'Google/Wellsky/DevDay.md');

    useVaultStore.setState({
      activeFile: 'Google/Wellsky/DevDay.md',
      activeDocument: doc2,
      tasks: doc2.tasks,
    });

    rerender(<LensDocumentCanvas />);

    expect(screen.getByText('WellSky Workshop')).toBeDefined();
  });

  it('opens a note read-only; Edit unlocks the editor and Save returns to reading', async () => {
    render(<LensDocumentCanvas />);

    // Read mode: content visible, nothing editable
    expect(screen.getByText('Acme Corp Migration')).toBeDefined();
    expect(screen.queryByTestId('markdown-action-toolbar')).toBeNull();
    expect(screen.queryByTestId('save-note-btn')).toBeNull();
    expect(screen.queryByTestId('note-title-input')).toBeNull();
    await waitFor(() =>
      expect(document.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false'),
    );

    fireEvent.click(screen.getByTestId('edit-note-btn'));

    expect(screen.getByTestId('markdown-action-toolbar')).toBeDefined();
    expect(screen.getByDisplayValue('Acme Corp Migration')).toBeDefined();
    await waitFor(() =>
      expect(document.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('true'),
    );

    fireEvent.click(screen.getByTestId('save-note-btn'));

    await waitFor(() => expect(screen.getByTestId('edit-note-btn')).toBeDefined());
    expect(screen.getByTestId('note-saved-indicator')).toBeDefined();
    expect(ipc.writeFileAtomic).toHaveBeenCalled();
  });
});
