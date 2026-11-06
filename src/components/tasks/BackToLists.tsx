import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useVaultStore } from '../../store';
import { sectionOfPath } from '../../core/vault/sections';
import { useTranslation } from '../../i18n';
import { dirName } from '../../utils/paths';

/** "← All lists": returns from one list (or the aggregated list) to the Tasks grid it came from. */
export const BackToLists: React.FC = () => {
  const { t } = useTranslation();
  const activeFile = useVaultStore((state) => state.activeFile);
  const activeFolder = useVaultStore((state) => state.activeFolder);
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const selectTaskFolder = useVaultStore((state) => state.selectTaskFolder);

  const folder = activeFile ? dirName(activeFile) : activeFolder;
  if (!folder || sectionOfPath(folder, vaultPath) !== 'tasks') return null;

  return (
    <button
      type="button"
      data-testid="back-to-lists-btn"
      onClick={() => selectTaskFolder(folder)}
      className="self-start flex items-center gap-1 mb-2 -ml-1 px-1 py-0.5 rounded text-xs font-medium text-stone-500 hover:text-forest-700 hover:bg-sand-100 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {t('tasksHome.allLists')}
    </button>
  );
};

export default BackToLists;
