import { useVaultStore } from '../store';
import { sectionOfPath } from '../core/vault/sections';

/**
 * Opens the file a task lives in, in its own section: a list under Tarefas/ opens as a task
 * list, a file under Anotações/ as a note. Tasks never jump into the Notes section by accident.
 */
export function openTaskSource(filePath: string): Promise<void> {
  const store = useVaultStore.getState();
  return sectionOfPath(filePath, store.vaultPath) === 'notes'
    ? store.openNote(filePath)
    : store.openTaskList(filePath);
}
