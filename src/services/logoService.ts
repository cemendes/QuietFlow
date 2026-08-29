import { ipc, isTauriEnvironment } from '../store/ipc';

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
 * Resolves the icon for a folder (from config, disk, or localStorage fallback).
 */
export async function resolveFolderIcon(
  vaultPath: string,
  folderPath: string,
  config: LogoConfig
): Promise<string | null> {
  const relativePath = getFolderRelativePath(vaultPath, folderPath);
  const mapped = config[relativePath] || config[folderPath];

  if (mapped) {
    // If it's an emoji (single/double emoji character, no file extension)
    if (!mapped.includes('.') && !mapped.startsWith('data:')) {
      return mapped;
    }

    // If it's already a data URL
    if (mapped.startsWith('data:')) {
      return mapped;
    }

    // If it's a file in .logos/
    const filePath = `${vaultPath}/${LOGOS_DIR_NAME}/${mapped}`;
    if (isTauriEnvironment()) {
      try {
        const { convertFileSrc } = await import('@tauri-apps/api/core');
        return convertFileSrc(filePath);
      } catch {
        // Fallback to localStorage if convertFileSrc fails
      }
    } else {
      // In browser mock / testing environment
      try {
        const fileContent = await ipc.readFile(filePath);
        if (fileContent) {
          if (mapped.endsWith('.svg')) {
            return `data:image/svg+xml;utf8,${encodeURIComponent(fileContent)}`;
          }
          return fileContent.startsWith('data:') ? fileContent : `data:image/png;base64,${fileContent}`;
        }
      } catch {
        // ignore and fallback
      }
    }
  }

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(`folder-icon-${folderPath}`);
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
