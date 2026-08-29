import { useSyncExternalStore } from 'react';
import {
  addTaskToDocument,
  deleteTaskFromDocument,
  parseMarkdownDocument,
  updateTaskInDocument,
} from '../core/markdown';
import {
  loadLogoConfig,
  persistFolderEmoji,
  persistFolderLogo,
  getFolderRelativePath,
} from '../services/logoService';
import { ipc } from './ipc';
import {
  NewTaskInput,
  TaskItem,
  TaskPriority,
  VaultNode,
  VaultStore,
  VaultStoreState,
  ViewMode,
} from './types';

const INITIAL_STATE: VaultStoreState = {
  vaultPath: null,
  vaultTree: null,
  activeFile: null,
  activeFolder: null,
  activeDocument: null,
  tasks: [],
  activeTaskId: null,
  searchQuery: '',
  activeView: 'list',
  selectedTag: null,
  selectedPriority: null,
  logoConfig: {},
  isLoading: false,
  isSaving: false,
  error: null,
};

let state: VaultStoreState = { ...INITIAL_STATE };
const listeners = new Set<() => void>();
let vaultUnlisten: (() => void) | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function set(updater: Partial<VaultStoreState> | ((prev: VaultStoreState) => Partial<VaultStoreState>)) {
  const next = typeof updater === 'function' ? updater(state) : updater;
  state = { ...state, ...next };
  notify();
}

function getState(): VaultStoreState {
  return state;
}

function setState(newState: Partial<VaultStoreState>) {
  set(newState);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let lastSelfWriteTimestamp = 0;

async function writeVaultFile(filePath: string, content: string): Promise<void> {
  lastSelfWriteTimestamp = Date.now();
  await ipc.writeFileAtomic(filePath, content);
  lastSelfWriteTimestamp = Date.now();
}

async function loadVault(vaultPath: string): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('quietflow-vault-path', vaultPath);
    }
    // Save to OS application support directory via backend IPC
    if (typeof ipc?.setSavedVaultPath === 'function') {
      try {
        await ipc.setSavedVaultPath(vaultPath);
      } catch {
        // Ignored
      }
    }

    const [tree, logoConfig] = await Promise.all([
      ipc.initVault(vaultPath),
      loadLogoConfig(vaultPath),
    ]);
    set((prev) => ({
      ...prev,
      vaultPath,
      vaultTree: tree,
      logoConfig,
      isLoading: false,
    }));

    // Auto-select today.md or first note if activeFile is empty
    let targetNode =
      tree.children?.find((c) => !c.isDirectory && c.name.toLowerCase() === 'today.md') ||
      tree.children?.find((c) => !c.isDirectory && c.name.endsWith('.md'));

    if (!targetNode && vaultPath) {
      // Auto-create today.md if none exists in this vault
      try {
        const todayPath = `${vaultPath}/today.md`;
        const initialContent = `---\ntitle: Today's Focus\n---\n\n# Tasks\n`;
        await writeVaultFile(todayPath, initialContent);
        await refreshVault();
        targetNode = {
          name: 'today.md',
          path: todayPath,
          isDirectory: false,
          children: [],
          fileCount: 0,
        };
      } catch {
        // Safe fallback in mock/read-only vaults
      }
    }

    if (targetNode && !getState().activeFile) {
      await selectFile(targetNode.path);
    }

    // Clean up any existing listener
    if (vaultUnlisten) {
      vaultUnlisten();
      vaultUnlisten = null;
    }

    try {
      await ipc.startWatchingVault(vaultPath);
      vaultUnlisten = await ipc.listenVaultChanged(async (changedVaultPath) => {
        if (changedVaultPath === getState().vaultPath) {
          const isSelfWrite = Date.now() - lastSelfWriteTimestamp < 600;
          await refreshVault();
          // Only refresh active file/folder if this was an external change (not initiated by app save)
          if (!isSelfWrite) {
            if (getState().activeFile) {
              await refreshActiveFile();
            } else if (getState().activeFolder) {
              await selectFolder(getState().activeFolder!);
            }
          }
        }
      });
    } catch {
      // Ignore watcher failure in browser mock
    }
  } catch (err: any) {
    console.error('loadVault error:', err);
    set((prev) => ({
      ...prev,
      vaultPath,
      isLoading: false,
      error: err?.message || err?.toString() || 'Failed to load vault',
    }));
  }
}

