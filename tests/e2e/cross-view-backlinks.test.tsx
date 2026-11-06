import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { KanbanCard } from '../../src/components/kanban/KanbanCard';
import { useVaultStore } from '../../src/store/vaultStore';
import { TaskItem } from '../../src/store/types';

vi.mock('../../src/store/ipc', () => ({
  ipc: {
    readFile: vi.fn().mockResolvedValue('# Acme Corp\n- [ ] Task 1\n'),
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
    listSnapshots: vi.fn().mockResolvedValue([]),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
  },
}));

const LIST = '/vault/Tarefas/Customers/Acme Corp.md';

describe('Task list badge on tasks', () => {
  const sampleTask: TaskItem = {
    id: 'task-1',
    title: 'Finalize Q3 roadmap',
    status: 'todo',
    filePath: LIST,
    rawLine: '- [ ] Finalize Q3 roadmap',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    useVaultStore.setState({ vaultPath: '/vault', section: 'tasks' });
  });

  it('TaskRow: opens the task list in Tarefas, never as a note', async () => {
    render(<TaskRow task={sampleTask} onToggle={vi.fn()} onSelect={vi.fn()} />);

    const badge = screen.getByTestId('note-backlink-task-1');
    expect(badge.textContent).toContain('Acme Corp');

    fireEvent.click(badge);
    await waitFor(() => {
      expect(useVaultStore.getState().activeFile).toBe(LIST);
      expect(useVaultStore.getState().section).toBe('tasks');
      expect(useVaultStore.getState().activeView).toBe('list');
    });
  });

  it('KanbanCard: opens the task list in Tarefas, never as a note', async () => {
    render(<KanbanCard task={sampleTask} onSelect={vi.fn()} />);

    const badge = screen.getByTestId('kanban-note-backlink-task-1');
    expect(badge.textContent).toContain('Acme Corp');

    fireEvent.click(badge);
    await waitFor(() => {
      expect(useVaultStore.getState().activeFile).toBe(LIST);
      expect(useVaultStore.getState().section).toBe('tasks');
    });
  });

  it('hides the badge inside the list the task already belongs to', () => {
    useVaultStore.setState({ activeFile: LIST });
    render(<TaskRow task={sampleTask} onToggle={vi.fn()} onSelect={vi.fn()} />);
    render(<KanbanCard task={sampleTask} onSelect={vi.fn()} />);

    expect(screen.queryByTestId('note-backlink-task-1')).toBeNull();
    expect(screen.queryByTestId('kanban-note-backlink-task-1')).toBeNull();
  });
});
