import React from 'react';
import { Check, Calendar, Tag, MessageSquare, AlertCircle } from 'lucide-react';
import { TaskItem, TaskPriority } from '../../store/types';

interface DocumentTaskCardProps {
  task: TaskItem;
  onToggle: (taskId: string) => void;
  onSelect?: (taskId: string) => void;
}

export const DocumentTaskCard: React.FC<DocumentTaskCardProps> = ({
  task,
  onToggle,
  onSelect,
}) => {
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in-progress';

  const getPriorityBadge = (priority?: TaskPriority) => {
    if (!priority) return null;
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  return (
    <div
      data-testid={`document-task-card-${task.id}`}
      onClick={() => onSelect?.(task.id)}
      className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${
        isDone
          ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
          : isInProgress
          ? 'bg-emerald-50/30 border-emerald-300 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Custom Interactive Checkbox */}
        <button
          type="button"
          data-testid={`task-checkbox-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-150 ${
            isDone
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : isInProgress
              ? 'bg-amber-100 border-amber-400 text-amber-800'
              : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/50'
          }`}
          aria-label={isDone ? 'Mark task incomplete' : 'Mark task complete'}
        >
          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          {isInProgress && <span className="w-2 h-2 rounded-xs bg-amber-600" />}
        </button>

        {/* Content & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium tracking-tight ${
                isDone ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {task.title}
            </span>
            {getPriorityBadge(task.priority)}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
          </div>

          {/* Tags */}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {task.tags.map((tag) => (
                <span
                  key={String(tag)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {String(tag).replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Subtasks */}
          {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
            <div className="mt-2.5 space-y-1.5 pl-2 border-l-2 border-slate-100">
              {task.subtasks.map((sub, idx) => (
                <div key={sub?.id || `sub-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                      sub?.status === 'done'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {sub?.status === 'done' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span className={sub?.status === 'done' ? 'line-through text-slate-400' : ''}>
                    {sub?.title || ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Comments preview */}
          {Array.isArray(task.comments) && task.comments.length > 0 && task.comments[0] && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span>
                {task.comments[0].author || 'Note'}: {task.comments[0].content || ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
