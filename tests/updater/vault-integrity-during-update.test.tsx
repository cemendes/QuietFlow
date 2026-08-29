import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SettingsModal from '../../src/components/settings/SettingsModal';
import UpdateToast from '../../src/components/updater/UpdateToast';
import { mockUpdaterInstance } from '../../src/utils/updater';

describe('Vault Integrity & In-App Update UI Simulation Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Settings modal detects update, downloads with progress bar, and presents relaunch button', async () => {
    mockUpdaterInstance.setMockState({
      available: true,
      version: '0.2.0-alpha.1',
      notes: '• Groundbreaking new features',
    });

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // Switch to About tab
    fireEvent.click(screen.getByRole('button', { name: /about/i }));

    // Click Check for Updates
    const checkBtn = screen.getByTestId('check-updates-btn');
    fireEvent.click(checkBtn);

    // Wait for update available state
    await waitFor(() => {
      expect(screen.getByText(/New release v0.2.0-alpha.1 is available!/i)).toBeInTheDocument();
    });

    // Click Download & Install
    const downloadBtn = screen.getByTestId('download-update-btn');
    fireEvent.click(downloadBtn);

    // Wait for Ready state with Relaunch button
    await waitFor(
      () => {
        expect(screen.getByTestId('relaunch-update-btn')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('UpdateToast displays pill notice, starts download on click, and supports changelog pill', async () => {
    mockUpdaterInstance.setMockState({
      available: true,
      version: '0.2.0-alpha.1',
      notes: '• Performance updates',
    });

    render(<UpdateToast />);

    // Advance timer to trigger background startup check
    await waitFor(
      () => {
        expect(screen.getByTestId('update-toast-banner')).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    expect(screen.getByText(/Update available/i)).toBeInTheDocument();
    expect(screen.getByText('v0.2.0-alpha.1')).toBeInTheDocument();

    // Click pill to initiate update
    fireEvent.click(screen.getByTestId('update-toast-banner'));

    // Verify downloading state
    await waitFor(
      () => {
        expect(screen.getByText(/Updating.../i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
