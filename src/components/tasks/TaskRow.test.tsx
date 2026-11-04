import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskRow from './TaskRow';
import type { TaskItem } from '../../store/types';

vi.mock('../../utils/feedback', () => ({ triggerCompletionFeedback: vi.fn() }));

const task = (status: TaskItem['status']): TaskItem => ({
  id: 'task-a',
  title: 'Pay rent',
  status,
  tags: [],
});

describe('TaskRow completion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes a task without the full-screen celebration', () => {
    const onToggle = vi.fn();
    render(<TaskRow task={task('todo')} onToggle={onToggle} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByTestId('task-checkbox-task-a'));
    expect(onToggle).toHaveBeenCalledWith('task-a');
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('tints a done task green with a smooth transition', () => {
    render(<TaskRow task={task('done')} onToggle={vi.fn()} onSelect={vi.fn()} />);
    const row = screen.getByTestId('task-row-task-a');
    expect(row).toHaveAttribute('data-done', 'true');
    expect(row.className).toMatch(/bg-forest-50/);
    expect(row.className).toMatch(/duration-300/);
  });
});
