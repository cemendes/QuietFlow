import React, { useMemo } from 'react';
import { useVaultStore } from '../../store';
import { NewTaskInput, TaskItem } from '../../store/types';
import TaskRow from './TaskRow';
import QuickAddBar from './QuickAddBar';
import FocusHeader from './FocusHeader';
import ZenTheaterModal from '../zen/ZenTheaterModal';

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
  const isSaving = useVaultStore((state) => state.isSaving);

  const toggleTask = useVaultStore((state) => state.toggleTask);
  const deleteTask = useVaultStore((state) => state.deleteTask);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const setSelectedTag = useVaultStore((state) => state.setSelectedTag);
  const setSelectedPriority = useVaultStore((state) => state.setSelectedPriority);
  const setSearchQuery = useVaultStore((state) => state.setSearchQuery);

  const activeFolder = useVaultStore((state) => state.activeFolder);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const logoConfig = useVaultStore((state) => state.logoConfig);
  const getFolderIcon = useVaultStore((state) => state.getFolderIcon);

  const [headerIcon, setHeaderIcon] = React.useState<string | null>(null);

  // Compute target folder path for the current view
  const currentFolderPath = useMemo(() => {
    if (activeFolder) return activeFolder;
    if (activeFile) {
      const parent = activeFile.substring(0, activeFile.lastIndexOf('/'));
      return parent || null;
    }
    return null;
  }, [activeFile, activeFolder]);

  // Synchronously compute initial icon and asynchronously resolve Tauri asset / base64 if needed
  React.useEffect(() => {
    let isMounted = true;
    if (!currentFolderPath || currentFolderPath === vaultPath) {
      setHeaderIcon(null);
      return;
    }

    // Don't show folder icon for Inbox
    if (activeFile?.toLowerCase().includes('inbox')) {
      setHeaderIcon(null);
      return;
    }

    // 1. Synchronous check
    const syncIcon =
      (getFolderIcon ? getFolderIcon(currentFolderPath) : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem(`folder-icon-${currentFolderPath}`) : null);

    if (syncIcon) {
      setHeaderIcon(syncIcon);
    }

    // 2. Async resolution (for Tauri convertFileSrc / disk files)
    if (vaultPath) {
      import('../../services/logoService').then(({ resolveFolderIcon }) => {
        resolveFolderIcon(vaultPath, currentFolderPath, logoConfig).then((resolved) => {
          if (isMounted && resolved) {
            setHeaderIcon(resolved);
          }
        });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [currentFolderPath, vaultPath, logoConfig, getFolderIcon]);

  // Determine display title
  const computedTitle = useMemo(() => {
    if (title) return title;
    if (activeFile) {
      const fileName = activeFile.split('/').pop()?.replace(/\.md$/, '') || 'Tasks';
      if (fileName.toLowerCase() === 'inbox') {
        return 'Inbox';
      }
      if (fileName.toLowerCase() === 'today') {
        return "Today's Focus";
      }
      // Capitalize first letter
      return fileName.charAt(0).toUpperCase() + fileName.slice(1);
    }
    if (activeFolder) {
      if (activeFolder === vaultPath) {
        return 'My Vault';
      }
      const folderName = activeFolder.split('/').pop() || 'Folder';
      return folderName.charAt(0).toUpperCase() + folderName.slice(1);
    }
    return "Today's Focus";
  }, [title, activeFile, activeFolder]);

  const [activeFocusBucket, setActiveFocusBucket] = React.useState<'all' | 'now' | 'not-now'>('all');

  // Filter tasks based on search query, selected tag, selected priority, and focus bucket
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Focus bucket filter
      const todayStr = new Date().toISOString().split('T')[0];
      const isDueToday = task.dueDate === todayStr;
      const isOverdue = Boolean(task.dueDate && task.dueDate < todayStr);
      const isFuture = Boolean(task.dueDate && task.dueDate > todayStr);

      if (activeFocusBucket === 'now') {
        const isNow = task.status === 'in-progress' || isDueToday || isOverdue || (task.priority === 'high' && !isFuture);
        if (!isNow) return false;
      } else if (activeFocusBucket === 'not-now') {
        const isLater = task.status === 'backlog' || isFuture || (!task.priority && !task.dueDate && task.status !== 'in-progress');
        if (!isLater) return false;
      }

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
  }, [tasks, searchQuery, selectedTag, selectedPriority, activeFocusBucket]);

  // Summary counts
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;

  const [isZenOpen, setIsZenOpen] = React.useState(false);
  const [zenTask, setZenTask] = React.useState<TaskItem | null>(null);

  const handleOpenZen = (specificTask?: TaskItem) => {
    const candidate = specificTask || filteredTasks.find((t) => t.status !== 'done') || tasks[0] || null;
    if (candidate) {
      setZenTask(candidate);
      setIsZenOpen(true);
    }
  };

  return (
    <div data-testid="task-list" className={`flex flex-col h-full bg-sand-50 overflow-hidden ${className}`}>
      {/* Header & Controls */}
      <header
        data-tauri-drag-region
        className="flex flex-col p-6 pb-3 border-b border-sand-200 bg-sand-50/80 backdrop-blur-sm select-none"
      >
        <FocusHeader
          title={computedTitle}
          icon={headerIcon}
          completedCount={completedCount}
          totalCount={totalCount}
          activeFocusBucket={activeFocusBucket}
          onFocusBucketChange={setActiveFocusBucket}
          isSaving={isSaving}
          onOpenZen={() => handleOpenZen()}
        />

        {/* Active Filters Pill Bar (if any filter is active) */}
        {(selectedTag || selectedPriority || searchQuery) && (
          <div data-testid="active-filters-bar" className="flex items-center flex-wrap gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Filtered by:</span>

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
                onDelete={(id) => deleteTask(id)}
                onPriorityClick={(pri) => setSelectedPriority(selectedPriority === pri ? null : pri)}
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
              />
            ))}
          </div>
        )}
      </main>

      {/* "One-Thing" Zen Theater Focus Modal */}
      {isZenOpen && (
        <ZenTheaterModal
          isOpen={isZenOpen}
          task={zenTask}
          onClose={() => setIsZenOpen(false)}
          onCompleteTask={(id) => toggleTask(id)}
        />
      )}
    </div>
  );
};

export default TaskList;
