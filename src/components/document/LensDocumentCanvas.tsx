import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Tag,
  BookOpen,
  AlertTriangle,
  Check,
  Pencil,
  Save,
} from 'lucide-react';
import { useVaultStore } from '../../store/vaultStore';
import { resolveFolderIcon } from '../../services/logoService';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { baseName } from '../../utils/paths';
import { useTranslation } from '../../i18n';
import type { VaultDocument } from '../../core/markdown/types';

/** Title shown for a note: frontmatter title, else first `# heading`, else the file name. */
function getNoteTitle(doc: VaultDocument, filePath: string): string {
  const cleanFileName = (baseName(filePath) || filePath).replace(/\.md$/, '');
  const rawTitle = doc.frontmatter?.title;
  const isDateOrTimestamp =
    (rawTitle as unknown) instanceof Date ||
    (typeof rawTitle === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawTitle.trim()));
  if (!isDateOrTimestamp && typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
    return rawTitle.trim();
  }
  const headingMatch = typeof doc.rawContent === 'string' ? doc.rawContent.match(/^#\s+(.+)$/m) : null;
  return headingMatch ? headingMatch[1].trim() : cleanFileName;
}

export const LensDocumentCanvas: React.FC = () => {
  const activeFile = useVaultStore((state) => state.activeFile);
  const activeDocument = useVaultStore((state) => state.activeDocument);
  const saveDocumentProse = useVaultStore((state) => state.saveDocumentProse);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const logoConfig = useVaultStore((state) => state.logoConfig);
  const getStoreFolderIcon = useVaultStore((state) => state.getFolderIcon);
  const renameNote = useVaultStore((state) => state.renameNote);
  const { t } = useTranslation();

  const [localProse, setLocalProse] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedFileRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [justSaved, setJustSaved] = useState(false);
  // Notes open for reading; editing is an explicit choice (except a brand-new note)
  const [isEditing, setIsEditing] = useState(false);
  // A title rename moves the file (new activeFile) but must not drop out of edit mode
  const keepEditingOnSwitchRef = useRef(false);
  const justSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const noteTitle = activeDocument && activeFile ? getNoteTitle(activeDocument, activeFile) : '';
  const [titleDraft, setTitleDraft] = useState(noteTitle);

  // Keep the editable title in sync when the note (or its title on disk) changes
  useEffect(() => {
    setTitleDraft(noteTitle);
  }, [noteTitle, activeFile]);

  // Each note opens in read mode; a freshly created one opens in edit mode with its title selected
  useEffect(() => {
    if (!activeDocument || activeDocument.filePath !== activeFile) return;
    if (keepEditingOnSwitchRef.current) {
      keepEditingOnSwitchRef.current = false;
      return;
    }
    const isBlankNewNote =
      !(activeDocument.body || '').trim() && noteTitle.startsWith(t('app.newNoteName'));
    setIsEditing(isBlankNewNote);
    if (isBlankNewNote) {
      // Next frame: the synced title value must be in the input before selecting it
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      });
    }
    // Only on note switch, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, activeDocument?.filePath]);

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
      if (justSavedTimeoutRef.current) {
        clearTimeout(justSavedTimeoutRef.current);
      }
    };
  }, []);

  // Explicit save: writes immediately, returns to read mode and confirms with a short "saved" state
  const handleSaveNow = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (!activeFile) return;
    await saveDocumentProse(activeFile, localProse);
    setIsEditing(false);
    setJustSaved(true);
    if (justSavedTimeoutRef.current) clearTimeout(justSavedTimeoutRef.current);
    justSavedTimeoutRef.current = setTimeout(() => setJustSaved(false), 2000);
  };

  const commitTitle = async () => {
    const next = titleDraft.trim();
    if (!activeFile || !next || next === noteTitle) {
      setTitleDraft(noteTitle);
      return;
    }
    // Flush pending prose first so the rename writes the latest body
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (localProse !== (activeDocument?.body || '')) {
      await saveDocumentProse(activeFile, localProse);
    }
    keepEditingOnSwitchRef.current = true;
    const newPath = await renameNote(activeFile, next);
    if (newPath === activeFile) keepEditingOnSwitchRef.current = false;
  };

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
            {!isEditing ? (
              <h1 data-testid="note-title" className="text-base font-bold text-slate-900 truncate">
                {noteTitle}
              </h1>
            ) : (
            <h1 className="min-w-0 flex-1">
              <input
                ref={titleInputRef}
                type="text"
                data-testid="note-title-input"
                aria-label={t('note.titleLabel')}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    // Revert first, then leave the field without committing
                    setTitleDraft(noteTitle);
                    requestAnimationFrame(() => titleInputRef.current?.blur());
                  }
                }}
                className="w-full text-base font-bold text-slate-900 bg-white rounded-md px-1 -mx-1 border border-sand-200 hover:border-sand-300 focus:border-forest-600 focus:outline-none transition-colors truncate"
              />
            </h1>
            )}
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

        <div className="flex items-center gap-3 shrink-0">
          {justSaved && (
            <span data-testid="note-saved-indicator" className="inline-flex items-center gap-1 text-xs font-medium text-forest-700">
              <Check className="w-3.5 h-3.5" />
              {t('note.saved')}
            </span>
          )}
          {!isEditing && (
            <button
              type="button"
              data-testid="edit-note-btn"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-forest-800 bg-white border border-sand-200 hover:bg-sand-100 shadow-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('editor.edit')}
            </button>
          )}
        </div>
      </div>

      {/* Main Fluid Canvas Area */}
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
        {/* NOTES ONLY MODE: Viewport-Filling Canvas */}
        {(
          <section data-testid="bottom-notes-zone" className="flex flex-col space-y-3">
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

            {!isEditing && !localProse.trim() && (
              <p data-testid="note-empty-message" className="text-sm text-slate-400 italic px-1">
                {t('editor.noNotes')}
              </p>
            )}
            <div onBlur={handleProseBlur} className={`flex flex-col ${!isEditing && !localProse.trim() ? 'hidden' : ''}`}>
              <MarkdownEditor
                key={activeFile}
                value={localProse}
                onChange={handleProseChange}
                placeholder="Write meeting notes, architecture decisions, or press Cmd+Enter to hoist a task..."
                autoGrow
                readOnly={!isEditing}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs focus-within:border-emerald-400"
                footer={
                  isEditing && (
                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      data-testid="save-note-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleSaveNow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600 bg-forest-700 text-white hover:bg-forest-800"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {t('note.save')}
                    </button>
                  </div>
                  )
                }
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
