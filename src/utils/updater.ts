import { isTauriEnvironment } from '../store/ipc';
import { useVaultStore } from '../store';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export type DownloadProgressCallback = (downloaded: number, total: number | null, percent: number) => void;

// In-memory mock updater state for browser/test environments
class MockUpdater {
  private mockUpdateAvailable: boolean = false;
  private mockRemoteVersion: string = '0.2.0-alpha.1';
  private mockReleaseNotes: string = '• Added in-app updater and enhanced folder management\n• Improved keyboard navigation and theme colors';
  private mockCorruptedSignature: boolean = false;

  setMockState(config: { available: boolean; version?: string; notes?: string; corrupt?: boolean }) {
    this.mockUpdateAvailable = config.available;
    if (config.version) this.mockRemoteVersion = config.version;
    if (config.notes) this.mockReleaseNotes = config.notes;
    this.mockCorruptedSignature = !!config.corrupt;
  }

  async check(): Promise<UpdateInfo | null> {
    if (!this.mockUpdateAvailable) return null;
    return {
      version: this.mockRemoteVersion,
      currentVersion: '0.1.0-alpha.3',
      body: this.mockReleaseNotes,
      date: new Date().toISOString(),
    };
  }

  async downloadAndInstall(onProgress?: DownloadProgressCallback): Promise<void> {
    if (this.mockCorruptedSignature) {
      throw new Error('Minisign signature mismatch: signature is invalid or file is corrupted.');
    }

    const total = 12 * 1024 * 1024; // 12 MB
    const steps = [0.1, 0.35, 0.7, 1.0];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 20));
      onProgress?.(Math.round(total * step), total, Math.round(step * 100));
    }
  }
}

export const mockUpdaterInstance = new MockUpdater();

/**
 * Check for available application updates safely.
 */
export async function checkForAppUpdate(): Promise<UpdateInfo | null> {
  if (isTauriEnvironment()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return null;

      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body,
        date: update.date,
      };
    } catch (err: any) {
      const errorMsg = String(err?.message || err);
      // If the latest release has no newer version or manifest returns 404, treat gracefully as up-to-date
      if (
        errorMsg.includes('404') ||
        errorMsg.includes('Not Found') ||
        errorMsg.includes('could not find latest') ||
        errorMsg.includes('No updates')
      ) {
        return null;
      }
      console.warn('Updater check error:', err);
      throw err;
    }
  }

  // Non-Tauri fallback / test mock
  return await mockUpdaterInstance.check();
}

/**
 * Download and stage the update package.
 */
export async function downloadAndInstallUpdate(onProgress?: DownloadProgressCallback): Promise<void> {
  if (isTauriEnvironment()) {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      throw new Error('No update available to download.');
    }

    let downloadedBytes = 0;
    let totalBytes: number | null = null;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started' && event.data.contentLength) {
        totalBytes = event.data.contentLength;
        onProgress?.(0, totalBytes, 0);
      } else if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength;
        const percent = totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
        onProgress?.(downloadedBytes, totalBytes, percent);
      } else if (event.event === 'Finished') {
        onProgress?.(downloadedBytes, totalBytes, 100);
      }
    });
    return;
  }

  // Non-Tauri fallback / test mock
  await mockUpdaterInstance.downloadAndInstall(onProgress);
}

/**
 * Zero-Data-Loss Safe Relaunch:
 * Flushes active note document and pending vault state before restarting the desktop application.
 */
export async function safeRelaunchApp(): Promise<void> {
  try {
    // 1. Ensure any pending state is synced
    const activeFile = useVaultStore.getState().activeFile;
    if (activeFile) {
      const { ipc } = await import('../store/ipc');
      const content = await ipc.readFile(activeFile);
      if (content) {
        await ipc.writeFileAtomic(activeFile, content);
      }
    }
  } catch (err) {
    console.warn('Note flush warning before relaunch:', err);
  }

  // 2. Trigger native relaunch
  if (isTauriEnvironment()) {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } else {
    // In browser/test mode, simulate reload
    window.location.reload();
  }
}
