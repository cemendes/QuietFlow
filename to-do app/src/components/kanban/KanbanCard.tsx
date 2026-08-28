import React from 'react';
import { TaskItem, TaskPriority, TaskStatus } from '../../store/types';

export interface KanbanCardProps {
  task: TaskItem;
  isSelected?: boolean;
  onSelect: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityClick?: (priority: TaskPriority) => void;
  onTagClick?: (tag: string) => void;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  high: {
    label: 'high',
    bg: 'bg-terracotta-500/10',
    text: 'text-terracotta-600',
    border: 'border-terracotta-500/20',
  },
  medium: {
    label: 'medium',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    border: 'border-amber-500/20',
  },
  low: {
    label: 'low',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
};

const formatDueDate = (dateStr?: string): { formatted: string; isOverdue: boolean } | null => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { formatted: dateStr, isOverdue: false };
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = date < today;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${monthNames[date.getMonth()]} ${date.getDate()}`;
    return { formatted, isOverdue };
  } catch {
    return { formatted: dateStr, isOverdue: false };
  }
};

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  isSelected = false,
  onSelect,
  onStatusChange,
  onPriorityClick,
  onTagClick,
}) => {
  const isDone = task.status === 'done';
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const dueDateInfo = formatDueDate(task.dueDate);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardClick = () => {
    onSelect(task.id);
  };

  return (
    <div
      data-testid={`kanban-card-${task.id}`}
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className={`group relative flex flex-col gap-2.5 p-3.5 bg-white border rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md ${
        isSelected
          ? 'border-forest-600 ring-2 ring-forest-500/20 shadow-sm'
          : 'border-sand-200 hover:border-sand-300'
      } ${isDone ? 'opacity-70 bg-sand-50/60' : ''}`}
    >
      {/* Top row: Title and Quick Move dropdown */}
      <div className="flex items-start justify-between gap-2">
        <h4
          className={`text-sm leading-snug font-medium break-words flex-1 ${
            isDone ? 'line-through text-slate-400' : 'text-slate-800'
          }`}
        >
          {task.title}
        </h4>

        <select
          data-testid={`kanban-card-status-select-${task.id}`}
          aria-label={`Move task ${task.title}`}
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, e.target.value as TaskStatus);
          }}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[10px] bg-sand-100 text-slate-600 border border-sand-200 rounded px-1.5 py-0.5 font-medium cursor-pointer hover:bg-sand-200 focus:outline-none focus:ring-1 focus:ring-forest-500"
        >
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Tags Chips */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-forest-800 bg-sand-100 border border-sand-200 rounded-full hover:bg-sand-200 transition-colors cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Card Footer: Badges & Progress */}
      <div className="flex items-center justify-between gap-2 pt-1 mt-auto text-xs">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Priority Pill */}
          {task.priority && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPriorityClick?.(task.priority!);
              }}
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border transition-colors ${
                priorityConfig[task.priority].bg
              } ${priorityConfig[task.priority].text} ${
                priorityConfig[task.priority].border
              }`}
            >
              {task.priority}
            </button>
          )}

          {/* Due Date Badge */}
          {dueDateInfo && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                dueDateInfo.isOverdue && !isDone
                  ? 'text-terracotta-600 bg-terracotta-500/10 border-terracotta-500/20'
                  : 'text-slate-500 bg-sand-100 border-sand-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{dueDateInfo.formatted}</span>
            </div>
          )}
        </div>

        {/* Subtask progress */}
        {subtasks.length > 0 && (
          <div
            title={`${completedSubtasks} of ${subtasks.length} subtasks completed`}
            className="flex items-center gap-1 text-[11px] text-slate-400 font-medium ml-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>
              {completedSubtasks}/{subtasks.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
