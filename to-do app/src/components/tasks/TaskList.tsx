import React, { useMemo } from 'react';
import { useVaultStore } from '../../store';
import { NewTaskInput } from '../../store/types';
import TaskRow from './TaskRow';
import QuickAddBar from './QuickAddBar';
import ViewSwitcher from './ViewSwitcher';

export interface TaskListProps {
  title?: string;
  className?: string;
  defaultSection?: string;
  onAddTask?: (task: NewTaskInput, defaultSection?: string) => Promise<void> | void;
}

export const TaskList: React.FC<TaskListProps> = ({
  title,
  className = '',
  defaultSection,
  onAddTask,
}) => {
  const tasks = useVaultStore((state) => state.tasks);
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const activeFile = useVaultStore((state) => state.activeFile);
  const searchQuery = useVaultStore((state) => state.searchQuery);
  const selectedTag = useVaultStore((state) => state.selectedTag);
  const selectedPriority = useVaultStore((state) => state.selectedPriority);

  const toggleTask = useVaultStore((state) => state.toggleTask);
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

  // Filter tasks based on search query, selected tag, and selected priority
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

  // Summary counts
  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter((t) => t.status === 'done').length;

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
          <QuickAddBar defaultSection={defaultSection} onAddTask={onAddTask} />
        </div>
      </header>

      {/* Task List Body */}
      <main className="flex-1 overflow-y-auto p-6 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 border-2 border-dashed border-sand-200 rounded-2xl bg-white/40">
            <svg
              className="w-10 h-10 text-slate-300 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <p className="text-sm font-medium text-slate-600">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || selectedTag || selectedPriority
                ? 'Try adjusting your search query or clearing active filters.'
                : 'All clear! Press ⌘N or use the input above to capture a new task.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isSelected={task.id === activeTaskId}
                onToggle={(id) => toggleTask(id)}
                onSelect={(id) => setActiveTaskId(id)}
                onPriorityClick={(pri) => setSelectedPriority(selectedPriority === pri ? null : pri)}
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TaskList;
