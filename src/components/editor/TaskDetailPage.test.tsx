import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TaskDetailPage from './TaskDetailPage';
import { useVaultStore } from '../../store';
import { TaskItem } from '../../store/types';

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Implement AI Model Training pipeline',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2026-08-30',
    tags: ['infra', 'ai-core'],
    notes: 'Detailed notes on dataset synchronization and cluster sizing.',
    subtasks: [
      { id: 'sub-1', title: 'Provision H100 GPU cluster', status: 'done' },
      { id: 'sub-2', title: 'Run synthetic benchmark suite', status: 'todo' },
      { id: 'sub-3', title: 'Verify dataset sync', status: 'todo' },
    ],
    comments: [
      {
        id: 'comm-1',
        author: 'Eduardo',
        timestamp: '2026-08-29 07:15',
        content: 'Cluster provisioned in us-east-4 with 8x H100.',
      },
    ],
    filePath: '/vault/projects/infra.md',
  },
  {
    id: 'task-2',
    title: 'Clean workspace',
    status: 'todo',
    tags: [],
    subtasks: [],
    filePath: '/vault/home.md',
  },
];

describe('TaskDetailPage Component', () => {
  beforeEach(() => {
    useVaultStore.setState({
      tasks: JSON.parse(JSON.stringify(mockTasks)),
      activeTaskId: 'task-1',
      activeFile: '/vault/projects/infra.md',
      activeView: 'list',
      isLoading: false,
      error: null,
    });
  });

  it('renders null when activeTaskId is null or not found', () => {
    useVaultStore.setState({ activeTaskId: null });
    const { container } = render(<TaskDetailPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders full-page two-column layout with title, breadcrumbs, notes, subtasks, properties, and comments', () => {
    render(<TaskDetailPage />);

    // Top Header & Navigation
    expect(screen.getByTestId('task-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-list-btn')).toHaveTextContent('Back to List');
    expect(screen.getByText('projects')).toBeInTheDocument();
    expect(screen.getByText('infra')).toBeInTheDocument();

    // Left Column: Title
    const titleInput = screen.getByTestId('task-detail-title-input');
    expect(titleInput).toHaveValue('Implement AI Model Training pipeline');

    // Left Column: Subtasks & Progress
    expect(screen.getByText('1/3 Completed')).toBeInTheDocument();
    expect(screen.getByText('Provision H100 GPU cluster')).toBeInTheDocument();
    expect(screen.getByText('Run synthetic benchmark suite')).toBeInTheDocument();

    // Right Column: Properties
    expect(screen.getByTestId('detail-status-select')).toHaveValue('in-progress');
    expect(screen.getByTestId('detail-priority-select')).toHaveValue('high');
    expect(screen.getByTestId('detail-due-date-input')).toHaveValue('2026-08-30');
    expect(screen.getByText('#infra')).toBeInTheDocument();
    expect(screen.getByText('#ai-core')).toBeInTheDocument();
    expect(screen.getByText('infra.md')).toBeInTheDocument();

    // Right Column: Activity & Comments
    expect(screen.getByText('Activity & Comments')).toBeInTheDocument();
    expect(screen.getByText('Cluster provisioned in us-east-4 with 8x H100.')).toBeInTheDocument();
    expect(screen.getByText('Eduardo')).toBeInTheDocument();
  });

  it('displays "Back to Kanban" when activeView is kanban', () => {
    useVaultStore.setState({ activeView: 'kanban' });
    render(<TaskDetailPage />);
    expect(screen.getByTestId('back-to-list-btn')).toHaveTextContent('Back to Kanban');
  });

  it('handles back button click and Escape key to return', () => {
    const handleBackMock = vi.fn();
    render(<TaskDetailPage onBack={handleBackMock} />);

    fireEvent.click(screen.getByTestId('back-to-list-btn'));
    expect(handleBackMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleBackMock).toHaveBeenCalledTimes(2);
  });

  it('toggles subtask status when clicking subtask checkbox', async () => {
    render(<TaskDetailPage />);

    const subtaskCheckbox = screen.getByTestId('subtask-checkbox-sub-2');
    await act(async () => {
      fireEvent.click(subtaskCheckbox);
    });

    const storeTasks = useVaultStore.getState().tasks;
    const task = storeTasks.find((t) => t.id === 'task-1');
    const updatedSub = task?.subtasks?.find((s) => s.id === 'sub-2');
    expect(updatedSub?.status).toBe('done');
  });

  it('adds a new subtask via Enter key or add button', async () => {
    render(<TaskDetailPage />);

    const input = screen.getByTestId('new-subtask-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Write unit tests' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    const storeTasks = useVaultStore.getState().tasks;
    const task = storeTasks.find((t) => t.id === 'task-1');
    expect(task?.subtasks).toHaveLength(4);
    expect(task?.subtasks?.some((s) => s.title === 'Write unit tests')).toBe(true);
  });

  it('posts a new comment and adds it to the activity timeline', async () => {
    render(<TaskDetailPage />);

    const commentTextarea = screen.getByTestId('new-comment-textarea');
    const postBtn = screen.getByTestId('post-comment-btn');

    await act(async () => {
      fireEvent.change(commentTextarea, { target: { value: 'Dataset sync verified successfully.' } });
    });

    expect(postBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(postBtn);
    });

    const storeTasks = useVaultStore.getState().tasks;
    const task = storeTasks.find((t) => t.id === 'task-1');
    expect(task?.comments).toHaveLength(2);
    expect(task?.comments?.[1].content).toBe('Dataset sync verified successfully.');
    expect(task?.comments?.[1].author).toBe('You');
  });

  it('toggles task completion status when clicking Mark as Done / Completed button', async () => {
    render(<TaskDetailPage />);

    const toggleBtn = screen.getByTestId('toggle-done-btn');
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    const storeTasks = useVaultStore.getState().tasks;
    const task = storeTasks.find((t) => t.id === 'task-1');
    expect(task?.status).toBe('done');
    expect(task?.completedDate).toBeDefined();
  });
});
