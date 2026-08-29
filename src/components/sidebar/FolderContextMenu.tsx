import React, { useState, useEffect, useRef } from 'react';
import { Edit3, FilePlus, FolderPlus, Trash2, Image, Smile } from 'lucide-react';

export interface FolderContextMenuProps {
  folderName: string;
  folderPath: string;
  isDirectory: boolean;
  onRename: (newName: string) => void;
  onAddNote?: () => void;
  onAddSubfolder?: () => void;
  onDelete: () => void;
  onSetEmoji?: (emoji: string) => void;
  onUploadLogo?: (dataUrl: string) => void;
  onClose: () => void;
}

const PRESET_EMOJIS = ['💼', '🚀', '⭐', '🔥', '🎯', '🌿', '💡', '📌', '📦', '⚡'];

export const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  folderName,
  isDirectory,
  onRename,
  onAddNote,
  onAddSubfolder,
  onDelete,
  onSetEmoji,
  onUploadLogo,
  onClose,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedValue, setRenamedValue] = useState(folderName);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRenamedValue(folderName);
  }, [folderName]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use mousedown so clicks outside register immediately
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size threshold (warn if > 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file is large. Recommended size is under 500 KB for optimal speed.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = document.createElement('img');
        img.onload = () => {
          // Downscale & center-crop to a clean 128x128 square
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);
            const optimizedDataUrl = canvas.toDataURL('image/png');
            onUploadLogo?.(optimizedDataUrl);
          } else {
            onUploadLogo?.(reader.result as string);
          }
          onClose();
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      ref={menuRef}
      data-testid="folder-context-menu"
      className="absolute right-2 top-8 z-50 w-52 bg-white border border-sand-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {isRenaming ? (
        <div className="px-3 py-2 flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            ref={(input) => {
              if (input) {
                input.focus();
                input.select();
              }
            }}
            onFocus={(e) => e.target.select()}
            value={renamedValue}
            onChange={(e) => setRenamedValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (renamedValue.trim()) {
                  onRename(renamedValue.trim());
                  onClose();
                }
              } else if (e.key === 'Escape') {
                setIsRenaming(false);
              }
            }}
            className="flex-1 px-2 py-1 bg-sand-50 border border-sand-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
          <button
            type="button"
            onClick={() => {
              if (renamedValue.trim()) {
                onRename(renamedValue.trim());
                onClose();
              }
            }}
            className="px-2 py-1 text-[10px] font-semibold text-white bg-forest-700 hover:bg-forest-800 rounded"
          >
            Save
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-sand-100 transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            <span>Rename</span>
          </button>

          {isDirectory && onAddNote && (
            <button
              type="button"
              onClick={() => {
                onAddNote();
                onClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-sand-100 transition-colors text-left"
            >
              <FilePlus className="w-3.5 h-3.5 text-stone-500" />
              <span>Add Note</span>
            </button>
          )}

          {isDirectory && onAddSubfolder && (
            <button
              type="button"
              onClick={() => {
                onAddSubfolder();
                onClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-sand-100 transition-colors text-left"
            >
              <FolderPlus className="w-3.5 h-3.5 text-stone-500" />
              <span>New Subfolder</span>
            </button>
          )}

          {isDirectory && (
            <>
              <div className="h-px bg-sand-200 my-1" />

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-sand-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Smile className="w-3.5 h-3.5 text-stone-500" />
                  <span>Choose Folder Icon</span>
                </div>
              </button>

              {showEmojiPicker && (
                <div className="grid grid-cols-5 gap-1 px-3 py-1.5 bg-sand-50 rounded-lg mx-2 mb-1">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSetEmoji?.(emoji);
                        onClose();
                      }}
                      className="text-base p-1 hover:bg-sand-200 rounded transition-transform hover:scale-110 text-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <label className="flex flex-col gap-0.5 px-3 py-1.5 hover:bg-sand-100 transition-colors text-left cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Image className="w-3.5 h-3.5 text-stone-500" />
                  <span className="font-medium text-slate-800">Upload Company Logo</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-5 leading-tight">
                  Square PNG/SVG, transparent, &lt;500KB
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </>
          )}

          <div className="h-px bg-sand-200 my-1" />

          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
};

export default FolderContextMenu;
