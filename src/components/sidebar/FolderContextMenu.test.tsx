import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FolderContextMenu from './FolderContextMenu';

describe('FolderContextMenu Component', () => {
  it('renders Rename, Add Note, Choose Folder Icon, Upload Logo, and Delete options', () => {
    render(
      <FolderContextMenu
        folderName="PRivia"
        folderPath="/vault/PRivia"
        isDirectory={true}
        onRename={vi.fn()}
        onAddNote={vi.fn()}
        onAddSubfolder={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText(/Add Note/i)).toBeInTheDocument();
    expect(screen.getByText('Choose Folder Icon')).toBeInTheDocument();
    expect(screen.getByText('Upload Company Logo')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('handles inline renaming', () => {
    const handleRename = vi.fn();
    render(
      <FolderContextMenu
        folderName="PRivia"
        folderPath="/vault/PRivia"
        isDirectory={true}
        onRename={handleRename}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'PRivia V2' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(handleRename).toHaveBeenCalledWith('PRivia V2');
  });
});
