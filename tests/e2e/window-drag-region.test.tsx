import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';
import { LensDocumentCanvas } from '../../src/components/document/LensDocumentCanvas';
import { TaskDetailPage } from '../../src/components/editor/TaskDetailPage';
import { TaskList } from '../../src/components/tasks/TaskList';
import { KanbanBoard } from '../../src/components/kanban/KanbanBoard';
import { Sidebar } from '../../src/components/sidebar/Sidebar';
import { useVaultStore } from '../../src/store/vaultStore';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';

vi.mock('../../src/store/ipc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store/ipc')>();
  return {
    ...actual,
    isTauriEnvironment: vi.fn().mockReturnValue(false),
    ipc: {
      ...actual.ipc,
      getSavedVaultPath: vi.fn().mockResolvedValue('/mock/vault'),
      getDefaultVaultPath: vi.fn().mockResolvedValue('/mock/vault'),
      writeFileAtomic: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('# Test\n\n- [ ] Task 1\n'),
      listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
    },
  };
});

describe('Universal Window Drag Region Invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
  });

  it('renders global top window drag strip in App root layout', () => {
    render(<App />);
    const globalDragStrip = screen.getByTestId('window-drag-region');
    expect(globalDragStrip).toBeInTheDocument();
    expect(globalDragStrip).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable header in LensDocumentCanvas when a document is active', () => {
    const doc = parseMarkdownDocument('# Title\n\n- [ ] Task in doc\n', 'Notes/Project.md');
    useVaultStore.setState({
      activeFile: 'Notes/Project.md',
      activeDocument: doc,
      tasks: doc.tasks,
      lensViewMode: 'split',
    });

    render(<LensDocumentCanvas />);
    const docHeader = screen.getByTestId('document-header');
    expect(docHeader).toBeInTheDocument();
    expect(docHeader).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable empty canvas in LensDocumentCanvas when no document is selected', () => {
    useVaultStore.setState({
      activeFile: null,
      activeDocument: null,
    });

    render(<LensDocumentCanvas />);
    const emptyCanvas = screen.getByTestId('document-empty-canvas');
    expect(emptyCanvas).toBeInTheDocument();
    expect(emptyCanvas).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable header in TaskDetailPage', () => {
    const task = {
      id: 'task-123',
      title: 'Review PR',
      status: 'todo' as const,
      filePath: 'Notes/Project.md',
      tags: [],
      subtasks: [],
      comments: [],
    };
    useVaultStore.setState({
      tasks: [task],
      activeTaskId: 'task-123',
    });

    render(<TaskDetailPage />);
    const taskHeader = screen.getByTestId('task-detail-header');
    expect(taskHeader).toBeInTheDocument();
    expect(taskHeader).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable header in TaskList', () => {
    render(<TaskList />);
    const header = screen.getByTestId('task-list').querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable header in KanbanBoard', () => {
    render(<KanbanBoard />);
    const header = screen.getByTestId('kanban-board').querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('data-tauri-drag-region');
  });

  it('renders draggable top bar in Sidebar', () => {
    render(<Sidebar />);
    const sidebar = screen.getByRole('complementary');
    const dragBar = sidebar.querySelector('[data-tauri-drag-region]');
    expect(dragBar).toBeInTheDocument();
  });
});
