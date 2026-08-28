import React, { useMemo } from 'react';
import { useVaultStore } from '../../store';
import { TaskStatus } from '../../store/types';
import KanbanColumn from './KanbanColumn';
import QuickAddBar from '../tasks/QuickAddBar';
import ViewSwitcher from '../tasks/ViewSwitcher';

export interface KanbanBoardProps {
  title?: string;
  className?: string;
  defaultSection?: string;
}

const STAGE_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  title,
  className = '',
  defaultSection,
}) => {
  const tasks = useVaultStore((state) => state.tasks);
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const activeFile = useVaultStore((state) => state.activeFile);
  const searchQuery = useVaultStore((state) => state.searchQuery);
  const selectedTag = useVaultStore((state) => state.selectedTag);
  const selectedPriority = useVaultStore((state) => state.selectedPriority);

  const updateTask = useVaultStore((state) => state.updateTask);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const setSelectedTag = useVaultStore((state) => state.setSelectedTag);
  const setSelectedPriority = useVaultStore((state) => state.setSelectedPriority);
  const setSearchQuery = useVaultStore((state) => state.setSearchQuery);

  // Determine display title
  const computedTitle = useMemo(() => {
    if (title) return title;
    if (activeFile) {
      const fileName = activeFile.split('/').pop()?.replace(/\.md$/, '') || 'Tasks';
      return fileName;
    }
    return "Today's Focus";
  }, [title, activeFile]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query) ?? false;
        const matchesTags = task.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;
        if (!matchesTitle && !matchesNotes && !matchesTags) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag) {
        if (!task.tags?.includes(selectedTag)) {
          return false;
        }
      }

      // Priority filter
      if (selectedPriority) {
        if (task.priority !== selectedPriority) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, selectedTag, selectedPriority]);

  // Task count summary
  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter((t) => t.status === 'done').length;

  const handleTaskDrop = (taskId: string, targetStatus: TaskStatus) => {
    const completedDate =
      targetStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;
    updateTask(taskId, { status: targetStatus, completedDate });
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const completedDate =
      newStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;
    updateTask(taskId, { status: newStatus, completedDate });
  };

  return (
    <div className={`flex flex-col h-full bg-sand-50 overflow-hidden ${className}`}>
      {/* Header & Controls */}
      <header className="flex flex-col gap-3.5 p-6 pb-4 border-b border-sand-200 bg-sand-50/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              {computedTitle}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold text-forest-800 bg-forest-500/10 border border-forest-500/20 rounded-full">
              {completedCount}/{totalCount} done
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ViewSwitcher />
          </div>
        </div>

        {/* Active Filters Pill Bar (if any filter is active) */}
        {(selectedTag || selectedPriority || searchQuery) && (
          <div className="flex items-center flex-wrap gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-sand-200 rounded-md text-slate-700">
                Search: &quot;{searchQuery}&quot;
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-terracotta-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-500/10 border border-forest-500/20 rounded-md text-forest-800 font-medium">
                #{selectedTag}
                <button
                  onClick={() => setSelectedTag(null)}
                  className="hover:text-terracotta-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {selectedPriority && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terracotta-500/10 border border-terracotta-500/20 rounded-md text-terracotta-700 font-medium">
                Priority: {selectedPriority}
                <button
                  onClick={() => setSelectedPriority(null)}
                  className="hover:text-terracotta-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
                setSelectedPriority(null);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Quick Add Bar */}
        <div className="pt-1">
          <QuickAddBar defaultSection={defaultSection} />
        </div>
      </header>

      {/* Kanban Board 4-Column Canvas */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full min-w-max pb-2">
          {STAGE_COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={columnTasks}
                activeTaskId={activeTaskId}
                onSelectTask={(id) => setActiveTaskId(id)}
                onTaskDrop={handleTaskDrop}
                onStatusChange={handleStatusChange}
                onPriorityClick={(pri) =>
                  setSelectedPriority(selectedPriority === pri ? null : pri)
                }
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default KanbanBoard;
