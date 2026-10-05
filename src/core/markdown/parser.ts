import matter from 'gray-matter';
import {
  DocumentSpan,
  Frontmatter,
  NewTaskInput,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TaskComment,
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

function parseTaskLine(
  rawLine: string,
  lineIndex: number,
  slugCounts?: Map<string, number>
): TaskItem | null {
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

  // Parse @due(...) or due:...
  let dueDate: string | undefined;
  const dueMatch = remainder.match(/@due\(([^)]+)\)/i) || remainder.match(/\bdue:(\d{4}-\d{2}-\d{2})\b/i);
  if (dueMatch) {
    dueDate = dueMatch[1].trim();
  }

  // Parse @priority(...) or @high/@medium/@low
  let priority: TaskPriority | undefined;
  const priorityMatch =
    remainder.match(/@priority\((low|medium|high)\)/i) ||
    remainder.match(/@(low|medium|high)\b/i);
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
  const completedMatch = remainder.match(/@completed\(([^)]+)\)/i);
  if (completedMatch) {
    completedDate = completedMatch[1].trim();
  }

  // Parse #tags (require starting with a letter or underscore so issue numbers like #45 are preserved in title)
  const tags: string[] = [];
  const tagMatches = remainder.matchAll(/(?:^|\s)#([a-zA-Z_][a-zA-Z0-9_-]*)/g);
  for (const tm of tagMatches) {
    tags.push(tm[1]);
  }

  // Extract clean title by removing metadata annotations and tags
  let title = remainder
    .replace(/@due\([^)]+\)/gi, '')
    .replace(/\bdue:\d{4}-\d{2}-\d{2}\b/gi, '')
    .replace(/@priority\([^)]+\)/gi, '')
    .replace(/@(low|medium|high)\b/gi, '')
    .replace(/@status\([^)]+\)/gi, '')
    .replace(/@completed\([^)]+\)/gi, '')
    .replace(/(?:^|\s)#[a-zA-Z_][a-zA-Z0-9_-]*/g, '')
    .trim();

  // Tasks without a title (e.g. newly typed "- [ ] " or "- [x] ") should not be created as tasks
  if (!title) {
    return null;
  }

  const baseSlug = slugify(title) || 'item';
  let id: string;
  if (slugCounts) {
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    id = count === 1 ? `task-${baseSlug}` : `task-${baseSlug}-${count}`;
  } else {
    id = `task-${baseSlug}`;
  }

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

function extractFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  try {
    if (typeof (globalThis as any).Buffer === 'undefined') {
      (globalThis as any).Buffer = {
        isBuffer: () => false,
        from: (str: string) => str,
      };
    }
    const parsed = matter(content);
    const data = (parsed.data as Frontmatter) || {};

    // Normalize date objects for title and date to clean strings (e.g. YYYY-MM-DD)
    if ((data.title as unknown) instanceof Date) {
      data.title = (data.title as unknown as Date).toISOString().slice(0, 10);
    }
    if ((data.date as unknown) instanceof Date) {
      data.date = (data.date as unknown as Date).toISOString().slice(0, 10);
    }

    // Normalize tags to string[]
    if (data.tags !== undefined) {
      if (typeof data.tags === 'string') {
        data.tags = [data.tags];
      } else if (Array.isArray(data.tags)) {
        data.tags = (data.tags as any[]).map(String);
      } else {
        data.tags = [];
      }
    }

    return {
      frontmatter: data,
      body: parsed.content || '',
    };
  } catch {
    // Robust fallback for browser environments
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!fmMatch) {
      return { frontmatter: {}, body: content };
    }
    const yamlBlock = fmMatch[1];
    const body = fmMatch[2];
    const frontmatter: Frontmatter = {};
    const lines = yamlBlock.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim().replace(/^['"](.*)['"]$/, '$1');
        if (key === 'tags') {
          if (val.startsWith('[') && val.endsWith(']')) {
            frontmatter.tags = val
              .slice(1, -1)
              .split(',')
              .map((s) => s.trim().replace(/^['"](.*)['"]$/, '$1'))
              .filter(Boolean);
          } else if (val) {
            frontmatter.tags = [val];
          }
        } else {
          (frontmatter as any)[key] = val;
        }
      }
    }
    return { frontmatter, body };
  }
}

function extractDocumentSpans(
  lines: string[],
  tasks: TaskItem[],
  startIndex: number
): DocumentSpan[] {
  const spans: DocumentSpan[] = [];
  const taskMap = new Map<number, TaskItem>();
  for (const t of tasks) {
    if (t.lineIndex !== undefined) {
      taskMap.set(t.lineIndex, t);
    }
  }

  let i = startIndex;
  let spanCounter = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (trimmed.length === 0) {
      i++;
      continue;
    }

    // Check if line is start of task
    if (taskMap.has(i)) {
      const task = taskMap.get(i)!;
      const startLine = i;
      let endLine = i;
      let j = i + 1;
      while (j < lines.length && /^(\s{2,}|\t)/.test(lines[j]) && lines[j].trim().length > 0) {
        endLine = j;
        j++;
      }
      const rawSpanText = lines.slice(startLine, endLine + 1).join('\n');
      spans.push({
        id: `span-task-${task.id}`,
        type: 'task',
        rawText: rawSpanText,
        startLine,
        endLine,
        taskId: task.id,
      });
      i = endLine + 1;
      continue;
    }

    // Code block span
    if (trimmed.startsWith('```')) {
      const startLine = i;
      let endLine = i;
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].trim().startsWith('```')) {
          endLine = j;
          break;
        }
        endLine = j;
        j++;
      }
      const rawSpanText = lines.slice(startLine, endLine + 1).join('\n');
      spans.push({
        id: `span-${spanCounter++}`,
        type: 'code',
        rawText: rawSpanText,
        startLine,
        endLine,
      });
      i = endLine + 1;
      continue;
    }

    // Heading span
    if (/^#{1,6}\s+/.test(line)) {
      spans.push({
        id: `span-${spanCounter++}`,
        type: 'heading',
        rawText: line,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    // Thematic break
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      spans.push({
        id: `span-${spanCounter++}`,
        type: 'thematic-break',
        rawText: line,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    // Callout / blockquote
    if (trimmed.startsWith('>')) {
      const startLine = i;
      let endLine = i;
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('>')) {
        endLine = j;
        j++;
      }
      const rawSpanText = lines.slice(startLine, endLine + 1).join('\n');
      spans.push({
        id: `span-${spanCounter++}`,
        type: 'callout',
        rawText: rawSpanText,
        startLine,
        endLine,
      });
      i = endLine + 1;
      continue;
    }

    // General prose paragraph
    const startLine = i;
    let endLine = i;
    let j = i + 1;
    while (j < lines.length) {
      const nextTrimmed = lines[j].trim();
      if (
        nextTrimmed.length === 0 ||
        taskMap.has(j) ||
        nextTrimmed.startsWith('```') ||
        /^#{1,6}\s+/.test(lines[j]) ||
        /^(\*\*\*|---|___)$/.test(nextTrimmed) ||
        nextTrimmed.startsWith('>')
      ) {
        break;
      }
      endLine = j;
      j++;
    }
    const rawSpanText = lines.slice(startLine, endLine + 1).join('\n');
    spans.push({
      id: `span-${spanCounter++}`,
      type: 'prose',
      rawText: rawSpanText,
      startLine,
      endLine,
    });
    i = endLine + 1;
  }

  return spans;
}

export function parseMarkdownDocument(content: string, filePath?: string): VaultDocument {
  const { frontmatter, body } = extractFrontmatter(content);

  const lines = content.split(/\r?\n/);
  const tasks: TaskItem[] = [];
  const slugCounts = new Map<string, number>();

  let inFrontmatter = false;
  let frontmatterEndIndex = 0;
  let inCodeBlock = false;
  let currentTask: TaskItem | null = null;
  let currentNotes: string[] = [];
  let currentSubtasks: SubtaskItem[] = [];
  let currentComments: TaskComment[] = [];

  const finalizeCurrentTask = () => {
    if (currentTask) {
      if (currentNotes.length > 0) {
        currentTask.notes = currentNotes.join('\n');
      }
      if (currentSubtasks.length > 0) {
        currentTask.subtasks = [...currentSubtasks];
      }
      if (currentComments.length > 0) {
        currentTask.comments = [...currentComments];
      }
      if (filePath) {
        currentTask.filePath = filePath;
      }
      tasks.push(currentTask);
      currentTask = null;
      currentNotes = [];
      currentSubtasks = [];
      currentComments = [];
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
        frontmatterEndIndex = i + 1;
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
      const parsedTask = parseTaskLine(line, i, slugCounts);
      if (parsedTask) {
        if (filePath) {
          parsedTask.filePath = filePath;
        }
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

        // Comment line check
        const commentMatch = trimmed.match(/^-\s*[Cc]omment\s*\(([^)]+)\):\s*(.*)$/i);
        if (commentMatch) {
          const meta = commentMatch[1].trim();
          let author = 'You';
          let timestamp = meta;
          if (meta.includes(',')) {
            const parts = meta.split(',');
            author = parts[0].trim();
            timestamp = parts.slice(1).join(',').trim();
          }
          currentComments.push({
            id: `comment-${i}`,
            author,
            timestamp,
            content: commentMatch[2].trim(),
            rawLine: line,
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

  const spans = extractDocumentSpans(lines, tasks, frontmatterEndIndex);
  const wordCount = body.trim().length > 0 ? body.trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    filePath,
    frontmatter,
    tasks,
    spans,
    rawContent: content,
    body,
    wordCount,
    readingTimeMinutes,
  };
}

export function updateTaskInDocument(
  content: string,
  taskId: string,
  updates: Partial<TaskItem>
): string {
  const lines = content.split(/\r?\n/);
  const doc = parseMarkdownDocument(content);
  let task = doc.tasks.find((t) => t.id === taskId);

  // Fallback if legacy or partial taskId was passed
  if (!task) {
    const legacyMatch = taskId.match(/^task-(\d+)-(.*)$/);
    if (legacyMatch) {
      const legacyLine = parseInt(legacyMatch[1], 10);
      const legacySlug = legacyMatch[2];
      task = doc.tasks.find((t) => t.lineIndex === legacyLine || t.id.includes(legacySlug));
    }
  }

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

export function deleteTaskFromDocument(content: string, taskId: string): string {
  const lines = content.split(/\r?\n/);
  const doc = parseMarkdownDocument(content);
  let task = doc.tasks.find((t) => t.id === taskId);

  // Fallback if legacy or partial taskId was passed
  if (!task) {
    const legacyMatch = taskId.match(/^task-(\d+)-(.*)$/);
    if (legacyMatch) {
      const legacyLine = parseInt(legacyMatch[1], 10);
      const legacySlug = legacyMatch[2];
      task = doc.tasks.find((t) => t.lineIndex === legacyLine || t.id.includes(legacySlug));
    }
  }

  if (!task || task.lineIndex === undefined) {
    return content;
  }

  // Calculate lines occupied by this task block
  let deleteCount = 1;
  for (let i = task.lineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the next task or header or unindented text
    if (/^\s*-\s*\[[ xX/]\]/.test(line) || /^#+\s/.test(line)) {
      break;
    }
    if (/^\s+/.test(line)) {
      deleteCount++;
    } else {
      break;
    }
  }

  lines.splice(task.lineIndex, deleteCount);
  return lines.join('\n');
}
