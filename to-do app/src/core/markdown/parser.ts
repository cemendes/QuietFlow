import matter from 'gray-matter';
import {
  Frontmatter,
  NewTaskInput,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskStatus,
  VaultDocument,
} from './types';
import { serializeTaskBlock } from './serializer';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
}

function parseTaskLine(rawLine: string, lineIndex: number): TaskItem | null {
  const match = rawLine.match(/^-\s*\[([ xX/])\]\s+(.*)$/);
  if (!match) return null;

  const checkMark = match[1];
  let status: TaskStatus = 'todo';
  if (checkMark === 'x' || checkMark === 'X') {
    status = 'done';
  } else if (checkMark === '/') {
    status = 'in-progress';
  }

  let remainder = match[2];

  // Parse @due(...)
  let dueDate: string | undefined;
  const dueMatch = remainder.match(/@due\(([^)]+)\)/);
  if (dueMatch) {
    dueDate = dueMatch[1].trim();
  }

  // Parse @priority(...)
  let priority: TaskPriority | undefined;
  const priorityMatch = remainder.match(/@priority\((low|medium|high)\)/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as TaskPriority;
  }

  // Parse @status(...)
  const statusMatch = remainder.match(/@status\(([a-zA-Z0-9_-]+)\)/i);
  if (statusMatch) {
    const rawStatus = statusMatch[1].toLowerCase();
    if (rawStatus === 'in-progress' || rawStatus === 'inprogress') {
      status = 'in-progress';
    } else if (rawStatus === 'done' || rawStatus === 'completed') {
      status = 'done';
    } else if (rawStatus === 'todo' || rawStatus === 'backlog') {
      status = rawStatus as TaskStatus;
    }
  }

  // Parse @completed(...)
  let completedDate: string | undefined;
  const completedMatch = remainder.match(/@completed\(([^)]+)\)/);
  if (completedMatch) {
    completedDate = completedMatch[1].trim();
  }

  // Parse #tags
  const tags: string[] = [];
  const tagMatches = remainder.matchAll(/#([a-zA-Z0-9_-]+)/g);
  for (const tm of tagMatches) {
    tags.push(tm[1]);
  }

  // Extract clean title by removing metadata annotations and tags
  let title = remainder
    .replace(/@due\([^)]+\)/g, '')
    .replace(/@priority\([^)]+\)/gi, '')
    .replace(/@status\([^)]+\)/gi, '')
    .replace(/@completed\([^)]+\)/g, '')
    .replace(/#[a-zA-Z0-9_-]+/g, '')
    .trim();

  const id = `task-${lineIndex}-${slugify(title) || 'item'}`;

  return {
    id,
    title,
    status,
    priority,
    dueDate,
    completedDate,
    tags,
    rawLine,
    lineIndex,
  };
}

