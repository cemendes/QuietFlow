import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FolderItem } from '../../src/components/sidebar/FolderItem';
import { LensDocumentCanvas } from '../../src/components/document/LensDocumentCanvas';
import { useVaultStore } from '../../src/store/vaultStore';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';
import { ipc } from '../../src/store/ipc';

vi.mock('../../src/store/ipc', () => ({
  ipc: {
    writeFileAtomic: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('# Title\n\n- [ ] Task 1\n\nSome notes'),
    initVault: vi.fn().mockResolvedValue({ root: { name: 'vault', path: '/vault', isDirectory: true, children: [] } }),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
  },
}));

describe('Note Creation and Fluid Canvas Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    useVaultStore.setState({
      vaultPath: '/vault',
      section: 'notes',
    });
  });

  describe('Bug 1: Note Creation Input Keystrokes', () => {
    it('allows typing full note names without re-selecting text on each keystroke', async () => {
      const folderNode = {
        name: 'Work',
        path: '/vault/Work',
        isDirectory: true,
        children: [],
        fileCount: 0,
      };

      const expandedPaths = new Set<string>(['/vault/Work']);

      render(
        <FolderItem
          node={folderNode}
          activeFile={null}
          expandedPaths={expandedPaths}
          onToggleFolder={vi.fn()}
          onSelectFile={vi.fn()}
        />
      );

      // Trigger "New note" button (FilePlus icon button)
      const addNoteBtn = screen.getByTitle('New file in folder');
      fireEvent.click(addNoteBtn);

      // The input should be visible with placeholder "Note name..."
      const input = screen.getByPlaceholderText('Note name...') as HTMLInputElement;
      expect(input).toBeDefined();

      // Track selection changes on the input
      let selectCallCount = 0;
      const originalSelect = input.select.bind(input);
      input.select = () => {
        selectCallCount++;
        originalSelect();
      };

      // Simulate user typing character by character: 'N', 'o', 't', 'e', '1'
      fireEvent.change(input, { target: { value: 'N' } });
      fireEvent.change(input, { target: { value: 'No' } });
      fireEvent.change(input, { target: { value: 'Not' } });
      fireEvent.change(input, { target: { value: 'Note' } });
      fireEvent.change(input, { target: { value: 'Note 1' } });

      // In the buggy implementation, select() was called on EVERY single keystroke re-render.
      // With our fix, select() is only called once on mount/open!
      expect(selectCallCount).toBe(0); // Subsequent keystrokes should not invoke select()
      expect(input.value).toBe('Note 1');

      // Press Enter to submit creation
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
          '/vault/Work/Note 1.md',
          expect.stringContaining('title: Note 1')
        );
      });
    });
  });

  describe('Bug 2: Fluid Full-Width Layout & Viewport Height', () => {
    const sampleMarkdown = `---
title: Product Strategy
---
- [ ] Finalize Q3 roadmap @priority(high)
- [x] Review competitor metrics

### Notes
Full width notes content here.
`;

    it('renders fluid layout without max-w-[850px] restriction in the notes editor', () => {
      const doc = parseMarkdownDocument(sampleMarkdown, 'Strategy/Product.md');
      useVaultStore.setState({
        activeFile: 'Strategy/Product.md',
        activeDocument: doc,
        tasks: doc.tasks,
      });

      const { container } = render(<LensDocumentCanvas />);

      expect(container.querySelector('.max-w-\\[850px\\]')).toBeNull();
      expect(container.querySelector('.w-full.flex-1.flex.flex-col')).not.toBeNull();
      expect(screen.queryByTestId('top-tasks-zone')).toBeNull();
      expect(screen.getByTestId('bottom-notes-zone')).toBeDefined();
    });

    it('renders a compact notes field that grows with its content instead of scrolling', () => {
      const doc = parseMarkdownDocument(sampleMarkdown, 'Strategy/Product.md');
      useVaultStore.setState({
        activeFile: 'Strategy/Product.md',
        activeDocument: doc,
        tasks: doc.tasks,
        lensViewMode: 'notes',
      });

      const { container } = render(<LensDocumentCanvas />);

      // Ensure top tasks zone is absent
      expect(screen.queryByTestId('top-tasks-zone')).toBeNull();

      // The notes zone sizes to its content; the page scrolls, never the field itself
      const notesZone = screen.getByTestId('bottom-notes-zone');
      expect(notesZone.className).not.toContain('h-full');
      const contentArea = screen.getByTestId('tiptap-editor-content').parentElement!;
      expect(contentArea.className).not.toContain('overflow-y-auto');
      expect(contentArea.className).not.toContain('h-full');
      fireEvent.click(screen.getByTestId('edit-note-btn'));
      expect(screen.getByTestId('save-note-btn')).toBeInTheDocument();

      // Ensure WYSIWYG editor content is rendered
      const editorContent = screen.getByTestId('tiptap-editor-content');
      expect(editorContent).toBeInTheDocument();
    });
  });
});
