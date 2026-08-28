import React, { useEffect, useState } from 'react';
import { TaskItem } from '../../store/types';
import { triggerCelebration } from '../../utils/celebrations';
import { triggerCompletionFeedback } from '../../utils/feedback';

export interface ZenTheaterModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  durationMinutes?: number;
  onClose: () => void;
  onCompleteTask: (taskId: string) => void;
}

export const ZenTheaterModal: React.FC<ZenTheaterModalProps> = ({
  isOpen,
  task,
  durationMinutes = 25,
  onClose,
  onCompleteTask,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSecondsElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const totalSeconds = durationMinutes * 60;
  const progressRatio = Math.min(secondsElapsed / totalSeconds, 1);
  const radius = 175;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const handleComplete = () => {
    triggerCompletionFeedback();
    triggerCelebration();
    onCompleteTask(task.id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Zen Theater"
      aria-modal="true"
      data-testid="zen-theater-modal"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9F6] animate-in fade-in duration-300 select-none p-6"
    >
      {/* Visual Sweeping Aura Circle (Centered Seamlessly) */}
      <div className="relative w-[480px] h-[480px] flex items-center justify-center">
        {/* Soft Radial Ambient Glow */}
        <div className="absolute inset-4 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        <svg className="w-full h-full -rotate-90" viewBox="0 0 400 400">
          {/* Base Ambient Track */}
          <circle
            cx="200"
            cy="200"
            r={radius}
            stroke="#10B981"
            strokeOpacity="0.25"
            strokeWidth="8"
            fill="none"
          />
          {/* Luminous Sweeping Arc */}
          <circle
            cx="200"
            cy="200"
            r={radius}
            stroke="#059669"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.65))',
            }}
          />
        </svg>

        {/* Seamless Task Content (No White Container) */}
        <div className="absolute inset-8 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
          <span className="text-[11px] font-bold tracking-widest text-forest-700 uppercase">
            Current Focus
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight leading-snug max-w-[280px]">
            {task.title}
          </h2>
          {task.notes && (
            <p className="text-xs text-stone-600 line-clamp-2 max-w-[240px]">
              {task.notes}
            </p>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-8 flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={handleComplete}
          className="px-6 py-2.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          ✓ Complete Task
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 bg-stone-200/70 hover:bg-stone-300/80 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Exit Zen (Esc)
        </button>
      </div>
    </div>
  );
};

export default ZenTheaterModal;
