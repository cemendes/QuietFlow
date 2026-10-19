/** Splits on both `/` and `\` so Windows paths from the native shell behave like mock-vault paths. */
const SEP = /[\\/]+/;

/** Last segment of a path: the file or folder name, never the location. */
export function baseName(path: string | null | undefined): string {
  if (!path) return '';
  const parts = path.split(SEP).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** Name of the folder that directly contains `path` (empty when none). */
export function parentName(path: string | null | undefined): string {
  if (!path) return '';
  const parts = path.split(SEP).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : '';
}
