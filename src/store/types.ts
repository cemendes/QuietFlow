import {
  Frontmatter,
  NewTaskInput,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskStatus,
  VaultDocument,
} from '../core/markdown/types';

export type {
  Frontmatter,
  NewTaskInput,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskStatus,
  VaultDocument,
};

export interface VaultNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: VaultNode[];
  fileCount: number;
}

export type VaultTree = VaultNode;

export type ViewMode = 'list' | 'kanban';

export interface VaultStoreState {
  vaultPath: string | null;
  vaultTree: VaultTree | null;
  activeFile: string | null;
  activeDocument: VaultDocument | null;
  tasks: TaskItem[];
  activeTaskId: string | null;
  searchQuery: string;
  activeView: ViewMode;
  selectedTag: string | null;
  selectedPriority: TaskPriority | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface VaultStoreActions {
  // Vault & File operations
  loadVault: (vaultPath: string) => Promise<void>;
  refreshVault: () => Promise<void>;
  selectFile: (filePath: string) => Promise<void>;
  refreshActiveFile: () => Promise<void>;
  createFile: (filePath: string, initialContent?: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;

  // Task operations
  setTasks: (tasks: TaskItem[]) => void;
  toggleTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  addTask: (task: NewTaskInput, targetSection?: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, sourcePath: string, destPath: string) => Promise<void>;

  // UI state
  setActiveTaskId: (taskId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: ViewMode) => void;
  setSelectedTag: (tag: string | null) => void;
  setSelectedPriority: (priority: TaskPriority | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type VaultStore = VaultStoreState & VaultStoreActions;
