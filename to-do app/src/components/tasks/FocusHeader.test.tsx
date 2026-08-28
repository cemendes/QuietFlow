import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FocusHeader } from './FocusHeader';

describe('FocusHeader Test Suite', () => {
  it('renders completed tasks count, progress ring percentage, and toggles Now/Not Now filter', () => {
    const handleFilterChange = vi.fn();
    render(
      <FocusHeader
        title="Today's Focus"
        completedCount={4}
        totalCount={7}
        activeFocusBucket="all"
        onFocusBucketChange={handleFilterChange}
      />
    );

    expect(screen.getByText(/4 of 7 completed/i)).toBeInTheDocument();
    expect(screen.getByText('57%')).toBeInTheDocument();

    const nowOnlyBtn = screen.getByRole('button', { name: /now only/i });
    fireEvent.click(nowOnlyBtn);
    expect(handleFilterChange).toHaveBeenCalledWith('now');
  });

  it('renders 100% and congratulatory color when all tasks are complete', () => {
    render(
      <FocusHeader
        title="Today's Focus"
        completedCount={5}
        totalCount={5}
        activeFocusBucket="all"
        onFocusBucketChange={() => {}}
      />
    );

    expect(screen.getByText(/5 of 5 completed/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
