import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import TaskDetailPanel from './TaskDetailPanel';
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
    notes: 'Initial meeting notes with CFO regarding revenue projections.',
    subtasks: [
      { id: 'sub-1', title: 'Check cash flow statement', status: 'done' },
      { id: 'sub-2', title: 'Export PDF summaries', status: 'todo' },
    ],
    filePath: '/vault/projects/finance.md',
  },
  {
    id: 'task-2',
    title: 'Clean room',
    status: 'in-progress',
    tags: [],
    subtasks: [],
    filePath: '/vault/home.md',
  },
];

describe('TaskDetailPanel Component', () => {
  beforeEach(() => {
    useVaultStore.setState({
      tasks: [...mockTasks],
      activeTaskId: 'task-1',
      activeFile: '/vault/projects/finance.md',
      isLoading: false,
      error: null,
    });
  });

  it('renders null or hidden when activeTaskId is null or not found', () => {
    useVaultStore.setState({ activeTaskId: null });
    const { container } = render(<TaskDetailPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders task title, folder path, metadata controls, subtasks, and markdown note editor', () => {
    render(<TaskDetailPanel />);

    // Folder path display
    expect(screen.getByText(/projects\/finance\.md/i)).toBeInTheDocument();

    // Task title editable input/field
    const titleInput = screen.getByDisplayValue('Review Q3 financial forecast');
    expect(titleInput).toBeInTheDocument();

    // Status and Priority controls
    expect(screen.getByTestId('status-select')).toHaveValue('todo');
    expect(screen.getByTestId('priority-select')).toHaveValue('high');

    // Due date control
    expect(screen.getByTestId('due-date-input')).toHaveValue('2026-08-28');

    // Subtask items
    expect(screen.getByText('Check cash flow statement')).toBeInTheDocument();
    expect(screen.getByText('Export PDF summaries')).toBeInTheDocument();

    // Note content in editor
    expect(screen.getByDisplayValue(/Initial meeting notes with CFO/i)).toBeInTheDocument();
  });

  it('updates task title on change', async () => {
    render(<TaskDetailPanel />);
    const titleInput = screen.getByDisplayValue('Review Q3 financial forecast');

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Review Q3 & Q4 financial forecast' } });
    });

    const active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.title).toBe('Review Q3 & Q4 financial forecast');
  });

  it('updates task status when changed via dropdown', async () => {
    render(<TaskDetailPanel />);
    const statusSelect = screen.getByTestId('status-select');

    await act(async () => {
      fireEvent.change(statusSelect, { target: { value: 'in-progress' } });
    });

    const active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.status).toBe('in-progress');
  });

  it('updates task priority when changed via dropdown', async () => {
    render(<TaskDetailPanel />);
    const prioritySelect = screen.getByTestId('priority-select');

    await act(async () => {
      fireEvent.change(prioritySelect, { target: { value: 'medium' } });
    });

    const active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.priority).toBe('medium');
  });

  it('updates due date when changed', async () => {
    render(<TaskDetailPanel />);
    const dueInput = screen.getByTestId('due-date-input');

    await act(async () => {
      fireEvent.change(dueInput, { target: { value: '2026-09-01' } });
    });

    const active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.dueDate).toBe('2026-09-01');
  });

  it('adds a new subtask, toggles existing subtask, and deletes subtask', async () => {
    render(<TaskDetailPanel />);

    // Add subtask
    const subtaskInput = screen.getByPlaceholderText(/Add subtask/i);
    await act(async () => {
      fireEvent.change(subtaskInput, { target: { value: 'Send summary email' } });
      fireEvent.keyDown(subtaskInput, { key: 'Enter', code: 'Enter' });
    });

    let active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.subtasks?.some((st) => st.title === 'Send summary email')).toBe(true);

    // Toggle subtask sub-2
    const sub2Checkbox = screen.getByTestId('subtask-checkbox-sub-2');
    await act(async () => {
      fireEvent.click(sub2Checkbox);
    });

    active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    const sub2 = active?.subtasks?.find((s) => s.id === 'sub-2');
    expect(sub2?.status).toBe('done');

    // Delete subtask sub-1
    const deleteSub1Btn = screen.getByTestId('delete-subtask-sub-1');
    await act(async () => {
      fireEvent.click(deleteSub1Btn);
    });

    active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.subtasks?.some((s) => s.id === 'sub-1')).toBe(false);
  });

  it('edits notes markdown and switches between edit and preview mode', async () => {
    render(<TaskDetailPanel />);

    // Markdown textarea
    const noteArea = screen.getByTestId('markdown-editor-textarea');
    expect(noteArea).toHaveValue('Initial meeting notes with CFO regarding revenue projections.');

    await act(async () => {
      fireEvent.change(noteArea, {
        target: { value: '## Notes\n- Action items discussed\n- Next sync on Friday' },
      });
    });

    const active = useVaultStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(active?.notes).toBe('## Notes\n- Action items discussed\n- Next sync on Friday');

    // Switch to preview mode
    const previewTab = screen.getByRole('button', { name: /preview/i });
    await act(async () => {
      fireEvent.click(previewTab);
    });

    // In preview mode, textarea is replaced by markdown preview element
    expect(screen.queryByTestId('markdown-editor-textarea')).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-preview')).toBeInTheDocument();
    expect(screen.getByText('Action items discussed')).toBeInTheDocument();

    // Switch back to edit mode
    const editTab = screen.getByRole('button', { name: /edit/i });
    await act(async () => {
      fireEvent.click(editTab);
    });
    expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();
  });

  it('renders with slide-over backdrop and closes on backdrop click', async () => {
    render(<TaskDetailPanel />);

    const backdrop = screen.getByTestId('task-detail-backdrop');
    expect(backdrop).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(backdrop);
    });

    expect(useVaultStore.getState().activeTaskId).toBeNull();
  });
});
