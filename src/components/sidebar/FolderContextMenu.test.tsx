import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FolderContextMenu from './FolderContextMenu';

describe('FolderContextMenu Component', () => {
  it('renders Rename, Add Note, Choose Folder Icon, Upload Logo, and Delete options', () => {
    render(
      <FolderContextMenu
        folderName="Projects"
        folderPath="/vault/Projects"
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
        folderName="Projects"
        folderPath="/vault/Projects"
        isDirectory={true}
        onRename={handleRename}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Projects V2' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(handleRename).toHaveBeenCalledWith('Projects V2');
  });

  it('dismisses popup on click outside and on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <div>
        <div data-testid="outside-element">Outside Area</div>
        <FolderContextMenu
          folderName="Projects"
          folderPath="/vault/Projects"
          isDirectory={true}
          onRename={vi.fn()}
          onDelete={vi.fn()}
          onClose={handleClose}
        />
      </div>
    );

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
