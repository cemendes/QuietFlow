import React, { useMemo } from 'react';
import { FileText, Folder } from 'lucide-react';
import { useVaultStore } from '../../store';
import type { VaultNode } from '../../store/types';
import { formatDateName, useTranslation } from '../../i18n';
import { baseName } from '../../utils/paths';
import { sectionSubtree } from '../../core/vault/sections';
import { HomeCard } from '../common/HomeCard';

interface NoteEntry {
  name: string;
  path: string;
  folder: string;
}

/** Collects every note under `node`, labelling each with its parent folder (never the section root). */
function collectNotes(node: VaultNode, rootPath: string, parentLabel = ''): NoteEntry[] {
  if (!node.isDirectory) {
    if (!node.name.endsWith('.md')) return [];
    return [{ name: node.name.replace(/\.md$/, ''), path: node.path, folder: parentLabel }];
  }
  const label = node.path === rootPath ? '' : node.name;
  return (node.children ?? []).flatMap((child) => collectNotes(child, rootPath, label));
}

export function findNode(node: VaultNode, path: string): VaultNode | null {
  if (node.path === path) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

/** Notes section landing page: the notes of the selected folder (or of all of Anotações/). */
export const NotesHome: React.FC = () => {
  const { t, language } = useTranslation();
  const vaultTree = useVaultStore((state) => state.vaultTree);
  const activeFolder = useVaultStore((state) => state.activeFolder);
  const openNote = useVaultStore((state) => state.openNote);
  const deleteEntry = useVaultStore((state) => state.deleteEntry);

  // Vaults without an Anotações/ folder (e.g. read-only ones) fall back to the whole vault.
  const sectionNode = useMemo(() => sectionSubtree(vaultTree, 'notes') ?? vaultTree, [vaultTree]);

  const scopeNode = useMemo(() => {
    if (!sectionNode) return null;
    return activeFolder ? findNode(sectionNode, activeFolder) ?? sectionNode : sectionNode;
  }, [sectionNode, activeFolder]);

  const notes = useMemo(
    () => (scopeNode && sectionNode ? collectNotes(scopeNode, sectionNode.path) : []),
    [scopeNode, sectionNode],
  );

  const title =
    scopeNode && scopeNode !== sectionNode ? baseName(scopeNode.path) : t('notes.allNotes');

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
              return (
                <HomeCard
                  key={note.path}
                  title={displayName}
                  onOpen={() => openNote(note.path)}
                  onDelete={() => deleteEntry(note.path)}
                  deleteLabel={t('notes.deleteNote', { name: displayName })}
                  confirmText={t('notes.deleteConfirm')}
                  testIds={{ card: 'vault-note-card', delete: 'delete-note-btn', confirmDelete: 'confirm-delete-note-btn' }}
                >
                  {note.folder && (
                    <span className="flex items-center gap-1 text-[11px] text-stone-400 truncate">
                      <Folder className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{note.folder}</span>
                    </span>
                  )}
                </HomeCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotesHome;