async function refreshVault(): Promise<void> {
  const currentPath = getState().vaultPath;
  if (!currentPath) return;

  try {
    const [tree, logoConfig] = await Promise.all([
      ipc.initVault(currentPath),
      loadLogoConfig(currentPath),
    ]);
    set({ vaultTree: tree, logoConfig });
  } catch (err: any) {
    console.error('Failed to refresh vault tree:', err);
  }
}

function collectMarkdownFiles(node: VaultNode | null): string[] {
  if (!node) return [];
  const files: string[] = [];
  if (!node.isDirectory && (node.name.endsWith('.md') || !node.name.includes('.'))) {
    files.push(node.path);
  }
  if (node.children) {
    for (const child of node.children) {
      files.push(...collectMarkdownFiles(child));
    }
  }
  return files;
}

function findNodeByPath(root: VaultNode | null, targetPath: string): VaultNode | null {
  if (!root) return null;
  if (root.path === targetPath) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

async function selectFolder(folderPath: string): Promise<void> {
  set({ isLoading: true, error: null, activeFolder: folderPath, activeFile: null });
  try {
    const root = getState().vaultTree;
    const folderNode = findNodeByPath(root, folderPath);
    const mdFiles = folderNode ? collectMarkdownFiles(folderNode) : [];

    const allTasks: TaskItem[] = [];
    for (const file of mdFiles) {
      try {
        const content = await ipc.readFile(file);
        const doc = parseMarkdownDocument(content);
        const tasksWithFile = doc.tasks.map((t) => ({
          ...t,
          filePath: file,
        }));
        allTasks.push(...tasksWithFile);
      } catch (e) {
        console.warn(`Failed to read markdown file in folder ${file}:`, e);
      }
    }

    set((prev) => ({
      ...prev,
      activeFolder: folderPath,
      activeFile: null,
      activeDocument: null,
      tasks: allTasks,
      isLoading: false,
    }));
  } catch (err: any) {
    set((prev) => ({
      ...prev,
      isLoading: false,
      error: err?.message || err?.toString() || `Failed to select folder: ${folderPath}`,
    }));
  }
}

async function selectFile(filePath: string): Promise<void> {
  set({ isLoading: true, error: null, activeFile: filePath, activeFolder: null });
  try {
    const content = await ipc.readFile(filePath);
    const doc = parseMarkdownDocument(content);

    // Attach filePath to tasks for convenience
    const tasksWithFile = doc.tasks.map((t) => ({
      ...t,
      filePath,
    }));

    set((prev) => ({
      ...prev,
      activeFile: filePath,
      activeFolder: null,
      activeDocument: doc,
      tasks: tasksWithFile,
      isLoading: false,
    }));
  } catch (err: any) {
    set((prev) => ({
      ...prev,
      isLoading: false,
      error: err?.message || err?.toString() || `Failed to read file: ${filePath}`,
    }));
  }
}

async function refreshActiveFile(): Promise<void> {
  const currentFile = getState().activeFile;
  if (!currentFile) return;

  try {
    const content = await ipc.readFile(currentFile);
    const doc = parseMarkdownDocument(content);
    const tasksWithFile = doc.tasks.map((t) => ({
      ...t,
      filePath: currentFile,
    }));
    set({
      activeDocument: doc,
      tasks: tasksWithFile,
    });
  } catch (err: any) {
    console.error(`Failed to refresh active file ${currentFile}:`, err);
  }
}

async function createFile(filePath: string, initialContent = ''): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    await writeVaultFile(filePath, initialContent);
    await refreshVault();
    await selectFile(filePath);
  } catch (err: any) {
    set({
      isLoading: false,
      error: err?.message || err?.toString() || `Failed to create file: ${filePath}`,
    });
  }
}

