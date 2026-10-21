import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVaultStore } from '../../src/store/vaultStore';

describe('Vault Store Lens & Cognitive Re-entry State', () => {
  beforeEach(() => {
    localStorage.clear();
    useVaultStore.getState().reset();
  });

  it('updates lensViewMode globally and per-document', () => {
    const store = useVaultStore.getState();
    expect(store.lensViewMode).toBe('split');

    store.setLensViewMode('tasks', 'customers/acme.md');
    expect(useVaultStore.getState().lensViewMode).toBe('tasks');

    const viewState = useVaultStore.getState().getDocumentViewState('customers/acme.md');
    expect(viewState.lensMode).toBe('tasks');
  });

  it('remembers scroll position per document for cognitive re-entry', () => {
    const store = useVaultStore.getState();
    store.setDocumentScrollPosition('customers/acme.md', 450);
    const viewState = useVaultStore.getState().getDocumentViewState('customers/acme.md');
    expect(viewState.scrollY).toBe(450);
  });

  it('persists last active file and folder in localStorage', async () => {
    localStorage.clear();
    const store = useVaultStore.getState();

    await store.selectFile('/MockVault/projects/alpha.md');
    expect(localStorage.getItem('quietflow-last-active-file')).toBe('/MockVault/projects/alpha.md');
    expect(localStorage.getItem('quietflow-last-active-folder')).toBeNull();

    await store.selectFolder('/MockVault/projects');
    expect(localStorage.getItem('quietflow-last-active-folder')).toBe('/MockVault/projects');
    expect(localStorage.getItem('quietflow-last-active-file')).toBeNull();
  });

  it('always opens on the Notes overview on loadVault, ignoring the last session location', async () => {
    const { ipc } = await import('../../src/store/ipc');
    await ipc.writeFileAtomic('/MockVault/Inbox.md', '# Inbox\n');
    await ipc.writeFileAtomic('/MockVault/Notes/Important.md', '# Important Note\n');
    localStorage.setItem('quietflow-last-active-file', '/MockVault/Notes/Important.md');

    await useVaultStore.getState().loadVault('/MockVault');
    expect(useVaultStore.getState().section).toBe('notes');
    expect(useVaultStore.getState().activeFile).toBeNull();
    expect(useVaultStore.getState().activeFolder).toBe('/MockVault');
    // Inbox stays the Tasks section's landing note
    expect(useVaultStore.getState().sectionSelection.tasks.file).toBe('/MockVault/Inbox.md');
  });
});
