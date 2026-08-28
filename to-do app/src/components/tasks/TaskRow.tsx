import React, { useState } from 'react';
import { Trash2, Wand2, Sparkles } from 'lucide-react';
import { TaskItem, TaskPriority } from '../../store/types';
import { triggerCompletionFeedback } from '../../utils/feedback';
import { triggerCelebration } from '../../utils/celebrations';
import { sliceTask } from '../../utils/slicer';
import { useVaultStore } from '../../store';

export interface TaskRowProps {
  task: TaskItem;
  isSelected?: boolean;
  onToggle: (taskId: string) => void;
  onSelect: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onPriorityClick?: (priority: TaskPriority) => void;
  onTagClick?: (tag: string) => void;
  onOpenZen?: (task: TaskItem) => void;
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

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isSelected = false,
  onToggle,
  onSelect,
  onDelete,
  onPriorityClick,
  onTagClick,
  onOpenZen,
}) => {
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in-progress';
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const dueDateInfo = formatDueDate(task.dueDate);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDone) {
      triggerCompletionFeedback();
      triggerCelebration();
    }
    onToggle(task.id);
  };

  const handleRowClick = () => {
    onSelect(task.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'task',
        taskId: task.id,
        sourceFilePath: task.filePath,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const [isSlicing, setIsSlicing] = useState(false);
  const updateTask = useVaultStore((state) => state.updateTask);

  const handleMagicSlice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSlicing) return;
    setIsSlicing(true);

    try {
      const generatedSteps = await sliceTask(task.title);
      const existingSubtasks = task.subtasks || [];
      const newSubtasks = [
        ...existingSubtasks,
        ...generatedSteps.map((step, idx) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: step,
          status: 'todo' as const,
        })),
      ];

      await updateTask(task.id, { subtasks: newSubtasks });
    } catch (err) {
      console.error('Failed to slice task:', err);
    } finally {
      setIsSlicing(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      data-testid={`task-row-${task.id}`}
      onClick={handleRowClick}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 bg-white border rounded-xl transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'border-forest-600 ring-2 ring-forest-500/20 shadow-sm'
          : 'border-sand-200 hover:border-sand-300 hover:shadow-sm'
      } ${isDone ? 'opacity-60 bg-sand-50/50' : ''}`}
    >
      {/* Status Checkbox */}
      <button
        type="button"
        data-testid={`task-checkbox-${task.id}`}
        aria-label={`Toggle task ${task.title}`}
        onClick={handleCheckboxClick}
        className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${
          isDone
            ? 'bg-forest-600 border-forest-600 text-white'
            : isInProgress
            ? 'border-forest-500 bg-forest-50 text-forest-700'
            : 'border-slate-300 bg-white hover:border-forest-500'
        }`}
      >
        {isDone && (
          <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isInProgress && (
          <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
        )}
      </button>

      {/* Task Title */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className={`text-sm leading-snug truncate ${
            isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Tags Chips */}
      {task.tags && task.tags.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {task.tags.map((tag) => (
            <button
              type="button"
              key={tag}
              data-testid={`tag-chip-${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-sand-100 border border-sand-200 rounded-full hover:bg-sand-200 cursor-pointer transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Subtask Counter */}
      {subtasks.length > 0 && (
        <div
          title={`${completedSubtasks} of ${subtasks.length} subtasks completed`}
          className="flex items-center gap-1 text-xs text-slate-400 font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>
            {completedSubtasks}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Due Date Badge */}
      {dueDateInfo && (
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border ${
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

      {/* Priority Pill */}
      {task.priority && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPriorityClick?.(task.priority!);
          }}
          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md border transition-colors ${
            priorityConfig[task.priority].bg
          } ${priorityConfig[task.priority].text} ${
            priorityConfig[task.priority].border
          }`}
        >
          {task.priority}
        </button>
      )}

      {/* Hover Actions: Magic Slicer, Zen Focus, Delete */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        {/* Magic Slicer Button */}
        <button
          type="button"
          data-testid={`task-slice-${task.id}`}
          title="Magic Slicer (Break into bite-sized steps)"
          onClick={handleMagicSlice}
          disabled={isSlicing}
          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isSlicing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>

        {/* Zen Focus Button */}
        {onOpenZen && (
          <button
            type="button"
            data-testid={`task-zen-${task.id}`}
            title="Focus in Zen Theater"
            onClick={(e) => {
              e.stopPropagation();
              onOpenZen(task);
            }}
            className="p-1 text-slate-400 hover:text-forest-700 hover:bg-forest-50 rounded transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Task Button */}
        {onDelete && (
          <button
            type="button"
            data-testid={`task-delete-${task.id}`}
            aria-label={`Delete task ${task.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskRow;
