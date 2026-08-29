import React, { useEffect, useState } from 'react';
import { History, X, RotateCcw, FileText, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { useVaultStore } from '../../store';
import { SnapshotMetadata } from '../../store/types';

export interface FileHistoryModalProps {
  isOpen: boolean;
  filePath: string | null;
  onClose: () => void;
}

export const FileHistoryModal: React.FC<FileHistoryModalProps> = ({ isOpen, filePath, onClose }) => {
  const loadSnapshotsForFile = useVaultStore((state) => state.loadSnapshotsForFile);
  const restoreSnapshotForFile = useVaultStore((state) => state.restoreSnapshotForFile);
  const createManualSnapshot = useVaultStore((state) => state.createManualSnapshot);

  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restoredSuccess, setRestoredSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && filePath) {
      setIsLoading(true);
      loadSnapshotsForFile(filePath).then((list) => {
        setSnapshots(list);
        if (list.length > 0) {
          setSelectedSnapshotId(list[0].id);
        } else {
          setSelectedSnapshotId(null);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, filePath, loadSnapshotsForFile]);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !filePath) return null;

  const fileName = filePath.split('/').pop() || 'note.md';

  const handleRestore = async (id: string) => {
    if (!filePath) return;
    await restoreSnapshotForFile(filePath, id);
    setRestoredSuccess(true);
    setTimeout(() => {
      setRestoredSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCreateSnapshotNow = async () => {
    if (!filePath) return;
    const created = await createManualSnapshot(filePath);
    if (created) {
      const updated = await loadSnapshotsForFile(filePath);
      setSnapshots(updated);
      setSelectedSnapshotId(created.id);
    }
  };

  const formatTimestamp = (tsString: string) => {
    const num = parseInt(tsString, 10);
    if (isNaN(num)) return tsString;
    const date = tsString.length > 10 ? new Date(num) : new Date(num * 1000);
    return date.toLocaleString();
  };

  return (
    <div
      role="dialog"
      aria-label="Version History"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="file-history-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-200 bg-sand-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-forest-100 text-forest-700 rounded-lg">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Version History & Swap Snapshots
              </h2>
              <p className="text-xs text-slate-500 font-mono truncate max-w-md">{fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="create-snapshot-manual-btn"
              onClick={handleCreateSnapshotNow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sand-100 hover:bg-sand-200 border border-sand-300 rounded-lg text-slate-700 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              <span>Snapshot Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Version History"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-xs text-slate-400">
              Loading snapshot timeline...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
              <History className="w-8 h-8 stroke-[1.5] text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No snapshots recorded yet</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Snapshots are automatically captured before every file modification (rate-limited to 2 minutes).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {restoredSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Successfully restored snapshot version!
                </div>
              )}

              <div className="text-xs font-semibold text-slate-600 mb-2">
                Available Snapshot Revisions ({snapshots.length})
              </div>

              <div className="divide-y divide-sand-100 border border-sand-200 rounded-xl overflow-hidden bg-sand-50/30">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    data-testid={`snapshot-item-${snap.id}`}
                    className={`flex items-center justify-between p-3.5 hover:bg-sand-50 transition-colors ${
                      selectedSnapshotId === snap.id ? 'bg-forest-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white border border-sand-200 text-forest-700 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {formatTimestamp(snap.timestamp)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest-100 text-forest-700 font-semibold">
                            {snap.taskCount} tasks
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {(snap.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`restore-btn-${snap.id}`}
                      onClick={() => handleRestore(snap.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FileHistoryModal;
