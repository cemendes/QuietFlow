import React from 'react';
import { useVaultStore } from '../../store';
import { useTranslation } from '../../i18n';

export interface ViewSwitcherProps {
  className?: string;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ className = '' }) => {
  const activeView = useVaultStore((state) => state.activeView);
  const setActiveView = useVaultStore((state) => state.setActiveView);
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('view.switcher')}
      className={`inline-flex items-center p-1 bg-sand-100 border border-sand-200 rounded-lg shadow-inner ${className}`}
    >
      <button
        type="button"
        aria-label={t('view.list')}
        title={t('view.list')}
        data-active={activeView === 'list'}
        onClick={() => setActiveView('list')}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          activeView === 'list'
            ? 'bg-white text-forest-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className="text-sm">☰</span>
        <span>{t('view.listShort')}</span>
      </button>

      <button
        type="button"
        aria-label={t('view.kanban')}
        title={t('view.kanban')}
        data-active={activeView === 'kanban'}
        onClick={() => setActiveView('kanban')}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          activeView === 'kanban'
            ? 'bg-white text-forest-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className="text-sm">☷</span>
        <span>{t('view.kanbanShort')}</span>
      </button>
    </div>
  );
};

export default ViewSwitcher;
