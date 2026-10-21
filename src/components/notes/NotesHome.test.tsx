import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { NotesHome } from './NotesHome';
import { useVaultStore } from '../../store';
import { setLanguage } from '../../i18n';
import type { VaultNode } from '../../store/types';
import { ipc } from '../../store/ipc';

vi.mock('../../store/ipc', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../store/ipc')>();
  return {
    ...mod,
    ipc: {
      ...mod.ipc,
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('# Note\n'),
    },
  };
});

const tree: VaultNode = {
  name: 'Vault',
  path: '/vault',
  isDirectory: true,
  fileCount: 3,
  children: [
    {
      name: 'teste2',
      path: '/vault/teste2',
      isDirectory: true,
      fileCount: 1,
      children: [
        { name: '2026-10-18.md', path: '/vault/teste2/2026-10-18.md', isDirectory: false, fileCount: 0, children: [] },
      ],
    },
    { name: 'Inbox.md', path: '/vault/Inbox.md', isDirectory: false, fileCount: 0, children: [] },
  ],
};

describe('NotesHome', () => {
  beforeEach(() => {
    vi.mocked(ipc.deleteEntry).mockClear();
    useVaultStore.getState().reset();
    useVaultStore.setState({ vaultPath: '/vault', vaultTree: tree, activeFolder: '/vault' });
  });

  afterEach(() => {
    act(() => setLanguage('en'));
  });

  it('titles the vault-wide list "All notes" / "Todas as anotações"', () => {
    const { rerender } = render(<NotesHome />);
    expect(screen.getByRole('heading', { name: 'All notes' })).toBeInTheDocument();

    act(() => setLanguage('pt-BR'));
    rerender(<NotesHome />);
    expect(screen.getByRole('heading', { name: 'Todas as anotações' })).toBeInTheDocument();
  });

  it('keeps the folder name as the title when a folder is selected', () => {
    useVaultStore.setState({ activeFolder: '/vault/teste2' });
    render(<NotesHome />);
    expect(screen.getByRole('heading', { name: 'teste2' })).toBeInTheDocument();
  });

  it('shows date-named notes as DD/MM/YYYY in Brazilian Portuguese', () => {
    act(() => setLanguage('pt-BR'));
    render(<NotesHome />);
    expect(screen.getByText('18/10/2026')).toBeInTheDocument();
  });

  it('deletes a note from its trash icon only after confirming', async () => {
    render(<NotesHome />);
    const card = screen.getAllByTestId('vault-note-card').find((c) => c.textContent?.includes('Inbox'))!;

    fireEvent.click(within(card).getByRole('button', { name: 'Delete note Inbox' }));
    expect(ipc.deleteEntry).not.toHaveBeenCalled();
    expect(useVaultStore.getState().activeFile).toBeNull();

    // Cancelling leaves the note alone
    fireEvent.click(within(card).getByRole('button', { name: 'Cancel' }));
    expect(ipc.deleteEntry).not.toHaveBeenCalled();

    fireEvent.click(within(card).getByRole('button', { name: 'Delete note Inbox' }));
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Delete' }));
    });
    expect(ipc.deleteEntry).toHaveBeenCalledWith('/vault/Inbox.md');
    expect(useVaultStore.getState().activeFile).toBeNull();
  });
});
