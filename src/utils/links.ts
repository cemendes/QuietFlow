import { isTauriEnvironment } from '../store/ipc';

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BARE_EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

/**
 * Turns what the user typed into a usable link target. A bare domain like `example.com` would
 * otherwise become a relative (broken) link, so it gets `https://`. Returns null for empty input
 * and for script URLs.
 */
export function normalizeLinkUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(javascript|data|vbscript):/i.test(url)) return null;
  if (HAS_SCHEME.test(url) || url.startsWith('#') || url.startsWith('/')) return url;
  if (BARE_EMAIL.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/** Opens a link in the system browser (desktop app) or a new tab (web dev server). */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return;
    } catch {
      // Fall back to the webview below
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
