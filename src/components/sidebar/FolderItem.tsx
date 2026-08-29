import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FolderPlus,
  FilePlus,
  MoreVertical,
} from 'lucide-react';
import { VaultNode } from '../../store/types';
import { ipc } from '../../store/ipc';
import { useVaultStore } from '../../store';
import FolderContextMenu from './FolderContextMenu';

export interface FolderItemProps {
  node: VaultNode;
  level?: number;
  activeFile: string | null;
  expandedPaths: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  node,
  level = 0,
  activeFile,
  expandedPaths,
  onToggleFolder,
  onSelectFile,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [folderIcon, setFolderIcon] = useState<string | null>(() => {
    return localStorage.getItem(`folder-icon-${node.path}`);
  });

  useEffect(() => {
    const saved = localStorage.getItem(`folder-icon-${node.path}`);
    if (saved) setFolderIcon(saved);
  }, [node.path]);

  const handleSetEmoji = (emoji: string) => {
    localStorage.setItem(`folder-icon-${node.path}`, emoji);
    setFolderIcon(emoji);
  };

  const handleUploadLogo = (dataUrl: string) => {
    localStorage.setItem(`folder-icon-${node.path}`, dataUrl);
    setFolderIcon(dataUrl);
  };

  const refreshVault = useVaultStore((state) => state.refreshVault);
  const createFile = useVaultStore((state) => state.createFile);
  const deleteEntry = useVaultStore((state) => state.deleteEntry);

  const handleCreateSubfolder = async () => {
    if (!newSubName.trim()) return;
    const subfolderPath = `${node.path}/${newSubName.trim()}`;
    await ipc.createDirectory(subfolderPath);
    await refreshVault();
    setNewSubName('');
    setIsCreatingSubfolder(false);
    if (!isExpanded) {
      onToggleFolder(node.path);
    }
  };

  const formatDefaultNoteName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const baseDate = `${year}-${month}-${day}`;

    // If folder already has files, find next unique candidate name
    if (!node.children || node.children.length === 0) {
      return baseDate;
    }

    const existingNames = new Set(
      node.children.map((c) => c.name.replace(/\.md$/i, ''))
    );

    if (!existingNames.has(baseDate)) {
      return baseDate;
    }

    // Generate short random suffix (e.g. 2026-08-28-a3f9)
    const generateRandomSuffix = () =>
      Math.random().toString(36).substring(2, 6);

