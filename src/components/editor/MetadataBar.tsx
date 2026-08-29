import React from 'react';
import { TaskPriority, TaskStatus } from '../../store/types';
import { Calendar, Tag, Folder, FileText, ChevronRight } from 'lucide-react';

export interface MetadataBarProps {
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
  filePath?: string;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority?: TaskPriority) => void;
  onDueDateChange: (dueDate?: string) => void;
  className?: string;
}

export const MetadataBar: React.FC<MetadataBarProps> = ({
  status,
  priority,
  dueDate,
  tags = [],
  filePath,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  className = '',
}) => {
  // Format clean breadcrumb (e.g. CCO / 2026-08-28)
  const breadcrumb = React.useMemo(() => {
    if (!filePath) return null;
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop()?.replace(/\.md$/, '') || '';
    const parentFolder = parts.length > 0 ? parts.pop() : null;
    const isVaultRoot = !parentFolder || parentFolder === 'QuietFlowVault' || parentFolder === 'Documents';

    return {
      folder: isVaultRoot ? null : parentFolder,
      file: fileName,
    };
  }, [filePath]);

  return (
    <div className={`flex flex-col gap-3 py-3 border-y border-sand-200 text-xs text-slate-600 ${className}`}>
      {/* Clean Folder & Note location breadcrumb */}
      {breadcrumb && (
        <div className="flex items-center flex-wrap gap-1.5 px-2.5 py-1.5 bg-sand-100/70 border border-sand-200/80 rounded-lg text-slate-700 text-xs">
          {breadcrumb.folder && (
            <>
              <span className="flex items-center gap-1 font-medium text-stone-600">
                <Folder className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                {breadcrumb.folder}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            </>
          )}
          <span className="flex items-center gap-1 font-semibold text-slate-800">
            <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            {breadcrumb.file}
          </span>
        </div>
      )}

      {/* Grid of editable properties */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Status
          </label>
          <select
            data-testid="status-select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            className="w-full px-2.5 py-1.5 bg-white border border-sand-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-forest-500 hover:border-sand-300 transition-colors"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="backlog">Backlog</option>
          </select>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Priority
          </label>
          <select
            data-testid="priority-select"
            value={priority || ''}
            onChange={(e) =>
              onPriorityChange(e.target.value ? (e.target.value as TaskPriority) : undefined)
            }
            className="w-full px-2.5 py-1.5 bg-white border border-sand-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-forest-500 hover:border-sand-300 transition-colors"
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            Due Date
          </label>
          <input
            type="date"
            data-testid="due-date-input"
            value={dueDate || ''}
            onChange={(e) => onDueDateChange(e.target.value || undefined)}
            className="w-full px-2.5 py-1.5 bg-white border border-sand-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-forest-500 hover:border-sand-300 transition-colors"
          />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            Tags
          </label>
          <div className="flex flex-wrap gap-1 min-h-[30px] items-center">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 bg-forest-500/10 text-forest-800 border border-forest-500/20 rounded-md text-[11px] font-medium"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px] italic">No tags</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataBar;
