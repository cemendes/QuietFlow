import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckSquare,
  FileText,
  Folder,
  Tag,
  Calendar,
  AlertCircle,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { VaultNode, TaskPriority, NewTaskInput } from '../../store/types';
import { addTaskToDocument } from '../../core/markdown';
import { ipc } from '../../store/ipc';

export type CaptureType = 'task' | 'note';

export interface CapturePayload {
  type: CaptureType;
  title: string;
  tags?: string[];
  priority?: TaskPriority;
  dueDate?: string;
  targetFile: string;
  content?: string;
}

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (payload: CapturePayload) => Promise<void> | void;
}

interface ParsedNLP {
  cleanTitle: string;
  tags: string[];
  priority?: TaskPriority;
  dueDate?: string;
}

function extractAllMarkdownFiles(node: VaultNode | null): { name: string; path: string }[] {
  if (!node) return [];
  const results: { name: string; path: string }[] = [];

  function traverse(n: VaultNode, parentPath = '') {
    if (!n.isDirectory && (n.name.endsWith('.md') || n.name.endsWith('.markdown'))) {
      const displayName = parentPath ? `${parentPath} / ${n.name.replace(/\.md$/, '')}` : n.name.replace(/\.md$/, '');
      results.push({ name: displayName, path: n.path });
    }
    if (n.children && n.children.length > 0) {
      const nextParent = parentPath ? `${parentPath} / ${n.name}` : (n.name === 'Vault' || n.name === 'QuietFlowVault' ? '' : n.name);
      for (const child of n.children) {
        traverse(child, nextParent);
      }
    }
  }

  traverse(node);
  return results;
}

