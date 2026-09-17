import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Code,
  Quote,
} from 'lucide-react';

declare module '@tiptap/core' {
  interface Storage {
    markdown?: {
      getMarkdown(): string;
    };
  }
}

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Add notes, checklist items, or details...',
  className = '',
}) => {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-forest-700 underline font-medium hover:text-forest-900 cursor-pointer',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[300px] p-4 text-slate-800 text-sm leading-relaxed',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown?.getMarkdown() ?? '';
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (editor && editor.storage?.markdown) {
      const currentMarkdown = editor.storage.markdown.getMarkdown();
      if (value !== currentMarkdown) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  const handleToggleLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = (editor.getAttributes('link').href as string) || '';
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const getButtonClass = (isActive: boolean) =>
    `p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-slate-200 text-slate-900 font-semibold'
        : 'text-slate-600 hover:bg-sand-200/70 hover:text-slate-900'
    }`;

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</span>
      </div>

      {/* Formatting Action Toolbar */}
      <div
        data-testid="markdown-action-toolbar"
        className="flex items-center gap-0.5 p-1 mb-1.5 bg-sand-50 border border-sand-200/80 rounded-lg text-slate-600 flex-wrap shrink-0"
      >
        <button
          type="button"
          title="Bold (Cmd+B)"
          data-testid="toolbar-bold-btn"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={getButtonClass(editor?.isActive('bold') ?? false)}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Italic (Cmd+I)"
          data-testid="toolbar-italic-btn"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={getButtonClass(editor?.isActive('italic') ?? false)}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Heading 1"
          data-testid="toolbar-h1-btn"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 1 }) ?? false)}
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 2"
          data-testid="toolbar-h2-btn"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 2 }) ?? false)}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 3"
          data-testid="toolbar-h3-btn"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 3 }) ?? false)}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Bullet list"
          data-testid="toolbar-bullet-btn"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={getButtonClass(editor?.isActive('bulletList') ?? false)}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Numbered list"
          data-testid="toolbar-ordered-btn"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={getButtonClass(editor?.isActive('orderedList') ?? false)}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Task list"
          data-testid="toolbar-task-btn"
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          className={getButtonClass(editor?.isActive('taskList') ?? false)}
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Insert link"
          data-testid="toolbar-link-btn"
          onClick={handleToggleLink}
          className={getButtonClass(editor?.isActive('link') ?? false)}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Inline code"
          data-testid="toolbar-code-btn"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={getButtonClass(editor?.isActive('code') ?? false)}
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Quote"
          data-testid="toolbar-quote-btn"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={getButtonClass(editor?.isActive('blockquote') ?? false)}
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 min-h-[140px] h-full bg-white border border-sand-200 rounded-xl overflow-y-auto">
        <EditorContent
          editor={editor}
          data-testid="tiptap-editor-content"
          className="min-h-full"
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
