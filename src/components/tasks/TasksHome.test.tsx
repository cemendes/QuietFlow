import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { TasksHome } from './TasksHome';
import { useVaultStore } from '../../store';
import { setLanguage } from '../../i18n';
import type { VaultNode } from '../../store/types';
import { ipc } from '../../store/ipc';

const FILES: Record<string, string> = {
  '/vault/Tarefas/Inbox.md': '# Inbox\n- [ ] Call bank\n- [x] Pay rent\n',
  '/vault/Tarefas/UFRJ/Cálculo.md': '# Cálculo\n- [ ] Lista 3\n- [ ] Lista 4\n- [x] Lista 2\n',
};

vi.mock('../../store/ipc', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../store/ipc')>();
  return {
    ...mod,
    ipc: {
      ...mod.ipc,
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      writeFileAtomic: vi.fn().mockResolvedValue(undefined),
      initVault: vi.fn(),
      readFile: vi.fn(async (p: string) => FILES[p] ?? ''),
      listSnapshots: vi.fn().mockResolvedValue([]),
    },
  };
});

const file = (path: string): VaultNode => ({
  name: path.split('/').pop()!,
  path,
  isDirectory: false,
  children: [],
  fileCount: 0,
});

const tree: VaultNode = {
  name: 'vault',
  path: '/vault',
  isDirectory: true,
  fileCount: 3,
  children: [
    { name: 'Anotações', path: '/vault/Anotações', isDirectory: true, fileCount: 1, children: [file('/vault/Anotações/Ideia.md')] },
    {
      name: 'Tarefas',
      path: '/vault/Tarefas',
      isDirectory: true,
      fileCount: 2,
      children: [
        { name: 'UFRJ', path: '/vault/Tarefas/UFRJ', isDirectory: true, fileCount: 1, children: [file('/vault/Tarefas/UFRJ/Cálculo.md')] },
        file('/vault/Tarefas/Inbox.md'),
      ],
    },
  ],
};

describe('TasksHome', () => {
  beforeEach(() => {
    act(() => setLanguage('pt-BR'));
    useVaultStore.getState().reset();
    useVaultStore.setState({
      vaultPath: '/vault',
      vaultTree: tree,
      section: 'tasks',
      activeFolder: '/vault/Tarefas',
      activeView: 'home',
    });
    vi.mocked(ipc.initVault).mockResolvedValue(tree);
  });

  afterEach(() => {
    act(() => setLanguage('en'));
  });

  it('shows one card per task list of Tarefas, never notes, with Inbox first', () => {
    render(<TasksHome />);

    expect(screen.getByRole('heading', { name: 'Todas as listas' })).toBeInTheDocument();
    const cards = screen.getAllByTestId('task-list-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Todas as tarefas')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Cálculo')).toBeInTheDocument();
    expect(within(cards[1]).getByText('UFRJ')).toBeInTheDocument();
    expect(screen.queryByText('Ideia')).not.toBeInTheDocument();
  });

  it('shows open and done counts per list', async () => {
    render(<TasksHome />);

    await waitFor(() => {
      expect(screen.getByText('1 abertas · 1 concluídas')).toBeInTheDocument();
      expect(screen.getByText('2 abertas · 1 concluídas')).toBeInTheDocument();
    });
  });

  it('scopes to the folder selected in the sidebar', () => {
    useVaultStore.setState({ activeFolder: '/vault/Tarefas/UFRJ' });
    render(<TasksHome />);

    expect(screen.getByRole('heading', { name: 'UFRJ' })).toBeInTheDocument();
    expect(screen.getAllByTestId('task-list-card')).toHaveLength(1);
  });

  it('opens a list in the Tasks section', async () => {
    render(<TasksHome />);
    fireEvent.click(screen.getByText('Cálculo'));

    await waitFor(() => {
      const s = useVaultStore.getState();
      expect(s.activeFile).toBe('/vault/Tarefas/UFRJ/Cálculo.md');
      expect(s.activeView).toBe('list');
      expect(s.tasks).toHaveLength(3);
    });
  });

  it('asks before deleting a list', async () => {
    render(<TasksHome />);
    const card = screen.getAllByTestId('task-list-card')[1];
    fireEvent.click(within(card).getByTestId('delete-task-list-btn'));
    expect(screen.getByText('Excluir esta lista?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete-task-list-btn'));
    await waitFor(() => expect(ipc.deleteEntry).toHaveBeenCalledWith('/vault/Tarefas/UFRJ/Cálculo.md'));
  });

  it('creates a new list inside the current folder and opens it', async () => {
    useVaultStore.setState({ activeFolder: '/vault/Tarefas/UFRJ' });
    render(<TasksHome />);
    fireEvent.click(screen.getByTestId('new-task-list-btn'));

    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
        '/vault/Tarefas/UFRJ/Nova lista.md',
        expect.stringContaining('title: Nova lista'),
      );
      expect(useVaultStore.getState().activeFile).toBe('/vault/Tarefas/UFRJ/Nova lista.md');
      expect(useVaultStore.getState().section).toBe('tasks');
    });
  });

  it('can show every task of the folder in one list', async () => {
    render(<TasksHome />);
    fireEvent.click(screen.getByTestId('view-all-tasks-btn'));

    await waitFor(() => {
      const s = useVaultStore.getState();
      expect(s.activeView).toBe('list');
      expect(s.activeFolder).toBe('/vault/Tarefas');
      expect(s.tasks).toHaveLength(5);
    });
  });
});
