import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  Columns,
  Plus,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { useVaultStore } from '../../store/vaultStore';
import { LensViewMode, TaskItem } from '../../store/types';
import { resolveFolderIcon } from '../../services/logoService';
import { DocumentTaskCard } from './DocumentTaskCard';
import { MarkdownEditor } from '../editor/MarkdownEditor';

export const LensDocumentCanvas: React.FC = () => {
  const activeFile = useVaultStore((state) => state.activeFile);
  const activeDocument = useVaultStore((state) => state.activeDocument);
  const lensViewMode = useVaultStore((state) => state.lensViewMode);
  const setLensViewMode = useVaultStore((state) => state.setLensViewMode);
  const toggleTask = useVaultStore((state) => state.toggleTask);
  const addTask = useVaultStore((state) => state.addTask);
  const saveDocumentProse = useVaultStore((state) => state.saveDocumentProse);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const logoConfig = useVaultStore((state) => state.logoConfig);
  const getStoreFolderIcon = useVaultStore((state) => state.getFolderIcon);

  const documentViewState = useVaultStore((state) => state.documentViewState);
  const [localProse, setLocalProse] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [isTasksCollapsed, setIsTasksCollapsed] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedFileRef = useRef<string | null>(null);

  // Sync active document body into local edit state only on file transition
  useEffect(() => {
    if (activeDocument && activeFile && activeDocument.filePath === activeFile && lastLoadedFileRef.current !== activeFile) {
      lastLoadedFileRef.current = activeFile;
      setLocalProse(activeDocument.body || '');
    }
  }, [activeFile, activeDocument]);

  // Compute active lens mode reactively (with auto-adaptation for 0-task / 0-prose files)
  const explicitMode = activeFile ? documentViewState[activeFile]?.lensMode : null;
  const taskCount = activeDocument?.tasks?.length || 0;
  const hasProse = (activeDocument?.body || '').trim().length > 0;

  const currentLensMode: LensViewMode = explicitMode || (
    taskCount === 0 && hasProse ? 'notes' : taskCount > 0 && !hasProse ? 'tasks' : lensViewMode || 'split'
  );

  // Debounced auto-save for prose
  const handleProseChange = (text: string) => {
    setLocalProse(text);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (activeFile) {
        saveDocumentProse(activeFile, text);
      }
    }, 500);
  };

  // Synchronous flush on blur / unmount
  const handleProseBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (activeFile && localProse !== (activeDocument?.body || '')) {
      saveDocumentProse(activeFile, localProse);
    }
  }, [activeFile, localProse, activeDocument?.body, saveDocumentProse]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const isLoading = useVaultStore((state) => state.isLoading);
  const error = useVaultStore((state) => state.error);

  const folderPath = typeof activeFile === 'string' && activeFile.includes('/')
    ? activeFile.slice(0, activeFile.lastIndexOf('/'))
    : '';

  const [folderIcon, setFolderIcon] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (folderPath) {
      const sync = getStoreFolderIcon ? getStoreFolderIcon(folderPath) : null;
      if (sync) {
        setFolderIcon(sync);
      }
      if (vaultPath) {
        resolveFolderIcon(vaultPath, folderPath, logoConfig).then((resolved) => {
          if (isMounted && resolved) {
            setFolderIcon(resolved);
          }
        });
      }
    } else {
      setFolderIcon(null);
    }
    return () => {
      isMounted = false;
    };
  }, [folderPath, vaultPath, logoConfig, getStoreFolderIcon]);

  if (!activeDocument || !activeFile) {
    return (
      <div
        data-tauri-drag-region
        data-testid="document-empty-canvas"
        className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-sand-50/50 select-none"
      >
        {isLoading ? (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
            <h3 className="text-sm font-medium text-slate-600">Loading document...</h3>
          </>
        ) : error ? (
          <>
            <AlertTriangle className="w-12 h-12 stroke-[1.5] mb-3 text-amber-500" />
            <h3 className="text-base font-semibold text-slate-800">Unable to load document</h3>
            <p className="text-xs mt-1 text-rose-600 max-w-md font-mono bg-rose-50 p-2 rounded-lg border border-rose-200">
              {error}
            </p>
          </>
        ) : (
          <>
            <FileText className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
            <h3 className="text-base font-medium text-slate-700">No document selected</h3>
            <p className="text-sm mt-1 text-slate-500">
              Select a customer note from the sidebar or press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-xs font-semibold">Cmd+O</kbd> to search.
            </p>
          </>
        )}
      </div>
    );
  }

  const tasks: TaskItem[] = (Array.isArray(activeDocument.tasks) ? activeDocument.tasks : []).filter(
    (t) => t && typeof t.title === 'string' && t.title.trim().length > 0
  );
  const completedTasks = tasks.filter((t) => t && t.status === 'done');
  const pendingTasks = tasks.filter((t) => t && t.status !== 'done');
  const fileName = typeof activeFile === 'string' && activeFile.includes('/') ? activeFile.split('/').pop() || activeFile : String(activeFile);
  const folderName = folderPath.includes('/') ? folderPath.split('/').pop() || folderPath : folderPath;

  const frontmatterTitle = String(activeDocument.frontmatter?.title || fileName.replace(/\.md$/, ''));
  const rawTags = activeDocument.frontmatter?.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === 'string'
    ? [rawTags]
    : [];

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      status: 'todo',
    });
    setNewTaskTitle('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-sand-50/30 overflow-hidden min-h-0">
      {/* Top Document Header Bar */}
      <div
        data-tauri-drag-region
        data-testid="document-header"
        className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 select-none shrink-0"
      >
        {/* Breadcrumb & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            {folderIcon && (
              (folderIcon.startsWith('data:') || folderIcon.startsWith('http')) ? (
                <img
                  src={folderIcon}
                  alt={folderName || 'Folder'}
                  className="w-4 h-4 rounded object-contain shrink-0"
                  onError={() => setFolderIcon(null)}
                />
              ) : !folderIcon.includes('.') && !folderIcon.includes('/') ? (
                <span className="text-sm leading-none shrink-0 select-none">{folderIcon}</span>
              ) : null
            )}
            {folderName && (
              <>
                <span className="truncate">{folderName}</span>
                <span>/</span>
              </>
            )}
            <span className="text-slate-800 font-semibold truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h1 className="text-base font-bold text-slate-900 truncate">{frontmatterTitle}</h1>
            {tags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 3-Way Lens Toggle Pills */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            data-testid="lens-split-btn"
            onClick={() => setLensViewMode('split', activeFile)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentLensMode === 'split'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>

          <button
            type="button"
            data-testid="lens-tasks-only-btn"
            onClick={() => setLensViewMode('tasks', activeFile)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentLensMode === 'tasks'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasks Only</span>
            {pendingTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {pendingTasks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="lens-notes-only-btn"
            onClick={() => setLensViewMode('notes', activeFile)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentLensMode === 'notes'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Notes Only</span>
          </button>
        </div>
      </div>

      {/* Main Fluid Canvas Area */}
      <div className="w-full flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-h-0">
        {/* SPLIT VIEW MODE: Notes (2/3 Left) and Action Items (1/3 Right) */}
        {currentLensMode === 'split' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 h-full">
            {/* Left Column: Documentation & Notes (2/3 width) */}
            <section
              data-testid="bottom-notes-zone"
              className="w-full lg:w-2/3 flex-1 flex flex-col min-h-0 h-full space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
                <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Documentation & Notes
                </h2>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>{activeDocument.wordCount || 0} words</span>
                  <span>•</span>
                  <span>{activeDocument.readingTimeMinutes || 1} min read</span>
                </div>
              </div>

              <div onBlur={handleProseBlur} className="flex-1 flex flex-col min-h-0 h-full">
                <MarkdownEditor
                  key={activeFile}
                  value={localProse}
                  onChange={handleProseChange}
                  placeholder="Write meeting notes, architecture decisions, or press Cmd+Enter to hoist a task..."
                  className="flex-1 min-h-[350px] h-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs focus-within:border-emerald-400"
                />
              </div>
            </section>

            {/* Right Column: Action Items (1/3 width) */}
            <section
              data-testid="top-tasks-zone"
              className="w-full lg:w-1/3 flex flex-col min-h-0 space-y-3"
            >
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
                    Action Items
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    ({pendingTasks.length} remaining, {completedTasks.length} done)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTasksCollapsed(!isTasksCollapsed)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100"
                >
                  {isTasksCollapsed ? (
                    <>
                      <span>Expand</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {!isTasksCollapsed && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {tasks.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No action items in this note. Add one below or type <code className="bg-slate-100 px-1 py-0.5 rounded">- [ ]</code> in the notes.
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <DocumentTaskCard
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onSelect={setActiveTaskId}
                        />
                      ))
                    )}
                  </div>

                  {/* Quick Task Input */}
                  <form onSubmit={handleQuickAddTask} className="pt-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-2xs">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Add an action item for this document... (Press Enter)"
                        className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none focus:outline-none"
                      />
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TASKS ONLY MODE: Full Fluid Width & Height */}
        {currentLensMode === 'tasks' && (
          <section data-testid="top-tasks-zone" className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
                  Action Items
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  ({pendingTasks.length} remaining, {completedTasks.length} done)
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {tasks.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No action items in this note. Add one below or switch to Notes view to write tasks.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <DocumentTaskCard
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onSelect={setActiveTaskId}
                    />
                  ))
                )}
              </div>

              {/* Quick Task Input */}
              <form onSubmit={handleQuickAddTask} className="pt-2 shrink-0">
                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-2xs">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add an action item for this document... (Press Enter)"
                    className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none focus:outline-none"
                  />
                </div>
              </form>
            </div>
          </section>
        )}

        {/* NOTES ONLY MODE: Viewport-Filling Canvas */}
        {currentLensMode === 'notes' && (
          <section data-testid="bottom-notes-zone" className="flex-1 flex flex-col min-h-0 h-full space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Documentation & Notes
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-3">
                <span>{activeDocument.wordCount || 0} words</span>
                <span>•</span>
                <span>{activeDocument.readingTimeMinutes || 1} min read</span>
              </div>
            </div>

            <div onBlur={handleProseBlur} className="flex-1 flex flex-col min-h-0 h-full">
              <MarkdownEditor
                key={activeFile}
                value={localProse}
                onChange={handleProseChange}
                placeholder="Write meeting notes, architecture decisions, or press Cmd+Enter to hoist a task..."
                className="flex-1 min-h-[350px] h-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs focus-within:border-emerald-400"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