    let randomCandidate = `${baseDate}-${generateRandomSuffix()}`;
    while (existingNames.has(randomCandidate)) {
      randomCandidate = `${baseDate}-${generateRandomSuffix()}`;
    }
    return randomCandidate;
  };

  const handleCreateFileInFolder = async (customName?: string) => {
    const nameToUse = customName || newSubName || formatDefaultNoteName();
    if (!nameToUse.trim()) return;
    const formattedName = nameToUse.trim().endsWith('.md')
      ? nameToUse.trim()
      : `${nameToUse.trim()}.md`;
    const newFilePath = `${node.path}/${formattedName}`;
    const initialContent = `---\ntitle: ${nameToUse.trim().replace(/\.md$/, '')}\n---\n\n# Tasks\n\n- [ ] `;
    await createFile(newFilePath, initialContent);
    setNewSubName('');
    setIsCreatingFile(false);
    if (!isExpanded) {
      onToggleFolder(node.path);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (node.isDirectory) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const moveTask = useVaultStore((state) => state.moveTask);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 1. Check if a task was dropped
    const taskJson = e.dataTransfer.getData('application/json');
    if (taskJson) {
      try {
        const payload = JSON.parse(taskJson);
        if (payload.type === 'task' && payload.taskId) {
          // If dropped on folder, resolve target note file
          let targetFilePath = '';
          if (node.isDirectory) {
            const defaultNote = node.children?.find((c) => !c.isDirectory && c.name.endsWith('.md'));
            if (defaultNote) {
              targetFilePath = defaultNote.path;
            } else {
              targetFilePath = `${node.path}/${node.name}.md`;
            }
          } else {
            targetFilePath = node.path;
          }

          if (targetFilePath && payload.sourceFilePath !== targetFilePath) {
            await moveTask(payload.taskId, payload.sourceFilePath, targetFilePath);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to parse task drop payload:', err);
      }
    }

    // 2. Fallback to folder/file move
    if (!node.isDirectory) return;

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || sourcePath === node.path) return;

    const itemName = sourcePath.split('/').pop();
    if (!itemName) return;

    const destinationPath = `${node.path}/${itemName}`;
    if (sourcePath === destinationPath) return;

    try {
      await ipc.moveEntry(sourcePath, destinationPath);
      await refreshVault();
    } catch (err) {
      console.error('Failed to move entry:', err);
    }
  };

  if (node.isDirectory) {
    return (
      <div
        data-testid={`folder-container-${node.path}`}
        className={`flex flex-col select-none rounded-md transition-colors ${
          isDragOver ? 'bg-forest-100/60 ring-1 ring-forest-500' : ''
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowContextMenu(true);
          }}
          style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
          className="group relative flex w-full items-center justify-between py-1.5 pr-2 rounded-md text-xs font-medium text-stone-700 hover:bg-sand-200/60 hover:text-stone-900 transition-colors cursor-pointer"
          onClick={() => onToggleFolder(node.path)}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-stone-400 group-hover:text-stone-600 transition-transform">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )}
            </span>

            {/* Custom Logo / Emoji or Default Folder Icon */}
            {folderIcon ? (
              folderIcon.startsWith('data:image') ? (
                <img
                  src={folderIcon}
                  alt={node.name}
                  className="w-4 h-4 rounded object-cover shadow-2xs shrink-0"
                />
              ) : (
                <span className="text-sm leading-none shrink-0">{folderIcon}</span>
              )
            ) : (
              <span className="text-forest-600 shrink-0">
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
              </span>
            )}

            <span className="truncate text-left">{node.name}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Context Menu Button */}
            <button
              type="button"
              data-testid={`folder-menu-btn-${node.name}`}
              title="Folder options"
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(!showContextMenu);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-700 hover:bg-sand-300/50 rounded transition-opacity"
            >
              <MoreVertical className="w-3 h-3" />
            </button>

            {/* Quick Actions: Add subfolder / Add file */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
              <button
                type="button"
                title="New file in folder"
                onClick={(e) => {
                  e.stopPropagation();
                  const defaultName = formatDefaultNoteName();
                  setNewSubName(defaultName);
                  setIsCreatingFile(true);
                  setIsCreatingSubfolder(false);
                  if (!isExpanded) onToggleFolder(node.path);
                }}
                className="p-1 text-stone-400 hover:text-forest-700 hover:bg-sand-300/50 rounded"
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="New subfolder"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewSubName('');
                  setIsCreatingSubfolder(true);
                  setIsCreatingFile(false);
                  if (!isExpanded) onToggleFolder(node.path);
                }}
                className="p-1 text-stone-400 hover:text-forest-700 hover:bg-sand-300/50 rounded"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {showContextMenu && (
            <FolderContextMenu
              folderName={node.name}
              folderPath={node.path}
              isDirectory={true}
              onRename={async (newName) => {
                const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
                const newPath = `${parentPath}/${newName}`;
                await ipc.moveEntry(node.path, newPath);
                await refreshVault();
              }}
              onAddNote={() => {
                const defaultName = formatDefaultNoteName();
                setNewSubName(defaultName);
                setIsCreatingFile(true);
                setIsCreatingSubfolder(false);
                if (!isExpanded) onToggleFolder(node.path);
              }}
              onAddSubfolder={() => {
                setNewSubName('');
                setIsCreatingSubfolder(true);
                setIsCreatingFile(false);
                if (!isExpanded) onToggleFolder(node.path);
              }}
              onDelete={() => deleteEntry(node.path)}
              onSetEmoji={handleSetEmoji}
              onUploadLogo={handleUploadLogo}
              onClose={() => setShowContextMenu(false)}
            />
          )}
        </div>

        {/* Inline Subfolder / File Input */}
        {(isCreatingSubfolder || isCreatingFile) && (
          <div
            style={{ paddingLeft: `${Math.max(8, (level + 1) * 14 + 8)}px` }}
            className="flex items-center gap-1.5 py-1 pr-2"
          >
            <input
              type="text"
              autoFocus
              ref={(input) => {
                if (input && isCreatingFile) {
                  input.focus();
                  input.select();
                }
              }}
              onFocus={(e) => {
                if (isCreatingFile) {
                  e.target.select();
                }
              }}
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (isCreatingSubfolder) handleCreateSubfolder();
                  else handleCreateFileInFolder();
                } else if (e.key === 'Escape') {
                  setIsCreatingSubfolder(false);
                  setIsCreatingFile(false);
                  setNewSubName('');
                }
              }}
              placeholder={isCreatingSubfolder ? 'Subfolder name...' : 'Note name...'}
              className="flex-1 px-2 py-1 text-xs bg-white border border-sand-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-500"
            />
            <button
              type="button"
              onClick={() => {
                if (isCreatingSubfolder) handleCreateSubfolder();
                else handleCreateFileInFolder();
              }}
              disabled={!newSubName.trim()}
              className="px-2 py-1 text-[10px] font-semibold text-white bg-forest-700 hover:bg-forest-800 disabled:opacity-40 rounded"
            >
              Add
            </button>
          </div>
        )}

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="flex flex-col mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <FolderItem
                key={child.path}
                node={child}
                level={level + 1}
                activeFile={activeFile}
                expandedPaths={expandedPaths}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File Item with Drag-and-Drop + Context Menu
  const isActive = activeFile === node.path;
  const displayName = node.name.replace(/\.md$/i, '');

  return (
    <div className="relative">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowContextMenu(true);
        }}
        style={{ paddingLeft: `${Math.max(8, level * 14 + 18)}px` }}
        onClick={() => onSelectFile(node.path)}
        data-testid={`file-item-${node.path}`}
        data-active={isActive ? 'true' : 'false'}
        className={`group flex w-full items-center justify-between py-1.5 pr-2 rounded-md text-xs transition-all text-left cursor-pointer ${
          isDragOver
            ? 'bg-forest-100/60 ring-1 ring-forest-500'
            : isActive
            ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
            : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900 font-normal'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {folderIcon ? (
            folderIcon.startsWith('data:image') ? (
              <img
                src={folderIcon}
                alt={node.name}
                className="w-3.5 h-3.5 rounded object-cover shadow-2xs shrink-0"
              />
            ) : (
              <span className="text-xs leading-none shrink-0">{folderIcon}</span>
            )
          ) : (
            <FileText
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? 'text-forest-600' : 'text-stone-400 group-hover:text-stone-600'
              }`}
            />
          )}
          <span className="truncate">{displayName}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Note Context Menu Button */}
          <button
            type="button"
            data-testid={`file-menu-btn-${displayName}`}
            title="Note options"
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(!showContextMenu);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-700 hover:bg-sand-300/50 rounded transition-opacity"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showContextMenu && (
        <FolderContextMenu
          folderName={displayName}
          folderPath={node.path}
          isDirectory={false}
          onRename={async (newName) => {
            const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
            const safeName = newName.trim().endsWith('.md') ? newName.trim() : `${newName.trim()}.md`;
            const newPath = parentDir ? `${parentDir}/${safeName}` : safeName;
            try {
              await ipc.moveEntry(node.path, newPath);
              await refreshVault();
            } catch (err) {
              console.error('Failed to rename note:', err);
            }
          }}
          onDelete={async () => {
            await deleteEntry(node.path);
          }}
          onSetEmoji={handleSetEmoji}
          onUploadLogo={handleUploadLogo}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
};

export default FolderItem;
