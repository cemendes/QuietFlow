import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLogoConfig,
  saveLogoConfig,
  getFolderRelativePath,
  resolveFolderIcon,
  persistFolderLogo,
  persistFolderEmoji,
} from './logoService';

describe('logoService', () => {
  const mockVault = '/MockVault';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('getFolderRelativePath computes correct relative paths', () => {
    expect(getFolderRelativePath(mockVault, '/MockVault/Privia')).toBe('Privia');
    expect(getFolderRelativePath(mockVault, '/MockVault/Clients/Acme')).toBe('Clients/Acme');
    expect(getFolderRelativePath(mockVault, '/MockVault')).toBe('');
    expect(getFolderRelativePath(mockVault, 'Privia')).toBe('Privia');
  });

  it('loadLogoConfig returns empty object if file does not exist', async () => {
    const config = await loadLogoConfig(mockVault);
    expect(config).toEqual({});
  });

  it('saveLogoConfig and loadLogoConfig persist mapping to .logos/config.json', async () => {
    const mockConfig = {
      Privia: 'privia_icon.png',
      Google: 'google_icon.png',
    };

    await saveLogoConfig(mockVault, mockConfig);
    const loaded = await loadLogoConfig(mockVault);
    expect(loaded).toEqual(mockConfig);
  });

  it('resolveFolderIcon resolves emoji directly from config', async () => {
    const config = {
      Projects: '🚀',
    };
    const icon = await resolveFolderIcon(mockVault, '/MockVault/Projects', config);
    expect(icon).toBe('🚀');
  });

  it('resolveFolderIcon resolves data URL directly', async () => {
    const config = {
      Privia: 'data:image/png;base64,mockdata',
    };
    const icon = await resolveFolderIcon(mockVault, '/MockVault/Privia', config);
    expect(icon).toBe('data:image/png;base64,mockdata');
  });

  it('resolveFolderIcon falls back to localStorage if not in config', async () => {
    localStorage.setItem('folder-icon-/MockVault/Legacy', '💡');
    const icon = await resolveFolderIcon(mockVault, '/MockVault/Legacy', {});
    expect(icon).toBe('💡');
  });

  it('persistFolderLogo creates .logos directory, writes file, updates config and localStorage', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await persistFolderLogo(mockVault, '/MockVault/CCO', mockDataUrl);

    expect(res.fileName).toBe('CCO.png');
    expect(res.iconUrl).toBe(mockDataUrl);

    const config = await loadLogoConfig(mockVault);
    expect(config['CCO']).toBe('CCO.png');
    expect(localStorage.getItem('folder-icon-/MockVault/CCO')).toBe(mockDataUrl);
  });

  it('persistFolderEmoji updates config and localStorage', async () => {
    await persistFolderEmoji(mockVault, '/MockVault/Notes', '📝');

    const config = await loadLogoConfig(mockVault);
    expect(config['Notes']).toBe('📝');
    expect(localStorage.getItem('folder-icon-/MockVault/Notes')).toBe('📝');
  });
});
