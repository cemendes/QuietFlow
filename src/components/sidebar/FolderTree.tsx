import React, { useState, useEffect } from 'react';
import { FolderItem } from './FolderItem';
import { VaultNode } from '../../store/types';

export interface FolderTreeProps {
  tree: VaultNode | null;
  activeFile: string | null;
  activeFolder?: string | null;
  onSelectFile: (path: string) => void;
  onSelectFolder?: (path: string) => void;
  className?: string;
}

function collectDirectoryPaths(node: VaultNode | null): string[] {
  if (!node) return [];
  const paths: string[] = [];
  if (node.isDirectory) {
    paths.push(node.path);
    if (node.children) {
      for (const child of node.children) {
        paths.push(...collectDirectoryPaths(child));
      }
    }
  }
  return paths;
}

const COLLAPSED_FOLDERS_STORAGE_KEY = 'quietflow-collapsed-folders';

export const FolderTree: React.FC<FolderTreeProps> = ({
  tree,
  activeFile,
  activeFolder,
  onSelectFile,
  onSelectFolder,
  className = '',
}) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(COLLAPSED_FOLDERS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return new Set(parsed);
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return new Set();
  });

  // Prune any collapsed paths that no longer exist in the vault tree
  useEffect(() => {
    if (!tree) return;
    const allDirs = new Set(collectDirectoryPaths(tree));
    setCollapsedPaths((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const p of prev) {
        if (allDirs.has(p)) {
          next.add(p);
        } else {
          changed = true;
        }
      }
      if (changed && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(COLLAPSED_FOLDERS_STORAGE_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage error
        }
      }
      return changed ? next : prev;
    });
  }, [tree]);

  const handleToggleFolder = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(COLLAPSED_FOLDERS_STORAGE_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  };

  // Directories are expanded unless explicitly collapsed by the user
  const expandedPaths = React.useMemo(() => {
    const allDirs = collectDirectoryPaths(tree);
    return new Set(allDirs.filter((p) => !collapsedPaths.has(p)));
  }, [tree, collapsedPaths]);

  if (!tree) {
    return (
      <div className={`px-3 py-4 text-center text-xs text-stone-400 ${className}`}>
        No folder open
      </div>
    );
  }

  // If tree is root directory with children, render children directly at top level
  const rootItems = tree.isDirectory && tree.children ? tree.children : [tree];

  if (rootItems.length === 0) {
    return (
      <div className={`px-3 py-4 text-center text-xs text-stone-400 ${className}`}>
        Vault is empty
      </div>
    );
  }

  return (
    <nav aria-label="Vault folders" className={`flex flex-col space-y-0.5 ${className}`}>
      {rootItems.map((item) => (
        <FolderItem
          key={item.path}
          node={item}
          level={0}
          activeFile={activeFile}
          activeFolder={activeFolder}
          expandedPaths={expandedPaths}
          onToggleFolder={handleToggleFolder}
          onSelectFile={onSelectFile}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </nav>
  );
};

export default FolderTree;
