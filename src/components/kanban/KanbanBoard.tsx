import React, { useMemo } from 'react';
import { useVaultStore } from '../../store';
import { TaskStatus } from '../../store/types';
import KanbanColumn from './KanbanColumn';
import QuickAddBar from '../tasks/QuickAddBar';
import FocusHeader from '../tasks/FocusHeader';

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
  const isSaving = useVaultStore((state) => state.isSaving);

  const updateTask = useVaultStore((state) => state.updateTask);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const setSelectedTag = useVaultStore((state) => state.setSelectedTag);
  const setSelectedPriority = useVaultStore((state) => state.setSelectedPriority);
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
    if (!currentFolderPath) {
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
      return fileName.charAt(0).toUpperCase() + fileName.slice(1);
    }
    if (activeFolder) {
      const folderName = activeFolder.split('/').pop() || 'Folder';
      return folderName.charAt(0).toUpperCase() + folderName.slice(1);
    }
    return "Today's Focus";
  }, [title, activeFile, activeFolder]);

  const [activeFocusBucket, setActiveFocusBucket] = React.useState<'all' | 'now' | 'not-now'>('all');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Focus bucket filter
      const todayStr = new Date().toISOString().split('T')[0];
      const isDueToday = task.dueDate === todayStr;
      const isOverdue = Boolean(task.dueDate && task.dueDate < todayStr);
      const isFuture = Boolean(task.dueDate && task.dueDate > todayStr);

      if (activeFocusBucket === 'now') {
        // Now = Due today, overdue, high priority, or in-progress
        const isHighPriority = task.priority === 'high';
        const isInProgress = task.status === 'in-progress';
        if (!isDueToday && !isOverdue && !isHighPriority && !isInProgress) {
          return false;
        }
      } else if (activeFocusBucket === 'not-now') {
        // Backlog / Not Now
        const isBacklogStatus = task.status === 'backlog';
        if (!isFuture && !isBacklogStatus) {
          return false;
        }
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
  }, [tasks, activeFocusBucket, searchQuery, selectedTag, selectedPriority]);

  // Task count summary
  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter((t) => t.status === 'done').length;

  const handleTaskDrop = (taskId: string, targetStatus: TaskStatus) => {
    const completedDate =
      targetStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;
    updateTask(taskId, { status: targetStatus, completedDate });
  };

  return (
    <div className={`flex flex-col h-full bg-sand-50 overflow-hidden ${className}`}>
      {/* Header & Controls */}
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3.5 p-6 pb-3 border-b border-sand-200 bg-sand-50/80 backdrop-blur-sm select-none"
      >
        <FocusHeader
          title={computedTitle}
          icon={headerIcon}
          completedCount={completedCount}
          totalCount={totalCount}
          activeFocusBucket={activeFocusBucket}
          onFocusBucketChange={setActiveFocusBucket}
          isSaving={isSaving}
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
          <QuickAddBar defaultSection={defaultSection} />
        </div>
      </header>

      {/* Kanban Board 4-Column Canvas */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4 flex flex-col min-h-0">
        <div className="flex flex-row items-stretch gap-4 h-full w-full min-w-max pb-1">
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
                onPriorityClick={(pri) =>
                  setSelectedPriority(selectedPriority === pri ? null : pri)
                }
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
                maxWip={column.id === 'in-progress' ? 3 : undefined}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default KanbanBoard;
