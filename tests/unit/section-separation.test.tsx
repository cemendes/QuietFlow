import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import TaskList from '../../src/components/tasks/TaskList';
import { NotesHome } from '../../src/components/notes/NotesHome';
import { ViewSwitcher } from '../../src/components/tasks/ViewSwitcher';
import { useVaultStore } from '../../src/store';
import type { VaultNode } from '../../src/store/types';

vi.mock('../../src/store/ipc', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/store/ipc')>();
  return {
    ...mod,
    ipc: {
      ...mod.ipc,
      readFile: vi.fn().mockResolvedValue('# Note\n\n- [ ] A task\n'),
      listSnapshots: vi.fn().mockResolvedValue([]),
    },
  };
});

const note = (path: string): VaultNode => ({
  name: path.split('/').pop()!,
  path,
  isDirectory: false,
  fileCount: 0,
  children: [],
});

// Each section keeps its files in its own folder: Anotações/ for notes, Tarefas/ for task lists.
const tree: VaultNode = {
  name: 'Vault',
  path: '/vault',
  isDirectory: true,
  fileCount: 3,
  children: [
    {
      name: 'Anotações',
      path: '/vault/Anotações',
      isDirectory: true,
      fileCount: 2,
      children: [
        {
          name: 'Project Alpha',
          path: '/vault/Anotações/Project Alpha',
          isDirectory: true,
          fileCount: 1,
          children: [note('/vault/Anotações/Project Alpha/Kickoff.md')],
        },
        note('/vault/Anotações/Ideas.md'),
      ],
    },
    {
      name: 'Tarefas',
      path: '/vault/Tarefas',
      isDirectory: true,
      fileCount: 1,
      children: [note('/vault/Tarefas/Inbox.md')],
    },
  ],
};

describe('Tasks and Notes are separate sections', () => {
  beforeEach(() => {
    useVaultStore.getState().reset();
    useVaultStore.setState({ vaultPath: '/vault', vaultTree: tree, activeFolder: '/vault/Anotações' });
  });

  it('starts in the Notes section', () => {
    expect(useVaultStore.getState().section).toBe('notes');
  });

  it('the task list never renders notes or a Notes tab', () => {
    useVaultStore.setState({
      tasks: [{ id: 't1', title: 'Action item', status: 'todo', filePath: '/vault/Tarefas/Inbox.md', lineIndex: 1 }],
    });
    render(<TaskList onAddTask={vi.fn()} />);

    expect(screen.getByText('Action item')).toBeInTheDocument();
    expect(screen.queryByTestId('vault-tab-notes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vault-notes-grid')).not.toBeInTheDocument();
  });

  it('the task view switcher has no Document view', () => {
    render(<ViewSwitcher />);
    expect(screen.queryByText('Document')).not.toBeInTheDocument();
  });

  it('NotesHome lists every note of the vault and opens one in the Notes section', async () => {
    render(<NotesHome />);

    expect(screen.getByTestId('vault-notes-grid')).toBeInTheDocument();
    expect(screen.getByText('Kickoff')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Kickoff'));

    await waitFor(() => {
      expect(useVaultStore.getState().section).toBe('notes');
      expect(useVaultStore.getState().activeFile).toBe('/vault/Anotações/Project Alpha/Kickoff.md');
    });
  });

  it('NotesHome scopes to the selected folder', () => {
    useVaultStore.setState({ activeFolder: '/vault/Anotações/Project Alpha' });
    render(<NotesHome />);

    expect(screen.getByText('Kickoff')).toBeInTheDocument();
    expect(screen.queryByText('Ideas')).not.toBeInTheDocument();
  });

  it('remembers each section\'s own selection when switching', async () => {
    useVaultStore.setState({ section: 'tasks' });
    await act(async () => {
      await useVaultStore.getState().selectFile('/vault/Tarefas/Inbox.md');
    });
    await act(async () => {
      await useVaultStore.getState().setSection('notes');
    });

    // Notes starts fresh at the top of Anotações/: the tasks-side file is not carried over
    expect(useVaultStore.getState().activeFile).toBeNull();
    expect(useVaultStore.getState().activeFolder).toBe('/vault/Anotações');
    expect(useVaultStore.getState().tasks).toEqual([]);

    await act(async () => {
      await useVaultStore.getState().openNote('/vault/Anotações/Project Alpha/Kickoff.md');
    });
    await act(async () => {
      await useVaultStore.getState().setSection('tasks');
    });

    expect(useVaultStore.getState().section).toBe('tasks');
    expect(useVaultStore.getState().activeFile).toBe('/vault/Tarefas/Inbox.md');

    await act(async () => {
      await useVaultStore.getState().setSection('notes');
    });
    expect(useVaultStore.getState().activeFile).toBe('/vault/Anotações/Project Alpha/Kickoff.md');
  });

  it('NotesHome never lists task lists from Tarefas/', () => {
    render(<NotesHome />);
    expect(screen.getAllByTestId('vault-note-card')).toHaveLength(2);
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
  });

  it('switching to Tasks for the first time lands on the grid of lists at Tarefas/', async () => {
    await act(async () => {
      await useVaultStore.getState().setSection('tasks');
    });
    const s = useVaultStore.getState();
    expect(s.activeView).toBe('home');
    expect(s.activeFolder).toBe('/vault/Tarefas');
    expect(s.activeFile).toBeNull();
  });
});
