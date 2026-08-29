import React from 'react';
import { CheckCircle2, Flame, Layers, Sparkles } from 'lucide-react';
import ViewSwitcher from './ViewSwitcher';

export type FocusBucket = 'all' | 'now' | 'not-now';

export interface FocusHeaderProps {
  title: string;
  icon?: string | null;
  completedCount: number;
  totalCount: number;
  activeFocusBucket: FocusBucket;
  onFocusBucketChange: (bucket: FocusBucket) => void;
  isSaving?: boolean;
  onOpenZen?: () => void;
}

export const FocusHeader: React.FC<FocusHeaderProps> = ({
  title,
  icon,
  completedCount,
  totalCount,
  activeFocusBucket,
  onFocusBucketChange,
  isSaving = false,
  onOpenZen,
}) => {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const isComplete = percentage >= 100;
  const strokeDashoffset = isComplete ? 0 : circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col gap-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {icon && (
                icon.startsWith('data:image') || icon.startsWith('http') ? (
                  <img
                    src={icon}
                    alt="Folder logo"
                    className="w-7 h-7 rounded-lg object-cover border border-sand-200 shadow-2xs shrink-0"
                  />
                ) : (
                  <span className="text-2xl leading-none select-none shrink-0">{icon}</span>
                )
              )}
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                {title}
              </h1>
            </div>

            {/* Progress Ring & Dopamine Micro-Counter */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-sand-200 rounded-xl shadow-2xs">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    className="stroke-sand-200"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    className="stroke-forest-600 transition-all duration-300 ease-out"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap={isComplete ? 'butt' : 'round'}
                    fill="none"
                  />
                </svg>
              <span className="absolute text-[8px] font-bold text-forest-800">
                {percentage}%
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {completedCount} of {totalCount} completed
            </span>
          </div>

          {isSaving && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenZen && (
            <button
              type="button"
              data-testid="zen-mode-header-btn"
              onClick={onOpenZen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-50 text-forest-800 border border-forest-600/30 rounded-xl text-xs font-semibold hover:bg-forest-100/80 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-forest-600" />
              <span>Zen Focus</span>
            </button>
          )}
          <ViewSwitcher />
        </div>
      </div>

      {/* Now vs. Not Now Focus Filter Tabs */}
      <div className="flex items-center justify-between pt-1">
        <div className="inline-flex p-0.5 bg-sand-200/80 rounded-lg border border-sand-300/60">
          <button
            type="button"
            onClick={() => onFocusBucketChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeFocusBucket === 'all'
                ? 'bg-white text-forest-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            All Tasks
          </button>
          <button
            type="button"
            onClick={() => onFocusBucketChange('now')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeFocusBucket === 'now'
                ? 'bg-white text-rose-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            Now Only
          </button>
          <button
            type="button"
            onClick={() => onFocusBucketChange('not-now')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeFocusBucket === 'not-now'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            Later / Backlog
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusHeader;
