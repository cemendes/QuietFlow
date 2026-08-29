import React, { useState, useEffect } from 'react';
import {
  Folder,
  Palette,
  Keyboard,
  Info,
  X,
  FolderOpen,
  Check,
  Sparkles,
  Wand2,
  History,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { isTauriEnvironment } from '../../store/ipc';
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  safeRelaunchApp,
  UpdateInfo,
} from '../../utils/updater';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'vault' | 'ai' | 'snapshots' | 'theme' | 'shortcuts' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const loadVault = useVaultStore((state) => state.loadVault);

  const [activeTab, setActiveTab] = useState<TabType>('vault');
  const [tempVaultPath, setTempVaultPath] = useState(vaultPath || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [geminiModel, setGeminiModel] = useState(() => {
    return localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  });
  const [aiSavedSuccess, setAiSavedSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'warm-paper' | 'nordic-slate' | 'forest-moss'>(() => {
    return (localStorage.getItem('quietflow-theme') as any) || 'warm-paper';
  });
  const [shortcutKey] = useState('Option+Shift+Space');
  const [isApplying, setIsApplying] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState('0.1.0-alpha.4');
  const [showChangelogDraft, setShowChangelogDraft] = useState(false);

  useEffect(() => {
    if (isTauriEnvironment()) {
      import('@tauri-apps/api/app')
        .then(({ getVersion }) => getVersion())
        .then((ver) => setAppVersion(ver))
        .catch(() => {});
    }
  }, []);

  // In-app updater states
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'ready' | 'error'
  >('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const update = await checkForAppUpdate();
      if (update) {
        setUpdateInfo(update);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err?.message || 'Failed to check for updates.');
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    setUpdateError(null);
    try {
      await downloadAndInstallUpdate((_downloaded, _total, percent) => {
        setDownloadProgress(percent);
      });
      setUpdateStatus('ready');
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err?.message || 'Download failed or signature verification failed.');
    }
  };

  const handleRelaunch = async () => {
    await safeRelaunchApp();
  };

  const applyTheme = (themeName: 'warm-paper' | 'nordic-slate' | 'forest-moss') => {
    setSelectedTheme(themeName);
    localStorage.setItem('quietflow-theme', themeName);
    document.documentElement.classList.remove('theme-warm-paper', 'theme-nordic-slate', 'theme-forest-moss');
    document.documentElement.classList.add(`theme-${themeName}`);
  };

  useEffect(() => {
    const saved = localStorage.getItem('quietflow-theme') || 'warm-paper';
    document.documentElement.classList.add(`theme-${saved}`);
  }, []);

  useEffect(() => {
    if (vaultPath) {
      setTempVaultPath(vaultPath);
    }
  }, [vaultPath]);

  // Keyboard shortcut listener for Esc key
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

  if (!isOpen) return null;

  const handleBrowseFolder = async () => {
    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const selected = await invoke<string | null>('pick_vault_folder');
        if (selected) {
          setTempVaultPath(selected);
        }
      } catch (err) {
        console.warn('Failed to invoke pick_vault_folder:', err);
      }
    }
  };

  const handleSaveVault = async () => {
    if (!tempVaultPath.trim()) return;
    setIsApplying(true);
    try {
      await loadVault(tempVaultPath.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to load updated vault:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Settings"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="settings-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-200 bg-sand-50/70">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Preferences</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 font-medium">
              QuietFlow v0.1.0-alpha.3
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Settings Pane */}
        <div className="flex flex-1 min-h-[380px] overflow-hidden">
          
          {/* Tab Sidebar */}
          <div className="w-48 bg-sand-50/50 border-r border-sand-200 p-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'vault'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Folder className="w-4 h-4 text-forest-600 shrink-0" />
              Vault Storage
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'ai'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Wand2 className="w-4 h-4 text-emerald-600 shrink-0" />
              AI & Magic Slicer
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('snapshots')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'snapshots'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-teal-600 shrink-0" />
              Snapshots & Swap
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'theme'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Palette className="w-4 h-4 text-amber-600 shrink-0" />
              Theme & Colors
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'shortcuts'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-4 h-4 text-sky-600 shrink-0" />
              Shortcuts
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'about'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4 text-purple-600 shrink-0" />
              About & Status
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'vault' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Local Markdown Vault</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    QuietFlow stores all tasks and notes directly as plain markdown files on your local drive with zero telemetry or lock-in.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="vault-location-input" className="block text-xs font-semibold text-slate-700">
                    Vault Location
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="vault-location-input"
                      type="text"
                      value={tempVaultPath}
                      onChange={(e) => setTempVaultPath(e.target.value)}
                      placeholder="/Users/username/QuietFlowVault"
                      className="flex-1 px-3 py-2 text-xs bg-sand-50 border border-sand-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-sand-100 hover:bg-sand-200 border border-sand-200 rounded-lg text-slate-700 transition-colors shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Browse
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-sand-100">
                  <div className="text-xs text-slate-500">
                    {savedSuccess ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5" /> Vault reloaded successfully
                      </span>
                    ) : (
                      <span>Changes take effect immediately on reload.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveVault}
                    disabled={isApplying || !tempVaultPath.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-xs transition-all"
                  >
                    {isApplying ? 'Applying...' : 'Apply Vault'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Gemini AI & Magic Slicer</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Power the 1-click <b>Magic Slicer</b> task auto-breaker using Google Generative AI. All tasks breakdown into simple, low-friction Markdown checkboxes.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="gemini-key-input" className="block text-xs font-semibold text-slate-700">
                    Google Gemini API Key
                  </label>
                  <input
                    id="gemini-key-input"
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 text-xs bg-sand-50 border border-sand-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Keys are stored only locally in your browser/desktop app. If blank, QuietFlow uses instant offline heuristic breakdown.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="gemini-model-select" className="block text-xs font-semibold text-slate-700">
                    Gemini Model
                  </label>
                  <select
                    id="gemini-model-select"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-sand-50 border border-sand-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Ultra Fast)</option>
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash (Advanced Reasoning)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-sand-100">
                  <div className="text-xs text-slate-500">
                    {aiSavedSuccess && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5" /> AI configuration saved
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('gemini_api_key', geminiApiKey.trim());
                      localStorage.setItem('gemini_model', geminiModel);
                      setAiSavedSuccess(true);
                      setTimeout(() => setAiSavedSuccess(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg font-medium text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save AI Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'snapshots' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Vault Snapshots & Swap Recovery</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    QuietFlow automatically captures safety snapshot copies of your notes before every modification. All backups are stored locally in <code className="bg-sand-100 px-1 py-0.5 rounded text-forest-700">.quietflow/snapshots</code>.
                  </p>
                </div>

                <div className="p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Snapshot Strategy</span>
                    <span className="text-slate-600">Rate-limited Pre-Write (Every 2 min)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Retention Limit</span>
                    <span className="text-slate-600">20 revisions per note</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Expiration Window</span>
                    <span className="text-slate-600">14 days (Auto-pruned)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Storage Overhead</span>
                    <span className="text-emerald-700 font-medium">100% Local / Zero Cloud Leak</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-sand-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">How to Recover Notes</div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Right-click any note in the sidebar and select <span className="font-semibold text-slate-700">"Version History"</span> to preview past revisions and restore any snapshot with 1 click. If a corrupted file is detected, QuietFlow will automatically display an instant recovery banner.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Color Palette & Aesthetics</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Designed with soothing natural tones (warm sand, deep forest green, and subtle terracotta) for all-day focus.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    data-testid="theme-option-warm-paper"
                    onClick={() => applyTheme('warm-paper')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all text-left w-full ${
                      selectedTheme === 'warm-paper'
                        ? 'border-forest-600 bg-forest-50/20 ring-1 ring-forest-600'
                        : 'border-sand-200 hover:border-sand-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-sand-300 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[#1E3F20]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Warm Sand & Forest (Default)</div>
                        <div className="text-[11px] text-slate-500">Soft linen background with calming evergreen accents</div>
                      </div>
                    </div>
                    {selectedTheme === 'warm-paper' && <Check className="w-4 h-4 text-forest-700" />}
                  </button>

                  <button
                    type="button"
                    data-testid="theme-option-nordic-slate"
                    onClick={() => applyTheme('nordic-slate')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all text-left w-full ${
                      selectedTheme === 'nordic-slate'
                        ? 'border-forest-600 bg-forest-50/20 ring-1 ring-forest-600'
                        : 'border-sand-200 hover:border-sand-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-slate-800" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Nordic Minimalist</div>
                        <div className="text-[11px] text-slate-500">Crisp high-contrast neutrals with muted slate accents</div>
                      </div>
                    </div>
                    {selectedTheme === 'nordic-slate' && <Check className="w-4 h-4 text-forest-700" />}
                  </button>

                  <button
                    type="button"
                    data-testid="theme-option-forest-moss"
                    onClick={() => applyTheme('forest-moss')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all text-left w-full ${
                      selectedTheme === 'forest-moss'
                        ? 'border-forest-600 bg-forest-50/20 ring-1 ring-forest-600'
                        : 'border-sand-200 hover:border-sand-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Deep Moss Dark Mode</div>
                        <div className="text-[11px] text-slate-500">Night owls deep forest palette with glowing accents</div>
                      </div>
                    </div>
                    {selectedTheme === 'forest-moss' && <Check className="w-4 h-4 text-forest-700" />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Keyboard Shortcuts</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Designed for fast keyboard-first operation anywhere in macOS.
                  </p>
                </div>

                <div className="space-y-2.5 divide-y divide-sand-100">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Global Quick Capture</div>
                      <div className="text-[11px] text-slate-400">Trigger spotlight input anywhere across macOS</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      {shortcutKey}
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">In-App Quick Capture</div>
                      <div className="text-[11px] text-slate-400">Open capture modal inside the app</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘K
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">New Task / Note</div>
                      <div className="text-[11px] text-slate-400">Focus quick add input or create note</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘N
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Toggle Sidebar</div>
                      <div className="text-[11px] text-slate-400">Collapse or expand navigation sidebar</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘B
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Dismiss / Close</div>
                      <div className="text-[11px] text-slate-400">Close drawer, modal, or blur inputs</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-forest-700" />
                    <h3 className="text-sm font-bold text-slate-800">QuietFlow Desktop</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A calm, local-first markdown task manager crafted for deep work, speed, and privacy.
                  </p>
                </div>

                <div className="p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Current Version</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-700 font-medium">
                      <span data-testid="app-current-version">v{appVersion}</span>
                      {import.meta.env.DEV && typeof __COMMIT_HASH__ !== 'undefined' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sand-200/70 text-slate-600 font-mono">
                          dev · {__COMMIT_HASH__}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Architecture</span>
                    <span className="text-slate-700">Tauri v2 + React 18 + Rust Core</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Storage Backend</span>
                    <span className="text-slate-700">Plaintext Markdown (Filesystem)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Sync & Privacy</span>
                    <span className="text-emerald-700 font-medium">100% Local / Zero Cloud Leak</span>
                  </div>

                  {import.meta.env.DEV ? (
                    <div className="flex justify-between items-center pt-2 border-t border-sand-200/60">
                      <span className="text-slate-500">Development Draft</span>
                      <button
                        type="button"
                        data-testid="toggle-changelog-draft-btn"
                        onClick={() => setShowChangelogDraft(!showChangelogDraft)}
                        className="text-forest-700 hover:text-forest-900 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-forest-600" />
                        <span>{showChangelogDraft ? 'Hide Changelog Draft' : 'View Changelog Draft'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-2 border-t border-sand-200/60">
                      <span className="text-slate-500">Release Notes</span>
                      <button
                        type="button"
                        data-testid="view-public-changelog-btn"
                        onClick={async () => {
                          const url = 'https://github.com/cemendes/QuietFlow/blob/main/CHANGELOG.md';
                          if (isTauriEnvironment()) {
                            try {
                              const { open } = await import('@tauri-apps/plugin-shell');
                              await open(url);
                              return;
                            } catch {
                              // Fallback
                            }
                          }
                          window.open(url, '_blank');
                        }}
                        className="text-forest-700 hover:text-forest-900 font-semibold cursor-pointer flex items-center gap-1.5 hover:underline"
                      >
                        <span>View Full Changelog</span>
                        <ExternalLink className="w-3 h-3 text-forest-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Dev Changelog Draft Viewer */}
                {import.meta.env.DEV && showChangelogDraft && (
                  <div className="p-4 bg-white rounded-xl border border-forest-200/80 shadow-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-sand-100">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-forest-700" />
                        <span>Changelog Draft (Unreleased Changes)</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-forest-100 text-forest-700 font-semibold">
                        CHANGELOG.md
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1.5 font-sans leading-relaxed pt-1">
                      <div className="font-semibold text-slate-800">✨ Added in this local build:</div>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
                        <li><span className="font-medium text-slate-700">Vault Snapshots & Swap Engine:</span> Auto rate-limited pre-write backups in <code className="bg-sand-100 px-1 py-0.5 rounded">.quietflow/snapshots</code> with 20-version / 14-day auto-pruning.</li>
                        <li><span className="font-medium text-slate-700">Corruption Guard:</span> Proactive empty/corrupted note detection with 1-click restore banner.</li>
                        <li><span className="font-medium text-slate-700">Note Version History Modal:</span> Timeline viewer, task count diffs, and on-demand snapshots.</li>
                        <li><span className="font-medium text-slate-700">Full-Page Task Detail View:</span> Dedicated canvas view with markdown notes & comments activity feed.</li>
                        <li><span className="font-medium text-slate-700">Autonomous Menu Crawler:</span> 17-state Playwright crawler exploring all menus, modals, and context actions.</li>
                        <li><span className="font-medium text-slate-700">Chaos Monkey Harness:</span> Gremlins stress testing firing 1,000 rapid interactions.</li>
                        <li><span className="font-medium text-slate-700">Markdown Parser Fuzzing:</span> 100-iteration random garbage fuzzer and URL hashtag fixes.</li>
                        <li><span className="font-medium text-slate-700">Pre-version Gatekeeper:</span> Automated release checks running Rust backend + Vitest + Playwright.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Software Update Card */}
                <div className="p-4 bg-white rounded-xl border border-sand-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Software Updates</div>
                      <div className="text-[11px] text-slate-500">
                        {updateStatus === 'idle' && 'Check for latest improvements and security updates.'}
                        {updateStatus === 'checking' && 'Checking GitHub Releases for updates...'}
                        {updateStatus === 'available' && `New release v${updateInfo?.version} is available!`}
                        {updateStatus === 'up-to-date' && 'QuietFlow is up to date.'}
                        {updateStatus === 'downloading' && `Downloading update... ${downloadProgress}%`}
                        {updateStatus === 'ready' && 'Update downloaded! Ready to install.'}
                        {updateStatus === 'error' && (updateError || 'Failed to check for updates.')}
                      </div>
                    </div>

                    {updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error' ? (
                      <button
                        type="button"
                        data-testid="check-updates-btn"
                        onClick={handleCheckUpdates}
                        className="px-3 py-1.5 text-xs font-semibold text-forest-700 bg-sand-100 hover:bg-sand-200 border border-sand-300 rounded-lg transition-colors"
                      >
                        Check for Updates
                      </button>
                    ) : updateStatus === 'checking' ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-sand-50 border border-sand-200 rounded-lg cursor-not-allowed"
                      >
                        Checking...
                      </button>
                    ) : updateStatus === 'available' ? (
                      <button
                        type="button"
                        data-testid="download-update-btn"
                        onClick={handleDownloadUpdate}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-forest-700 hover:bg-forest-800 shadow-xs rounded-lg transition-colors"
                      >
                        Download & Install
                      </button>
                    ) : updateStatus === 'ready' ? (
                      <button
                        type="button"
                        data-testid="relaunch-update-btn"
                        onClick={handleRelaunch}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs rounded-lg transition-colors"
                      >
                        Relaunch Now
                      </button>
                    ) : null}
                  </div>

                  {/* Download Progress Bar */}
                  {updateStatus === 'downloading' && (
                    <div className="w-full bg-sand-100 rounded-full h-2 overflow-hidden border border-sand-200">
                      <div
                        data-testid="update-progress-bar"
                        className="bg-forest-600 h-2 rounded-full transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Release Notes Preview */}
                  {updateInfo?.body && (
                    <div className="p-2.5 bg-sand-50/80 rounded-lg border border-sand-200/80 text-[11px] text-slate-600 whitespace-pre-line">
                      <div className="font-semibold text-slate-700 mb-1">Release Notes:</div>
                      {updateInfo.body}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
