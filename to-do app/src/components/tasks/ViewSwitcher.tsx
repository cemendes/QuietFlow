import React from 'react';
import { useVaultStore } from '../../store';

export interface ViewSwitcherProps {
  className?: string;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ className = '' }) => {
  const activeView = useVaultStore((state) => state.activeView);
  const setActiveView = useVaultStore((state) => state.setActiveView);

  return (
    <div
      role="group"
      aria-label="View switcher"
      className={`inline-flex items-center p-1 bg-sand-100 border border-sand-200 rounded-lg shadow-inner ${className}`}
    >
      <button
        type="button"
        aria-label="List View"
        title="List View"
        data-active={activeView === 'list'}
        onClick={() => setActiveView('list')}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          activeView === 'list'
            ? 'bg-white text-forest-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className="text-sm">☰</span>
        <span>List</span>
      </button>

      <button
        type="button"
        aria-label="Kanban View"
        title="Kanban View"
        data-active={activeView === 'kanban'}
        onClick={() => setActiveView('kanban')}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          activeView === 'kanban'
            ? 'bg-white text-forest-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className="text-sm">☷</span>
        <span>Kanban</span>
      </button>
    </div>
  );
};

export default ViewSwitcher;
