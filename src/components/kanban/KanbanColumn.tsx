import React, { useState } from 'react';
import { TaskItem, TaskPriority, TaskStatus } from '../../store/types';
import KanbanCard from './KanbanCard';

export interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: TaskItem[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onTaskDrop: (taskId: string, targetStatus: TaskStatus) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityClick?: (priority: TaskPriority) => void;
  onTagClick?: (tag: string) => void;
  maxWip?: number;
}

const statusHeaderColors: Record<TaskStatus, { dot: string; countBg: string }> = {
  backlog: {
    dot: 'bg-slate-400',
    countBg: 'bg-slate-200/60 text-slate-700',
  },
  todo: {
    dot: 'bg-amber-500',
    countBg: 'bg-amber-500/10 text-amber-800',
  },
  'in-progress': {
    dot: 'bg-forest-600',
    countBg: 'bg-forest-500/10 text-forest-800',
  },
  done: {
    dot: 'bg-forest-700',
    countBg: 'bg-forest-500/15 text-forest-900',
  },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  activeTaskId,
  onSelectTask,
  onTaskDrop,
  onPriorityClick,
  onTagClick,
  maxWip,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const isExceededWip = maxWip !== undefined && tasks.length > maxWip;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only leave if not moving inside child elements of column
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskDrop(taskId, id);
    }
  };

  const headerColors = statusHeaderColors[id] || statusHeaderColors.backlog;

  return (
    <div
      data-testid={`kanban-column-${id}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-1 min-w-[260px] max-w-[340px] shrink-0 bg-sand-100/60 rounded-2xl border transition-all duration-150 overflow-hidden ${
        isDragOver
          ? 'border-forest-500 ring-2 ring-forest-500/30 bg-forest-50/30'
          : isExceededWip
          ? 'border-rose-300 shadow-xs'
          : 'border-sand-200 shadow-xs'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-sand-200/70 bg-sand-100/80 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${headerColors.dot}`} />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h3>
        </div>
        {maxWip ? (
          <span
            data-testid={isExceededWip ? 'wip-warning-pill' : undefined}
            className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${
              isExceededWip
                ? 'bg-rose-500/15 text-rose-800 border border-rose-300/80'
                : 'bg-forest-500/10 text-forest-800'
            }`}
          >
            {tasks.length} / {maxWip} WIP
          </span>
        ) : (
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-semibold rounded-full ${headerColors.countBg}`}
          >
            {tasks.length}
          </span>
        )}
      </div>

      {/* Cards Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[160px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-sand-200/90 rounded-xl text-center p-4 bg-white/40">
            <span className="text-xs text-slate-400 font-medium tracking-wide">No tasks</span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isSelected={task.id === activeTaskId}
              onSelect={onSelectTask}
              onPriorityClick={onPriorityClick}
              onTagClick={onTagClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
