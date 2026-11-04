import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Folder, ListChecks, Plus } from 'lucide-react';
import { useVaultStore } from '../../store';
import { ipc } from '../../store/ipc';
import type { VaultNode } from '../../store/types';
import { parseMarkdownDocument } from '../../core/markdown';
import { sectionRootPath, sectionSubtree } from '../../core/vault/sections';
import { formatDateName, useTranslation } from '../../i18n';
import { baseName } from '../../utils/paths';
import { HomeCard } from '../common/HomeCard';
import { findNode } from '../notes/NotesHome';

interface ListEntry {
  name: string;
  path: string;
  folder: string;
}

interface ListCounts {
  open: number;
  done: number;
}

const isInbox = (entry: ListEntry) => entry.name.toLowerCase() === 'inbox';

/** Every task list (`.md` file) under `node`, labelled with its parent folder (never the section root). */
function collectLists(node: VaultNode, rootPath: string, parentLabel = ''): ListEntry[] {
  if (!node.isDirectory) {
    if (!node.name.endsWith('.md')) return [];
    return [{ name: node.name.replace(/\.md$/, ''), path: node.path, folder: parentLabel }];
  }
  const label = node.path === rootPath ? '' : node.name;
  return (node.children ?? []).flatMap((child) => collectLists(child, rootPath, label));
}

/** Tasks section landing page: the task lists of the selected folder (or of all of Tarefas/). */
export const TasksHome: React.FC = () => {
  const { t, language } = useTranslation();
  const vaultTree = useVaultStore((state) => state.vaultTree);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const activeFolder = useVaultStore((state) => state.activeFolder);
  const openTaskList = useVaultStore((state) => state.openTaskList);
  const selectFolder = useVaultStore((state) => state.selectFolder);
  const createFile = useVaultStore((state) => state.createFile);
  const deleteEntry = useVaultStore((state) => state.deleteEntry);
  const contentRevision = useVaultStore((state) => state.contentRevision);
  const [counts, setCounts] = useState<Record<string, ListCounts>>({});

  const sectionNode = useMemo(() => sectionSubtree(vaultTree, 'tasks'), [vaultTree]);

  const scopeNode = useMemo(() => {
    if (!sectionNode) return null;
    return activeFolder ? findNode(sectionNode, activeFolder) ?? sectionNode : sectionNode;
  }, [sectionNode, activeFolder]);

  // Inbox is where Quick Capture lands, so it leads the grid; the rest keeps the tree order.
  const lists = useMemo(() => {
    if (!scopeNode || !sectionNode) return [];
    const all = collectLists(scopeNode, sectionNode.path);
    return [...all.filter(isInbox), ...all.filter((l) => !isInbox(l))];
  }, [scopeNode, sectionNode]);

  // Count open / done tasks per list; re-read whenever the tree changes (saves, external edits).
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      lists.map(async (list) => {
        try {
          const tasks = parseMarkdownDocument(await ipc.readFile(list.path)).tasks;
          const done = tasks.filter((task) => task.status === 'done').length;
          return [list.path, { open: tasks.length - done, done }] as const;
        } catch {
          return [list.path, { open: 0, done: 0 }] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [lists, vaultTree, contentRevision]);

  const scopePath = scopeNode?.path ?? (vaultPath ? sectionRootPath(vaultTree, vaultPath, 'tasks') : null);
  const title = scopeNode && scopeNode !== sectionNode ? baseName(scopeNode.path) : t('tasksHome.allLists');

  const handleNewList = async () => {
    if (!scopePath) return;
    const baseTitle = t('tasksHome.newListName');
    const taken = new Set((scopeNode?.children ?? []).map((c) => c.name.toLowerCase()));
    let listName = baseTitle;
    for (let n = 2; taken.has(`${listName}.md`.toLowerCase()); n++) {
      listName = `${baseTitle} ${n}`;
    }
    const filePath = `${scopePath}/${listName}.md`;
    await createFile(filePath, `---\ntitle: ${listName}\n---\n\n# ${listName}\n`);
    await openTaskList(filePath);
  };

  const displayName = (list: ListEntry) =>
    isInbox(list) ? t('tasks.inboxTitle') : formatDateName(list.name, language);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" data-testid="tasks-home">
      <header className="flex items-end justify-between gap-4 px-6 pt-8 pb-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-stone-800 truncate">{title}</h1>
          <p className="text-xs text-stone-500 mt-1">{t('tasksHome.count', { count: lists.length })}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lists.length > 0 && scopePath && (
            <button
              type="button"
              data-testid="view-all-tasks-btn"
              onClick={() => selectFolder(scopePath)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:text-forest-800 hover:bg-sand-100 border border-sand-200 transition-colors"
            >
              <ListChecks className="w-3.5 h-3.5" />
              {t('tasksHome.viewAll')}
            </button>
          )}
          <button
            type="button"
            data-testid="new-task-list-btn"
            onClick={handleNewList}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 shadow-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-forest-600"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('tasksHome.newList')}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-6">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 border-2 border-dashed border-sand-200 rounded-2xl bg-white/40">
            <CheckSquare className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">{t('tasksHome.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="task-lists-grid">
            {lists.map((list) => {
              const name = displayName(list);
              const count = counts[list.path];
              return (
                <HomeCard
                  key={list.path}
                  title={name}
                  onOpen={() => openTaskList(list.path)}
                  onDelete={() => deleteEntry(list.path)}
                  deleteLabel={t('tasksHome.deleteList', { name })}
                  confirmText={t('tasksHome.deleteConfirm')}
                  testIds={{ card: 'task-list-card', delete: 'delete-task-list-btn', confirmDelete: 'confirm-delete-task-list-btn' }}
                >
                  {list.folder && (
                    <span className="flex items-center gap-1 text-[11px] text-stone-400 truncate mb-0.5">
                      <Folder className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{list.folder}</span>
                    </span>
                  )}
                  <span className="text-[11px] text-stone-500 min-h-[16px]">
                    {count ? t('tasksHome.openDone', { open: count.open, done: count.done }) : ''}
                  </span>
                </HomeCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default TasksHome;
