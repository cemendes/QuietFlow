export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'backlog';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskComment {
  id: string;
  author?: string;
  timestamp: string;
  content: string;
  rawLine?: string;
}

export interface SubtaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  rawLine?: string;
  lineIndex?: number;
}

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  completedDate?: string;
  tags: string[];
  notes?: string;
  subtasks?: SubtaskItem[];
  comments?: TaskComment[];
  rawLine?: string;
  lineIndex?: number;
  filePath?: string;
}

export interface Frontmatter {
  id?: string;
  title?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  [key: string]: any;
}

export interface VaultDocument {
  frontmatter: Frontmatter;
  tasks: TaskItem[];
  rawContent: string;
  body: string;
}

export interface NewTaskInput {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  completedDate?: string;
  tags?: string[];
  notes?: string;
  subtasks?: Array<{ title: string; status?: TaskStatus }>;
  comments?: TaskComment[];
}
