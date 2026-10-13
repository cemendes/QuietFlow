import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { useVaultStore } from '../../store';
import { SnapshotMetadata } from '../../store/types';

export const CorruptionWarningBanner: React.FC = () => {
  const corruptedFileWarning = useVaultStore((state) => state.corruptedFileWarning);
  const loadSnapshotsForFile = useVaultStore((state) => state.loadSnapshotsForFile);
  const restoreSnapshotForFile = useVaultStore((state) => state.restoreSnapshotForFile);
  const dismissCorruptionWarning = useVaultStore((state) => state.dismissCorruptionWarning);

  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (corruptedFileWarning) {
      loadSnapshotsForFile(corruptedFileWarning).then((list) => {
        setSnapshots(list);
      });
    }
  }, [corruptedFileWarning, loadSnapshotsForFile]);

  if (!corruptedFileWarning) return null;

  const fileName = corruptedFileWarning.split('/').pop() || 'note.md';
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  const handleRestoreLatest = async () => {
    if (!latestSnapshot) return;
    setIsRestoring(true);
    try {
      await restoreSnapshotForFile(corruptedFileWarning, latestSnapshot.id);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      data-testid="corruption-warning-banner"
      role="alert"
      className="bg-amber-500 text-slate-900 border-b border-amber-600/30 px-4 py-2.5 shadow-md flex items-center justify-between z-40 animate-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1 rounded-md bg-amber-600/20 text-slate-900 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-950 font-bold" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-amber-950">Empty or Corrupted File Detected: </span>
          <span className="text-amber-900">
            "{fileName}" appears to have lost its contents, but a swap backup snapshot is available.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {latestSnapshot && (
          <button
            type="button"
            data-testid="restore-snapshot-banner-btn"
            onClick={handleRestoreLatest}
            disabled={isRestoring}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-950 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Restoring...' : 'Restore from Snapshot'}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="dismiss-corruption-banner-btn"
          onClick={dismissCorruptionWarning}
          title="Dismiss warning"
          aria-label="Dismiss warning"
          className="p-1 text-amber-900 hover:text-amber-950 rounded hover:bg-amber-600/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CorruptionWarningBanner;
