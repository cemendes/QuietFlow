import React, { useState } from 'react';
import { Archive, X, RotateCcw, Search, CheckCircle2, Calendar } from 'lucide-react';
import { useVaultStore } from '../../store';

export interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const tasks = useVaultStore((state) => state.tasks);
  const toggleTask = useVaultStore((state) => state.toggleTask);

  if (!isOpen) return null;

  const completedTasks = tasks.filter((t) => t.status === 'done');
  const filteredCompleted = completedTasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div
      role="dialog"
      aria-label="Archive"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="archive-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-200 bg-sand-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-forest-100 text-forest-700 rounded-lg">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Completed Tasks Archive</h2>
              <p className="text-xs text-slate-500">{completedTasks.length} total archived tasks</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Archive"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-sand-100 bg-white">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived tasks or #tags..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-sand-50 border border-sand-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-500"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 stroke-[1.5] text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No archived tasks found</p>
              <p className="text-xs text-slate-400">Completed tasks will automatically appear here.</p>
            </div>
          ) : (
            filteredCompleted.map((task) => (
              <div
                key={task.id}
                data-testid={`archived-task-${task.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-sand-200 bg-sand-50/50 hover:bg-sand-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 line-through truncate">{task.title}</p>
                    {task.completedDate && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" /> Completed {task.completedDate}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  title="Restore task to active"
                  aria-label={`Restore task ${task.title}`}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-forest-700 bg-white border border-forest-600/30 rounded-lg hover:bg-forest-50 cursor-pointer transition-colors shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default ArchiveModal;