export function parseMarkdownDocument(content: string): VaultDocument {
  const parsedMatter = matter(content);
  const frontmatter: Frontmatter = (parsedMatter.data as Frontmatter) || {};
  const body = parsedMatter.content;

  const lines = content.split(/\r?\n/);
  const tasks: TaskItem[] = [];

  let inFrontmatter = false;
  let inCodeBlock = false;
  let currentTask: TaskItem | null = null;
  let currentNotes: string[] = [];
  let currentSubtasks: SubtaskItem[] = [];

  const finalizeCurrentTask = () => {
    if (currentTask) {
      if (currentNotes.length > 0) {
        currentTask.notes = currentNotes.join('\n');
      }
      if (currentSubtasks.length > 0) {
        currentTask.subtasks = [...currentSubtasks];
      }
      tasks.push(currentTask);
      currentTask = null;
      currentNotes = [];
      currentSubtasks = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Frontmatter boundary handling
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
      }
      continue;
    }

    // Code block boundary handling
    if (trimmed.startsWith('```')) {
      finalizeCurrentTask();
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }

    // Check for top-level task (not indented)
    if (/^-\s*\[([ xX/])\]/.test(line)) {
      finalizeCurrentTask();
      const parsedTask = parseTaskLine(line, i);
      if (parsedTask) {
        currentTask = parsedTask;
      }
      continue;
    }

    // If we are currently collecting context for a task, check for indented lines
    if (currentTask) {
      if (/^(\s{2,}|\t)/.test(line) && trimmed.length > 0) {
        // Subtask check
        const subtaskMatch = line.match(/^(\s{2,}|\t)-\s*\[([ xX/])\]\s+(.*)$/);
        if (subtaskMatch) {
          const subCheck = subtaskMatch[2];
          let subStatus: TaskStatus = 'todo';
          if (subCheck === 'x' || subCheck === 'X') subStatus = 'done';
          else if (subCheck === '/') subStatus = 'in-progress';

          currentSubtasks.push({
            id: `subtask-${i}`,
            title: subtaskMatch[3].trim(),
            status: subStatus,
            rawLine: line,
            lineIndex: i,
          });
          continue;
        }

        // Note line check
        let noteContent = trimmed;
        if (trimmed.startsWith('- Notes:')) {
          noteContent = trimmed.replace(/^- Notes:\s*/, '');
        } else if (trimmed.startsWith('- notes:')) {
          noteContent = trimmed.replace(/^- notes:\s*/, '');
        } else if (trimmed.startsWith('- ')) {
          noteContent = trimmed.replace(/^-\s*/, '');
        }
        currentNotes.push(noteContent);
        continue;
      } else {
        // Line is not indented or is empty, finalize task
        finalizeCurrentTask();
      }
    }
  }

  finalizeCurrentTask();

  return {
    frontmatter,
    tasks,
    rawContent: content,
    body,
  };
}

export function updateTaskInDocument(
  content: string,
  taskId: string,
  updates: Partial<TaskItem>
): string {
  const lines = content.split(/\r?\n/);
  const doc = parseMarkdownDocument(content);
  const task = doc.tasks.find((t) => t.id === taskId);

  if (!task || task.lineIndex === undefined) {
    return content;
  }

  const startLine = task.lineIndex;
  let endLine = startLine;

  // Find end of task block (indented notes/subtasks)
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(\s{2,}|\t)/.test(line) && line.trim().length > 0) {
      endLine = i;
    } else {
      break;
    }
  }

  const mergedTask: TaskItem = {
    ...task,
    ...updates,
  };

  // If status is not 'done' and completedDate wasn't explicitly provided in updates, remove completedDate
  if (updates.status && updates.status !== 'done' && updates.completedDate === undefined) {
    delete mergedTask.completedDate;
  }

  const serializedLines = serializeTaskBlock(mergedTask);
  lines.splice(startLine, endLine - startLine + 1, ...serializedLines);

  return lines.join('\n');
}

export function addTaskToDocument(
  content: string,
  newTask: NewTaskInput,
  targetSection?: string
): string {
  const lines = content.split(/\r?\n/);
  const serializedTaskLines = serializeTaskBlock(newTask);

  // Search for target section header
  let headerIndex = -1;
  const headerRegex = targetSection
    ? new RegExp(`^#+\\s*${targetSection}`, 'i')
    : /^#+\s*(Deliverables\s*&\s*Tasks|Tasks|Deliverables|Actions|Action\s*Items)/i;

  for (let i = 0; i < lines.length; i++) {
    if (headerRegex.test(lines[i])) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex !== -1) {
    // Locate the end of the section (before next heading or end of file)
    let insertIndex = lines.length;
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^#+\s/.test(line)) {
        insertIndex = i;
        break;
      }
    }

    // Insert task before the next header (or at end of section)
    // Find last non-empty line before insertIndex
    let targetInsert = insertIndex;
    while (targetInsert > headerIndex + 1 && lines[targetInsert - 1].trim() === '') {
      targetInsert--;
    }

    lines.splice(targetInsert, 0, ...serializedTaskLines);
  } else {
    // No matching section header found, append to end of document
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(...serializedTaskLines);
  }

  return lines.join('\n');
}
