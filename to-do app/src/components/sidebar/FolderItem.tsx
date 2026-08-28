import React from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { VaultNode } from '../../store/types';

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

  if (node.isDirectory) {
    return (
      <div className="flex flex-col select-none">
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
          className="group flex w-full items-center justify-between py-1.5 pr-2 rounded-md text-xs font-medium text-stone-700 hover:bg-sand-200/60 hover:text-stone-900 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-stone-400 group-hover:text-stone-600 transition-transform">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )}
            </span>
            <span className="text-forest-600 shrink-0">
              {isExpanded ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </span>
            <span className="truncate text-left">{node.name}</span>
          </div>

          {node.fileCount > 0 && (
            <span
              data-testid={`folder-badge-${node.name}`}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sand-200 text-stone-600 group-hover:bg-sand-300/80 transition-colors shrink-0"
            >
              {node.fileCount}
            </span>
          )}
        </button>

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

  // File Item
  const isActive = activeFile === node.path;
  const displayName = node.name.replace(/\.md$/i, '');

  return (
    <button
      type="button"
      data-testid={`file-item-${node.path}`}
      data-active={isActive ? 'true' : 'false'}
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${Math.max(8, level * 14 + 18)}px` }}
      className={`group flex w-full items-center gap-2 py-1.5 pr-2 rounded-md text-xs transition-all text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 ${
        isActive
          ? 'bg-sand-200/90 text-forest-700 font-semibold shadow-xs'
          : 'text-stone-600 hover:bg-sand-200/50 hover:text-stone-900 font-normal'
      }`}
    >
      <FileText
        className={`w-3.5 h-3.5 shrink-0 ${
          isActive ? 'text-forest-600' : 'text-stone-400 group-hover:text-stone-600'
        }`}
      />
      <span className="truncate">{displayName}</span>
    </button>
  );
};

export default FolderItem;
