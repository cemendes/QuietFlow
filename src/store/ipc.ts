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

    const dirMap = new Map<string, VaultNode>();
    dirMap.set(rootPath, rootNode);

    // Returns the node for a directory, creating it and any missing ancestors
    const ensureDirectory = (dirPath: string): VaultNode => {
      const existing = dirMap.get(dirPath);
      if (existing) return existing;
      const parentPath = dirPath.substring(0, dirPath.lastIndexOf('/'));
      const dirNode: VaultNode = {
        name: dirPath.split('/').pop() || '',
        path: dirPath,
        isDirectory: true,
        children: [],
        fileCount: 0,
      };
      dirMap.set(dirPath, dirNode);
      ensureDirectory(parentPath).children.push(dirNode);
      return dirNode;
    };

    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(`${rootPath}/`)) continue;
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
      ensureDirectory(parentPath).children.push({
        name: filePath.split('/').pop() || '',
        path: filePath,
        isDirectory: false,
        children: [],
        fileCount: 0,
      });
    }

    // Include explicitly created (possibly empty) directories
    for (const dirPath of this.directories.values()) {
      if (!dirPath.startsWith(`${rootPath}/`)) continue;
      ensureDirectory(dirPath);
    }

    // Mirror the Rust scanner: recursive file counts, directories first then alphabetical
    const finalize = (node: VaultNode): number => {
      let count = 0;
      for (const child of node.children) {
        count += child.isDirectory ? finalize(child) : 1;
      }
      node.children.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      node.fileCount = count;
      return count;
    };
    finalize(rootNode);

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
    // Deleting a directory removes everything beneath it
    const isInside = (p: string) => p === path || p.startsWith(`${path}/`);
    for (const filePath of [...this.files.keys()]) {
      if (isInside(filePath)) this.files.delete(filePath);
    }
    for (const dirPath of [...this.directories]) {
      if (isInside(dirPath)) this.directories.delete(dirPath);
    }
  }

  async moveEntry(sourcePath: string, destinationPath: string): Promise<void> {
    // Moving a directory carries everything beneath it
    const isInside = (p: string) => p === sourcePath || p.startsWith(`${sourcePath}/`);
    const relocate = (p: string) => destinationPath + p.slice(sourcePath.length);

    let movedDirectory = this.directories.has(sourcePath);
    for (const [filePath, content] of [...this.files.entries()]) {
      if (!isInside(filePath)) continue;
      if (filePath !== sourcePath) movedDirectory = true;
      this.files.delete(filePath);
      this.files.set(relocate(filePath), content);
    }
    for (const dirPath of [...this.directories]) {
      if (!isInside(dirPath)) continue;
      this.directories.delete(dirPath);
      this.directories.add(relocate(dirPath));
    }
    // Keep a directory that only existed implicitly (through its files) alive if it ends up empty
    if (movedDirectory) this.directories.add(destinationPath);
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
