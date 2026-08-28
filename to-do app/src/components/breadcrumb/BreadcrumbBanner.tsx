import React, { useEffect, useState } from 'react';
import { X, ArrowRight, Compass } from 'lucide-react';
import { useVaultStore } from '../../store';

export interface BreadcrumbBannerProps {
  thresholdMinutes?: number;
}

export const BreadcrumbBanner: React.FC<BreadcrumbBannerProps> = ({
  thresholdMinutes = 15,
}) => {
  const activeFile = useVaultStore((state) => state.activeFile);
  const selectFile = useVaultStore((state) => state.selectFile);

  const [showBanner, setShowBanner] = useState(false);
  const [breadcrumbFile, setBreadcrumbFile] = useState<string | null>(null);

  useEffect(() => {
    // Record last activity timestamp on window blur or unmount
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (activeFile) {
          localStorage.setItem('quietflow-last-active-file', activeFile);
          localStorage.setItem('quietflow-last-active-time', Date.now().toString());
        }
      } else {
        // App regained focus
        const lastTimeStr = localStorage.getItem('quietflow-last-active-time');
        const lastFile = localStorage.getItem('quietflow-last-active-file');

        if (lastTimeStr && lastFile) {
          const lastTime = parseInt(lastTimeStr, 10);
          const minutesElapsed = (Date.now() - lastTime) / (1000 * 60);

          if (minutesElapsed >= thresholdMinutes) {
            setBreadcrumbFile(lastFile);
            setShowBanner(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeFile, thresholdMinutes]);

  if (!showBanner || !breadcrumbFile) return null;

  const fileName = breadcrumbFile.split('/').pop()?.replace(/\.md$/, '') || 'your previous notes';

  const handleResume = async () => {
    await selectFile(breadcrumbFile);
    setShowBanner(false);
  };

  return (
    <div
      data-testid="breadcrumb-banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-white border border-sand-200 rounded-2xl shadow-xl animate-in slide-in-from-top-4 duration-200 max-w-lg"
    >
      <div className="p-1.5 bg-forest-100 text-forest-700 rounded-xl shrink-0">
        <Compass className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 text-xs">
        <p className="font-semibold text-slate-800 truncate">
          Welcome back! You were exploring <span className="text-forest-700 font-bold">{fileName}</span>.
        </p>
        <p className="text-[11px] text-slate-400">Pick up right where you left off?</p>
      </div>

      <button
        type="button"
        onClick={handleResume}
        className="flex items-center gap-1 px-3 py-1.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
      >
        <span>Resume</span>
        <ArrowRight className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() => setShowBanner(false)}
        aria-label="Dismiss Breadcrumb"
        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-100 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default BreadcrumbBanner;