export function parseNaturalLanguageInput(raw: string): ParsedNLP {
  let text = raw.trim();
  let priority: TaskPriority | undefined;
  const tags: string[] = [];
  let dueDate: string | undefined;

  // Extract @priority (@high, @medium, @low)
  const priorityMatch = text.match(/@(high|medium|low)\b/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as TaskPriority;
    text = text.replace(priorityMatch[0], '').trim();
  }

  // Extract #tags (#planning, #notes, etc.)
  const tagMatches = Array.from(text.matchAll(/#([\w-]+)/g));
  for (const match of tagMatches) {
    tags.push(match[1]);
  }
  text = text.replace(/#([\w-]+)/g, '').trim();

  // Extract due:YYYY-MM-DD or keywords (tomorrow / today)
  const dueMatch = text.match(/\bdue:(\d{4}-\d{2}-\d{2})\b/i);
  if (dueMatch) {
    dueDate = dueMatch[1];
    text = text.replace(dueMatch[0], '').trim();
  } else if (/\btomorrow\b/i.test(text)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate = tomorrow.toISOString().split('T')[0];
    text = text.replace(/\btomorrow\b/gi, '').trim();
  } else if (/\btoday\b/i.test(text)) {
    dueDate = new Date().toISOString().split('T')[0];
    text = text.replace(/\btoday\b/gi, '').trim();
  }

  // Strip lingering unmatched "due:" keyword
  text = text.replace(/\bdue:\s*/gi, '').trim();

  // Clean extra spaces
  const cleanTitle = text.replace(/\s+/g, ' ').trim();

  return {
    cleanTitle: cleanTitle || raw.trim(),
    tags,
    priority,
    dueDate,
  };
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const vaultTree = useVaultStore((state) => state.vaultTree);
  const activeFile = useVaultStore((state) => state.activeFile);
  const storeAddTask = useVaultStore((state) => state.addTask);
  const refreshActiveFile = useVaultStore((state) => state.refreshActiveFile);

  const [inputVal, setInputVal] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const files = useMemo(() => extractAllMarkdownFiles(vaultTree), [vaultTree]);

  // Set default selected file on open or when files change
  useEffect(() => {
    if (activeFile) {
      setSelectedFile(activeFile);
    } else {
      const inboxFile = files.find((f) => f.name.toLowerCase().includes('inbox') || f.path.toLowerCase().endsWith('inbox.md'));
      if (inboxFile) {
        setSelectedFile(inboxFile.path);
      } else if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].path);
      }
    }
  }, [activeFile, files]);

  // Focus input automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputVal('');
      setCaptureType('task');
      if (activeFile) {
        setSelectedFile(activeFile);
      } else {
        const inboxFile = files.find((f) => f.name.toLowerCase().includes('inbox') || f.path.toLowerCase().endsWith('inbox.md'));
        if (inboxFile) {
          setSelectedFile(inboxFile.path);
        } else if (files.length > 0) {
          setSelectedFile(files[0].path);
        }
      }
      inputRef.current?.focus();
    }
  }, [isOpen, activeFile, files]);

  // Keyboard shortcut listener for Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const parsed = parseNaturalLanguageInput(inputVal);

  const handleSave = async () => {
    if (!inputVal.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetFilePath = selectedFile || activeFile || (files[0] ? files[0].path : '');

      const payload: CapturePayload = {
        type: captureType,
        title: parsed.cleanTitle,
        tags: parsed.tags.length > 0 ? parsed.tags : (captureType === 'note' ? undefined : []),
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        targetFile: targetFilePath,
        content: captureType === 'note' ? inputVal.trim() : undefined,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        // Fallback default save behavior into file
        if (captureType === 'task') {
          const newTask: NewTaskInput = {
            title: parsed.cleanTitle,
            tags: parsed.tags,
            priority: parsed.priority,
            dueDate: parsed.dueDate,
            status: 'todo',
          };
          if (targetFilePath === activeFile) {
            await storeAddTask(newTask);
          } else if (targetFilePath) {
            // Write directly to file
            const content = await ipc.readFile(targetFilePath);
            const updated = addTaskToDocument(content, newTask);
            await ipc.writeFileAtomic(targetFilePath, updated);
          }
        } else {
          // Quick note: append to target document
          if (targetFilePath) {
            const currentContent = await ipc.readFile(targetFilePath);
            const noteBlock = `\n\n### Note (${new Date().toLocaleString()})\n${inputVal.trim()}\n`;
            await ipc.writeFileAtomic(targetFilePath, currentContent + noteBlock);
            if (targetFilePath === activeFile) {
              await refreshActiveFile();
            }
          }
        }
      }

      setInputVal('');
      onClose();
    } catch (err) {
      console.error('Failed to save quick capture item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Quick Capture"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-28 px-4"
    >
      {/* Frosted Backdrop Blur */}
      <div
        data-testid="quick-capture-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      />

      {/* Floating Spotlight Card */}
      <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sand-200/80 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col divide-y divide-sand-200/60">
        
        {/* Top Control Bar: Type Selector & Folder Destination & Close */}
        <div className="flex items-center justify-between px-4 py-3 bg-sand-50/50">
          {/* Type Selector (Task | Quick Note) */}
          <div className="flex items-center bg-sand-200/70 p-0.5 rounded-lg">
            <button
              type="button"
              data-active={captureType === 'task'}
              onClick={() => setCaptureType('task')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                captureType === 'task'
                  ? 'bg-white text-forest-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-forest-600" />
              Task
            </button>
            <button
              type="button"
              data-active={captureType === 'note'}
              onClick={() => setCaptureType('note')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                captureType === 'note'
                  ? 'bg-white text-forest-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Quick Note
            </button>
          </div>

          {/* Right side: Destination selector & close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-sand-100 px-2.5 py-1 rounded-lg border border-sand-200/60 text-xs text-slate-600">
              <Folder className="w-3.5 h-3.5 text-forest-600 shrink-0" />
              <select
                aria-label="Destination"
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {files.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
                {files.length === 0 && (
                  <option value="">(No files in vault)</option>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-sand-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spotlight Main Input */}
        <div className="p-4 sm:p-5">
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              captureType === 'task'
                ? "What's on your mind? (e.g. Call Alice #sales @high due:2026-09-01)"
                : "What's on your mind? Write a quick note..."
            }
            className="w-full text-base sm:text-lg text-slate-900 placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 leading-relaxed"
          />

          {/* Parsed Metadata Badges & Live Feedback Preview */}
          {(parsed.tags.length > 0 || parsed.priority || parsed.dueDate) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-sand-100">
              {parsed.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-forest-50 text-forest-700 border border-forest-200/60"
                >
                  <Tag className="w-3 h-3 text-forest-500" />
                  #{tag}
                </span>
              ))}

              {parsed.priority && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    parsed.priority === 'high'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      : parsed.priority === 'medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  {parsed.priority.toUpperCase()}
                </span>
              )}

              {parsed.dueDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
                  <Calendar className="w-3 h-3 text-sky-500" />
                  {parsed.dueDate}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Keyboard Hints & Save Action Button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-sand-50/60 text-slate-500 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-sand-200 rounded text-[10px] font-semibold text-slate-600 shadow-2xs">
                ↵ Enter
              </kbd>
              Save
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-sand-200 rounded text-[10px] font-semibold text-slate-600 shadow-2xs">
                Esc
              </kbd>
              Cancel
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!inputVal.trim() || isSubmitting}
            aria-label="Save capture"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-40 disabled:hover:bg-forest-700 text-white rounded-lg font-medium text-xs shadow-sm transition-all"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            Save
          </button>
        </div>

      </div>
    </div>
  );
};

export default QuickCaptureModal;
