/** Splits on both `/` and `\` so Windows paths from the native shell behave like mock-vault paths. */
const SEP = /[\\/]+/;

/** Last segment of a path: the file or folder name, never the location. */
export function baseName(path: string | null | undefined): string {
  if (!path) return '';
  const parts = path.split(SEP).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/**
 * Full path of the folder containing `path`, cut at the last `/` or `\` (whichever comes last).
 * Native Windows paths can mix both (`C:\Users\me/Vault\note.md`), so never look for just one.
 */
export function dirName(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(0, i) : '';
}

/** The separator `path` uses right before its last segment (`\` or `/`), to keep new sibling paths consistent. */
export function lastSeparator(path: string): string {
  return path.lastIndexOf('\\') > path.lastIndexOf('/') ? '\\' : '/';
}

/** Name of the folder that directly contains `path` (empty when none). */
export function parentName(path: string | null | undefined): string {
  if (!path) return '';
  const parts = path.split(SEP).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : '';
}
