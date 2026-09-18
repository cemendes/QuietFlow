import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DocumentTaskCard } from '../../src/components/document/DocumentTaskCard';
import { TaskItem } from '../../src/store/types';

describe('DocumentTaskCard Component', () => {
  const baseTask: TaskItem = {
    id: 'task-1',
    title: 'Regular task title',
    status: 'todo',
    filePath: 'Google/Wellsky/DevDay.md',
    lineIndex: 7,
  };

  it('renders standard plain text task title', () => {
    render(<DocumentTaskCard task={baseTask} />);
    expect(screen.getByText('Regular task title')).toBeDefined();
  });

  it('renders markdown links cleanly without exposing raw URL syntax', () => {
    const taskWithLink: TaskItem = {
      ...baseTask,
      title: 'Buy [tickets and hotel](https://us2.concursolutions.com/travel/trip) for Kansas City.',
    };

    const onSelect = vi.fn();
    render(<DocumentTaskCard task={taskWithLink} onSelect={onSelect} />);

    // Link text should be rendered as a link
    const linkEl = screen.getByRole('link', { name: 'tickets and hotel' });
    expect(linkEl).toBeDefined();
    expect(linkEl.getAttribute('href')).toBe('https://us2.concursolutions.com/travel/trip');

    // Surrounding text should be rendered
    expect(screen.getByText(/Buy/)).toBeDefined();
    expect(screen.getByText(/for Kansas City\./)).toBeDefined();

    // Raw markdown syntax and URL should NOT be visible in text
    expect(screen.queryByText(/\[tickets and hotel\]/)).toBeNull();
    expect(screen.queryByText(/\(https:\/\/us2\.concursolutions\.com\/travel\/trip\)/)).toBeNull();

    // Clicking the link should not bubble to onSelect
    fireEvent.click(linkEl);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
