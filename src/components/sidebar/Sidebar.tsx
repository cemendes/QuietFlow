import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Settings,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Folder,
  FolderPlus,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { isTauriEnvironment, ipc } from '../../store/ipc';
import { FolderTree } from './FolderTree';

export interface SidebarProps {
  className?: string;
  onSelectFile?: (filePath: string) => void;
  onNewNote?: () => void;
  onOpenSettings?: () => void;
  onOpenArchive?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  onSelectFile,
  onNewNote,
  onOpenSettings,
  onOpenArchive,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('quietflow-sidebar-width');
    return saved ? parseInt(saved, 10) : 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [activeScope, setActiveScope] = useState<'today' | 'inbox' | 'starred' | null>('today');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { vaultTree, vaultPath, activeFile, selectFile, tasks, refreshVault } = useVaultStore();

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
    const folderPath = `${vaultPath}/${folderName}`;
    await ipc.createDirectory(folderPath);

    // Auto-create standard initial note inside folder with clean format (e.g. today date)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}`;
    const initialNoteName = `${dateStr}.md`;
    const primaryNotePath = `${folderPath}/${initialNoteName}`;
    const initialContent = `---\ntitle: ${dateStr}\n---\n\n# Tasks\n\n- [ ] Initial action item\n`;
    await ipc.writeFileAtomic(primaryNotePath, initialContent);

    await refreshVault();
    await selectFile(primaryNotePath);

    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Compute counts for Inbox badge
  const inboxTasksCount = tasks.filter((t) => {
    const isInboxTask = t.filePath?.toLowerCase().includes('inbox') || activeFile?.toLowerCase().includes('inbox');
    return isInboxTask && t.status !== 'done';
  }).length;

  const handleInboxClick = async () => {
    setActiveScope('inbox');
    if (!vaultPath) return;

    let inboxNode = vaultTree?.children?.find(
      (c) => !c.isDirectory && (c.name.toLowerCase() === 'inbox.md' || c.name.toLowerCase().includes('inbox'))
    );

    if (!inboxNode) {
      const inboxPath = `${vaultPath}/Inbox.md`;
      const initialContent = `---\ntitle: Inbox\n---\n\n# Tasks\n`;
      await ipc.writeFileAtomic(inboxPath, initialContent);
      await refreshVault();
      await selectFile(inboxPath);
    } else {
      await selectFile(inboxNode.path);
    }
  };

  const handleFileSelect = (filePath: string) => {
    if (filePath.toLowerCase().includes('inbox')) {
      setActiveScope('inbox');
    } else {
      setActiveScope(null);
    }
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
          title="Drag to resize sidebar"
        />
      )}

      {/* Top Bar: Window Drag Region & macOS Inset */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 pt-3.5 pb-2 cursor-grab active:cursor-grabbing min-h-[38px]"
      >
        <div className="flex items-center gap-1.5 h-4">
          {/* Only render simulated dots in browser mock mode, never in native Tauri window */}
          {!isTauriEnvironment() && (
            <>
              <div className="w-3 h-3 rounded-full bg-red-400/90 border border-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-amber-400/90 border border-amber-500/20" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/90 border border-emerald-500/20" />
            </>
          )}
          {isTauriEnvironment() && (
            <div className="w-16 h-3" /> /* Preserves native macOS traffic light inset */
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            data-testid="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-sand-200/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 z-10"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* When collapsed, render toggle button in dedicated row cleanly centered below traffic lights */}
      {isCollapsed && (
        <div className="flex items-center justify-center px-2 py-1 mb-2">
          <button
            type="button"
            data-testid="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-sand-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 shadow-xs"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* App Branding & Vault Title */}
      {!isCollapsed ? (
        <div className="flex items-center justify-between px-3.5 py-1 mb-2">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="QuietFlow"
              className="w-6 h-6 rounded-md shadow-xs object-cover"
            />
            <span className="text-sm font-semibold tracking-tight text-forest-800">
              QuietFlow
            </span>
          </div>

          {onNewNote && (
            <button
              type="button"
              onClick={onNewNote}
              className="p-1 rounded-md text-stone-500 hover:text-forest-700 hover:bg-sand-200/60 transition-colors"
              title="New note (Cmd+N)"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-center py-2 mb-2">
          <img
            src="/favicon.png"
            alt="QuietFlow"
            className="w-7 h-7 rounded-md shadow-xs object-cover"
          />
        </div>
      )}

      {/* System Views Navigation (Inbox Only) */}
      <div className="px-2 py-1 space-y-0.5">
        <button
          type="button"
          onClick={handleInboxClick}
          title="Inbox"
          className={`flex w-full items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeScope === 'inbox' || activeFile?.toLowerCase().includes('inbox')
              ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
              : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Inbox
              className={`w-4 h-4 shrink-0 ${
                activeScope === 'inbox' || activeFile?.toLowerCase().includes('inbox')
                  ? 'text-forest-600'
                  : 'text-stone-400'
              }`}
            />
            {!isCollapsed && <span className="truncate">Inbox</span>}
          </div>
          {!isCollapsed && inboxTasksCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-forest-100 text-forest-700">
              {inboxTasksCount}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-sand-200 mx-3" />

      {/* Nested Folder Tree Section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                Folders
              </span>
              <button
                type="button"
                data-testid="add-folder-btn"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                title="New folder"
                aria-label="New folder"
                className="p-1 text-stone-400 hover:text-forest-700 hover:bg-sand-200/60 rounded transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

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
                  placeholder="Folder name..."
                  className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none py-0.5"
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-1.5 py-0.5 text-[10px] font-semibold text-white bg-forest-700 hover:bg-forest-800 disabled:opacity-40 rounded transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            <FolderTree
              tree={vaultTree}
              activeFile={activeFile}
              onSelectFile={handleFileSelect}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-2 space-y-2">
            {vaultTree?.children
              ?.filter((c) => c.isDirectory)
              .map((folder) => {
                const icon = localStorage.getItem(`folder-icon-${folder.path}`);
                return (
                  <button
                    key={folder.path}
                    type="button"
                    title={folder.name}
                    onClick={() => {
                      setIsCollapsed(false);
                      const defaultNote = folder.children?.find((c) => !c.isDirectory && c.name.endsWith('.md'));
                      if (defaultNote) {
                        handleFileSelect(defaultNote.path);
                      }
                    }}
                    className="p-2 rounded-lg text-stone-500 hover:text-forest-700 hover:bg-sand-200/80 transition-colors cursor-pointer group relative flex items-center justify-center"
                  >
                    {icon ? (
                      icon.startsWith('data:image') ? (
                        <img
                          src={icon}
                          alt={folder.name}
                          className="w-5 h-5 rounded object-cover shadow-2xs"
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
          title="Archive"
          aria-label="Archive"
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:bg-sand-200/60 hover:text-stone-900 transition-colors"
        >
          <Archive className="w-4 h-4 text-stone-400 shrink-0" />
          {!isCollapsed && <span>Archive</span>}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:bg-sand-200/60 hover:text-stone-900 transition-colors"
        >
          <Settings className="w-4 h-4 text-stone-400 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
