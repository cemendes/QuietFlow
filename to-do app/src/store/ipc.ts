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
  moveEntry: (sourcePath: string, destinationPath: string) => Promise<void>;
  getDefaultVaultPath: () => Promise<string>;
  startWatchingVault: (path: string) => Promise<void>;
  listenVaultChanged: (callback: (vaultPath: string) => void) => Promise<() => void>;
}

// In-memory fallback mock for browser/testing environment
class BrowserMockIpc implements IpcInterface {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  constructor() {
    this.seedDefaultMockFiles();
  }

  private seedDefaultMockFiles() {
    const today = new Date().toISOString().split('T')[0];
    this.files.set(
      '/MockVault/today.md',
      `---
id: today-focus
title: Today's Focus
date: ${today}
---

# Tasks
- [ ] Review Q3 Security Audit & SLA @due(2026-09-01) @priority(high) #deliverable
  - Notes: Coordinate findings report with SecOps team
- [/] Draft Master Service Agreement revision @status(in-progress) #legal @priority(medium)
- [x] Finalize contract renewal pricing @completed(2026-08-27) #finance @priority(low)

# Meeting Notes
### Morning Standup
Timeline on track for September 15 release.
`
    );

    this.files.set(
      '/MockVault/Customers/Acme Corp.md',
      `---
id: cust-acme-corp
title: Acme Corp
category: Customers
---

# Deliverables
- [ ] Finalize enterprise SLA addendum @priority(high) #legal
- [/] Security questionnaire review @status(in-progress) #deliverable
`
    );

    this.files.set(
      '/MockVault/Customers/Beta Health.md',
      `---
id: cust-beta-health
title: Beta Health
category: Customers
---

# Deliverables
- [ ] Onboarding checklist verification @priority(medium) #support
`
    );
  }

  async initVault(basePath: string): Promise<VaultTree> {
    const rootPath = basePath || '/MockVault';
    const rootNode: VaultNode = {
      name: rootPath.split('/').pop() || 'Vault',
      path: rootPath,
      isDirectory: true,
      children: [],
      fileCount: 0,
    };

    // Group files into tree hierarchy
    const dirMap = new Map<string, VaultNode>();
    dirMap.set(rootPath, rootNode);

    for (const [filePath] of this.files.entries()) {
      if (!filePath.startsWith(rootPath)) continue;
      const relative = filePath.slice(rootPath.length).replace(/^\//, '');
      const parts = relative.split('/');

      if (parts.length === 1) {
        // Root file
        rootNode.children = rootNode.children || [];
        rootNode.children.push({
          name: parts[0],
          path: filePath,
          isDirectory: false,
          children: [],
          fileCount: 0,
        });
        rootNode.fileCount = (rootNode.fileCount || 0) + 1;
      } else {
        // Nested under folder
        const folderName = parts[0];
        const folderPath = `${rootPath}/${folderName}`;
        if (!dirMap.has(folderPath)) {
          const folderNode: VaultNode = {
            name: folderName,
            path: folderPath,
            isDirectory: true,
            children: [],
            fileCount: 0,
          };
          dirMap.set(folderPath, folderNode);
          rootNode.children = rootNode.children || [];
          rootNode.children.push(folderNode);
        }

        const folderNode = dirMap.get(folderPath)!;
        folderNode.children = folderNode.children || [];
        folderNode.fileCount = (folderNode.fileCount || 0) + 1;
        rootNode.fileCount = (rootNode.fileCount || 0) + 1;
      }
    }

    // Include explicitly created directories
    for (const dirPath of this.directories.values()) {
      if (!dirPath.startsWith(rootPath) || dirPath === rootPath) continue;
      const relative = dirPath.slice(rootPath.length).replace(/^\//, '');
      const parts = relative.split('/');
      const folderName = parts[0];
      const folderPath = `${rootPath}/${folderName}`;
      if (!dirMap.has(folderPath)) {
        const folderNode: VaultNode = {
          name: folderName,
          path: folderPath,
          isDirectory: true,
          children: [],
          fileCount: 0,
        };
        dirMap.set(folderPath, folderNode);
        rootNode.children = rootNode.children || [];
        rootNode.children.push(folderNode);
      }
    }

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

  async moveEntry(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.files.has(sourcePath)) {
      const content = this.files.get(sourcePath)!;
      this.files.delete(sourcePath);
      this.files.set(destinationPath, content);
    }
    if (this.directories.has(sourcePath)) {
      this.directories.delete(sourcePath);
      this.directories.add(destinationPath);
    }
  }

  async getDefaultVaultPath(): Promise<string> {
    return '/MockVault';
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

  getDefaultVaultPath: async (): Promise<string> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('get_default_vault_path');
    }
    return browserMock.getDefaultVaultPath();
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

  moveEntry: async (sourcePath: string, destinationPath: string): Promise<void> => {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<void>('move_entry', { sourcePath, destinationPath });
    }
    return browserMock.moveEntry(sourcePath, destinationPath);
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
