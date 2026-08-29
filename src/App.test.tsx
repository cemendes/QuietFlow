import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders QuietFlow brand header', () => {
    render(<App />);
    expect(screen.getByText(/QuietFlow/i)).toBeInTheDocument();
  });
});
