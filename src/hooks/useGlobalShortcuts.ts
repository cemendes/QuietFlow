import { useEffect } from 'react';
import { isTauriEnvironment } from '../store/ipc';

export interface UseGlobalShortcutsOptions {
  onToggleCapture?: () => void;
  shortcut?: string; // Default: 'Option+Shift+Space' or 'Alt+Shift+Space'
}

export function useGlobalShortcuts({
  onToggleCapture,
  shortcut = 'Option+Shift+Space',
}: UseGlobalShortcutsOptions = {}) {
  useEffect(() => {
    let unregisterTauri: (() => void) | null = null;

    // 1. In-app hotkeys: Cmd+K / Cmd+N / Option+Shift+Space browser event listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCapture?.();
        return;
      }

      // Alt/Option + Shift + Space
      if (e.altKey && e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        onToggleCapture?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 2. Tauri OS-level Global Shortcut registration
    const registerTauriGlobalShortcut = async () => {
      if (!isTauriEnvironment()) return;

      try {
        const { register, isRegistered, unregister } = await import(
          '@tauri-apps/plugin-global-shortcut'
        );

        // Standardize shortcut name for Tauri (e.g. Option+Shift+Space or Alt+Shift+Space)
        const tauriShortcut = shortcut;

        const registered = await isRegistered(tauriShortcut);
        if (!registered) {
          await register(tauriShortcut, (event) => {
            if (event.state === 'Pressed') {
              onToggleCapture?.();
            }
          });
        }

        unregisterTauri = () => {
          unregister(tauriShortcut).catch((err) =>
            console.error('Failed to unregister Tauri global shortcut:', err)
          );
        };
      } catch (err) {
        console.warn('Tauri global shortcut registration skipped or unsupported:', err);
      }
    };

    registerTauriGlobalShortcut();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (unregisterTauri) {
        unregisterTauri();
      }
    };
  }, [onToggleCapture, shortcut]);
}

export default useGlobalShortcuts;
