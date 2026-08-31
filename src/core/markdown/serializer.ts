import { TaskItem, NewTaskInput, TaskStatus } from './types';

export function getCheckboxForStatus(status: TaskStatus = 'todo'): string {
  switch (status) {
    case 'done':
      return '- [x]';
    case 'in-progress':
      return '- [/]';
    case 'todo':
    case 'backlog':
    default:
      return '- [ ]';
  }
}

export function serializeTaskLine(
  task: Pick<TaskItem, 'title' | 'status' | 'priority' | 'dueDate' | 'completedDate' | 'tags'>
): string {
  const checkbox = getCheckboxForStatus(task.status);
  const parts: string[] = [checkbox, task.title];

  if (task.status === 'backlog') {
    parts.push(`@status(backlog)`);
  }

  if (task.dueDate) {
    parts.push(`@due(${task.dueDate})`);
  }

  if (task.priority) {
    parts.push(`@priority(${task.priority})`);
  }

  if (task.status === 'done' && task.completedDate) {
    parts.push(`@completed(${task.completedDate})`);
  }

  if (task.tags && task.tags.length > 0) {
    const formattedTags = task.tags
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .join(' ');
    parts.push(formattedTags);
  }

  return parts.join(' ');
}

export function serializeTaskBlock(task: TaskItem | NewTaskInput): string[] {
  const lines: string[] = [];
  const status: TaskStatus = task.status || 'todo';

  const mainLine = serializeTaskLine({
    title: task.title,
    status,
    priority: task.priority,
    dueDate: task.dueDate,
    completedDate: task.completedDate,
    tags: task.tags || [],
  });
  lines.push(mainLine);

  if (task.notes && task.notes.trim().length > 0) {
    const noteLines = task.notes.trim().split('\n');
    if (noteLines.length > 0) {
      lines.push(`  - Notes: ${noteLines[0]}`);
      for (let i = 1; i < noteLines.length; i++) {
        lines.push(`    ${noteLines[i]}`);
      }
    }
  }

  if (task.subtasks && task.subtasks.length > 0) {
    for (const sub of task.subtasks) {
      const subCheckbox = getCheckboxForStatus(sub.status || 'todo');
      lines.push(`  ${subCheckbox} ${sub.title}`);
    }
  }

  if (task.comments && task.comments.length > 0) {
    for (const comment of task.comments) {
      const commentLines = comment.content.trim().split('\n');
      const authorPrefix = comment.author && comment.author !== 'You' ? `${comment.author}, ` : '';
      lines.push(`  - Comment (${authorPrefix}${comment.timestamp}): ${commentLines[0]}`);
      for (let i = 1; i < commentLines.length; i++) {
        lines.push(`    ${commentLines[i]}`);
      }
    }
  }

  return lines;
}

export function patchTaskInDocumentContent(
  rawContent: string,
  updatedTask: TaskItem,
  originalTask: TaskItem
): string {
  const lines = rawContent.split(/\r?\n/);
  const startLine = originalTask.lineIndex ?? 0;
  let endLine = startLine;

  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(\s{2,}|\t)/.test(line) && line.trim().length > 0) {
      endLine = i;
    } else {
      break;
    }
  }

  const serializedLines = serializeTaskBlock(updatedTask);
  lines.splice(startLine, endLine - startLine + 1, ...serializedLines);
  return lines.join('\n');
}
