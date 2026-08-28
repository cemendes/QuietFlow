import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BreadcrumbBanner from './BreadcrumbBanner';

describe('BreadcrumbBanner Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render banner if idle time is less than threshold', () => {
    localStorage.setItem('quietflow-last-active-file', '/vault/Client-Proposal.md');
    localStorage.setItem('quietflow-last-active-time', Date.now().toString());

    render(<BreadcrumbBanner thresholdMinutes={15} />);
    expect(screen.queryByTestId('breadcrumb-banner')).toBeNull();
  });

  it('renders welcome back banner and restores file on click when idle time exceeds threshold', () => {
    // 20 minutes ago
    const pastTime = Date.now() - 20 * 60 * 1000;
    localStorage.setItem('quietflow-last-active-file', '/vault/Client-Proposal.md');
    localStorage.setItem('quietflow-last-active-time', pastTime.toString());

    render(<BreadcrumbBanner thresholdMinutes={15} />);

    // Simulate window regaining focus
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByTestId('breadcrumb-banner')).toBeInTheDocument();
    expect(screen.getByText(/Client-Proposal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
  });
});