async function deleteEntry(path: string): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    await ipc.deleteEntry(path);
    if (getState().activeFile === path) {
      set({ activeFile: null, activeDocument: null, tasks: [], activeTaskId: null });
    }
    await refreshVault();
    set({ isLoading: false });
  } catch (err: any) {
    set({
      isLoading: false,
      error: err?.message || err?.toString() || `Failed to delete entry: ${path}`,
    });
  }
}

function setTasks(tasks: TaskItem[]): void {
  set({ tasks });
}

async function toggleTask(taskId: string): Promise<void> {
  const currentTasks = getState().tasks;
  const targetTask = currentTasks.find((t) => t.id === taskId);
  if (!targetTask) return;

  const currentStatus = targetTask.status;
  const newStatus = currentStatus === 'done' ? 'todo' : 'done';
  const completedDate =
    newStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;

  // Optimistic UI state update
  const updatedTasks = currentTasks.map((t) => {
    if (t.id === taskId) {
      const copy: TaskItem = { ...t, status: newStatus };
      if (completedDate) {
        copy.completedDate = completedDate;
      } else {
        delete copy.completedDate;
      }
      return copy;
    }
    return t;
  });

  set({ tasks: updatedTasks, isSaving: true, error: null });

  // Sync to disk
  const targetFile = targetTask.filePath || getState().activeFile;
  if (!targetFile) {
    set({ isSaving: false });
    return;
  }

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = updateTaskInDocument(content, taskId, {
      status: newStatus,
      completedDate,
    });
    await writeVaultFile(targetFile, updatedContent);

    // Update activeDocument in state if this is the active file
    if (getState().activeFile === targetFile) {
      const doc = parseMarkdownDocument(updatedContent);
      set({ activeDocument: doc, isSaving: false });
    } else {
      set({ isSaving: false });
    }
  } catch (err: any) {
    // Revert optimistic update on failure
    set({ tasks: currentTasks, error: `Failed to save task update: ${err}`, isSaving: false });
  }
}

async function updateTask(taskId: string, updates: Partial<TaskItem>): Promise<void> {
  const currentTasks = getState().tasks;
  const targetTask = currentTasks.find((t) => t.id === taskId);
  if (!targetTask) return;

  // Optimistic UI state update
  const updatedTasks = currentTasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, ...updates };
    }
    return t;
  });

  set({ tasks: updatedTasks, isSaving: true, error: null });

  // Sync to disk
  const targetFile = targetTask.filePath || getState().activeFile;
  if (!targetFile) {
    set({ isSaving: false });
    return;
  }

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = updateTaskInDocument(content, taskId, updates);
    await writeVaultFile(targetFile, updatedContent);

    if (getState().activeFile === targetFile) {
      const doc = parseMarkdownDocument(updatedContent);
      set({ activeDocument: doc, isSaving: false });
    } else {
      set({ isSaving: false });
    }
  } catch (err: any) {
    set({ tasks: currentTasks, error: `Failed to update task: ${err}`, isSaving: false });
  }
}

