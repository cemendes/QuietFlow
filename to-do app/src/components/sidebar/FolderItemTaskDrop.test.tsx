import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FolderItem from './FolderItem';
import { useVaultStore } from '../../store';
import { ipc } from '../../store/ipc';

vi.mock('../../store/ipc', () => ({
  ipc: {
    readFile: vi.fn(),
    writeFileAtomic: vi.fn(),
    moveEntry: vi.fn(),
    initVault: vi.fn(),
    createDirectory: vi.fn(),
    deleteEntry: vi.fn(),
    startWatchingVault: vi.fn(),
    listenVaultChanged: vi.fn(),
  },
}));

describe('FolderItem Task Drop Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({
      vaultPath: '/vault',
      tasks: [
        {
          id: 'task-test-task',
          title: 'Test task',
          status: 'todo',
          filePath: '/vault/Inbox.md',
          tags: [],
        },
        {
          id: 'task-another-task',
          title: 'Another task',
          status: 'todo',
          filePath: '/vault/Inbox.md',
          tags: [],
        },
      ],
    });

    vi.mocked(ipc.readFile).mockImplementation(async (path: string) => {
      if (path === '/vault/Inbox.md') {
        return '# Tasks\n- [ ] Test task\n- [ ] Another task\n';
      }
      return '# Tasks\n';
    });
  });

  it('moves task into note file when dropped on a note item', async () => {
    const noteNode = {
      name: 'Client.md',
      path: '/vault/Projects/Client.md',
      isDirectory: false,
      children: [],
      fileCount: 0,
    };

    render(
      <FolderItem
        node={noteNode}
        activeFile={null}
        expandedPaths={new Set()}
        onToggleFolder={() => {}}
        onSelectFile={() => {}}
      />
    );

    const fileEl = screen.getByTestId('file-item-/vault/Projects/Client.md');

    // Simulate task drag-and-drop
    fireEvent.dragOver(fileEl);
    fireEvent.drop(fileEl, {
      dataTransfer: {
        types: ['application/json'],
        getData: (format: string) => {
          if (format === 'application/json') {
            return JSON.stringify({
              type: 'task',
              taskId: 'task-test-task',
              sourceFilePath: '/vault/Inbox.md',
            });
          }
          return '';
        },
      },
    });

    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
        '/vault/Projects/Client.md',
        expect.stringContaining('Test task')
      );
    });
  });

  it('moves task into default note when dropped on a folder item', async () => {
    const folderNode = {
      name: 'Projects',
      path: '/vault/Projects',
      isDirectory: true,
      children: [
        {
          name: 'Client.md',
          path: '/vault/Projects/Client.md',
          isDirectory: false,
          children: [],
          fileCount: 0,
        },
      ],
      fileCount: 1,
    };

    render(
      <FolderItem
        node={folderNode}
        activeFile={null}
        expandedPaths={new Set(['/vault/Projects'])}
        onToggleFolder={() => {}}
        onSelectFile={() => {}}
      />
    );

    const folderContainer = screen.getByTestId('folder-container-/vault/Projects');

    fireEvent.dragOver(folderContainer);
    fireEvent.drop(folderContainer, {
      dataTransfer: {
        types: ['application/json'],
        getData: (format: string) => {
          if (format === 'application/json') {
            return JSON.stringify({
              type: 'task',
              taskId: 'task-another-task',
              sourceFilePath: '/vault/Inbox.md',
            });
          }
          return '';
        },
      },
    });

    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
        '/vault/Projects/Client.md',
        expect.stringContaining('Another task')
      );
    });
  });
});
