import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FolderItem from './FolderItem';
import { useVaultStore } from '../../store';
import { ipc } from '../../store/ipc';
import type { VaultNode } from '../../store/types';

vi.mock('../../store/ipc', () => ({
  ipc: {
    readFile: vi.fn().mockResolvedValue(''),
    writeFileAtomic: vi.fn(),
    moveEntry: vi.fn().mockResolvedValue(undefined),
    initVault: vi.fn(),
    createDirectory: vi.fn(),
    deleteEntry: vi.fn(),
    startWatchingVault: vi.fn(),
    listenVaultChanged: vi.fn(),
    listSnapshots: vi.fn().mockResolvedValue([]),
  },
}));

// The real saved vault path on Windows mixes separators: `C:\Users\me/Documents/QuietFlowVault`
const VAULT = 'C:\\Users\\me/Documents/QuietFlowVault';
const NOTES = `${VAULT}\\Anotações`;
const ACADEMIA = `${NOTES}\\Academia`;

function folder(children: VaultNode[]): VaultNode {
  return { name: 'Academia', path: ACADEMIA, isDirectory: true, fileCount: children.length, children };
}

function dropFile(target: HTMLElement, sourcePath: string) {
  fireEvent.dragOver(target);
  fireEvent.drop(target, {
    dataTransfer: {
      types: ['text/plain'],
      getData: (format: string) => (format === 'text/plain' ? sourcePath : ''),
    },
  });
}

describe('FolderItem — dropping a note onto a folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    vi.mocked(ipc.initVault).mockResolvedValue({ name: 'v', path: VAULT, isDirectory: true, fileCount: 0, children: [] });
    useVaultStore.setState({ vaultPath: VAULT, section: 'notes' });
  });

  it('moves the note straight into the folder, with no extra folders, on Windows paths', async () => {
    const pr: VaultNode = { name: "PR's.md", path: `${ACADEMIA}\\PR's.md`, isDirectory: false, fileCount: 0, children: [] };
    render(
      <FolderItem node={folder([pr])} activeFile={null} expandedPaths={new Set()} onToggleFolder={() => {}} onSelectFile={() => {}} />,
    );

    dropFile(screen.getByTestId(`folder-container-${ACADEMIA}`), `${NOTES}\\Treinos.md`);

    await waitFor(() => expect(ipc.moveEntry).toHaveBeenCalled());
    expect(ipc.moveEntry).toHaveBeenCalledWith(`${NOTES}\\Treinos.md`, `${ACADEMIA}\\Treinos.md`);
  });

  it('never overwrites a note with the same name already in the folder', async () => {
    const existing: VaultNode = { name: 'Treinos.md', path: `${ACADEMIA}\\Treinos.md`, isDirectory: false, fileCount: 0, children: [] };
    render(
      <FolderItem node={folder([existing])} activeFile={null} expandedPaths={new Set()} onToggleFolder={() => {}} onSelectFile={() => {}} />,
    );

    dropFile(screen.getByTestId(`folder-container-${ACADEMIA}`), `${NOTES}\\Treinos.md`);

    await waitFor(() => expect(ipc.moveEntry).toHaveBeenCalled());
    expect(ipc.moveEntry).toHaveBeenCalledWith(`${NOTES}\\Treinos.md`, `${ACADEMIA}\\Treinos 2.md`);
  });

  it('keeps the moved note open when it was the active one', async () => {
    useVaultStore.setState({ activeFile: `${NOTES}\\Treinos.md` });
    render(
      <FolderItem node={folder([])} activeFile={null} expandedPaths={new Set()} onToggleFolder={() => {}} onSelectFile={() => {}} />,
    );

    dropFile(screen.getByTestId(`folder-container-${ACADEMIA}`), `${NOTES}\\Treinos.md`);

    await waitFor(() => expect(useVaultStore.getState().activeFile).toBe(`${ACADEMIA}\\Treinos.md`));
  });
});
