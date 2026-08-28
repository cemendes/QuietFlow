import React, { useState } from 'react';
import {
  Calendar,
  Inbox,
  Star,
  Settings,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Compass,
} from 'lucide-react';
import { useVaultStore } from '../../store';
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
  const [activeScope, setActiveScope] = useState<'today' | 'inbox' | 'starred' | null>('today');

  const { vaultTree, activeFile, selectFile, tasks } = useVaultStore();

  // Compute counts for system badges
  const todayTasksCount = tasks.filter((t) => {
    const today = new Date().toISOString().split('T')[0];
    return t.status !== 'done' && (t.dueDate === today || !t.dueDate);
  }).length;

  const handleSystemScopeClick = (scope: 'today' | 'inbox' | 'starred') => {
    setActiveScope(scope);
    // If today.md or inbox.md exists at root level, optionally select it
    if (scope === 'today') {
      const todayNode = vaultTree?.children?.find((c) => c.name.toLowerCase() === 'today.md');
      if (todayNode) {
        if (onSelectFile) {
          onSelectFile(todayNode.path);
        } else {
          selectFile(todayNode.path);
        }
      }
    }
  };

  const handleFileSelect = (filePath: string) => {
    setActiveScope(null);
    if (onSelectFile) {
      onSelectFile(filePath);
    } else {
      selectFile(filePath);
    }
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-sand-100 border-r border-sand-200 transition-all duration-200 ease-in-out select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* Top Bar: Traffic lights placeholder & Collapse Toggle */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          {/* macOS window control dots */}
          <div className="w-3 h-3 rounded-full bg-red-400/90 border border-red-500/20" />
          <div className="w-3 h-3 rounded-full bg-amber-400/90 border border-amber-500/20" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/90 border border-emerald-500/20" />
        </div>

        <button
          type="button"
          data-testid="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-sand-200/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* App Branding & Vault Title */}
      {!isCollapsed ? (
        <div className="flex items-center justify-between px-3.5 py-1 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-forest-700 text-white shadow-xs">
              <Compass className="w-3.5 h-3.5" />
            </div>
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
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-forest-700 text-white shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* System Views Navigation (Today, Inbox, Starred) */}
      <div className="px-2 py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => handleSystemScopeClick('today')}
          title="Today"
          className={`flex w-full items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeScope === 'today'
              ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
              : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar
              className={`w-4 h-4 shrink-0 ${
                activeScope === 'today' ? 'text-forest-600' : 'text-stone-400'
              }`}
            />
            {!isCollapsed && <span className="truncate">Today</span>}
          </div>
          {!isCollapsed && todayTasksCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-forest-100 text-forest-700">
              {todayTasksCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSystemScopeClick('inbox')}
          title="Inbox"
          className={`flex w-full items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeScope === 'inbox'
              ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
              : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Inbox
              className={`w-4 h-4 shrink-0 ${
                activeScope === 'inbox' ? 'text-forest-600' : 'text-stone-400'
              }`}
            />
            {!isCollapsed && <span className="truncate">Inbox</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSystemScopeClick('starred')}
          title="Starred"
          className={`flex w-full items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeScope === 'starred'
              ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
              : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Star
              className={`w-4 h-4 shrink-0 ${
                activeScope === 'starred' ? 'text-forest-600' : 'text-stone-400'
              }`}
            />
            {!isCollapsed && <span className="truncate">Starred</span>}
          </div>
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
            </div>
            <FolderTree
              tree={vaultTree}
              activeFile={activeFile}
              onSelectFile={handleFileSelect}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-2 space-y-3">
            {vaultTree?.children
              ?.filter((c) => c.isDirectory)
              .map((folder) => (
                <div
                  key={folder.path}
                  title={folder.name}
                  className="p-1.5 rounded-md text-stone-400 hover:text-forest-700 hover:bg-sand-200/60 cursor-pointer"
                >
                  <FolderTree
                    tree={folder}
                    activeFile={activeFile}
                    onSelectFile={handleFileSelect}
                  />
                </div>
              ))}
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
