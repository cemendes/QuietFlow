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

const tree: VaultNode = {
  name: 'Vault',
  path: '/vault',
  isDirectory: true,
  fileCount: 2,
  children: [
    {
      name: 'Project Alpha',
      path: '/vault/Project Alpha',
      isDirectory: true,
      fileCount: 1,
      children: [
        { name: 'Kickoff.md', path: '/vault/Project Alpha/Kickoff.md', isDirectory: false, fileCount: 0, children: [] },
      ],
    },
    { name: 'Ideas.md', path: '/vault/Ideas.md', isDirectory: false, fileCount: 0, children: [] },
  ],
};

describe('Tasks and Notes are separate sections', () => {
  beforeEach(() => {
    useVaultStore.getState().reset();
    useVaultStore.setState({ vaultPath: '/vault', vaultTree: tree, activeFolder: '/vault' });
  });

  it('starts in the Notes section', () => {
    expect(useVaultStore.getState().section).toBe('notes');
  });

  it('the task list never renders notes or a Notes tab', () => {
    useVaultStore.setState({
      tasks: [{ id: 't1', title: 'Action item', status: 'todo', filePath: '/vault/Ideas.md', lineIndex: 1 }],
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
      expect(useVaultStore.getState().activeFile).toBe('/vault/Project Alpha/Kickoff.md');
    });
  });

  it('NotesHome scopes to the selected folder', () => {
    useVaultStore.setState({ activeFolder: '/vault/Project Alpha' });
    render(<NotesHome />);

    expect(screen.getByText('Kickoff')).toBeInTheDocument();
    expect(screen.queryByText('Ideas')).not.toBeInTheDocument();
  });

  it('remembers each section\'s own selection when switching', async () => {
    useVaultStore.setState({ section: 'tasks' });
    await act(async () => {
      await useVaultStore.getState().selectFile('/vault/Ideas.md');
    });
    await act(async () => {
      await useVaultStore.getState().setSection('notes');
    });

    // Notes starts fresh at the vault root: the tasks-side file is not carried over
    expect(useVaultStore.getState().activeFile).toBeNull();
    expect(useVaultStore.getState().activeFolder).toBe('/vault');
    expect(useVaultStore.getState().tasks).toEqual([]);

    await act(async () => {
      await useVaultStore.getState().openNote('/vault/Project Alpha/Kickoff.md');
    });
    await act(async () => {
      await useVaultStore.getState().setSection('tasks');
    });

    expect(useVaultStore.getState().section).toBe('tasks');
    expect(useVaultStore.getState().activeFile).toBe('/vault/Ideas.md');

    await act(async () => {
      await useVaultStore.getState().setSection('notes');
    });
    expect(useVaultStore.getState().activeFile).toBe('/vault/Project Alpha/Kickoff.md');
  });
});
