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

  it('renders top action items and bottom notes in split view', () => {
    render(<LensDocumentCanvas />);

    expect(screen.getByTestId('document-task-card-task-deliver-sow')).toBeDefined();
    expect(screen.getByTestId('document-task-card-task-initial-discovery-call')).toBeDefined();
    expect(screen.getByTestId('bottom-notes-zone')).toBeDefined();
  });

  it('hides notes when Tasks Only lens is selected', () => {
    render(<LensDocumentCanvas />);

    const tasksOnlyBtn = screen.getByTestId('lens-tasks-only-btn');
    fireEvent.click(tasksOnlyBtn);

    expect(screen.getByTestId('top-tasks-zone')).toBeDefined();
    expect(screen.queryByTestId('bottom-notes-zone')).toBeNull();
  });

  it('hides task cards when Notes Only lens is selected', () => {
    render(<LensDocumentCanvas />);

    const notesOnlyBtn = screen.getByTestId('lens-notes-only-btn');
    fireEvent.click(notesOnlyBtn);

    expect(screen.queryByTestId('top-tasks-zone')).toBeNull();
    expect(screen.getByTestId('bottom-notes-zone')).toBeDefined();
  });

  it('toggles task completion when clicking task card checkbox', async () => {
    render(<LensDocumentCanvas />);

    const taskCheckbox = screen.getByTestId('task-checkbox-task-deliver-sow');
    fireEvent.click(taskCheckbox);

    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalled();
      expect(useVaultStore.getState().tasks.find((t) => t.id === 'task-deliver-sow')?.status).toBe('done');
    });
  });
});
