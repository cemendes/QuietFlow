import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useVaultStore } from '../../store';
import { SubtaskItem, TaskPriority, TaskStatus } from '../../store/types';
import MetadataBar from './MetadataBar';
import MarkdownEditor from './MarkdownEditor';

export interface TaskDetailPanelProps {
  className?: string;
  onClose?: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  className = '',
  onClose,
}) => {
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const tasks = useVaultStore((state) => state.tasks);
  const updateTask = useVaultStore((state) => state.updateTask);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('quietflow-panel-width');
    return saved ? parseInt(saved, 10) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Handle right drawer drag resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 300), 700);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('quietflow-panel-width', panelWidth.toString());
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelWidth]);

  // Handle close action
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setActiveTaskId(null);
    }
  };

  // Keyboard shortcut listener for Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  if (!activeTaskId || !activeTask) {
    return null;
  }

  // Handlers for task updates
  const handleTitleChange = (newTitle: string) => {
    updateTask(activeTask.id, { title: newTitle });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const completedDate =
      newStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;
    updateTask(activeTask.id, { status: newStatus, completedDate });
  };

  const handlePriorityChange = (newPriority?: TaskPriority) => {
    updateTask(activeTask.id, { priority: newPriority });
  };

  const handleDueDateChange = (newDueDate?: string) => {
    updateTask(activeTask.id, { dueDate: newDueDate });
  };

  const handleNotesChange = (newNotes: string) => {
    updateTask(activeTask.id, { notes: newNotes });
  };

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const currentSubtasks = activeTask.subtasks || [];
    const newSubtask: SubtaskItem = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      status: 'todo',
    };
    updateTask(activeTask.id, {
      subtasks: [...currentSubtasks, newSubtask],
    });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const currentSubtasks = activeTask.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) => {
      if (st.id === subtaskId) {
        return {
          ...st,
          status: (st.status === 'done' ? 'todo' : 'done') as TaskStatus,
        };
      }
      return st;
    });
    updateTask(activeTask.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const currentSubtasks = activeTask.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter((st) => st.id !== subtaskId);
    updateTask(activeTask.id, { subtasks: updatedSubtasks });
  };

  return (
    <>
      {/* 1. Backdrop Overlay for click dismissal and focus isolation */}
      <div
        data-testid="task-detail-backdrop"
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/15 backdrop-blur-[0.5px] z-40 transition-opacity duration-200"
      />

      {/* 2. Slide-Over Right Drawer */}
      <aside
        aria-label="Task Details"
        style={{ width: panelWidth }}
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col h-full bg-sand-50 border-l border-sand-200 shadow-2xl overflow-hidden ${
          isResizing ? 'transition-none' : 'transition-[width] duration-150'
        } shrink-0 animate-in slide-in-from-right duration-200 ${className}`}
      >
      {/* Resizer Handle */}
      <div
        data-testid="task-panel-resize-handle"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-forest-500/30 transition-colors z-30"
        title="Drag to resize task details"
      />

      {/* Header with Title and Action Buttons */}
      <div className="flex items-start justify-between gap-2 p-5 pb-3">
        <input
          type="text"
          value={activeTask.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          aria-label="Task title"
          className="flex-1 text-lg font-semibold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-sand-300 focus:border-forest-500 focus:outline-none px-1 py-0.5 rounded transition-colors"
        />
        <div className="flex items-center gap-1">
          <button
            data-testid="delete-task-detail-btn"
            onClick={() => {
              useVaultStore.getState().deleteTask(activeTask.id);
              handleClose();
            }}
            title="Delete task"
            aria-label="Delete task"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            data-testid="close-task-detail-btn"
            onClick={handleClose}
            aria-label="Close task details"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-sand-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-5">
        {/* Metadata Controls */}
        <MetadataBar
          status={activeTask.status}
          priority={activeTask.priority}
          dueDate={activeTask.dueDate}
          tags={activeTask.tags}
          filePath={activeTask.filePath}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onDueDateChange={handleDueDateChange}
        />

        {/* Subtask Checklist Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subtasks
            </h4>
            {activeTask.subtasks && activeTask.subtasks.length > 0 && (
              <span className="text-[11px] font-medium text-slate-400">
                {activeTask.subtasks.filter((st) => st.status === 'done').length}/
                {activeTask.subtasks.length}
              </span>
            )}
          </div>

          {/* Subtask list */}
          <div className="space-y-1.5">
            {activeTask.subtasks?.map((subtask) => {
              const isDone = subtask.status === 'done';
              return (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between gap-2 p-2 bg-white border border-sand-200 rounded-lg group hover:border-sand-300 transition-colors"
                >
                  <button
                    type="button"
                    data-testid={`subtask-checkbox-${subtask.id}`}
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 hover:text-forest-600 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        isDone
                          ? 'line-through text-slate-400'
                          : 'text-slate-700 font-medium'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid={`delete-subtask-${subtask.id}`}
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="text-slate-300 hover:text-terracotta-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Quick add subtask row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add subtask..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-sand-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 transition-all"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="p-1.5 bg-forest-700 text-white rounded-lg hover:bg-forest-800 transition-colors shrink-0"
                aria-label="Add subtask button"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Markdown Notes Editor */}
        <div className="pt-2 flex flex-col flex-1 pb-4">
          <MarkdownEditor
            value={activeTask.notes || ''}
            onChange={handleNotesChange}
            placeholder="Add unstructured notes, meeting minutes, or references..."
          />
        </div>
      </div>
    </aside>
    </>
  );
};

export default TaskDetailPanel;
