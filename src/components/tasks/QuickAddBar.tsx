import React, { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../../store';
import { NewTaskInput, TaskPriority } from '../../store/types';

export interface QuickAddBarProps {
  placeholder?: string;
  defaultSection?: string;
  onAdded?: () => void;
  onAddTask?: (task: NewTaskInput, defaultSection?: string) => Promise<void> | void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  placeholder = 'Add a new task... (e.g. Call Alice tomorrow #client @high)',
  defaultSection,
  onAdded,
  onAddTask,
}) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const storeAddTask = useVaultStore((state) => state.addTask);
  const addTask = onAddTask || storeAddTask;

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+N or Ctrl+N to focus quick add
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const parseTaskInput = (raw: string): NewTaskInput => {
    let text = raw.trim();
    let priority: TaskPriority | undefined;
    const tags: string[] = [];
    let dueDate: string | undefined;

    // Extract @priority (@high, @medium, @low)
    const priorityMatch = text.match(/@(high|medium|low)\b/i);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as TaskPriority;
      text = text.replace(priorityMatch[0], '').trim();
    }

    // Extract #tags (#finance, #devops, etc.)
    const tagMatches = Array.from(text.matchAll(/#([\w-]+)/g));
    for (const match of tagMatches) {
      tags.push(match[1]);
    }
    text = text.replace(/#([\w-]+)/g, '').trim();

    // Extract due:YYYY-MM-DD or simple tomorrow / today keywords
    const dueMatch = text.match(/\bdue:(\d{4}-\d{2}-\d{2})\b/i);
    if (dueMatch) {
      dueDate = dueMatch[1];
      text = text.replace(dueMatch[0], '').trim();
    } else if (/\btomorrow\b/i.test(text)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
      text = text.replace(/\btomorrow\b/gi, '').trim();
    } else if (/\btoday\b/i.test(text)) {
      dueDate = new Date().toISOString().split('T')[0];
      text = text.replace(/\btoday\b/gi, '').trim();
    }

    // Strip trailing or lingering unmatched "due:" keyword
    text = text.replace(/\bdue:\s*/gi, '').trim();

    // Clean extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return {
      title: text || raw.trim(),
      priority,
      tags: tags.length > 0 ? tags : [],
      dueDate,
      status: 'todo',
    };
  };

  const handleAddTask = async () => {
    if (!value.trim()) return;
    const parsedTask = parseTaskInput(value);
    
    // Ensure there is an active file, or auto-load/create default
    const activeFile = useVaultStore.getState().activeFile;
    const vaultPath = useVaultStore.getState().vaultPath;
    if (!activeFile && vaultPath) {
      const todayPath = `${vaultPath}/today.md`;
      await useVaultStore.getState().createFile(todayPath, `---\ntitle: Today's Focus\n---\n\n# Tasks\n`);
    }

    await addTask(parsedTask, defaultSection);
    setValue('');
    if (onAdded) {
      onAdded();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddTask();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleAddTask();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center w-full max-w-2xl mx-auto transition-all duration-200 ${
        isFocused
          ? 'ring-2 ring-forest-500/20 shadow-md'
          : 'shadow-sm hover:shadow-md'
      } rounded-xl bg-white border border-sand-200 overflow-hidden`}
    >
      <div className="flex items-center pl-3.5 pr-2 text-slate-400">
        <svg
          className="w-4 h-4 text-forest-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label="Quick Add Task"
        className="w-full py-2.5 pr-20 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
      />

      <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-none">
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-sand-100 border border-sand-200 rounded">
          ⌘N
        </kbd>
        {value.trim() && (
          <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-forest-700 bg-forest-500/10 border border-forest-500/20 rounded">
            Enter ↵
          </kbd>
        )}
      </div>
    </form>
  );
};

export default QuickAddBar;
