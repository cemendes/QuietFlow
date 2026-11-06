import type { VaultNode } from '../../store/types';
import { setFrontmatterTitle } from '../markdown/frontmatterTitle';
import { parseMarkdownDocument } from '../markdown';
import {
  LEGACY_ROOT_TASK_LIST_FILE,
  ROOT_TASK_LIST_FILE,
  isRootTaskListNode,
  sectionRootPath,
  sectionSubtree,
} from './sections';
import { lastSeparator } from '../../utils/paths';

/** The slice of the IPC layer this needs (keeps it testable without the store). */
export interface RootTaskListIpc {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  moveEntry: (from: string, to: string) => Promise<void>;
}

const ROOT_TITLE = ROOT_TASK_LIST_FILE.replace(/\.md$/, '');
const LEGACY_TITLE = LEGACY_ROOT_TASK_LIST_FILE.replace(/\.md$/, '');

/**
 * Makes sure Tarefas/ has its root task list, Tarefas.md. A vault from before still has it as
 * Inbox.md: that file is renamed (tasks untouched) and its "Inbox" title / heading become "Tarefas".
 * Returns true when anything on disk changed, so the caller rescans the tree.
 */
export async function ensureRootTaskList(
  tree: VaultNode | null,
  vaultPath: string,
  ipc: RootTaskListIpc,
): Promise<boolean> {
  const tasksNode = sectionSubtree(tree, 'tasks');
  const children = tasksNode?.children ?? [];
  if (children.some(isRootTaskListNode)) return false;

  const tasksRoot = sectionRootPath(tree, vaultPath, 'tasks');
  const legacy = children.find(
    (c) => !c.isDirectory && c.name.toLowerCase() === LEGACY_ROOT_TASK_LIST_FILE.toLowerCase(),
  );
  // Keep the separator the scanned (native) paths use: `\` on Windows, `/` elsewhere
  const sep = legacy ? lastSeparator(legacy.path) : tasksNode ? lastSeparator(tasksNode.path) : '/';
  const target = `${tasksRoot}${sep}${ROOT_TASK_LIST_FILE}`;

  if (!legacy) {
    await ipc.writeFile(target, `---\ntitle: ${ROOT_TITLE}\n---\n\n`);
    return true;
  }

  await ipc.moveEntry(legacy.path, target);
  const content = await ipc.readFile(target);
  // Only the old name changes; the tasks and anything else in the file stay byte-for-byte
  let renamed = content.replace(new RegExp(`^#\\s+${LEGACY_TITLE}[ \\t]*$`, 'm'), `# ${ROOT_TITLE}`);
  if (String(parseMarkdownDocument(renamed).frontmatter?.title ?? '').trim() === LEGACY_TITLE) {
    renamed = setFrontmatterTitle(renamed, ROOT_TITLE);
  }
  if (renamed !== content) await ipc.writeFile(target, renamed);
  return true;
}
