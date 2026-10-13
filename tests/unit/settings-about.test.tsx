import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../../src/components/settings/SettingsModal';

vi.mock('../../src/store/ipc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store/ipc')>();
  return {
    ...actual,
    isTauriEnvironment: vi.fn().mockReturnValue(false),
  };
});

describe('SettingsModal About Tab', () => {
  it('displays Current Version and Build Date & Time in About & Status tab', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    // Click on About & Status tab
    const aboutTabButton = screen.getByRole('button', { name: /About & Status/i });
    fireEvent.click(aboutTabButton);

    // Verify header version badge matches about tab version
    const headerVersionBadge = screen.getByTestId('preferences-header-version');
    expect(headerVersionBadge).toBeInTheDocument();
    expect(headerVersionBadge.textContent).toContain('0.1.0-alpha.5');

    // Verify version and build timestamp elements are rendered
    const versionSpan = screen.getByTestId('app-current-version');
    expect(versionSpan).toBeInTheDocument();
    expect(versionSpan.textContent).toBe('v0.1.0-alpha.5');

    // Both must match
    expect(headerVersionBadge.textContent).toBe(`QuietFlow ${versionSpan.textContent}`);

    const buildTimeSpan = screen.getByTestId('app-build-time');
    expect(buildTimeSpan).toBeInTheDocument();
    expect(buildTimeSpan.textContent).not.toBe('');
  });
});
