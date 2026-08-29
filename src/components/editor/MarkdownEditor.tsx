import React, { useState } from 'react';
import { Eye, Edit3 } from 'lucide-react';

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
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const renderFormattedText = (str: string) => {
    // Match markdown links [text](url) or plain URLs
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    const elements: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        elements.push(str.substring(lastIndex, match.index));
      }

      if (match[1] && match[2]) {
        // [text](url)
        elements.push(
          <a
            key={match.index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="text-forest-700 hover:text-forest-900 underline font-medium hover:bg-forest-50 px-1 py-0.5 rounded transition-colors"
          >
            {match[1]}
          </a>
        );
      } else if (match[3]) {
        // Raw URL
        elements.push(
          <a
            key={match.index}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="text-forest-700 hover:text-forest-900 underline font-medium hover:bg-forest-50 px-1 py-0.5 rounded transition-colors"
          >
            {match[3]}
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < str.length) {
      elements.push(str.substring(lastIndex));
    }

    return elements.length > 0 ? elements : str;
  };

  const renderSimpleMarkdown = (text: string) => {
    if (!text.trim()) {
      return <p className="text-slate-400 italic text-sm">No notes entered.</p>;
    }

    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-sm text-slate-700 leading-relaxed font-normal">
        {lines.map((line, index) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h3 key={index} className="text-base font-semibold text-forest-800 pt-2 pb-0.5">
                {renderFormattedText(line.replace(/^###\s+/, ''))}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={index} className="text-lg font-bold text-forest-800 pt-2 pb-0.5 border-b border-sand-200">
                {renderFormattedText(line.replace(/^##\s+/, ''))}
              </h2>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h1 key={index} className="text-xl font-bold text-forest-800 pt-2 pb-1 border-b border-sand-200">
                {renderFormattedText(line.replace(/^#\s+/, ''))}
              </h1>
            );
          }

          // Bullet list items
          if (/^-\s+/.test(line)) {
            return (
              <li key={index} className="list-disc list-inside ml-2">
                {renderFormattedText(line.replace(/^-\s+/, ''))}
              </li>
            );
          }

          // Numbered list items
          if (/^\d+\.\s+/.test(line)) {
            return (
              <li key={index} className="list-decimal list-inside ml-2">
                {renderFormattedText(line.replace(/^\d+\.\s+/, ''))}
              </li>
            );
          }

          // Empty line
          if (line.trim() === '') {
            return <div key={index} className="h-2" />;
          }

          return <p key={index}>{renderFormattedText(line)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col flex-1 ${className}`}>
      {/* Editor / Preview Toolbar Tabs */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</span>
        <div className="flex items-center bg-sand-100 p-0.5 rounded-lg border border-sand-200">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'edit'
                ? 'bg-white text-forest-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'preview'
                ? 'bg-white text-forest-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview Content Area */}
      {mode === 'edit' ? (
        <textarea
          data-testid="markdown-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full flex-1 min-h-[140px] p-3 text-sm text-slate-800 bg-white border border-sand-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all font-mono leading-relaxed"
        />
      ) : (
        <div
          data-testid="markdown-preview"
          className="w-full flex-1 min-h-[140px] p-3 text-sm bg-white border border-sand-200 rounded-xl overflow-y-auto"
        >
          {renderSimpleMarkdown(value)}
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
