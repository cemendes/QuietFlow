import React, { useState, useEffect } from 'react';
import {
  NotebookText,
  Settings,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Folder,
  FolderPlus,
  CheckSquare,
  Circle,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { isTauriEnvironment, ipc } from '../../store/ipc';
import { FolderTree } from './FolderTree';
import { useTranslation } from '../../i18n';
import { NAV_ITEM_ACTIVE, NAV_ITEM_IDLE } from './navItemStyles';
import { sectionRootPath, sectionSubtree } from '../../core/vault/sections';
import { parseMarkdownDocument } from '../../core/markdown';
import type { TaskItem, VaultNode } from '../../store/types';

export interface SidebarProps {
  className?: string;
  onSelectFile?: (filePath: string) => void;
  onNewNote?: () => void;
  onNewTask?: () => void;
  onOpenSettings?: () => void;
  onOpenArchive?: () => void;
}

const isInboxNode = (node: VaultNode) => !node.isDirectory && node.name.toLowerCase() === 'inbox.md';

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  onSelectFile,
  onNewNote,
  onNewTask,
  onOpenSettings,
  onOpenArchive,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('quietflow-sidebar-width');
    return saved ? parseInt(saved, 10) : 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [activeScope, setActiveScope] = useState<'today' | 'vault' | null>('vault');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const vaultTree = useVaultStore((state) => state.vaultTree);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const activeFile = useVaultStore((state) => state.activeFile);
  const activeFolder = useVaultStore((state) => state.activeFolder);
  const selectFile = useVaultStore((state) => state.selectFile);
  const openNote = useVaultStore((state) => state.openNote);
  const section = useVaultStore((state) => state.section);
  const setSection = useVaultStore((state) => state.setSection);
  const selectNoteFolder = useVaultStore((state) => state.selectNoteFolder);
  const selectTaskFolder = useVaultStore((state) => state.selectTaskFolder);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const refreshVault = useVaultStore((state) => state.refreshVault);
  const openTaskList = useVaultStore((state) => state.openTaskList);
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const contentRevision = useVaultStore((state) => state.contentRevision);
  const getFolderIcon = useVaultStore((state) => state.getFolderIcon);
  const { t } = useTranslation();

  // Each section only shows its own folder (Tarefas/ or Anotações/); vaults without one show everything.
  const fullSectionTree = sectionSubtree(vaultTree, section) ?? vaultTree;
  const sectionRoot = vaultPath ? sectionRootPath(vaultTree, vaultPath, section) : null;

  // In Tasks the root row *is* the Inbox (where New task / Quick Capture land), so Inbox leaves the tree.
  const inboxPath =
    section === 'tasks'
      ? fullSectionTree?.children?.find(isInboxNode)?.path ?? (sectionRoot ? `${sectionRoot}/Inbox.md` : null)
      : null;
  const sectionTree =
    section === 'tasks' && fullSectionTree
      ? { ...fullSectionTree, children: fullSectionTree.children?.filter((c) => !isInboxNode(c)) }
      : fullSectionTree;
  // Open tasks of Todas as tarefas (Inbox.md) are listed under the Tasks root, like notes under Notes.
  // Re-read whenever the app writes a file or the tree changes (external edits).
  const [rootTasks, setRootTasks] = useState<TaskItem[]>([]);
  useEffect(() => {
    if (!inboxPath) {
      setRootTasks([]);
      return;
    }
    let cancelled = false;
    ipc
      .readFile(inboxPath)
      .then((content) => {
        if (!cancelled) setRootTasks(parseMarkdownDocument(content).tasks.filter((task) => task.status !== 'done'));
      })
      .catch(() => {
        if (!cancelled) setRootTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [inboxPath, contentRevision, vaultTree]);

  const handleRootTaskClick = async (taskId: string) => {
    if (!inboxPath) return;
    setActiveScope(null);
    await openTaskList(inboxPath);
    setActiveTaskId(taskId);
  };

  const selectSectionFolder = (path: string | null) =>
    section === 'notes' ? selectNoteFolder(path) : selectTaskFolder(path);

  // Keep activeScope in sync with activeFile and activeFolder
  useEffect(() => {
    if (activeFile) {
      const lower = activeFile.toLowerCase();
      if (lower.endsWith('today.md')) {
        setActiveScope('today');
      } else {
        setActiveScope(null);
      }
    } else if (activeFolder) {
      setActiveScope(null);
    }
  }, [activeFile, activeFolder]);

  // Handle drag resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 180), 450);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('quietflow-sidebar-width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !vaultPath) return;
    const folderName = newFolderName.trim();
    const folderPath = `${sectionRoot}/${folderName}`;
    await ipc.createDirectory(folderPath);

    // Auto-create a standard initial note inside the new folder
    const noteTitle = t('app.newNoteName');
    const primaryNotePath = `${folderPath}/${noteTitle}.md`;
    const initialContent = `---\ntitle: ${noteTitle}\n---\n\n`;
    await ipc.writeFileAtomic(primaryNotePath, initialContent);

    await refreshVault();
    await openNote(primaryNotePath);

    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const isVaultActive =
    section === 'tasks'
      ? !!activeFile && activeFile === inboxPath
      : activeScope === 'vault' || (!!activeFolder && (activeFolder === sectionRoot || activeFolder === vaultPath));

  const handleVaultClick = () => {
    setActiveScope('vault');
    setActiveTaskId(null);
    if (section === 'tasks') {
      if (inboxPath) handleFileSelect(inboxPath);
      return;
    }
    if (!sectionRoot) return;
    selectSectionFolder(sectionRoot);
  };

  const handleFileSelect = (filePath: string) => {
    if (onSelectFile) {
      onSelectFile(filePath);
    } else {
      selectFile(filePath);
    }
  };

  return (
    <aside
      style={{ width: isCollapsed ? 72 : sidebarWidth }}
      className={`relative flex flex-col h-full bg-sand-100 border-r border-sand-200 ${
        isResizing ? 'transition-none' : 'transition-[width] duration-150'
      } ease-in-out select-none shrink-0 ${className}`}
    >
      {/* Resizer Handle */}
      {!isCollapsed && (
        <div
          data-testid="sidebar-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-forest-500/30 transition-colors z-30"
          title={t('sidebar.resizeHandle')}
        />
      )}

      {/* Top Bar: Window Drag Region, branding and collapse toggle */}
      {!isCollapsed && (
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 pt-3.5 pb-2 min-h-[38px] select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Only render simulated dots in browser mock mode, never in native Tauri window */}
          {!isTauriEnvironment() && !isCollapsed && (
            <div className="flex items-center gap-1.5 h-4 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400/90 border border-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-amber-400/90 border border-amber-500/20" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/90 border border-emerald-500/20" />
            </div>
          )}
          {isTauriEnvironment() && !isCollapsed && (
            <div className="w-16 h-3 shrink-0" /> /* Preserves native macOS traffic light inset */
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src="/favicon.png"
                alt="QuietFlow"
                className="w-5 h-5 rounded-md shadow-xs object-cover shrink-0"
              />
              <span className="text-sm font-semibold tracking-tight text-forest-800 truncate">
                QuietFlow
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            data-testid="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-sand-200/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 z-10 shrink-0"
            title={t('sidebar.collapse')}
            aria-label={t('sidebar.collapse')}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>
      )}

      {/* When collapsed, toggle and logo stacked below the window controls */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 px-2 pt-2 mb-1">
          <button
            type="button"
            data-testid="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-sand-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 shadow-xs"
            title={t('sidebar.expand')}
            aria-label={t('sidebar.expand')}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <img
            src="/favicon.png"
            alt="QuietFlow"
            className="w-7 h-7 rounded-md shadow-xs object-cover"
          />
        </div>
      )}

      {/* Section switch: Tasks and Notes are separate areas with their own screens */}
      <div className="px-2 pt-1 pb-1">
        <div
          role="tablist"
          className={`flex ${isCollapsed ? 'flex-col' : ''} gap-1 p-1 bg-sand-200/60 rounded-lg`}
        >
          {([
            { id: 'notes', label: t('sidebar.notes'), Icon: NotebookText },
            { id: 'tasks', label: t('nav.tasks'), Icon: CheckSquare },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`section-tab-${id}`}
              aria-selected={section === id}
              title={label}
              onClick={() => setSection(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                section === id
                  ? 'bg-white text-forest-800 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-1 space-y-0.5">
        {section === 'notes' && onNewNote && (
          <button
            type="button"
            data-testid="new-note-btn"
            onClick={onNewNote}
            title={t('sidebar.newNote')}
            aria-label={t('sidebar.newNoteLabel')}
            className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 mb-1.5 rounded-md text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 shadow-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">{t('sidebar.newNoteLabel')}</span>}
          </button>
        )}

        {section === 'tasks' && onNewTask && (
          <button
            type="button"
            data-testid="new-task-btn"
            onClick={onNewTask}
            title={t('sidebar.newTask')}
            aria-label={t('sidebar.newTaskLabel')}
            className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 mb-1.5 rounded-md text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 shadow-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">{t('sidebar.newTaskLabel')}</span>}
          </button>
        )}

        {/* Root of the vault for the current section */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleVaultClick}
            data-testid="vault-root-btn"
            title={section === 'notes' ? t('sidebar.notes') : t('nav.tasks')}
            data-active={isVaultActive ? 'true' : 'false'}
            aria-current={isVaultActive ? 'page' : undefined}
            className={`flex flex-1 min-w-0 items-center ${isCollapsed ? 'justify-center' : ''} px-2 py-1.5 rounded-md text-xs transition-colors ${
              isVaultActive ? NAV_ITEM_ACTIVE : `${NAV_ITEM_IDLE} font-medium`
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 min-w-0'}`}>
              {section === 'notes' ? (
                <NotebookText
                  className={`w-4 h-4 shrink-0 ${isVaultActive ? 'text-forest-600' : 'text-stone-400'}`}
                />
              ) : (
                <CheckSquare
                  className={`w-4 h-4 shrink-0 ${isVaultActive ? 'text-forest-600' : 'text-stone-400'}`}
                />
              )}
              {!isCollapsed && (
                <span className="truncate">
                  {section === 'notes' ? t('sidebar.notes') : t('nav.tasks')}
                </span>
              )}
            </div>
          </button>
          {!isCollapsed && section === 'notes' && (
            <button
              type="button"
              data-testid="add-folder-btn"
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              title={t('sidebar.newFolder')}
              aria-label={t('sidebar.newFolder')}
              className="p-1.5 text-stone-400 hover:text-forest-700 hover:bg-sand-200/60 rounded transition-colors shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {section === 'tasks' && !isCollapsed && rootTasks.length > 0 && (
        <ul className="px-2 pb-1 space-y-0.5" aria-label={t('tasks.inboxTitle')}>
          {rootTasks.map((task) => {
            const isCurrent = activeFile === inboxPath && activeTaskId === task.id;
            return (
              <li key={task.id}>
                <button
                  type="button"
                  data-testid={`sidebar-task-${task.id}`}
                  title={task.title}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => handleRootTaskClick(task.id)}
                  className={`flex w-full min-w-0 items-center gap-2 pl-7 pr-2 py-1 rounded-md text-xs transition-colors ${
                    isCurrent ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE
                  }`}
                >
                  <Circle className="w-3 h-3 shrink-0 text-stone-400" />
                  <span className="truncate">{task.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="h-1" />

      {/* Nested Folder Tree Section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {!isCollapsed ? (
          <>
            {isCreatingFolder && (
              <div className="flex items-center gap-1.5 px-2 py-1 mb-1.5 bg-white border border-sand-200 rounded-lg shadow-2xs">
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateFolder();
                    } else if (e.key === 'Escape') {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder={t('sidebar.folderNamePlaceholder')}
                  className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none py-0.5"
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-1.5 py-0.5 text-[10px] font-semibold text-white bg-forest-700 hover:bg-forest-800 disabled:opacity-40 rounded transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
            )}

            <FolderTree
              tree={sectionTree}
              activeFile={activeFile}
              activeFolder={activeFolder}
              onSelectFile={handleFileSelect}
              onSelectFolder={(path) => {
                setActiveScope(null);
                setActiveTaskId(null);
                selectSectionFolder(path);
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-1 space-y-1">
            {sectionTree?.children
              ?.filter((c) => c.isDirectory)
              .map((folder) => {
                const icon = getFolderIcon ? getFolderIcon(folder.path) : (typeof localStorage !== 'undefined' ? localStorage.getItem(`folder-icon-${folder.path}`) : null);
                const containsActive = !!activeFile && activeFile.startsWith(`${folder.path}/`);
                return (
                  <button
                    key={folder.path}
                    type="button"
                    title={folder.name}
                    aria-current={containsActive ? 'true' : undefined}
                    onClick={() => {
                      setIsCollapsed(false);
                      const defaultNote = folder.children?.find((c) => !c.isDirectory && c.name.endsWith('.md'));
                      if (defaultNote) {
                        handleFileSelect(defaultNote.path);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer group relative flex items-center justify-center ${
                      containsActive
                        ? NAV_ITEM_ACTIVE
                        : 'text-stone-500 hover:text-forest-700 hover:bg-sand-200'
                    }`}
                  >
                    {icon ? (
                      (icon.startsWith('data:') || icon.startsWith('asset:') || icon.startsWith('http') || icon.includes('/') || icon.includes('.')) ? (
                        <img
                          src={icon}
                          alt={folder.name}
                          className="w-5 h-5 rounded object-contain shadow-2xs"
                        />
                      ) : (
                        <span className="text-base leading-none">{icon}</span>
                      )
                    ) : (
                      <Folder className="w-4 h-4 text-forest-600" />
                    )}

                    {folder.fileCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold bg-forest-700 text-white rounded-full">
                        {folder.fileCount}
                      </span>
                    )}

                    {/* Floating Native macOS Tooltip */}
                    <div className="pointer-events-none absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {folder.name}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer Actions: Archive & Settings */}
      <div className="mt-auto border-t border-sand-200 p-2 space-y-0.5">
        <button
          type="button"
          onClick={onOpenArchive}
          title={t('sidebar.archive')}
          aria-label={t('sidebar.archive')}
          className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:bg-sand-200 hover:text-stone-900 transition-colors`}
        >
          <Archive className="w-4 h-4 text-stone-400 shrink-0" />
          {!isCollapsed && <span>{t('sidebar.archive')}</span>}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title={t('sidebar.settings')}
          aria-label={t('sidebar.settings')}
          className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:bg-sand-200 hover:text-stone-900 transition-colors`}
        >
          <Settings className="w-4 h-4 text-stone-400 shrink-0" />
          {!isCollapsed && <span>{t('sidebar.settings')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
