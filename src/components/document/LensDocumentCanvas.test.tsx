import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LensDocumentCanvas } from './LensDocumentCanvas';
import { useVaultStore } from '../../store';
import { ipc } from '../../store/ipc';
import type { VaultNode } from '../../store/types';

const ACADEMIA = '/vault/Anotações/Academia/Nova anotação.md';
const FINANCEIRO = '/vault/Anotações/Financeiro/Nova anotação.md';

const files: Record<string, string> = {};

vi.mock('../../store/ipc', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../store/ipc')>();
  return {
    ...mod,
    ipc: {
      ...mod.ipc,
      readFile: vi.fn(async (p: string) => files[p] ?? ''),
      writeFileAtomic: vi.fn(async (p: string, c: string) => {
        files[p] = c;
      }),
      listSnapshots: vi.fn().mockResolvedValue([]),
    },
  };
});

const tree: VaultNode = {
  name: 'vault',
  path: '/vault',
  isDirectory: true,
  fileCount: 2,
  children: [
    {
      name: 'Anotações',
      path: '/vault/Anotações',
      isDirectory: true,
      fileCount: 2,
      children: [
        {
          name: 'Academia',
          path: '/vault/Anotações/Academia',
          isDirectory: true,
          fileCount: 1,
          children: [{ name: 'Nova anotação.md', path: ACADEMIA, isDirectory: false, fileCount: 0, children: [] }],
        },
        {
          name: 'Financeiro',
          path: '/vault/Anotações/Financeiro',
          isDirectory: true,
          fileCount: 1,
          children: [{ name: 'Nova anotação.md', path: FINANCEIRO, isDirectory: false, fileCount: 0, children: [] }],
        },
      ],
    },
  ],
};

async function flush(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('LensDocumentCanvas — switching notes', () => {
  beforeEach(() => {
    files[ACADEMIA] = '---\ntitle: Treino\n---\n\ntexto da academia\n';
    files[FINANCEIRO] = '---\ntitle: Contas\n---\n\nconteudo financeiro\n';
    vi.mocked(ipc.writeFileAtomic).mockClear();
    useVaultStore.getState().reset();
    useVaultStore.setState({ vaultPath: '/vault', vaultTree: tree, section: 'notes' });
  });

  it("never writes one note's text into the note opened after it", async () => {
    render(<LensDocumentCanvas />);
    await act(() => useVaultStore.getState().openNote(ACADEMIA));
    await flush();
    expect(screen.getByText('texto da academia')).toBeInTheDocument();

    await act(() => useVaultStore.getState().openNote(FINANCEIRO));
    // Let any debounced auto-save fire
    await flush(700);

    expect(files[FINANCEIRO]).toContain('conteudo financeiro');
    expect(files[FINANCEIRO]).not.toContain('texto da academia');
    expect(files[ACADEMIA]).toContain('texto da academia');
    // Opening notes to read them must not write anything
    expect(ipc.writeFileAtomic).not.toHaveBeenCalled();
  });
});
