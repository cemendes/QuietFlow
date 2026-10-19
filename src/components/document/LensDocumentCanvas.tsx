import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Tag,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { useVaultStore } from '../../store/vaultStore';
import { resolveFolderIcon } from '../../services/logoService';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { baseName } from '../../utils/paths';

export const LensDocumentCanvas: React.FC = () => {
  const activeFile = useVaultStore((state) => state.activeFile);
  const activeDocument = useVaultStore((state) => state.activeDocument);
  const saveDocumentProse = useVaultStore((state) => state.saveDocumentProse);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const logoConfig = useVaultStore((state) => state.logoConfig);
  const getStoreFolderIcon = useVaultStore((state) => state.getFolderIcon);

  const [localProse, setLocalProse] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedFileRef = useRef<string | null>(null);

  // Sync active document body into local edit state only on file transition
  useEffect(() => {
    if (activeDocument && activeFile && activeDocument.filePath === activeFile && lastLoadedFileRef.current !== activeFile) {
      lastLoadedFileRef.current = activeFile;
      setLocalProse(activeDocument.body || '');
    }
  }, [activeFile, activeDocument]);

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

  const folderPath = typeof activeFile === 'string' && /[\\/]/.test(activeFile)
    ? activeFile.slice(0, Math.max(activeFile.lastIndexOf('/'), activeFile.lastIndexOf('\\')))
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

  const fileName = baseName(String(activeFile)) || String(activeFile);
  const cleanFileName = fileName.replace(/\.md$/, '');
  // The vault root is an implementation detail: only real folders are shown.
  const folderName = folderPath && folderPath !== vaultPath ? baseName(folderPath) : '';

  const rawTitle = activeDocument.frontmatter?.title;
  const isDateOrTimestamp =
    (rawTitle as unknown) instanceof Date ||
    (typeof rawTitle === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawTitle.trim()));

  const headingMatch = typeof activeDocument.rawContent === 'string' ? activeDocument.rawContent.match(/^#\s+(.+)$/m) : null;
  const firstHeading = headingMatch ? headingMatch[1].trim() : null;

  const frontmatterTitle =
    (!isDateOrTimestamp && typeof rawTitle === 'string' && rawTitle.trim().length > 0)
      ? rawTitle.trim()
      : firstHeading || cleanFileName;
  const rawTags = activeDocument.frontmatter?.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === 'string'
    ? [rawTags]
    : [];

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
            <span className="text-slate-800 font-semibold truncate">{cleanFileName}</span>
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

      </div>

      {/* Main Fluid Canvas Area */}
      <div className="w-full flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-h-0">
        {/* NOTES ONLY MODE: Viewport-Filling Canvas */}
        {(
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
