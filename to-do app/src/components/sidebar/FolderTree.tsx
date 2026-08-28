import React, { useState, useEffect } from 'react';
import { FolderItem } from './FolderItem';
import { VaultNode } from '../../store/types';

export interface FolderTreeProps {
  tree: VaultNode | null;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
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

export const FolderTree: React.FC<FolderTreeProps> = ({
  tree,
  activeFile,
  onSelectFile,
  className = '',
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    return new Set(collectDirectoryPaths(tree));
  });

  // Whenever tree structure changes (e.g. initial vault load), ensure directories are in expanded set
  useEffect(() => {
    if (tree) {
      setExpandedPaths((prev) => {
        const allDirs = collectDirectoryPaths(tree);
        const next = new Set(prev);
        for (const p of allDirs) {
          next.add(p);
        }
        return next;
      });
    }
  }, [tree]);

  const handleToggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

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
          expandedPaths={expandedPaths}
          onToggleFolder={handleToggleFolder}
          onSelectFile={onSelectFile}
        />
      ))}
    </nav>
  );
};

export default FolderTree;
