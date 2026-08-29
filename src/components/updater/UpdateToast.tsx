import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, ExternalLink, X } from 'lucide-react';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  safeRelaunchApp,
  UpdateInfo,
} from '../../utils/updater';

const CURRENT_VERSION = '0.1.0-alpha.4';
const CHANGELOG_URL = 'https://github.com/cemendes/QuietFlow/blob/main/CHANGELOG.md';

export const UpdateToast: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChangelogPill, setShowChangelogPill] = useState(false);

  useEffect(() => {
    // Check if the app was just updated to show the "What's new" changelog pill
    if (typeof localStorage !== 'undefined') {
      const lastSeenVersion = localStorage.getItem('quietflow-last-seen-version');
      if (lastSeenVersion && lastSeenVersion !== CURRENT_VERSION) {
        setShowChangelogPill(true);
      }
      localStorage.setItem('quietflow-last-seen-version', CURRENT_VERSION);
    }

    // Check for updates in background on startup after a gentle 3-second delay
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

  const handleStartUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    if (isReady) {
      await safeRelaunchApp();
      return;
    }

    setIsDownloading(true);
    setError(null);
    try {
      await downloadAndInstallUpdate((_dl, _tot, percent) => {
        setProgress(percent);
      });
      setIsDownloading(false);
      setIsReady(true);
      // Auto relaunch after 1 second of completion
      setTimeout(async () => {
        await safeRelaunchApp();
      }, 1000);
    } catch (err: any) {
      setIsDownloading(false);
      setError(err?.message || 'Update failed');
    }
  };

  const handleOpenChangelog = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(CHANGELOG_URL, '_blank');
    setShowChangelogPill(false);
  };

  // 1. Post-Update Changelog Pill (Antigravity style)
  if (showChangelogPill && !updateInfo) {
    return (
      <div
        data-testid="changelog-pill"
        className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1 bg-slate-900/90 hover:bg-slate-950 text-slate-100 border border-slate-700/60 rounded-full shadow-lg backdrop-blur-md text-[11px] font-medium transition-all duration-150 select-none animate-in fade-in slide-in-from-top-2"
      >
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Updated to v{CURRENT_VERSION}</span>
        </span>
        <span className="text-slate-500">·</span>
        <button
          type="button"
          onClick={handleOpenChangelog}
          className="flex items-center gap-1 text-slate-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
        >
          <span>See changelog</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </button>
        <button
          type="button"
          aria-label="Dismiss changelog pill"
          onClick={() => setShowChangelogPill(false)}
          className="text-slate-400 hover:text-slate-200 ml-1 p-0.5 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (!updateInfo || isDismissed) return null;

  // 2. New Update Available Pill (Antigravity style: Dark Blue / Slate, top-center title bar)
  return (
    <div
      data-testid="update-toast-banner"
      onClick={handleStartUpdate}
      className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md text-[11px] font-medium transition-all duration-200 cursor-pointer select-none animate-in fade-in slide-in-from-top-2 border ${
        error
          ? 'bg-rose-950/90 text-rose-200 border-rose-800/70 hover:bg-rose-900'
          : isReady
          ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/70 hover:bg-emerald-900'
          : isDownloading
          ? 'bg-slate-900/95 text-slate-100 border-indigo-500/50 cursor-wait'
          : 'bg-slate-900/90 hover:bg-slate-950 text-slate-100 border-slate-700/70 hover:border-indigo-500/50 hover:shadow-indigo-500/10'
      }`}
    >
      {/* Icon */}
      {isDownloading ? (
        <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
      ) : isReady ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
      )}

      {/* Text / Status */}
      {isDownloading ? (
        <div className="flex items-center gap-2">
          <span>Updating... {progress}%</span>
          <div className="w-12 bg-slate-700 rounded-full h-1 overflow-hidden">
            <div
              className="bg-indigo-400 h-1 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : isReady ? (
        <span className="font-semibold text-emerald-300">Restarting to apply v{updateInfo.version}...</span>
      ) : error ? (
        <span className="text-rose-300">{error} (Click to retry)</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">Update available</span>
          <span className="text-slate-500">·</span>
          <span className="font-semibold text-indigo-300">v{updateInfo.version}</span>
          <span className="text-[10px] text-slate-400 pl-1">(Click to update)</span>
        </div>
      )}

      {/* Dismiss button */}
      {!isDownloading && !isReady && (
        <button
          type="button"
          aria-label="Dismiss update notification"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="text-slate-400 hover:text-slate-200 ml-0.5 p-0.5 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default UpdateToast;
