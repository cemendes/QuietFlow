import React, { useEffect, useState } from 'react';
import { Sparkles, Download, X, RefreshCw } from 'lucide-react';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  safeRelaunchApp,
  UpdateInfo,
} from '../../utils/updater';

export const UpdateToast: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check in background on startup after a gentle 3-second delay
    const timer = setTimeout(async () => {
      try {
        const update = await checkForAppUpdate();
        if (update) {
          setUpdateInfo(update);
        }
      } catch (err) {
        // Silent catch for background checks
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!updateInfo || isDismissed) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadAndInstallUpdate((_dl, _tot, percent) => {
        setProgress(percent);
      });
      setIsDownloading(false);
      setIsReady(true);
    } catch (err: any) {
      setIsDownloading(false);
      setError(err?.message || 'Update failed');
    }
  };

  const handleRelaunch = async () => {
    await safeRelaunchApp();
  };

  return (
    <div
      data-testid="update-toast-banner"
      className="fixed bottom-5 right-5 z-50 max-w-sm p-4 bg-white border border-sand-200 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 text-xs text-slate-700"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800">QuietFlow v{updateInfo.version} Available</div>
            <div className="text-[11px] text-slate-500">A new update is ready for download.</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss update notification"
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isDownloading ? (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>Downloading update...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-sand-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-forest-600 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : isReady ? (
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="toast-relaunch-btn"
            onClick={handleRelaunch}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Relaunch to Update</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-700 transition-colors"
          >
            Later
          </button>
          <button
            type="button"
            data-testid="toast-download-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1 font-semibold text-white bg-forest-700 hover:bg-forest-800 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Update Now</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default UpdateToast;
