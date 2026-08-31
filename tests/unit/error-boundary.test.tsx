import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';

const BadComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulated document rendering failure');
  }
  return <div>Healthy Document View</div>;
};

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <BadComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy Document View')).toBeInTheDocument();
  });

  it('catches render errors and displays calm fallback card with retry button', () => {
    // Suppress console.error in vitest for expected test crash
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestWrapper = () => {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button onClick={() => setShouldThrow(false)}>Fix Error</button>
          <ErrorBoundary fallbackTitle="Unable to load document">
            <BadComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    };

    render(<TestWrapper />);

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Unable to load document')).toBeInTheDocument();
    expect(screen.getAllByText(/Simulated document rendering failure/).length).toBeGreaterThan(0);

    // Fix error and click retry
    fireEvent.click(screen.getByText('Fix Error'));
    fireEvent.click(screen.getByText('Retry Render'));

    expect(screen.getByText('Healthy Document View')).toBeInTheDocument();

    spy.mockRestore();
  });
});