async function addTask(newTask: NewTaskInput, targetSection?: string): Promise<void> {
  const targetFile = getState().activeFile;
  if (!targetFile) {
    set({ error: 'No active file selected to add task' });
    return;
  }

  const currentTasks = getState().tasks;

  // Optimistic task creation with a temporary unique ID
  const tempId = `task-temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const optimisticTask: TaskItem = {
    id: tempId,
    title: newTask.title.trim(),
    status: newTask.status || 'todo',
    priority: newTask.priority,
    dueDate: newTask.dueDate,
    tags: newTask.tags ? [...newTask.tags] : [],
    notes: newTask.notes,
    subtasks: newTask.subtasks
      ? newTask.subtasks.map((st, idx) => ({
          id: `subtask-${idx}-${Date.now()}`,
          title: st.title,
          status: st.status || 'todo',
        }))
      : undefined,
    filePath: targetFile,
    rawLine: `- [ ] ${newTask.title}`,
  };

  set({
    tasks: [...currentTasks, optimisticTask],
    isSaving: true,
    error: null,
  });

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = addTaskToDocument(content, newTask, targetSection);
    await writeVaultFile(targetFile, updatedContent);

    const doc = parseMarkdownDocument(updatedContent);
    const tasksWithFile = doc.tasks.map((t) => ({
      ...t,
      filePath: targetFile,
    }));

    set({
      activeDocument: doc,
      tasks: tasksWithFile,
      isSaving: false,
    });
  } catch (err: any) {
    set({ tasks: currentTasks, error: `Failed to add task: ${err}`, isSaving: false });
  }
}

async function deleteTask(taskId: string): Promise<void> {
  const currentTasks = getState().tasks;
  const targetTask = currentTasks.find((t) => t.id === taskId);
  if (!targetTask) return;

  const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
  set({
    tasks: updatedTasks,
    activeTaskId: getState().activeTaskId === taskId ? null : getState().activeTaskId,
    isSaving: true,
    error: null,
  });

  const targetFile = targetTask.filePath || getState().activeFile;
  if (!targetFile) {
    set({ isSaving: false });
    return;
  }

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = deleteTaskFromDocument(content, taskId);
    await writeVaultFile(targetFile, updatedContent);

    if (getState().activeFile === targetFile) {
      const doc = parseMarkdownDocument(updatedContent);
      set({ activeDocument: doc, isSaving: false });
    } else {
      set({ isSaving: false });
    }
  } catch (err: any) {
    set({ tasks: currentTasks, error: `Failed to delete task: ${err}`, isSaving: false });
  }
}

async function moveTask(taskId: string, sourcePath: string, destPath: string): Promise<void> {
  if (sourcePath === destPath) return;

  const currentTasks = getState().tasks;
  const targetTask = currentTasks.find((t) => t.id === taskId);
  if (!targetTask) return;

  set({ isSaving: true, error: null });

  try {
    // 1. Read source file and delete task
    const sourceContent = await ipc.readFile(sourcePath);
    const updatedSourceContent = deleteTaskFromDocument(sourceContent, taskId);

    // 2. Read destination file (or create if empty) and append task
    let destContent = '';
    try {
      destContent = await ipc.readFile(destPath);
    } catch {
      destContent = `---\ntitle: ${destPath.split('/').pop()?.replace(/\.md$/, '') || 'Note'}\n---\n\n# Tasks\n`;
    }

    const newTaskInput: NewTaskInput = {
      title: targetTask.title,
      status: targetTask.status,
      priority: targetTask.priority,
      dueDate: targetTask.dueDate,
      tags: targetTask.tags,
      notes: targetTask.notes,
      subtasks: targetTask.subtasks?.map((st) => ({ title: st.title, status: st.status })),
    };

    const updatedDestContent = addTaskToDocument(destContent, newTaskInput);

    // 3. Atomically write both files
    await writeVaultFile(sourcePath, updatedSourceContent);
    await writeVaultFile(destPath, updatedDestContent);

    // 4. Update memory state depending on active file
    const activeFile = getState().activeFile;
    if (activeFile === sourcePath) {
      const doc = parseMarkdownDocument(updatedSourceContent);
      const tasksWithFile = doc.tasks.map((t) => ({ ...t, filePath: sourcePath }));
      set({
        activeDocument: doc,
        tasks: tasksWithFile,
        activeTaskId: getState().activeTaskId === taskId ? null : getState().activeTaskId,
        isSaving: false,
      });
    } else if (activeFile === destPath) {
      const doc = parseMarkdownDocument(updatedDestContent);
      const tasksWithFile = doc.tasks.map((t) => ({ ...t, filePath: destPath }));
      set({
        activeDocument: doc,
        tasks: tasksWithFile,
        isSaving: false,
      });
    } else {
      // Optimistic update of filePath
      const updatedTasks = currentTasks.map((t) => (t.id === taskId ? { ...t, filePath: destPath } : t));
      set({ tasks: updatedTasks, isSaving: false });
    }
  } catch (err: any) {
    set({ tasks: currentTasks, error: `Failed to move task: ${err}`, isSaving: false });
  }
}

