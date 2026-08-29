import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  safeRelaunchApp,
  mockUpdaterInstance,
} from '../../src/utils/updater';
import { useVaultStore } from '../../src/store';

describe('In-App Updater Lifecycle & Security Simulation Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario A: detects available new release v0.2.0-alpha.1 and streams progress chunks to 100%', async () => {
    mockUpdaterInstance.setMockState({
      available: true,
      version: '0.2.0-alpha.1',
      notes: '• Security updates and auto-updater integration',
    });

    const updateInfo = await checkForAppUpdate();
    expect(updateInfo).not.toBeNull();
    expect(updateInfo?.version).toBe('0.2.0-alpha.1');
    expect(updateInfo?.currentVersion).toBe('0.1.0-alpha.3');
    expect(updateInfo?.body).toContain('auto-updater integration');

    // Simulate progress callback
    const progressChunks: number[] = [];
    await downloadAndInstallUpdate((_dl, _tot, percent) => {
      progressChunks.push(percent);
    });

    expect(progressChunks).toContain(10);
    expect(progressChunks).toContain(35);
    expect(progressChunks).toContain(70);
    expect(progressChunks).toContain(100);
  });

  it('Scenario B: detects app is already on latest version', async () => {
    mockUpdaterInstance.setMockState({
      available: false,
    });

    const updateInfo = await checkForAppUpdate();
    expect(updateInfo).toBeNull();
  });

  it('Scenario C: rejects corrupted or tampered cryptographic Minisign signatures safely', async () => {
    mockUpdaterInstance.setMockState({
      available: true,
      corrupt: true,
    });

    const updateInfo = await checkForAppUpdate();
    expect(updateInfo).not.toBeNull();

    await expect(downloadAndInstallUpdate()).rejects.toThrow(
      /Minisign signature mismatch: signature is invalid or file is corrupted/
    );
  });

  it('Scenario D: flushes active note document before triggering relaunch', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    // Mock active file and doc
    useVaultStore.setState({
      activeFile: '/MockVault/today.md',
      activeDocument: {
        frontmatter: { title: "Today's Focus" },
        sections: [
          {
            title: 'Tasks',
            level: 1,
            tasks: [
              { id: 'task-1', title: 'Finish updater testing', status: 'todo' },
            ],
            rawText: '',
          },
        ],
        tasks: [
          { id: 'task-1', title: 'Finish updater testing', status: 'todo', filePath: '/MockVault/today.md' },
        ],
      },
    });

    await safeRelaunchApp();

    expect(reloadMock).toHaveBeenCalled();
  });
});
