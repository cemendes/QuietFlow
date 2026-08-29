import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Calendar,
  Tag,
  Folder,
  FileText,
  ChevronRight,
  MessageSquare,
  Send,
  Sparkles,
  Clock,
  User,
  X,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { SubtaskItem, TaskComment, TaskPriority, TaskStatus } from '../../store/types';
import MarkdownEditor from './MarkdownEditor';

export interface TaskDetailPageProps {
  className?: string;
  onBack?: () => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  className = '',
  onBack,
}) => {
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const tasks = useVaultStore((state) => state.tasks);
  const activeView = useVaultStore((state) => state.activeView);
  const updateTask = useVaultStore((state) => state.updateTask);
  const deleteTask = useVaultStore((state) => state.deleteTask);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const [title, setTitle] = useState(activeTask?.title || '');
  const [notes, setNotes] = useState(activeTask?.notes || '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sync internal state when activeTask changes
  useEffect(() => {
    if (activeTask) {
      setTitle(activeTask.title);
      setNotes(activeTask.notes || '');
    }
  }, [activeTask?.id]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveTaskId(null);
    }
  };

  // Keyboard shortcut listener for Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        // Only trigger back if not inside a modal or focused textarea
        const target = e.target as HTMLElement;
        if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') {
          return;
        }
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBack]);

  if (!activeTaskId || !activeTask) {
    return null;
  }

  const isDone = activeTask.status === 'done';

  // Format breadcrumbs from filePath
  const breadcrumbs = () => {
    if (!activeTask.filePath) return null;
    const parts = activeTask.filePath.split('/').filter(Boolean);
    const fileName = parts.pop()?.replace(/\.md$/, '') || '';
    const parentFolder = parts.length > 0 ? parts.pop() : null;
    const isVaultRoot = !parentFolder || parentFolder === 'QuietFlowVault' || parentFolder === 'Documents';

    return {
      folder: isVaultRoot ? 'My Vault' : parentFolder,
      file: fileName,
    };
  };

  const breadcrumbInfo = breadcrumbs();

  // Handlers for task mutations
  const handleTitleBlur = () => {
    if (title.trim() && title !== activeTask.title) {
      updateTask(activeTask.id, { title: title.trim() });
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    updateTask(activeTask.id, { notes: newNotes });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const completedDate =
      newStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;
    updateTask(activeTask.id, { status: newStatus, completedDate });
  };

  const handleToggleDone = () => {
    handleStatusChange(isDone ? 'todo' : 'done');
  };

  const handlePriorityChange = (newPriority?: TaskPriority) => {
    updateTask(activeTask.id, { priority: newPriority });
  };

  const handleDueDateChange = (newDueDate?: string) => {
    updateTask(activeTask.id, { dueDate: newDueDate });
  };

  // Subtask handlers
  const handleToggleSubtask = (subtaskId: string) => {
    if (!activeTask.subtasks) return;
    const updatedSubtasks = activeTask.subtasks.map((st) => {
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

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: SubtaskItem = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      status: 'todo',
    };
    const updatedSubtasks = [...(activeTask.subtasks || []), newSubtask];
    updateTask(activeTask.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!activeTask.subtasks) return;
    const updatedSubtasks = activeTask.subtasks.filter((st) => st.id !== subtaskId);
    updateTask(activeTask.id, { subtasks: updatedSubtasks });
  };

  // Tag handlers
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!activeTask.tags.includes(cleanTag)) {
      const updatedTags = [...activeTask.tags, cleanTag];
      updateTask(activeTask.id, { tags: updatedTags });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = activeTask.tags.filter((t) => t !== tagToRemove);
    updateTask(activeTask.id, { tags: updatedTags });
  };

  // Comment handlers
  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);

    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newComment: TaskComment = {
      id: `comment-${Date.now()}`,
      author: 'You',
      timestamp: formattedTimestamp,
      content: newCommentText.trim(),
    };

    const updatedComments = [...(activeTask.comments || []), newComment];
    updateTask(activeTask.id, { comments: updatedComments });
    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activeTask.comments) return;
    const updatedComments = activeTask.comments.filter((c) => c.id !== commentId);
    updateTask(activeTask.id, { comments: updatedComments });
  };

  const handleDeleteTask = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(activeTask.id);
      handleBack();
    }
  };

  // Subtask progress calculations
  const totalSubtasks = activeTask.subtasks?.length || 0;
  const completedSubtasks = activeTask.subtasks?.filter((st) => st.status === 'done').length || 0;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      data-testid="task-detail-page"
      className={`flex flex-col h-full w-full bg-sand-50/60 overflow-hidden select-text ${className}`}
    >
      {/* 1. Top Navigation & Action Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-sand-200/80 bg-white/70 backdrop-blur-md shrink-0">
        {/* Left: Back Button & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid="back-to-list-btn"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-sand-100 hover:bg-sand-200/80 rounded-lg transition-all"
            title="Return to previous view (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{activeView === 'kanban' ? 'Back to Kanban' : 'Back to List'}</span>
          </button>

          {breadcrumbInfo && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 truncate">
              <span className="flex items-center gap-1 font-medium text-stone-600">
                <Folder className="w-3 h-3 text-forest-600 shrink-0" />
                <span className="truncate">{breadcrumbInfo.folder}</span>
              </span>
              <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
              <span className="flex items-center gap-1 font-medium text-stone-700 truncate">
                <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">{breadcrumbInfo.file}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Status badge toggle */}
          <button
            type="button"
            data-testid="toggle-done-btn"
            onClick={handleToggleDone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isDone
                ? 'bg-forest-100 text-forest-800 border border-forest-300 shadow-xs'
                : 'bg-white border border-sand-200 text-stone-700 hover:border-sand-300 hover:bg-sand-50'
            }`}
          >
            {isDone ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-stone-400" />
                <span>Mark as Done</span>
              </>
            )}
          </button>

          {/* Delete Task */}
          <button
            type="button"
            data-testid="delete-task-btn"
            onClick={handleDeleteTask}
            title="Delete task"
            className="p-1.5 text-stone-400 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Two-Column Content Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: Primary Task Content & Notes (~65% width) */}
        <main className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-8">
          {/* Title Area */}
          <div className="space-y-2">
            <input
              type="text"
              data-testid="task-detail-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Task title..."
              className={`w-full text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder-stone-300 transition-colors ${
                isDone ? 'line-through text-stone-400' : 'text-stone-900'
              }`}
            />
          </div>

          {/* Description & Notes Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-sand-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Description & Notes
              </h3>
            </div>

            <div className="bg-white border border-sand-200/80 rounded-xl p-4 shadow-xs">
              <MarkdownEditor
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add structured notes, execution details, bullet points, or code snippets..."
              />
            </div>
          </section>

          {/* Subtasks Checklist Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-sand-200/80">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Subtasks
                </h3>
                {totalSubtasks > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sand-200/80 text-stone-600">
                    {completedSubtasks}/{totalSubtasks} Completed
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="w-full bg-sand-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-forest-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Subtask list */}
            <div className="space-y-1.5">
              {activeTask.subtasks?.map((subtask) => {
                const subDone = subtask.status === 'done';
                return (
                  <div
                    key={subtask.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white border border-sand-200/80 rounded-xl group hover:border-sand-300 shadow-xs transition-colors"
                  >
                    <button
                      type="button"
                      data-testid={`subtask-checkbox-${subtask.id}`}
                      onClick={() => handleToggleSubtask(subtask.id)}
                      className="flex items-center gap-2.5 flex-1 text-left"
                    >
                      {subDone ? (
                        <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-stone-300 hover:text-forest-600 shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          subDone
                            ? 'line-through text-stone-400'
                            : 'text-stone-800 font-medium'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      data-testid={`delete-subtask-${subtask.id}`}
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-stone-300 hover:text-terracotta-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
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
                  data-testid="new-subtask-input"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask... (press Enter)"
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-sand-200 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 shadow-xs transition-all"
                />
                <button
                  type="button"
                  data-testid="add-subtask-btn"
                  onClick={handleAddSubtask}
                  className="p-2 bg-forest-700 text-white rounded-xl hover:bg-forest-800 transition-colors shrink-0 shadow-xs"
                  aria-label="Add subtask button"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* RIGHT COLUMN: Metadata Attributes & Activity / Comments Feed (~35% width) */}
        <aside className="w-88 border-l border-sand-200 bg-sand-100/50 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Properties Section */}
            <section className="space-y-3.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Properties
              </h4>

              <div className="space-y-3 bg-white border border-sand-200/80 rounded-xl p-3.5 shadow-xs">
                {/* Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-500">Status</span>
                  <select
                    data-testid="detail-status-select"
                    value={activeTask.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sand-50 border border-sand-200 text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="backlog">Backlog</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-500">Priority</span>
                  <select
                    data-testid="detail-priority-select"
                    value={activeTask.priority || ''}
                    onChange={(e) =>
                      handlePriorityChange(
                        e.target.value ? (e.target.value as TaskPriority) : undefined
                      )
                    }
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sand-50 border border-sand-200 text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  >
                    <option value="">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-500">Due Date</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      data-testid="detail-due-date-input"
                      value={activeTask.dueDate || ''}
                      onChange={(e) => handleDueDateChange(e.target.value || undefined)}
                      className="px-2 py-1 text-xs bg-sand-50 border border-sand-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
                    />
                    {activeTask.dueDate && (
                      <button
                        type="button"
                        onClick={() => handleDueDateChange(undefined)}
                        className="text-stone-400 hover:text-stone-600 p-0.5"
                        title="Clear due date"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Location / File Origin */}
                {activeTask.filePath && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-sand-100">
                    <span className="text-xs font-medium text-stone-500">Origin</span>
                    <span
                      title={activeTask.filePath}
                      className="text-[11px] font-mono text-stone-600 bg-sand-100 px-2 py-0.5 rounded truncate max-w-[140px]"
                    >
                      {activeTask.filePath.split('/').pop()}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Tags Section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Tags
                </h4>
                {!isAddingTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="text-[11px] font-semibold text-forest-700 hover:text-forest-800 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeTask.tags.map((tag) => (
                  <span
                    key={tag}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-sand-200 rounded-lg text-xs font-medium text-stone-700 shadow-xs"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-stone-400 hover:text-terracotta-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {isAddingTag && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        } else if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagInput('');
                        }
                      }}
                      placeholder="tag-name"
                      className="w-24 px-2 py-1 text-xs bg-white border border-forest-500 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="p-1 bg-forest-700 text-white rounded hover:bg-forest-800 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Activity & Comments Stream */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-sand-200/80">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Activity & Comments
                  </h4>
                </div>
                {activeTask.comments && activeTask.comments.length > 0 && (
                  <span className="text-[10px] font-bold text-stone-400">
                    {activeTask.comments.length}
                  </span>
                )}
              </div>

              {/* Comments Timeline */}
              <div className="space-y-3">
                {(!activeTask.comments || activeTask.comments.length === 0) ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    No comments yet. Leave a note or update below.
                  </p>
                ) : (
                  activeTask.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group flex flex-col gap-1 bg-white border border-sand-200/80 rounded-xl p-3 shadow-xs text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-[10px]">
                            {comment.author ? comment.author.charAt(0).toUpperCase() : 'Y'}
                          </span>
                          <span className="font-semibold text-stone-800">
                            {comment.author || 'You'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">
                            {comment.timestamp}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-stone-300 hover:text-terracotta-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap pl-6 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input Composer */}
              <div className="pt-2 space-y-2">
                <textarea
                  data-testid="new-comment-textarea"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                  rows={2}
                  placeholder="Write a comment... (Cmd+Enter to post)"
                  className="w-full px-3 py-2 text-xs bg-white border border-sand-200 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-forest-500 shadow-xs resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    data-testid="post-comment-btn"
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    onClick={handlePostComment}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Comment</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TaskDetailPage;
