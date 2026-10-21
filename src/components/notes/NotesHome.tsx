import React, { useMemo, useState } from 'react';
import { FileText, Folder, Trash2 } from 'lucide-react';
import { useVaultStore } from '../../store';
import type { VaultNode } from '../../store/types';
import { formatDateName, useTranslation } from '../../i18n';
import { baseName } from '../../utils/paths';

interface NoteEntry {
  name: string;
  path: string;
  folder: string;
}

/** Collects every note under `node`, labelling each with its parent folder (never the vault root). */
function collectNotes(node: VaultNode, vaultPath: string | null, parentLabel = ''): NoteEntry[] {
  if (!node.isDirectory) {
    if (!node.name.endsWith('.md')) return [];
    return [{ name: node.name.replace(/\.md$/, ''), path: node.path, folder: parentLabel }];
  }
  const label = node.path === vaultPath ? '' : node.name;
  return (node.children ?? []).flatMap((child) => collectNotes(child, vaultPath, label));
}

function findNode(node: VaultNode, path: string): VaultNode | null {
  if (node.path === path) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

/** Notes section landing page: the notes of the selected folder (or of the whole vault). */
export const NotesHome: React.FC = () => {
  const { t, language } = useTranslation();
  const vaultTree = useVaultStore((state) => state.vaultTree);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const activeFolder = useVaultStore((state) => state.activeFolder);
  const openNote = useVaultStore((state) => state.openNote);
  const deleteEntry = useVaultStore((state) => state.deleteEntry);
  // Path of the note whose trash icon was clicked and is waiting for confirmation.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const scopeNode = useMemo(() => {
    if (!vaultTree) return null;
    return activeFolder ? findNode(vaultTree, activeFolder) ?? vaultTree : vaultTree;
  }, [vaultTree, activeFolder]);

  const notes = useMemo(
    () => (scopeNode ? collectNotes(scopeNode, vaultPath) : []),
    [scopeNode, vaultPath],
  );

  const title =
    scopeNode && scopeNode.path !== vaultPath ? baseName(scopeNode.path) : t('notes.allNotes');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" data-testid="notes-home">
      <header className="px-6 pt-8 pb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800">{title}</h1>
        <p className="text-xs text-stone-500 mt-1">{t('notes.count', { count: notes.length })}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-6">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 border-2 border-dashed border-sand-200 rounded-2xl bg-white/40">
            <FileText className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">{t('notes.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="vault-notes-grid">
            {notes.map((note) => {
              const displayName = formatDateName(note.name, language);
              const isConfirming = confirmingDelete === note.path;
              return (
                <div
                  key={note.path}
                  data-testid="vault-note-card"
                  className={`relative flex flex-col p-3.5 bg-white border rounded-xl transition-all group ${
                    isConfirming
                      ? 'border-terracotta-500'
                      : 'border-sand-200 hover:border-forest-500 hover:shadow-xs'
                  }`}
                >
                  {isConfirming ? (
                    <div className="flex items-center justify-between gap-2 w-full min-h-[20px]">
                      <span className="text-sm text-stone-700 truncate">{t('notes.deleteConfirm')}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(null)}
                          className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-sand-100 rounded-md cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          data-testid="confirm-delete-note-btn"
                          onClick={async () => {
                            setConfirmingDelete(null);
                            await deleteEntry(note.path);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-terracotta-600 hover:bg-terracotta-700 rounded-md cursor-pointer"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openNote(note.path)}
                        className="flex flex-col text-left w-full pr-14 cursor-pointer focus:outline-none after:absolute after:inset-0 after:rounded-xl"
                      >
                        <span className="font-semibold text-stone-800 group-hover:text-forest-700 text-sm truncate w-full mb-1">
                          {displayName}
                        </span>
                        {note.folder && (
                          <span className="flex items-center gap-1 text-[11px] text-stone-400 truncate">
                            <Folder className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{note.folder}</span>
                          </span>
                        )}
                      </button>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={t('notes.deleteNote', { name: displayName })}
                          title={t('common.delete')}
                          data-testid="delete-note-btn"
                          onClick={() => setConfirmingDelete(note.path)}
                          className="relative z-10 p-1 -m-1 rounded-md text-stone-400 hover:text-terracotta-600 hover:bg-sand-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <FileText className="w-4 h-4 text-stone-400 group-hover:text-forest-600 shrink-0" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotesHome;
