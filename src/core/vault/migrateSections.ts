import type { VaultNode } from '../../store/types';
import { parseMarkdownDocument } from '../markdown';
import { lastSeparator } from '../../utils/paths';
import { sectionRootPath, sectionSubtree } from './sections';

export interface SectionMove {
  from: string;
  to: string;
}

/** The slice of the IPC layer the migration needs (keeps it testable without the store). */
export interface MigrationIpc {
  readFile: (path: string) => Promise<string>;
  createDirectory: (path: string) => Promise<void>;
  moveEntry: (from: string, to: string) => Promise<void>;
}

const isMarkdown = (node: VaultNode) => !node.isDirectory && node.name.toLowerCase().endsWith('.md');

async function containsTasks(node: VaultNode, readFile: MigrationIpc['readFile']): Promise<boolean> {
  if (isMarkdown(node)) {
    try {
      return parseMarkdownDocument(await readFile(node.path)).tasks.length > 0;
    } catch {
      return false;
    }
  }
  for (const child of node.children ?? []) {
    if (await containsTasks(child, readFile)) return true;
  }
  return false;
}

const hasMarkdown = (node: VaultNode): boolean =>
  isMarkdown(node) || (node.isDirectory && (node.children ?? []).some(hasMarkdown));

/**
 * One-time split of a pre-sections vault: every root-level `.md` file or folder goes to `Tarefas/`
 * when it holds at least one checklist task, else to `Anotações/`. Folders move whole. Returns no
 * moves once either section folder exists, so it only ever runs on the first launch after upgrade.
 */
export async function planSectionMigration(
  tree: VaultNode,
  vaultPath: string,
  readFile: MigrationIpc['readFile'],
): Promise<SectionMove[]> {
  if (sectionSubtree(tree, 'tasks') || sectionSubtree(tree, 'notes')) return [];
  const moves: SectionMove[] = [];
  for (const entry of tree.children ?? []) {
    if (entry.name.startsWith('.') || !hasMarkdown(entry)) continue;
    const section = (await containsTasks(entry, readFile)) ? 'tasks' : 'notes';
    const root = sectionRootPath(tree, vaultPath, section);
    moves.push({ from: entry.path, to: `${root}${lastSeparator(entry.path)}${entry.name}` });
  }
  return moves;
}

/** Creates both section folders and applies the planned moves. Content is never rewritten. */
export async function runSectionMigration(
  tree: VaultNode,
  vaultPath: string,
  ipc: MigrationIpc,
): Promise<SectionMove[]> {
  const moves = await planSectionMigration(tree, vaultPath, ipc.readFile);
  for (const section of ['tasks', 'notes'] as const) {
    if (!sectionSubtree(tree, section)) await ipc.createDirectory(sectionRootPath(tree, vaultPath, section));
  }
  // Native renames replace an existing file on Windows, so skip any destination already taken.
  const taken = new Set<string>();
  const applied: SectionMove[] = [];
  for (const move of moves) {
    const key = move.to.normalize('NFC').toLowerCase();
    if (taken.has(key)) {
      console.warn(`QuietFlow: kept ${move.from} in place, ${move.to} is already taken`);
      continue;
    }
    taken.add(key);
    await ipc.moveEntry(move.from, move.to);
    applied.push(move);
  }
  return applied;
}
