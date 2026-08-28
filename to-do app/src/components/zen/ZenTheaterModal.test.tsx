import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ZenTheaterModal from './ZenTheaterModal';
import { TaskItem } from '../../store/types';

describe('ZenTheaterModal Component', () => {
  const mockTask: TaskItem = {
    id: 'task-1',
    title: 'Draft Master Service Agreement revision',
    status: 'todo',
    priority: 'high',
    tags: ['legal'],
    filePath: '/vault/today.md',
  };

  it('renders seamless task focus and circular aura when open', () => {
    render(
      <ZenTheaterModal
        isOpen={true}
        task={mockTask}
        onClose={vi.fn()}
        onCompleteTask={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Zen Theater' })).toBeInTheDocument();
    expect(screen.getByText('Draft Master Service Agreement revision')).toBeInTheDocument();
    expect(screen.getByText('Current Focus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Task/i })).toBeInTheDocument();
  });

  it('handles completion trigger and close callback', () => {
    const handleComplete = vi.fn();
    const handleClose = vi.fn();

    render(
      <ZenTheaterModal
        isOpen={true}
        task={mockTask}
        onClose={handleClose}
        onCompleteTask={handleComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Complete Task/i }));
    expect(handleComplete).toHaveBeenCalledWith('task-1');
    expect(handleClose).toHaveBeenCalled();
  });
});
