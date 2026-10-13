import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Folder, CornerDownLeft, X } from 'lucide-react';
import { useVaultStore } from '../../store/vaultStore';
import { VaultNode } from '../../store/types';

interface QuickFileSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlatFileItem {
  path: string;
  name: string;
  folder: string;
}

function flattenVaultFiles(node: VaultNode | null, currentFolder: string = ''): FlatFileItem[] {
  if (!node) return [];
  const items: FlatFileItem[] = [];

  if (!node.isDirectory && (node.name.endsWith('.md') || !node.name.includes('.'))) {
    items.push({
      path: node.path,
      name: node.name,
      folder: currentFolder || 'Root',
    });
  }

  if (node.children) {
    const nextFolder = node.isDirectory
      ? currentFolder
        ? `${currentFolder} / ${node.name}`
        : node.name
      : currentFolder;

    for (const child of node.children) {
      items.push(...flattenVaultFiles(child, nextFolder));
    }
  }

  return items;
}

export const QuickFileSwitcher: React.FC<QuickFileSwitcherProps> = ({ isOpen, onClose }) => {
  const vaultTree = useVaultStore((state) => state.vaultTree);
  const activeFile = useVaultStore((state) => state.activeFile);
  const selectFile = useVaultStore((state) => state.selectFile);
  const setActiveView = useVaultStore((state) => state.setActiveView);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allFiles = flattenVaultFiles(vaultTree);

  const filteredFiles = allFiles.filter((f) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return f.name.toLowerCase().includes(lower) || f.folder.toLowerCase().includes(lower);
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = async (filePath: string) => {
    await selectFile(filePath);
    setActiveView('document');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        handleSelect(filteredFiles[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="quick-file-switcher"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-sand-50/50">
          <Search className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes and customer files by name or folder..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none border-none focus:outline-none"
            data-testid="quick-file-switcher-input"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching files found for &quot;{query}&quot;
            </div>
          ) : (
            filteredFiles.map((file, index) => {
              const isSelected = index === selectedIndex;
              const isActive = file.path === activeFile;

              return (
                <div
                  key={file.path}
                  data-testid={`switcher-file-item-${index}`}
                  onClick={() => handleSelect(file.path)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{file.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate mt-0.5">
                        <Folder className="w-3 h-3 shrink-0" />
                        <span>{file.folder}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium px-2 py-0.5 rounded bg-emerald-100/70">
                      <span>Open</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-100 bg-sand-50/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="font-semibold bg-slate-200 px-1 py-0.2 rounded text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="font-semibold bg-slate-200 px-1 py-0.2 rounded text-[10px]">Enter</kbd> Select</span>
            <span><kbd className="font-semibold bg-slate-200 px-1 py-0.2 rounded text-[10px]">Esc</kbd> Close</span>
          </div>
          <span>{filteredFiles.length} notes</span>
        </div>
      </div>
    </div>
  );
};
