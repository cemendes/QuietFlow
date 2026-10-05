import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { Selection } from '@tiptap/pm/state';
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
  Code2,
  Quote,
  CalendarPlus,
} from 'lucide-react';

declare module '@tiptap/core' {
  interface Storage {
    markdown?: {
      getMarkdown(): string;
    };
  }
}

export function convertOrToggleList(
  editor: any,
  targetType: 'bulletList' | 'orderedList' | 'taskList'
): boolean {
  if (!editor) return false;

  const { state } = editor.view;
  const { selection } = state;
  const { $from } = selection;

  let itemDepth = -1;
  let listDepth = -1;

  const selectedNode = (selection as any).node;
  if (
    selectedNode &&
    (selectedNode.type.name === 'taskItem' || selectedNode.type.name === 'listItem')
  ) {
    const parentName = $from.node($from.depth).type.name;
    if (
      parentName === 'taskList' ||
      parentName === 'bulletList' ||
      parentName === 'orderedList'
    ) {
      listDepth = $from.depth;
    }
  } else {
    for (let d = $from.depth; d > 0; d--) {
      const name = $from.node(d).type.name;
      if ((name === 'taskItem' || name === 'listItem') && itemDepth === -1) {
        itemDepth = d;
      }
      if (
        (name === 'taskList' || name === 'bulletList' || name === 'orderedList') &&
        listDepth === -1 &&
        itemDepth !== -1 &&
        d < itemDepth
      ) {
        listDepth = d;
        break;
      }
    }
  }

  // Not inside any list -> use default TipTap toggle command
  if (listDepth === -1) {
    if (targetType === 'bulletList') {
      return editor.chain().focus().toggleBulletList().run();
    } else if (targetType === 'orderedList') {
      return editor.chain().focus().toggleOrderedList().run();
    } else if (targetType === 'taskList') {
      return editor.chain().focus().toggleTaskList().run();
    }
    return false;
  }

  const currentListNode = $from.node(listDepth);
  const currentListType = currentListNode.type.name;

  // If already in target list type, toggle it off (lift)
  if (currentListType === targetType) {
    if (targetType === 'bulletList') {
      return editor.chain().focus().toggleBulletList().run();
    } else if (targetType === 'orderedList') {
      return editor.chain().focus().toggleOrderedList().run();
    } else if (targetType === 'taskList') {
      return editor.chain().focus().toggleTaskList().run();
    }
    return false;
  }

  // Inside a list of different type -> convert only the active item or list node
  const listPos = $from.before(listDepth);
  const targetListNodeType = state.schema.nodes[targetType];
  const targetItemNodeType =
    targetType === 'taskList' ? state.schema.nodes.taskItem : state.schema.nodes.listItem;

  let hasAncestorTaskItem = false;
  for (let d = listDepth - 1; d > 0; d--) {
    if ($from.node(d).type.name === 'taskItem') {
      hasAncestorTaskItem = true;
      break;
    }
  }

  const itemIndex = itemDepth !== -1 ? $from.index(listDepth) : 0;
  const currentItemNode = itemDepth !== -1 ? $from.node(itemDepth) : currentListNode.child(0);

  const convertedItemAttrs = targetType === 'taskList' ? { checked: false } : null;

  editor.commands.command(({ tr }: { tr: any }) => {
    if (hasAncestorTaskItem) {
      // Child task conversion: never touch parent task
      const convertedItem = targetItemNodeType.create(convertedItemAttrs, currentItemNode.content);
      const convertedList = targetListNodeType.create(
        targetType === 'bulletList' ? { tight: true } : {},
        [convertedItem]
      );

      if (currentListNode.childCount <= 1) {
        tr.replaceWith(listPos, listPos + currentListNode.nodeSize, convertedList);
      } else {
        const slices: any[] = [];
        if (itemIndex > 0) {
          const beforeItems: any[] = [];
          for (let i = 0; i < itemIndex; i++) {
            beforeItems.push(currentListNode.child(i));
          }
          slices.push(currentListNode.type.create(currentListNode.attrs, beforeItems));
        }
        slices.push(convertedList);
        if (itemIndex < currentListNode.childCount - 1) {
          const afterItems: any[] = [];
          for (let i = itemIndex + 1; i < currentListNode.childCount; i++) {
            afterItems.push(currentListNode.child(i));
          }
          slices.push(currentListNode.type.create(currentListNode.attrs, afterItems));
        }
        tr.replaceWith(listPos, listPos + currentListNode.nodeSize, slices);
      }
    } else {
      // Top-level list conversion: convert all items in the list
      const newItems: any[] = [];
      for (let i = 0; i < currentListNode.childCount; i++) {
        const child = currentListNode.child(i);
        newItems.push(targetItemNodeType.create(convertedItemAttrs, child.content));
      }
      const newList = targetListNodeType.create(
        targetType === 'bulletList' ? { tight: true } : currentListNode.attrs,
        newItems
      );
      tr.replaceWith(listPos, listPos + currentListNode.nodeSize, newList);
    }

    // Restore cursor position inside the converted item
    const insidePos = Math.min($from.pos, tr.doc.content.size - 1);
    tr.setSelection(Selection.near(tr.doc.resolve(Math.max(1, insidePos))));
    return true;
  });

  editor.commands.focus();
  return true;
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
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState(value);
  const isSourceModeRef = useRef(isSourceMode);
  isSourceModeRef.current = isSourceMode;
  const sourceTextRef = useRef(sourceText);
  sourceTextRef.current = sourceText;
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-forest-700 underline font-medium hover:text-forest-900 cursor-pointer',
          },
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-slate max-w-none focus:outline-none min-h-[300px] p-4 text-slate-800 text-sm leading-relaxed',
        'data-placeholder': placeholder,
      },
      handleKeyDown: (view, event) => {
        // Tab / Shift-Tab indentation for list items
        if (event.key === 'Tab') {
          if (editorRef.current) {
            if (event.shiftKey) {
              const lifted =
                editorRef.current.commands.liftListItem('taskItem') ||
                editorRef.current.commands.liftListItem('listItem');
              if (lifted) {
                event.preventDefault();
                return true;
              }
            } else {
              const sunk =
                editorRef.current.commands.sinkListItem('taskItem') ||
                editorRef.current.commands.sinkListItem('listItem');
              if (sunk) {
                event.preventDefault();
                return true;
              }
            }
          }
        }

        // Keyboard shortcuts for list conversion
        if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
          if (event.key === '8' || event.code === 'Digit8') {
            event.preventDefault();
            if (editorRef.current) convertOrToggleList(editorRef.current, 'bulletList');
            return true;
          }
          if (event.key === '7' || event.code === 'Digit7') {
            event.preventDefault();
            if (editorRef.current) convertOrToggleList(editorRef.current, 'orderedList');
            return true;
          }
          if (event.key === '9' || event.code === 'Digit9') {
            event.preventDefault();
            if (editorRef.current) convertOrToggleList(editorRef.current, 'taskList');
            return true;
          }
        }

        // Inline typing list conversion on Space
        if (event.key === ' ') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const parentText = $from.parent.textContent;
          const offset = $from.parentOffset;
          const textBefore = parentText.slice(0, offset);

          let itemDepth = -1;
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name;
            if (name === 'taskItem' || name === 'listItem') {
              itemDepth = d;
              break;
            }
          }

          if (itemDepth !== -1 && editorRef.current) {
            const itemType = $from.node(itemDepth).type.name;

            // Typing "- " or "* " inside a taskItem -> convert to bulletList
            if (itemType === 'taskItem' && (textBefore === '-' || textBefore === '*')) {
              event.preventDefault();
              const deleteStart = $from.pos - textBefore.length;
              view.dispatch(state.tr.delete(deleteStart, $from.pos));
              convertOrToggleList(editorRef.current, 'bulletList');
              return true;
            }

            // Typing "1. " inside a taskItem -> convert to orderedList
            if (itemType === 'taskItem' && textBefore === '1.') {
              event.preventDefault();
              const deleteStart = $from.pos - textBefore.length;
              view.dispatch(state.tr.delete(deleteStart, $from.pos));
              convertOrToggleList(editorRef.current, 'orderedList');
              return true;
            }

            // Typing "[ ] " inside a listItem -> convert to taskList
            if (itemType === 'listItem' && textBefore === '[ ]') {
              event.preventDefault();
              const deleteStart = $from.pos - textBefore.length;
              view.dispatch(state.tr.delete(deleteStart, $from.pos));
              convertOrToggleList(editorRef.current, 'taskList');
              return true;
            }
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown?.getMarkdown() ?? '';
      onChange(markdown);
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    if (!isSourceModeRef.current && editor && editor.storage?.markdown) {
      const currentMarkdown = editor.storage.markdown.getMarkdown();
      const isDomFocused =
        typeof document !== 'undefined' &&
        editor.view?.dom &&
        (editor.view.dom === document.activeElement || editor.view.dom.contains(document.activeElement));
      if (value !== currentMarkdown && !isDomFocused) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
    if (value !== sourceTextRef.current) {
      setSourceText(value);
      sourceTextRef.current = value;
    }
  }, [value, editor]);

  const handleToggleSourceMode = useCallback(() => {
    if (isSourceModeRef.current) {
      // Switching from Source to WYSIWYG
      editor?.commands.setContent(sourceTextRef.current, { emitUpdate: false });
      setIsSourceMode(false);
    } else {
      // Switching from WYSIWYG to Source
      const currentMarkdown = editor?.storage.markdown?.getMarkdown() ?? sourceTextRef.current;
      setSourceText(currentMarkdown);
      sourceTextRef.current = currentMarkdown;
      setIsSourceMode(true);
    }
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        handleToggleSourceMode();
      }
    },
    [handleToggleSourceMode]
  );

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setSourceText(newText);
    sourceTextRef.current = newText;
    onChange(newText);
  };

  const handleToggleLink = useCallback(() => {
    if (!editor || isSourceMode) return;
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
  }, [editor, isSourceMode]);

  const handleAddDateSection = useCallback(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateText = `${yyyy}-${mm}-${dd}`;
    const dateHeading = `## ${dateText}`;

    if (isSourceModeRef.current) {
      const current = sourceTextRef.current || '';
      const fmMatch = current.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/);
      let updated = '';
      let targetCursor = 0;
      if (fmMatch) {
        const fmEnd = fmMatch[0].length;
        updated = `${current.slice(0, fmEnd)}${dateHeading}\n\n\n${current.slice(fmEnd).trimStart()}`;
        targetCursor = fmEnd + dateHeading.length + 2;
      } else {
        updated = `${dateHeading}\n\n\n${current.trimStart()}`;
        targetCursor = dateHeading.length + 2;
      }
      setSourceText(updated);
      sourceTextRef.current = updated;
      onChange(updated);
      setTimeout(() => {
        if (sourceTextareaRef.current) {
          sourceTextareaRef.current.focus();
          sourceTextareaRef.current.setSelectionRange(targetCursor, targetCursor);
        }
      }, 0);
    } else if (editor) {
      const currentMarkdown = editor.storage?.markdown?.getMarkdown() ?? '';
      const fmMatch = currentMarkdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/);

      if (fmMatch) {
        const fmEnd = fmMatch[0].length;
        const updatedMarkdown = `${currentMarkdown.slice(0, fmEnd)}${dateHeading}\n\n\n${currentMarkdown.slice(fmEnd).trimStart()}`;
        editor.commands.setContent(updatedMarkdown);
        onChange(updatedMarkdown);

        let headingEndPos = -1;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && node.textContent === dateText && headingEndPos === -1) {
            headingEndPos = pos + node.nodeSize;
          }
        });
        if (headingEndPos !== -1) {
          const targetPos = Math.min(headingEndPos + 1, editor.state.doc.content.size);
          editor.chain().focus().setTextSelection(targetPos).run();
        }
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(0, [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: dateText }],
            },
            {
              type: 'paragraph',
            },
          ])
          .run();

        let headingEndPos = -1;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && node.textContent === dateText && headingEndPos === -1) {
            headingEndPos = pos + node.nodeSize;
          }
        });

        if (headingEndPos !== -1) {
          const targetPos = Math.min(headingEndPos + 1, editor.state.doc.content.size);
          editor.chain().focus().setTextSelection(targetPos).run();
        }

        const newMarkdown = editor.storage?.markdown?.getMarkdown() ?? '';
        onChange(newMarkdown);
      }
    }
  }, [editor, onChange]);

  const handleConvertOrToggleList = useCallback(
    (targetType: 'bulletList' | 'orderedList' | 'taskList') => {
      if (!editor || isSourceModeRef.current) return;
      convertOrToggleList(editor, targetType);
    },
    [editor]
  );

  const getButtonClass = (isActive: boolean, disabled: boolean = false) =>
    `p-1.5 rounded transition-colors ${
      disabled
        ? 'opacity-40 cursor-not-allowed text-slate-400'
        : isActive
        ? 'bg-slate-200 text-slate-900 font-semibold'
        : 'text-slate-600 hover:bg-sand-200/70 hover:text-slate-900'
    }`;

  return (
    <div
      ref={(el) => {
        if (el) (el as any).__tiptap_editor = editor;
      }}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      data-testid="markdown-editor-container"
      className={`flex flex-col flex-1 min-h-0 focus:outline-none ${className}`}
    >
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
          disabled={isSourceMode}
          data-testid="toolbar-bold-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={getButtonClass(editor?.isActive('bold') ?? false, isSourceMode)}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Italic (Cmd+I)"
          disabled={isSourceMode}
          data-testid="toolbar-italic-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={getButtonClass(editor?.isActive('italic') ?? false, isSourceMode)}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Heading 1"
          disabled={isSourceMode}
          data-testid="toolbar-h1-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 1 }) ?? false, isSourceMode)}
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 2"
          disabled={isSourceMode}
          data-testid="toolbar-h2-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 2 }) ?? false, isSourceMode)}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 3"
          disabled={isSourceMode}
          data-testid="toolbar-h3-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={getButtonClass(editor?.isActive('heading', { level: 3 }) ?? false, isSourceMode)}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Add section for today's date (## YYYY-MM-DD)"
          data-testid="toolbar-date-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleAddDateSection}
          className={getButtonClass(false, false)}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Bullet list"
          disabled={isSourceMode}
          data-testid="toolbar-bullet-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleConvertOrToggleList('bulletList')}
          className={getButtonClass(editor?.isActive('bulletList') ?? false, isSourceMode)}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Numbered list"
          disabled={isSourceMode}
          data-testid="toolbar-ordered-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleConvertOrToggleList('orderedList')}
          className={getButtonClass(editor?.isActive('orderedList') ?? false, isSourceMode)}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Task list"
          disabled={isSourceMode}
          data-testid="toolbar-task-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleConvertOrToggleList('taskList')}
          className={getButtonClass(editor?.isActive('taskList') ?? false, isSourceMode)}
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <button
          type="button"
          title="Insert link"
          disabled={isSourceMode}
          data-testid="toolbar-link-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleToggleLink}
          className={getButtonClass(editor?.isActive('link') ?? false, isSourceMode)}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Inline code"
          disabled={isSourceMode}
          data-testid="toolbar-code-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={getButtonClass(editor?.isActive('code') ?? false, isSourceMode)}
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Quote"
          disabled={isSourceMode}
          data-testid="toolbar-quote-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={getButtonClass(editor?.isActive('blockquote') ?? false, isSourceMode)}
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-sand-200 mx-1" />

        <div className="ml-auto flex items-center">
          <button
            type="button"
            title={isSourceMode ? 'View Rich Text (Cmd+/)' : 'View Markdown Source (Cmd+/)'}
            data-testid="toolbar-source-toggle-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleSourceMode}
            className={getButtonClass(isSourceMode, false)}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 min-h-[140px] h-full bg-white border border-sand-200 rounded-xl overflow-y-auto flex flex-col">
        {isSourceMode ? (
          <textarea
            ref={sourceTextareaRef}
            data-testid="markdown-source-textarea"
            value={sourceText}
            onChange={handleSourceChange}
            placeholder={placeholder}
            className="font-mono text-xs text-slate-800 p-4 w-full h-full min-h-[300px] flex-1 resize-none focus:outline-none bg-transparent"
            spellCheck={false}
          />
        ) : (
          <EditorContent
            editor={editor}
            data-testid="tiptap-editor-content"
            className="min-h-full"
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
