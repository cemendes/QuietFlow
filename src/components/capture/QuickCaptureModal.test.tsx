import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuickCaptureModal } from './QuickCaptureModal';
import { useVaultStore } from '../../store';
import { VaultNode } from '../../store/types';

const mockVaultTree: VaultNode = {
  name: 'QuietFlowVault',
  path: '/path/to/vault',
  isDirectory: true,
  fileCount: 3,
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
      name: 'notes.md',
      path: '/path/to/vault/notes.md',
      isDirectory: false,
      fileCount: 0,
      children: [],
    },
  ],
};

describe('QuickCaptureModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({
      vaultPath: '/path/to/vault',
      vaultTree: mockVaultTree,
      activeFile: '/path/to/vault/Customers/Acme Corp.md',
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <QuickCaptureModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders spotlight capture dialog with input and footer hints when isOpen is true', () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(screen.getByRole('dialog', { name: /quick capture/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/what's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save capture/i })).toBeInTheDocument();
    expect(screen.getByText(/Esc/i)).toBeInTheDocument();
  });

  it('autofocuses the capture input on mount', () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const input = screen.getByPlaceholderText(/what's on your mind\?/i);
    expect(input).toHaveFocus();
  });

  it('switches capture mode between Task and Quick Note', () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const taskBtn = screen.getByRole('button', { name: /^task$/i });
    const noteBtn = screen.getByRole('button', { name: /^quick note$/i });

    expect(taskBtn).toBeInTheDocument();
    expect(noteBtn).toBeInTheDocument();

    fireEvent.click(noteBtn);
    expect(noteBtn).toHaveAttribute('data-active', 'true');
    expect(taskBtn).toHaveAttribute('data-active', 'false');

    fireEvent.click(taskBtn);
    expect(taskBtn).toHaveAttribute('data-active', 'true');
  });

  it('renders destination file/folder dropdown and allows changing destination', () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const destinationSelect = screen.getByRole('combobox', { name: /destination/i });
    expect(destinationSelect).toBeInTheDocument();
    expect(destinationSelect).toHaveValue('/path/to/vault/Customers/Acme Corp.md');

    fireEvent.change(destinationSelect, {
      target: { value: '/path/to/vault/notes.md' },
    });
    expect(destinationSelect).toHaveValue('/path/to/vault/notes.md');
  });

  it('extracts tags, priority, and due date from natural language input', async () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const input = screen.getByPlaceholderText(/what's on your mind\?/i);
    fireEvent.change(input, {
      target: { value: 'Prepare Q3 roadmap #planning #executive @high due:2026-09-01' },
    });

    // Check parsed pill badges rendered in preview / metadata chips
    expect(screen.getByText('#planning')).toBeInTheDocument();
    expect(screen.getByText('#executive')).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-09-01/i)).toBeInTheDocument();
  });

  it('saves task on Enter key press with parsed parameters and closes modal', async () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const input = screen.getByPlaceholderText(/what's on your mind\?/i);
    fireEvent.change(input, {
      target: { value: 'Refactor auth service #dev @medium due:2026-09-15' },
    });

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        type: 'task',
        title: 'Refactor auth service',
        tags: ['dev'],
        priority: 'medium',
        dueDate: '2026-09-15',
        targetFile: '/path/to/vault/Customers/Acme Corp.md',
        content: undefined,
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('saves quick note when note mode is active on Enter or Save button click', async () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Switch to note mode
    const noteBtn = screen.getByRole('button', { name: /^quick note$/i });
    fireEvent.click(noteBtn);

    const input = screen.getByPlaceholderText(/what's on your mind\?/i);
    fireEvent.change(input, {
      target: { value: 'Meeting notes with CEO regarding budget #notes' },
    });

    const saveBtn = screen.getByRole('button', { name: /save capture/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        type: 'note',
        title: 'Meeting notes with CEO regarding budget',
        tags: ['notes'],
        priority: undefined,
        dueDate: undefined,
        targetFile: '/path/to/vault/Customers/Acme Corp.md',
        content: 'Meeting notes with CEO regarding budget #notes',
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('dismisses modal on Escape key press or backdrop click', () => {
    render(
      <QuickCaptureModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const backdrop = screen.getByTestId('quick-capture-backdrop');
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
