import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../../src/App';
import { useVaultStore } from '../../src/store';
import { ipc } from '../../src/store/ipc';
import { VaultTree } from '../../src/store/types';

describe('Vault Snapshots & Corruption Recovery End-to-End Simulation', () => {
  const mockVaultPath = '/Users/eduardo/QuietFlowVault';
  const workFilePath = `${mockVaultPath}/work.md`;

  const healthyContent = `---
title: Work Projects
---

# Tasks

- [ ] Critical Project Milestone #ops @priority(high)
- [ ] Review security audit checklist #sec
- [x] Initial design doc
`;

  const mockTree: VaultTree = {
    name: 'QuietFlowVault',
    path: mockVaultPath,
    isDirectory: true,
    fileCount: 1,
    children: [
      {
        name: 'work.md',
        path: workFilePath,
        isDirectory: false,
        fileCount: 0,
        children: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    localStorage.setItem('quietflow-vault-path', mockVaultPath);
    vi.spyOn(ipc, 'getDefaultVaultPath').mockResolvedValue(mockVaultPath);
  });

  it('Phase 1 -> 4: Detects disk-level file truncation/corruption and successfully restores from swap snapshot', async () => {
    let onDiskContent = healthyContent;

    const mockSnapshots = [
      {
        id: '1724930000',
        timestamp: '1724930000',
        fileName: 'work.md',
        relativePath: 'work.md',
        sizeBytes: healthyContent.length,
        snapshotPath: `${mockVaultPath}/.quietflow/snapshots/work.md/1724930000.md`,
        taskCount: 3,
      },
    ];

    vi.spyOn(ipc, 'initVault').mockResolvedValue(mockTree);
    vi.spyOn(ipc, 'readFile').mockImplementation(async (path: string) => {
      if (path === workFilePath) return onDiskContent;
      return '';
    });
    vi.spyOn(ipc, 'listSnapshots').mockResolvedValue(mockSnapshots);
    vi.spyOn(ipc, 'restoreSnapshot').mockImplementation(async (_vPath, _fPath, _id) => {
      // Simulate snapshot restore repairing the on-disk file
      onDiskContent = healthyContent;
    });

    render(<App />);

    // 1. Initial vault load with healthy note
    await act(async () => {
      await useVaultStore.getState().loadVault(mockVaultPath);
      await useVaultStore.getState().selectFile(workFilePath);
    });

    expect(await screen.findByText('Critical Project Milestone')).toBeInTheDocument();
    expect(screen.getByText('Review security audit checklist')).toBeInTheDocument();

    // 2. SIMULATE SUDDEN ON-DISK CORRUPTION / TRUNCATION TO 0 BYTES
    onDiskContent = ''; // File was emptied or corrupted by external crash

    // 3. User re-selects or re-opens the corrupted note
    await act(async () => {
      await useVaultStore.getState().selectFile(workFilePath);
    });

    // Verify CorruptionWarningBanner automatically appears!
    expect(await screen.findByTestId('corruption-warning-banner')).toBeInTheDocument();
    expect(screen.getByText(/Empty or Corrupted File Detected/i)).toBeInTheDocument();
    expect(screen.getByTestId('restore-snapshot-banner-btn')).toBeInTheDocument();

    // 4. Click "Restore from Snapshot" on the banner
    const restoreBtn = screen.getByTestId('restore-snapshot-banner-btn');
    await act(async () => {
      fireEvent.click(restoreBtn);
    });

    // 5. Assert complete data recovery & banner dismissal
    await waitFor(() => {
      expect(ipc.restoreSnapshot).toHaveBeenCalledWith(mockVaultPath, workFilePath, '1724930000');
    });

    // All original tasks must be back on the canvas!
    expect(await screen.findByText('Critical Project Milestone')).toBeInTheDocument();
    expect(screen.getByText('Review security audit checklist')).toBeInTheDocument();
    expect(screen.getByText('Initial design doc')).toBeInTheDocument();

    // Warning banner should be cleared
    await waitFor(() => {
      expect(screen.queryByTestId('corruption-warning-banner')).not.toBeInTheDocument();
    });
  });
});
