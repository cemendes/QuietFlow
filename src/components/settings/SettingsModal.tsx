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
  Languages,
} from 'lucide-react';
import { useVaultStore } from '../../store';
import { isTauriEnvironment } from '../../store/ipc';
import { LANGUAGES, useTranslation } from '../../i18n';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'vault' | 'ai' | 'theme' | 'language' | 'shortcuts' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const loadVault = useVaultStore((state) => state.loadVault);
  const { t, language, setLanguage } = useTranslation();

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
      aria-label={t('settings.label')}
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
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{t('settings.title')}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 font-medium">
              QuietFlow v0.1.0-alpha.2
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('settings.close')}
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
              {t('settings.tab.vault')}
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
              {t('settings.tab.ai')}
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
              {t('settings.tab.theme')}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('language')}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                activeTab === 'language'
                  ? 'bg-sand-200 text-forest-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
              }`}
            >
              <Languages className="w-4 h-4 text-rose-600 shrink-0" />
              {t('settings.tab.language')}
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
              {t('settings.tab.shortcuts')}
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
              {t('settings.tab.about')}
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'vault' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{t('settings.vault.title')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('settings.vault.description')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="vault-location-input" className="block text-xs font-semibold text-slate-700">
                    {t('settings.vault.location')}
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
                      {t('settings.vault.browse')}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-sand-100">
                  <div className="text-xs text-slate-500">
                    {savedSuccess ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5" /> {t('settings.vault.reloaded')}
                      </span>
                    ) : (
                      <span>{t('settings.vault.hint')}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveVault}
                    disabled={isApplying || !tempVaultPath.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-xs transition-all"
                  >
                    {isApplying ? t('settings.vault.applying') : t('settings.vault.apply')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{t('settings.ai.title')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('settings.ai.descBefore')} <b>Magic Slicer</b> {t('settings.ai.descAfter')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="gemini-key-input" className="block text-xs font-semibold text-slate-700">
                    {t('settings.ai.keyLabel')}
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
                    {t('settings.ai.keyHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="gemini-model-select" className="block text-xs font-semibold text-slate-700">
                    {t('settings.ai.model')}
                  </label>
                  <select
                    id="gemini-model-select"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-sand-50 border border-sand-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  >
                    <option value="gemini-2.5-flash">{t('settings.ai.modelFlash25')}</option>
                    <option value="gemini-3.7-flash">{t('settings.ai.modelFlash37')}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-sand-100">
                  <div className="text-xs text-slate-500">
                    {aiSavedSuccess && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5" /> {t('settings.ai.saved')}
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
                    {t('settings.ai.save')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{t('settings.theme.title')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('settings.theme.description')}
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
                        <div className="text-xs font-bold text-slate-800">{t('settings.theme.warmName')}</div>
                        <div className="text-[11px] text-slate-500">{t('settings.theme.warmDesc')}</div>
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
                        <div className="text-xs font-bold text-slate-800">{t('settings.theme.nordicName')}</div>
                        <div className="text-[11px] text-slate-500">{t('settings.theme.nordicDesc')}</div>
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
                        <div className="text-xs font-bold text-slate-800">{t('settings.theme.mossName')}</div>
                        <div className="text-[11px] text-slate-500">{t('settings.theme.mossDesc')}</div>
                      </div>
                    </div>
                    {selectedTheme === 'forest-moss' && <Check className="w-4 h-4 text-forest-700" />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{t('settings.language.title')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('settings.language.description')}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {LANGUAGES.map(({ code, nativeName }) => (
                    <button
                      key={code}
                      type="button"
                      data-testid={`language-option-${code}`}
                      aria-pressed={language === code}
                      onClick={() => setLanguage(code)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all text-left w-full ${
                        language === code
                          ? 'border-forest-600 bg-forest-50/20 ring-1 ring-forest-600'
                          : 'border-sand-200 hover:border-sand-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{nativeName}</div>
                        <div className="text-[11px] text-slate-500">{t(`language.${code}`)}</div>
                      </div>
                      {language === code && <Check className="w-4 h-4 text-forest-700" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{t('settings.shortcuts.title')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('settings.shortcuts.description')}
                  </p>
                </div>

                <div className="space-y-2.5 divide-y divide-sand-100">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{t('settings.shortcuts.globalCapture')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.shortcuts.globalCaptureDesc')}</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      {shortcutKey}
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{t('settings.shortcuts.inAppCapture')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.shortcuts.inAppCaptureDesc')}</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘K
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{t('settings.shortcuts.newTask')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.shortcuts.newTaskDesc')}</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘N
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{t('settings.shortcuts.toggleSidebar')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.shortcuts.toggleSidebarDesc')}</div>
                    </div>
                    <kbd className="px-2 py-1 bg-sand-100 border border-sand-200 rounded text-xs font-mono font-semibold text-slate-700">
                      ⌘B
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{t('settings.shortcuts.dismiss')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.shortcuts.dismissDesc')}</div>
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
                    {t('settings.about.description')}
                  </p>
                </div>

                <div className="p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('settings.about.version')}</span>
                    <span className="font-mono text-slate-700">0.1.0-alpha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('settings.about.architecture')}</span>
                    <span className="text-slate-700">Tauri v2 + React 18 + Rust Core</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('settings.about.storage')}</span>
                    <span className="text-slate-700">{t('settings.about.storageValue')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('settings.about.sync')}</span>
                    <span className="text-emerald-700 font-medium">{t('settings.about.syncValue')}</span>
                  </div>
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
