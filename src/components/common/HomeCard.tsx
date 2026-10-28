import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n';

export interface HomeCardProps {
  title: string;
  /** Secondary lines under the title (folder, counts…). */
  children?: React.ReactNode;
  onOpen: () => void;
  onDelete: () => Promise<void> | void;
  deleteLabel: string;
  confirmText: string;
  testIds: { card: string; delete: string; confirmDelete: string };
}

/** A card on a section landing grid (NotesHome, TasksHome): opens on click, trash icon asks before deleting. */
export const HomeCard: React.FC<HomeCardProps> = ({
  title,
  children,
  onOpen,
  onDelete,
  deleteLabel,
  confirmText,
  testIds,
}) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div
      data-testid={testIds.card}
      className={`relative flex flex-col p-3.5 bg-white border rounded-xl transition-all group ${
        isConfirming ? 'border-terracotta-500' : 'border-sand-200 hover:border-forest-500 hover:shadow-xs'
      }`}
    >
      {isConfirming ? (
        <div className="flex items-center justify-between gap-2 w-full min-h-[20px]">
          <span className="text-sm text-stone-700 truncate">{confirmText}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-sand-100 rounded-md cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              data-testid={testIds.confirmDelete}
              onClick={async () => {
                setIsConfirming(false);
                await onDelete();
              }}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-terracotta-600 hover:bg-terracotta-700 rounded-md cursor-pointer"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpen}
            className="flex flex-col text-left w-full pr-14 cursor-pointer focus:outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            <span className="font-semibold text-stone-800 group-hover:text-forest-700 text-sm truncate w-full mb-1">
              {title}
            </span>
            {children}
          </button>
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              aria-label={deleteLabel}
              title={t('common.delete')}
              data-testid={testIds.delete}
              onClick={() => setIsConfirming(true)}
              className="relative z-10 p-1 -m-1 rounded-md text-stone-400 hover:text-terracotta-600 hover:bg-sand-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HomeCard;
