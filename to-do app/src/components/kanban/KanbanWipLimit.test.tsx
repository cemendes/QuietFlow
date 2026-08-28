import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KanbanColumn from './KanbanColumn';
import { TaskItem } from '../../store/types';

describe('Kanban WIP Limit Test Suite', () => {
  const mockTasks: TaskItem[] = [
    { id: '1', title: 'Task 1', status: 'in-progress', filePath: '/v/1.md', tags: [] },
    { id: '2', title: 'Task 2', status: 'in-progress', filePath: '/v/1.md', tags: [] },
    { id: '3', title: 'Task 3', status: 'in-progress', filePath: '/v/1.md', tags: [] },
    { id: '4', title: 'Task 4', status: 'in-progress', filePath: '/v/1.md', tags: [] },
  ];

  it('displays soft warning badge when in-progress column exceeds WIP limit (max 3)', () => {
    render(
      <KanbanColumn
        id="in-progress"
        title="In Progress"
        tasks={mockTasks}
        activeTaskId={null}
        onSelectTask={() => {}}
        onTaskDrop={() => {}}
        maxWip={3}
      />
    );

    expect(screen.getByText(/4 \/ 3 WIP/i)).toBeInTheDocument();
    expect(screen.getByTestId('wip-warning-pill')).toBeInTheDocument();
  });

  it('displays normal WIP badge when within WIP limit', () => {
    render(
      <KanbanColumn
        id="in-progress"
        title="In Progress"
        tasks={mockTasks.slice(0, 2)}
        activeTaskId={null}
        onSelectTask={() => {}}
        onTaskDrop={() => {}}
        maxWip={3}
      />
    );

    expect(screen.getByText(/2 \/ 3 WIP/i)).toBeInTheDocument();
    expect(screen.queryByTestId('wip-warning-pill')).not.toBeInTheDocument();
  });
});
