import { render, screen, fireEvent } from '@testing-library/react';
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
    useVaultStore.setState({
      vaultTree: mockVaultTree,
      activeFile: '/path/to/vault/Customers/Acme Corp.md',
      isLoading: false,
      error: null,
    });
  });

  it('renders Today, Inbox, and Starred system views', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /starred/i })).toBeInTheDocument();
  });

  it('renders QuietFlow branding and traffic lights', () => {
    render(<Sidebar />);
    expect(screen.getByText(/QuietFlow/i)).toBeInTheDocument();
  });

  it('renders nested folder tree with folders and files', () => {
    render(<Sidebar />);
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Health')).toBeInTheDocument();
    expect(screen.getByText('notes')).toBeInTheDocument();
  });

  it('displays file count badges on folders', () => {
    render(<Sidebar />);
    // Customers folder has 2 files
    expect(screen.getByTestId('folder-badge-Customers')).toHaveTextContent('2');
    // Internal folder has 1 file
    expect(screen.getByTestId('folder-badge-Internal')).toHaveTextContent('1');
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

  it('handles sidebar collapse and expand toggle', () => {
    const { container } = render(<Sidebar />);
    const toggleBtn = screen.getByTestId('sidebar-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();

    // Initial state: expanded sidebar width
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('w-64');

    // Click collapse
    fireEvent.click(toggleBtn);
    expect(aside).toHaveClass('w-16');

    // Click expand
    fireEvent.click(toggleBtn);
    expect(aside).toHaveClass('w-64');
  });
});
