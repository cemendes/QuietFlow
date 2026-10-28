import type { AppSection, VaultNode } from '../../store/types';

/**
 * Folder inside the vault that holds each section's files. Fixed names (not translated) so
 * switching the UI language never hides a section's files.
 */
export const SECTION_FOLDERS: Record<AppSection, string> = {
  tasks: 'Tarefas',
  notes: 'Anotações',
};

/** Forward slashes, NFC accents and no trailing separator, so native and mock paths compare equal. */
function canonical(path: string): string {
  return path.normalize('NFC').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function isSectionFolderName(name: string, section: AppSection): boolean {
  return name.normalize('NFC') === SECTION_FOLDERS[section];
}

/** The section's folder node among the vault root children, or null when it does not exist yet. */
export function sectionSubtree(tree: VaultNode | null, section: AppSection): VaultNode | null {
  return tree?.children?.find((c) => c.isDirectory && isSectionFolderName(c.name, section)) ?? null;
}

/** Path of the section's folder: the scanned (native) path when it exists, else joined onto the vault. */
export function sectionRootPath(tree: VaultNode | null, vaultPath: string, section: AppSection): string {
  return sectionSubtree(tree, section)?.path ?? `${vaultPath}/${SECTION_FOLDERS[section]}`;
}

/** Which section `path` lives in, or null when it is outside both section folders. */
export function sectionOfPath(path: string | null | undefined, vaultPath: string | null): AppSection | null {
  if (!path || !vaultPath) return null;
  const root = canonical(vaultPath);
  const target = canonical(path);
  if (!target.startsWith(`${root}/`)) return null;
  const first = target.slice(root.length + 1).split('/')[0];
  if (isSectionFolderName(first, 'tasks')) return 'tasks';
  if (isSectionFolderName(first, 'notes')) return 'notes';
  return null;
}
