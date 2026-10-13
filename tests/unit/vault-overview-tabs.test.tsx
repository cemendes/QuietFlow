import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TaskList from '../../src/components/tasks/TaskList';
import { useVaultStore } from '../../src/store';
import { VaultNode } from '../../src/store/types';

describe('TaskList Vault Overview Tabs', () => {
  const mockTree: VaultNode = {
    name: 'QuietFlowVault',
    path: '/path/to/vault',
    isDirectory: true,
    fileCount: 2,
    children: [
      {
        name: 'Project Alpha',
        path: '/path/to/vault/Project Alpha',
        isDirectory: true,
        fileCount: 1,
        children: [
          {
            name: 'Kickoff.md',
            path: '/path/to/vault/Project Alpha/Kickoff.md',
            isDirectory: false,
            fileCount: 0,
            children: [],
          },
        ],
      },
      {
        name: 'Ideas.md',
        path: '/path/to/vault/Ideas.md',
        isDirectory: false,
        fileCount: 0,
        children: [],
      },
    ],
  };

  it('renders All Tasks and All Notes tabs when activeScope is vault', async () => {
    const selectFile = vi.fn();
    const setActiveView = vi.fn();

    useVaultStore.setState({
      vaultPath: '/path/to/vault',
      vaultTree: mockTree,
      activeFolder: '/path/to/vault',
      activeFile: null,
      tasks: [
        {
          id: 'task-1',
          title: 'Action item in project',
          status: 'todo',
          filePath: '/path/to/vault/Project Alpha/Kickoff.md',
          lineIndex: 5,
        },
      ],
      selectFile,
      setActiveView,
    });

    render(<TaskList onAddTask={vi.fn()} />);

    // Verify tabs are visible
    const tasksTab = screen.getByTestId('vault-tab-tasks');
    const notesTab = screen.getByTestId('vault-tab-notes');
    expect(tasksTab).toBeInTheDocument();
    expect(notesTab).toBeInTheDocument();
    expect(tasksTab).toHaveTextContent(/All Tasks \(1\)/);
    expect(notesTab).toHaveTextContent(/All Notes \(2\)/);

    // Initial view is tasks
    expect(screen.getByText('Action item in project')).toBeInTheDocument();
    expect(screen.queryByTestId('vault-notes-grid')).not.toBeInTheDocument();

    // Click notes tab
    fireEvent.click(notesTab);

    // Notes grid should now be visible
    expect(screen.getByTestId('vault-notes-grid')).toBeInTheDocument();
    expect(screen.getByText('Kickoff')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();

    // Click a note card to navigate to document view
    const kickoffCard = screen.getAllByTestId('vault-note-card')[0];
    fireEvent.click(kickoffCard);

    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      expect(useVaultStore.getState().activeFile).toBe('/path/to/vault/Project Alpha/Kickoff.md');
      expect(useVaultStore.getState().activeView).toBe('document');
    });
  });
});
