import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { useVaultStore } from '../../src/store/vaultStore';
import { ipc } from '../../src/store/ipc';

vi.mock('../../src/store/ipc', () => ({
  isTauriEnvironment: vi.fn().mockReturnValue(false),
  ipc: {
    getSavedVaultPath: vi.fn().mockResolvedValue('/MockVault'),
    setSavedVaultPath: vi.fn().mockResolvedValue(undefined),
    getDefaultVaultPath: vi.fn().mockResolvedValue('/MockVault'),
    readFile: vi.fn().mockResolvedValue('# Note\n- [ ] Task 1\n'),
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
    createDirectory: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    startWatchingVault: vi.fn().mockResolvedValue(undefined),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
    listSnapshots: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../src/services/logoService', () => ({
  loadLogoConfig: vi.fn().mockResolvedValue({}),
  persistFolderEmoji: vi.fn().mockResolvedValue(undefined),
  persistFolderLogo: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  getFolderRelativePath: vi.fn().mockReturnValue(''),
  resolveFolderIcon: vi.fn().mockResolvedValue(null),
}));

describe('Contextual Keyboard Navigation & QuickFileSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    useVaultStore.setState({
      vaultPath: '/MockVault',
      vaultTree: {
        name: 'MockVault',
        path: '/MockVault',
        isDirectory: true,
        fileCount: 2,
        children: [
          {
            name: 'Customers',
            path: '/MockVault/Customers',
            isDirectory: true,
            fileCount: 2,
            children: [
              {
                name: 'Acme Corp.md',
                path: '/MockVault/Customers/Acme Corp.md',
                isDirectory: false,
                fileCount: 0,
                children: [],
              },
              {
                name: 'Stripe.md',
                path: '/MockVault/Customers/Stripe.md',
                isDirectory: false,
                fileCount: 0,
                children: [],
              },
            ],
          },
        ],
      },
      lensViewMode: 'split',
    });
  });

  it('opens QuickFileSwitcher with Cmd+O shortcut and filters files', () => {
    render(<App />);

    // Press Cmd+O
    fireEvent.keyDown(window, { key: 'o', metaKey: true });
    expect(screen.getByTestId('quick-file-switcher')).toBeDefined();

    const input = screen.getByTestId('quick-file-switcher-input');
    fireEvent.change(input, { target: { value: 'Acme' } });

    expect(screen.getByText('Acme Corp.md')).toBeDefined();
    expect(screen.queryByText('Stripe.md')).toBeNull();
  });

  it('cycles lens mode on Cmd+E shortcut', () => {
    render(<App />);
    expect(useVaultStore.getState().lensViewMode).toBe('split');

    // Press Cmd+E -> tasks
    fireEvent.keyDown(window, { key: 'e', metaKey: true });
    expect(useVaultStore.getState().lensViewMode).toBe('tasks');

    // Press Cmd+E -> notes
    fireEvent.keyDown(window, { key: 'e', metaKey: true });
    expect(useVaultStore.getState().lensViewMode).toBe('notes');

    // Press Cmd+E -> split
    fireEvent.keyDown(window, { key: 'e', metaKey: true });
    expect(useVaultStore.getState().lensViewMode).toBe('split');
  });
});
