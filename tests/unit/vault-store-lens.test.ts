import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVaultStore } from '../../src/store/vaultStore';

describe('Vault Store Lens & Cognitive Re-entry State', () => {
  beforeEach(() => {
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
});
