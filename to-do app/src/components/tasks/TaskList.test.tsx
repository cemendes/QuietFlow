import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TaskList from './TaskList';
import { useVaultStore } from '../../store';
import { TaskItem } from '../../store/types';

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Review Q3 financial forecast',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-08-28',
    tags: ['finance', 'planning'],
    subtasks: [
      { id: 'sub-1', title: 'Check cash flow statement', status: 'done' },
      { id: 'sub-2', title: 'Export PDF summaries', status: 'todo' },
    ],
    filePath: '/vault/finance.md',
  },
  {
    id: 'task-2',
    title: 'Deploy API gateway updates',
    status: 'in-progress',
    priority: 'medium',
    dueDate: '2026-08-30',
    tags: ['devops'],
    subtasks: [],
    filePath: '/vault/devops.md',
  },
  {
    id: 'task-3',
    title: 'Submit team expense report',
    status: 'done',
    priority: 'low',
    completedDate: '2026-08-27',
    tags: ['admin'],
    subtasks: [],
    filePath: '/vault/admin.md',
  },
];

describe('TaskList Component', () => {
  beforeEach(() => {
    useVaultStore.setState({
      tasks: mockTasks,
      activeTaskId: null,
      searchQuery: '',
      activeView: 'list',
      selectedTag: null,
      selectedPriority: null,
      activeFile: '/vault/finance.md',
      isLoading: false,
      error: null,
    });
  });

  it('renders header, quick add bar, and task rows', () => {
    render(<TaskList />);
    expect(screen.getByPlaceholderText(/Add a new task/i)).toBeInTheDocument();
    expect(screen.getByText('Review Q3 financial forecast')).toBeInTheDocument();
    expect(screen.getByText('Deploy API gateway updates')).toBeInTheDocument();
    expect(screen.getByText('Submit team expense report')).toBeInTheDocument();
  });

  it('renders priority pills and due date badges', () => {
    render(<TaskList />);
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText(/Aug 28/i)).toBeInTheDocument();
  });

  it('renders subtask count indicators when task has subtasks', () => {
    render(<TaskList />);
    // 1 of 2 done
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('handles task checkbox click to toggle completion status', async () => {
    render(<TaskList />);

    const checkbox = screen.getByTestId('task-checkbox-task-1');
    fireEvent.click(checkbox);

    // After clicking checkbox, task status toggles in the store to done
    expect(useVaultStore.getState().tasks.find((t) => t.id === 'task-1')?.status).toBe('done');
  });

  it('selects task to open detail drawer when row is clicked', () => {
    render(<TaskList />);

    const taskRow = screen.getByTestId('task-row-task-1');
    fireEvent.click(taskRow);

    expect(useVaultStore.getState().activeTaskId).toBe('task-1');
  });

  it('allows adding a new task via QuickAddBar', async () => {
    const handleAddTask = vi.fn().mockResolvedValue(undefined);

    render(<TaskList onAddTask={handleAddTask} />);

    const input = screen.getByPlaceholderText(/Add a new task/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Prepare board meeting slide deck #strategy @high' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(handleAddTask).toHaveBeenCalled();
    const calledArg = handleAddTask.mock.calls[0][0];
    expect(calledArg.title).toBe('Prepare board meeting slide deck');
    expect(calledArg.priority).toBe('high');
    expect(calledArg.tags).toContain('strategy');
  });

  it('switches view mode between list and kanban with ViewSwitcher', () => {
    render(<TaskList />);

    const kanbanBtn = screen.getByRole('button', { name: /kanban view/i });
    fireEvent.click(kanbanBtn);

    expect(useVaultStore.getState().activeView).toBe('kanban');
  });

  it('filters tasks based on search query or selected tag/priority', () => {
    useVaultStore.setState({ searchQuery: 'financial' });
    render(<TaskList />);

    expect(screen.getByText('Review Q3 financial forecast')).toBeInTheDocument();
    expect(screen.queryByText('Deploy API gateway updates')).not.toBeInTheDocument();
  });

  it('renders empty state when no tasks match filter', () => {
    useVaultStore.setState({ tasks: [] });
    render(<TaskList />);

    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });
});
