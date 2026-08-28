import { useSyncExternalStore } from 'react';
import {
  addTaskToDocument,
  parseMarkdownDocument,
  updateTaskInDocument,
} from '../core/markdown';
import { ipc } from './ipc';
import {
  NewTaskInput,
  TaskItem,
  TaskPriority,
  VaultStore,
  VaultStoreState,
  ViewMode,
} from './types';

const INITIAL_STATE: VaultStoreState = {
  vaultPath: null,
  vaultTree: null,
  activeFile: null,
  activeDocument: null,
  tasks: [],
  activeTaskId: null,
  searchQuery: '',
  activeView: 'list',
  selectedTag: null,
  selectedPriority: null,
  isLoading: false,
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

async function loadVault(vaultPath: string): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    const tree = await ipc.initVault(vaultPath);
    set({ vaultPath, vaultTree: tree, isLoading: false });

    // Clean up any existing listener
    if (vaultUnlisten) {
      vaultUnlisten();
      vaultUnlisten = null;
    }

    await ipc.startWatchingVault(vaultPath);
    vaultUnlisten = await ipc.listenVaultChanged(async (changedVaultPath) => {
      if (changedVaultPath === getState().vaultPath) {
        await refreshVault();
        if (getState().activeFile) {
          await refreshActiveFile();
        }
      }
    });
  } catch (err: any) {
    set({
      isLoading: false,
      error: err?.message || err?.toString() || 'Failed to load vault',
    });
  }
}

async function refreshVault(): Promise<void> {
  const currentPath = getState().vaultPath;
  if (!currentPath) return;

  try {
    const tree = await ipc.initVault(currentPath);
    set({ vaultTree: tree });
  } catch (err: any) {
    console.error('Failed to refresh vault tree:', err);
  }
}

async function selectFile(filePath: string): Promise<void> {
  set({ isLoading: true, error: null, activeFile: filePath });
  try {
    const content = await ipc.readFile(filePath);
    const doc = parseMarkdownDocument(content);

    // Attach filePath to tasks for convenience
    const tasksWithFile = doc.tasks.map((t) => ({
      ...t,
      filePath,
    }));

    set({
      activeFile: filePath,
      activeDocument: doc,
      tasks: tasksWithFile,
      isLoading: false,
    });
  } catch (err: any) {
    set({
      isLoading: false,
      error: err?.message || err?.toString() || `Failed to read file: ${filePath}`,
    });
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
    await ipc.writeFileAtomic(filePath, initialContent);
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

  set({ tasks: updatedTasks });

  // Sync to disk
  const targetFile = targetTask.filePath || getState().activeFile;
  if (!targetFile) return;

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = updateTaskInDocument(content, taskId, {
      status: newStatus,
      completedDate,
    });
    await ipc.writeFileAtomic(targetFile, updatedContent);

    // Update activeDocument in state if this is the active file
    if (getState().activeFile === targetFile) {
      const doc = parseMarkdownDocument(updatedContent);
      set({ activeDocument: doc });
    }
  } catch (err: any) {
    // Revert optimistic update on failure
    set({ tasks: currentTasks, error: `Failed to save task update: ${err}` });
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

  set({ tasks: updatedTasks });

  // Sync to disk
  const targetFile = targetTask.filePath || getState().activeFile;
  if (!targetFile) return;

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = updateTaskInDocument(content, taskId, updates);
    await ipc.writeFileAtomic(targetFile, updatedContent);

    if (getState().activeFile === targetFile) {
      const doc = parseMarkdownDocument(updatedContent);
      set({ activeDocument: doc });
    }
  } catch (err: any) {
    set({ tasks: currentTasks, error: `Failed to update task: ${err}` });
  }
}

async function addTask(newTask: NewTaskInput, targetSection?: string): Promise<void> {
  const targetFile = getState().activeFile;
  if (!targetFile) {
    set({ error: 'No active file selected to add task' });
    return;
  }

  try {
    const content = await ipc.readFile(targetFile);
    const updatedContent = addTaskToDocument(content, newTask, targetSection);
    await ipc.writeFileAtomic(targetFile, updatedContent);

    const doc = parseMarkdownDocument(updatedContent);
    const tasksWithFile = doc.tasks.map((t) => ({
      ...t,
      filePath: targetFile,
    }));

    set({
      activeDocument: doc,
      tasks: tasksWithFile,
    });
  } catch (err: any) {
    set({ error: `Failed to add task: ${err}` });
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
  refreshActiveFile,
  createFile,
  deleteEntry,
  setTasks,
  toggleTask,
  updateTask,
  addTask,
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
