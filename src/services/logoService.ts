import { ipc } from '../store/ipc';

export interface LogoConfig {
  [folderRelativePath: string]: string;
}

const CONFIG_FILE_NAME = 'config.json';
const LOGOS_DIR_NAME = '.logos';

/**
 * Loads the logo configuration mapping from `<vaultPath>/.logos/config.json`.
 */
export async function loadLogoConfig(vaultPath: string): Promise<LogoConfig> {
  if (!vaultPath) return {};
  try {
    const configPath = `${vaultPath}/${LOGOS_DIR_NAME}/${CONFIG_FILE_NAME}`;
    const content = await ipc.readFile(configPath);
    if (!content || !content.trim()) return {};
    return JSON.parse(content.trim()) as LogoConfig;
  } catch {
    return {};
  }
}

/**
 * Saves the logo configuration mapping to `<vaultPath>/.logos/config.json`.
 */
export async function saveLogoConfig(vaultPath: string, config: LogoConfig): Promise<void> {
  if (!vaultPath) return;
  try {
    const logosDir = `${vaultPath}/${LOGOS_DIR_NAME}`;
    await ipc.createDirectory(logosDir);
    const configPath = `${logosDir}/${CONFIG_FILE_NAME}`;
    await ipc.writeFileAtomic(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Failed to save logo config to .logos/config.json', err);
  }
}

/**
 * Resolves the relative path of a folder inside the vault.
 */
export function getFolderRelativePath(vaultPath: string, folderPath: string): string {
  if (!folderPath || !vaultPath) return folderPath || '';
  if (folderPath === vaultPath) return '';
  if (folderPath.startsWith(vaultPath)) {
    return folderPath.slice(vaultPath.length).replace(/^\/+/, '');
  }
  return folderPath;
}

/**
 * Validates that an icon string is immediately renderable (data URL, HTTP URL, or emoji).
 * Rejects stale/broken asset:// protocols and raw disk filenames.
 */
export function isValidRenderableIcon(icon: string | null | undefined): boolean {
  if (!icon || typeof icon !== 'string') return false;
  const trimmed = icon.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('asset://') || trimmed.startsWith('http://asset.') || trimmed.startsWith('https://asset.')) {
    return false;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }
  // If it's an emoji (single or multiple emoji characters without file extension or paths)
  if (!trimmed.includes('.') && !trimmed.includes('/') && !trimmed.includes('\\')) {
    return true;
  }
  return false;
}

/**
 * Resolves the icon for a folder (from config, disk, or localStorage fallback).
 */
export async function resolveFolderIcon(
  vaultPath: string,
  folderPath: string,
  config: LogoConfig
): Promise<string | null> {
  // 1. Fast check: localStorage cache (guarantees zero latency on initial render)
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(`folder-icon-${folderPath}`);
    if (cached) {
      if (isValidRenderableIcon(cached)) {
        return cached;
      }
      // Purge invalid/broken cached entries (e.g. stale asset:// URIs or raw filenames)
      localStorage.removeItem(`folder-icon-${folderPath}`);
    }
  }

  const relativePath = getFolderRelativePath(vaultPath, folderPath);
  const mapped = config[relativePath] || config[folderPath];

  if (mapped) {
    // If it's an emoji (single/double emoji character, no file extension)
    if (!mapped.includes('.') && !mapped.startsWith('data:')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`folder-icon-${folderPath}`, mapped);
      }
      return mapped;
    }

    // If it's already a data URL
    if (mapped.startsWith('data:')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`folder-icon-${folderPath}`, mapped);
      }
      return mapped;
    }

    // If it's a file in .logos/, read directly via IPC to produce a robust data URL
    const filePath = `${vaultPath}/${LOGOS_DIR_NAME}/${mapped}`;
    try {
      const fileContent = await ipc.readFile(filePath);
      if (fileContent && fileContent.trim()) {
        let resultUrl = fileContent.trim();
        if (resultUrl.startsWith('<svg') || resultUrl.startsWith('<?xml')) {
          resultUrl = `data:image/svg+xml;utf8,${encodeURIComponent(resultUrl)}`;
        } else if (mapped.endsWith('.svg') && !resultUrl.startsWith('data:')) {
          resultUrl = `data:image/svg+xml;utf8,${encodeURIComponent(resultUrl)}`;
        } else if (!resultUrl.startsWith('data:') && !resultUrl.startsWith('http')) {
          resultUrl = `data:image/png;base64,${resultUrl}`;
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`folder-icon-${folderPath}`, resultUrl);
        }
        return resultUrl;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Saves a folder logo image to `.logos/`, updates `config.json`, and updates localStorage.
 */
export async function persistFolderLogo(
  vaultPath: string,
  folderPath: string,
  dataUrl: string,
  customFileName?: string
): Promise<{ iconUrl: string; fileName: string }> {
  const relativePath = getFolderRelativePath(vaultPath, folderPath);
  const folderName = relativePath.split('/').pop() || 'folder';

  // Determine file extension
  let ext = 'png';
  if (dataUrl.includes('image/svg+xml') || dataUrl.includes('<svg')) {
    ext = 'svg';
  } else if (dataUrl.includes('image/webp')) {
    ext = 'webp';
  } else if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
    ext = 'jpg';
  }

  const fileName = customFileName || `${folderName}.${ext}`;
  const logosDir = `${vaultPath}/${LOGOS_DIR_NAME}`;
  const filePath = `${logosDir}/${fileName}`;

  try {
    await ipc.createDirectory(logosDir);

    // Save file content
    if (ext === 'svg' && dataUrl.startsWith('data:image/svg+xml;utf8,')) {
      const svgText = decodeURIComponent(dataUrl.replace('data:image/svg+xml;utf8,', ''));
      await ipc.writeFileAtomic(filePath, svgText);
    } else {
      await ipc.writeFileAtomic(filePath, dataUrl);
    }

    // Update config.json
    const currentConfig = await loadLogoConfig(vaultPath);
    currentConfig[relativePath] = fileName;
    await saveLogoConfig(vaultPath, currentConfig);
  } catch (err) {
    console.error(`Failed to persist logo to ${filePath}:`, err);
  }

  // Cache in localStorage for instant retrieval
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`folder-icon-${folderPath}`, dataUrl);
  }

  return { iconUrl: dataUrl, fileName };
}

/**
 * Saves a folder emoji icon, updates `config.json`, and updates localStorage.
 */
export async function persistFolderEmoji(
  vaultPath: string,
  folderPath: string,
  emoji: string
): Promise<void> {
  const relativePath = getFolderRelativePath(vaultPath, folderPath);

  try {
    const currentConfig = await loadLogoConfig(vaultPath);
    currentConfig[relativePath] = emoji;
    await saveLogoConfig(vaultPath, currentConfig);
  } catch (err) {
    console.error('Failed to persist emoji to .logos/config.json', err);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`folder-icon-${folderPath}`, emoji);
  }
}