function setActiveTaskId(activeTaskId: string | null): void {
  set({ activeTaskId });
}

function setSearchQuery(searchQuery: string): void {
  set({ searchQuery });
}

function setActiveView(activeView: ViewMode): void {
  set({ activeView });
}

function setSelectedTag(selectedTag: string | null): void {
  set({ selectedTag });
}

function setSelectedPriority(selectedPriority: TaskPriority | null): void {
  set({ selectedPriority });
}

async function setFolderIcon(folderPath: string, iconDataOrEmoji: string): Promise<void> {
  const { vaultPath, logoConfig } = getState();
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`folder-icon-${folderPath}`, iconDataOrEmoji);
  }

  if (!vaultPath) {
    set({ logoConfig: { ...logoConfig, [folderPath]: iconDataOrEmoji } });
    return;
  }

  const relPath = getFolderRelativePath(vaultPath, folderPath);
  // Update state immediately with the active icon / dataUrl so UI renders instantly
  set({ 
    logoConfig: { 
      ...logoConfig, 
      [relPath]: iconDataOrEmoji,
      [folderPath]: iconDataOrEmoji 
    } 
  });

  if (iconDataOrEmoji.startsWith('data:') || iconDataOrEmoji.includes('<svg')) {
    await persistFolderLogo(vaultPath, folderPath, iconDataOrEmoji);
  } else {
    await persistFolderEmoji(vaultPath, folderPath, iconDataOrEmoji);
  }
}

function getFolderIcon(folderPath: string): string | null {
  const { vaultPath, logoConfig } = getState();
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(`folder-icon-${folderPath}`);
    if (cached) return cached;
  }
  if (!vaultPath) {
    return logoConfig[folderPath] || null;
  }
  const relPath = getFolderRelativePath(vaultPath, folderPath);
  return logoConfig[relPath] || logoConfig[folderPath] || null;
}

function setError(error: string | null): void {
  set({ error });
}

function reset(): void {
  if (vaultUnlisten) {
    vaultUnlisten();
    vaultUnlisten = null;
  }
  set({ ...INITIAL_STATE });
}

const actions = {
  loadVault,
  refreshVault,
  selectFile,
  selectFolder,
  refreshActiveFile,
  createFile,
  deleteEntry,
  setFolderIcon,
  getFolderIcon,
  setTasks,
  toggleTask,
  updateTask,
  addTask,
  deleteTask,
  moveTask,
  setActiveTaskId,
  setSearchQuery,
  setActiveView,
  setSelectedTag,
  setSelectedPriority,
  setError,
  reset,
};

export function useVaultStore(): VaultStore;
export function useVaultStore<T>(selector: (state: VaultStore) => T): T;
export function useVaultStore<T>(selector?: (state: VaultStore) => T) {
  const fullStore: VaultStore = {
    ...state,
    ...actions,
  };

  const slice = useSyncExternalStore(
    subscribe,
    () => (selector ? selector({ ...state, ...actions }) : fullStore),
    () => (selector ? selector({ ...state, ...actions }) : fullStore)
  );

  return slice;
}

useVaultStore.getState = (): VaultStore => ({
  ...state,
  ...actions,
});

useVaultStore.setState = (partial: Partial<VaultStoreState>): void => {
  setState(partial);
};

useVaultStore.subscribe = subscribe;
