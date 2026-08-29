import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import KanbanBoard from './KanbanBoard';
import { useVaultStore } from '../../store';
import { TaskItem } from '../../store/types';

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Backlog research item',
    status: 'backlog',
    priority: 'low',
    tags: ['research'],
    subtasks: [],
    filePath: '/vault/project.md',
  },
  {
    id: 'task-2',
    title: 'Write unit tests',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-08-28',
    tags: ['testing', 'frontend'],
    subtasks: [
      { id: 'sub-1', title: 'Kanban tests', status: 'done' },
      { id: 'sub-2', title: 'List tests', status: 'todo' },
    ],
    filePath: '/vault/project.md',
  },
  {
    id: 'task-3',
    title: 'Implement Kanban Board',
    status: 'in-progress',
    priority: 'medium',
    dueDate: '2026-08-29',
    tags: ['frontend'],
    subtasks: [
      { id: 'sub-3', title: 'Cards', status: 'done' },
    ],
    filePath: '/vault/project.md',
  },
  {
    id: 'task-4',
    title: 'Design system tokens',
    status: 'done',
    completedDate: '2026-08-27',
    tags: ['design'],
    subtasks: [],
    filePath: '/vault/project.md',
  },
];

describe('KanbanBoard Component', () => {
  beforeEach(() => {
    useVaultStore.setState({
      tasks: mockTasks,
      activeTaskId: null,
      searchQuery: '',
      activeView: 'kanban',
      selectedTag: null,
      selectedPriority: null,
      activeFile: '/vault/project.md',
      isLoading: false,
      error: null,
    });
  });

  it('renders all 4 Kanban stage columns with task counts', () => {
    render(<KanbanBoard />);

    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To Do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();

    const columnBacklog = screen.getByTestId('kanban-column-backlog');
    const columnTodo = screen.getByTestId('kanban-column-todo');
    const columnInProgress = screen.getByTestId('kanban-column-in-progress');
    const columnDone = screen.getByTestId('kanban-column-done');

    expect(columnBacklog).toHaveTextContent('1');
    expect(columnTodo).toHaveTextContent('1');
    expect(columnInProgress).toHaveTextContent('1');
    expect(columnDone).toHaveTextContent('1');
  });

  it('renders cards with title, priority badge, tags, due date, and subtask progress', () => {
    render(<KanbanBoard />);

    // Title checks
    expect(screen.getByText('Backlog research item')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByText('Implement Kanban Board')).toBeInTheDocument();
    expect(screen.getByText('Design system tokens')).toBeInTheDocument();

    // Priority badge
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();

    // Due date badge
    expect(screen.getByText(/Aug 28/i)).toBeInTheDocument();
    expect(screen.getByText(/Aug 29/i)).toBeInTheDocument();

    // Subtask count indicator
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    // Tags
    expect(screen.getByText('#research')).toBeInTheDocument();
    expect(screen.getByText('#testing')).toBeInTheDocument();
  });

  it('selects task when card is clicked to open task detail panel', () => {
    render(<KanbanBoard />);

    const card = screen.getByTestId('kanban-card-task-2');
    fireEvent.click(card);

    expect(useVaultStore.getState().activeTaskId).toBe('task-2');
  });

  it('handles HTML5 drag and drop between columns to update task status', async () => {
    render(<KanbanBoard />);

    const card = screen.getByTestId('kanban-card-task-2');
    const targetColumn = screen.getByTestId('kanban-column-in-progress');

    // Simulate dragstart on card
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('task-2'),
      effectAllowed: 'move',
      dropEffect: 'move',
    };

    fireEvent.dragStart(card, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'task-2');

    // Simulate dragOver on target column
    fireEvent.dragOver(targetColumn, { dataTransfer });

    // Simulate drop on target column
    fireEvent.drop(targetColumn, { dataTransfer });

    // Status of task-2 should now be 'in-progress'
    const updated = useVaultStore.getState().tasks.find((t) => t.id === 'task-2');
    expect(updated?.status).toBe('in-progress');
  });

  it('supports clicking card to select task for detail drawer view', async () => {
    render(<KanbanBoard />);

    const card = screen.getByTestId('kanban-card-task-1');
    fireEvent.click(card);

    expect(useVaultStore.getState().activeTaskId).toBe('task-1');
  });

  it('filters tasks on board when search query or tag/priority is selected', () => {
    useVaultStore.setState({ searchQuery: 'research' });
    render(<KanbanBoard />);

    expect(screen.getByText('Backlog research item')).toBeInTheDocument();
    expect(screen.queryByText('Write unit tests')).not.toBeInTheDocument();
  });

  it('highlights column when dragging over it', () => {
    render(<KanbanBoard />);

    const targetColumn = screen.getByTestId('kanban-column-done');
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('task-1'),
    };

    fireEvent.dragEnter(targetColumn, { dataTransfer });
    expect(targetColumn).toHaveClass('ring-2');

    fireEvent.dragLeave(targetColumn);
    expect(targetColumn).not.toHaveClass('ring-2');
  });
});
