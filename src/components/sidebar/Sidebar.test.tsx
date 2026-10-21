import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useVaultStore } from '../../store';
import { VaultNode } from '../../store/types';

const mockVaultTree: VaultNode = {
  name: 'QuietFlowVault',
  path: '/path/to/vault',
  isDirectory: true,
  fileCount: 4,
  children: [
    {
      name: 'Customers',
      path: '/path/to/vault/Customers',
      isDirectory: true,
      fileCount: 2,
      children: [
        {
          name: 'Acme Corp.md',
          path: '/path/to/vault/Customers/Acme Corp.md',
          isDirectory: false,
          fileCount: 0,
          children: [],
        },
        {
          name: 'Beta Health.md',
          path: '/path/to/vault/Customers/Beta Health.md',
          isDirectory: false,
          fileCount: 0,
          children: [],
        },
      ],
    },
    {
      name: 'Internal',
      path: '/path/to/vault/Internal',
      isDirectory: true,
      fileCount: 1,
      children: [
        {
          name: 'Operations.md',
          path: '/path/to/vault/Internal/Operations.md',
          isDirectory: false,
          fileCount: 0,
          children: [],
        },
      ],
    },
    {
      name: 'notes.md',
      path: '/path/to/vault/notes.md',
      isDirectory: false,
      fileCount: 0,
      children: [],
    },
  ],
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // These cases describe the Tasks section; the app itself starts on Notes.
    useVaultStore.setState({
      section: 'tasks',
      vaultTree: mockVaultTree,
      activeFile: '/path/to/vault/Customers/Acme Corp.md',
      isLoading: false,
      error: null,
    });
  });

  it('renders a single Notes entry (no separate Inbox or Vault) and removes Today and Starred', () => {
    render(<Sidebar />);
    expect(screen.getByTitle('Notes')).toBeInTheDocument();
    expect(screen.queryByTitle('Inbox')).not.toBeInTheDocument();
    expect(screen.queryByTitle('My Vault')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^today$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^starred$/i })).not.toBeInTheDocument();
  });

  it('renders QuietFlow branding in the same row as the collapse button', () => {
    render(<Sidebar />);
    const brand = screen.getByText('QuietFlow');
    expect(brand).toBeInTheDocument();
    const topBar = screen.getByTestId('sidebar-toggle-btn').parentElement!;
    expect(topBar.contains(brand)).toBe(true);
  });

  it('renders nested folder tree with folders and files', () => {
    render(<Sidebar />);
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Health')).toBeInTheDocument();
    expect(screen.getByText('notes')).toBeInTheDocument();
  });

  it('collapses and expands folders on click', () => {
    render(<Sidebar />);
    // Acme Corp should initially be visible because folders start expanded
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    // Click on Customers folder header to collapse
    const customersFolder = screen.getByText('Customers');
    fireEvent.click(customersFolder);

    // Acme Corp should no longer be rendered
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(customersFolder);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('highlights the currently active file', () => {
    render(<Sidebar />);
    const acmeFile = screen.getByTestId('file-item-/path/to/vault/Customers/Acme Corp.md');
    expect(acmeFile).toHaveAttribute('data-active', 'true');
    expect(acmeFile.className).toContain('text-forest-700');

    const betaFile = screen.getByTestId('file-item-/path/to/vault/Customers/Beta Health.md');
    expect(betaFile).toHaveAttribute('data-active', 'false');
  });

  it('calls onSelectFile when clicking on a file item', async () => {
    const handleSelectFile = vi.fn();
    render(<Sidebar onSelectFile={handleSelectFile} />);

    const betaFile = screen.getByText('Beta Health');
    fireEvent.click(betaFile);

    expect(handleSelectFile).toHaveBeenCalledWith('/path/to/vault/Customers/Beta Health.md');
  });

  it('renders settings and archive buttons in footer', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('renders empty vault message when vaultTree is null', () => {
    useVaultStore.setState({ vaultTree: null });
    render(<Sidebar />);
    expect(screen.getByText(/No folder open/i)).toBeInTheDocument();
  });

  it('only offers New note in the Notes section, above the vault root, and calls onNewNote', () => {
    const handleNewNote = vi.fn();
    const { unmount } = render(<Sidebar onNewNote={handleNewNote} />);
    expect(screen.queryByTestId('new-note-btn')).toBeNull();
    unmount();

    act(() => useVaultStore.setState({ section: 'notes' }));
    render(<Sidebar onNewNote={handleNewNote} />);

    const newNoteBtn = screen.getByTestId('new-note-btn');
    expect(newNoteBtn).toHaveTextContent('New note');

    const notesBtn = screen.getByTestId('vault-root-btn');
    expect(
      newNoteBtn.compareDocumentPosition(notesBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(newNoteBtn);
    expect(handleNewNote).toHaveBeenCalledTimes(1);
  });

  describe('location cues', () => {
    const inboxPath = '/path/to/vault/Inbox.md';
    const treeWithInbox: VaultNode = {
      ...mockVaultTree,
      children: [
        ...mockVaultTree.children!,
        { name: 'Inbox.md', path: inboxPath, isDirectory: false, fileCount: 0, children: [] },
      ],
    };

    it('shows an Inbox.md note as an ordinary note inside the tree', () => {
      useVaultStore.setState({ vaultTree: treeWithInbox });
      render(<Sidebar />);
      expect(screen.getByTestId(`file-item-${inboxPath}`)).toBeInTheDocument();
    });

    it('marks the vault root as the current location only when it is selected', () => {
      render(<Sidebar />);
      const notesBtn = screen.getByTestId('vault-root-btn');
      expect(notesBtn).toHaveAttribute('data-active', 'false');
      expect(notesBtn).not.toHaveAttribute('aria-current');

      act(() => useVaultStore.setState({ activeFolder: '/path/to/vault', vaultPath: '/path/to/vault' }));
      expect(notesBtn).toHaveAttribute('data-active', 'true');
      expect(notesBtn).toHaveAttribute('aria-current', 'page');
    });

    it('gives the active note a visible background and aria-current', () => {
      render(<Sidebar />);
      const acmeFile = screen.getByTestId('file-item-/path/to/vault/Customers/Acme Corp.md');
      expect(acmeFile).toHaveAttribute('aria-current', 'page');
      expect(acmeFile.className).toContain('bg-[var(--bg-surface)]');
    });

    it('flags the folder that contains the active note', () => {
      render(<Sidebar />);
      expect(screen.getByTestId('folder-row-/path/to/vault/Customers')).toHaveAttribute(
        'data-contains-active',
        'true'
      );
      expect(screen.getByTestId('folder-row-/path/to/vault/Internal')).toHaveAttribute(
        'data-contains-active',
        'false'
      );
    });
  });

  it('handles sidebar collapse and expand toggle', () => {
    const { container } = render(<Sidebar />);
    const toggleBtn = screen.getByTestId('sidebar-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();

    // Initial state: expanded sidebar width
    const aside = container.querySelector('aside');
    expect(aside).toHaveStyle({ width: '240px' });

    // Click collapse
    fireEvent.click(toggleBtn);
    expect(aside).toHaveStyle({ width: '72px' });

    // Click expand
    const expandBtn = screen.getByTestId('sidebar-toggle-btn');
    fireEvent.click(expandBtn);
    expect(aside).toHaveStyle({ width: '240px' });
  });

  it('preserves collapsed state of other projects when a new project is created or tree updates', async () => {
    render(<Sidebar />);

    // Customers and Internal are initially expanded
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();

    // Collapse Customers folder
    const customersFolder = screen.getByText('Customers');
    fireEvent.click(customersFolder);
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // Now simulate creating a new project / folder updating the vaultTree in vaultStore
    const updatedVaultTree: VaultNode = {
      ...mockVaultTree,
      children: [
        ...mockVaultTree.children!,
        {
          name: 'NewProject',
          path: '/path/to/vault/NewProject',
          isDirectory: true,
          fileCount: 1,
          children: [
            {
              name: '2026-09-18.md',
              path: '/path/to/vault/NewProject/2026-09-18.md',
              isDirectory: false,
              fileCount: 0,
              children: [],
            },
          ],
        },
      ],
    };

    const { act } = await import('@testing-library/react');
    act(() => {
      useVaultStore.setState({ vaultTree: updatedVaultTree });
    });

    // The new project should be visible and expanded
    expect(await screen.findByText('NewProject')).toBeInTheDocument();
    expect(screen.getByText('2026-09-18')).toBeInTheDocument();

    // CRITICAL: Customers MUST REMAIN COLLAPSED (Acme Corp must NOT re-expand)
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // Internal should remain expanded
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });
});
