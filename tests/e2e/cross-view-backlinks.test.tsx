import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { KanbanCard } from '../../src/components/kanban/KanbanCard';
import { useVaultStore } from '../../src/store/vaultStore';
import { TaskItem } from '../../src/store/types';
import { ipc } from '../../src/store/ipc';

vi.mock('../../src/store/ipc', () => ({
  ipc: {
    readFile: vi.fn().mockResolvedValue('# Acme Corp\n- [ ] Task 1\n'),
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
    listSnapshots: vi.fn().mockResolvedValue([]),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
  },
}));

describe('Cross-View Backlinks to Note Canvas', () => {
  const sampleTask: TaskItem = {
    id: 'task-1',
    title: 'Finalize Q3 roadmap',
    status: 'todo',
    filePath: 'Customers/Acme Corp.md',
    rawLine: '- [ ] Finalize Q3 roadmap',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
  });

  it('renders note backlink on TaskRow and navigates on click', async () => {
    render(
      <TaskRow
        task={sampleTask}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    const backlink = screen.getByTestId('note-backlink-task-1');
    expect(backlink).toBeDefined();
    expect(backlink.textContent).toContain('Acme Corp');

    fireEvent.click(backlink);
    await waitFor(() => {
      expect(useVaultStore.getState().activeFile).toBe('Customers/Acme Corp.md');
      expect(useVaultStore.getState().activeView).toBe('document');
    });
  });

  it('renders note backlink on KanbanCard and navigates on click', async () => {
    render(
      <KanbanCard
        task={sampleTask}
        onSelect={vi.fn()}
      />
    );

    const backlink = screen.getByTestId('kanban-note-backlink-task-1');
    expect(backlink).toBeDefined();
    expect(backlink.textContent).toContain('Acme Corp');

    fireEvent.click(backlink);
    await waitFor(() => {
      expect(useVaultStore.getState().activeFile).toBe('Customers/Acme Corp.md');
      expect(useVaultStore.getState().activeView).toBe('document');
    });
  });
});
