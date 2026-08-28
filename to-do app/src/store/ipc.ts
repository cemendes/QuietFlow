import { VaultNode, VaultTree } from './types';

// Type declarations for Tauri global / window detection
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__);
}

export interface IpcInterface {
  initVault: (path: string) => Promise<VaultTree>;
  readFile: (path: string) => Promise<string>;
  writeFileAtomic: (path: string, content: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  startWatchingVault: (path: string) => Promise<void>;
  listenVaultChanged: (callback: (vaultPath: string) => void) => Promise<() => void>;
}

// In-memory fallback mock for browser/testing environment
class BrowserMockIpc implements IpcInterface {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  async initVault(path: string): Promise<VaultTree> {
    const rootNode: VaultNode = {
      name: path.split('/').pop() || 'Vault',
      path,
      isDirectory: true,
      children: [],
      fileCount: 0,
    };
    return rootNode;
  }

  async readFile(path: string): Promise<string> {
    if (this.files.has(path)) {
      return this.files.get(path)!;
    }
    return '';
  }

  async writeFileAtomic(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async createDirectory(path: string): Promise<void> {
    this.directories.add(path);
  }

  async deleteEntry(path: string): Promise<void> {
    this.files.delete(path);
    this.directories.delete(path);
  }

  async startWatchingVault(_path: string): Promise<void> {
    // No-op in browser mock
  }

  async listenVaultChanged(_callback: (vaultPath: string) => void): Promise<() => void> {
    return () => {};
  }
}

const browserMock = new BrowserMockIpc();

export const ipc: IpcInterface = {
  initVault: async (path: string): Promise<VaultTree> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<VaultTree>('init_vault', { path });
    }
    return browserMock.initVault(path);
  },

  readFile: async (path: string): Promise<string> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('read_file', { path });
    }
    return browserMock.readFile(path);
  },

  writeFileAtomic: async (path: string, content: string): Promise<void> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<void>('write_file_atomic', { path, content });
    }
    return browserMock.writeFileAtomic(path, content);
  },

  createDirectory: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<void>('create_directory', { path });
    }
    return browserMock.createDirectory(path);
  },

  deleteEntry: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<void>('delete_entry', { path });
    }
    return browserMock.deleteEntry(path);
  },

  startWatchingVault: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<void>('start_watching_vault', { path });
    }
    return browserMock.startWatchingVault(path);
  },

  listenVaultChanged: async (callback: (vaultPath: string) => void): Promise<() => void> => {
    if (isTauriEnvironment()) {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<string>('vault://changed', (event) => {
        callback(event.payload);
      });
      return unlisten;
    }
    return browserMock.listenVaultChanged(callback);
  },
};
