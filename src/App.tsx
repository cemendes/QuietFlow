import { useEffect, useState } from 'react';
import { useVaultStore } from './store';
import { ipc } from './store/ipc';
import { Sidebar } from './components/sidebar';
import { TaskList } from './components/tasks';
import { KanbanBoard } from './components/kanban';
import { TaskDetailPage } from './components/editor';
import { QuickCaptureModal } from './components/capture';
import { SettingsModal } from './components/settings';
import { ArchiveModal } from './components/archive/ArchiveModal';
import { BreadcrumbBanner } from './components/breadcrumb/BreadcrumbBanner';
import { UpdateToast } from './components/updater/UpdateToast';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export default function App() {
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const activeView = useVaultStore((state) => state.activeView);
  const activeTaskId = useVaultStore((state) => state.activeTaskId);
  const setActiveTaskId = useVaultStore((state) => state.setActiveTaskId);
  const loadVault = useVaultStore((state) => state.loadVault);
  const selectFile = useVaultStore((state) => state.selectFile);
  const createFile = useVaultStore((state) => state.createFile);
  const vaultTree = useVaultStore((state) => state.vaultTree);

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Auto-initialize vault & theme on first mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('quietflow-theme') || 'warm-paper';
    document.documentElement.classList.add(`theme-${savedTheme}`);

    const initDefaultVault = async () => {
      if (!vaultTree) {
        const savedBackend = await ipc.getSavedVaultPath().catch(() => null);
        const savedStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('quietflow-vault-path') : null;
        const defaultPath = await ipc.getDefaultVaultPath();
        const targetPath = savedBackend || savedStorage || vaultPath || defaultPath;
        loadVault(targetPath);
      }
    };
    initDefaultVault();
  }, [loadVault, vaultPath, vaultTree]);

  // Keyboard shortcut listener: Cmd+N for quick note creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Register global / in-app shortcut bindings
  useGlobalShortcuts({
    onToggleCapture: () => {
      setIsQuickCaptureOpen((prev) => !prev);
    },
  });

  // Additional in-app keyboard shortcuts: Cmd+N (new note / capture), Cmd+, (settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle new note creation
  const handleNewNote = async () => {
    if (!vaultPath) return;
    const now = new Date();
    const fileName = `Note-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.md`;
    const newFilePath = `${vaultPath}/${fileName}`;
    const initialContent = `---\ntitle: New Note\ndate: ${now.toISOString().split('T')[0]}\n---\n\n# Tasks\n\n- [ ] `;
    await createFile(newFilePath, initialContent);
  };

  return (
    <div className="flex h-screen w-screen bg-sand-50 text-slate-800 antialiased select-none overflow-hidden font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        onSelectFile={(filePath) => selectFile(filePath)}
        onNewNote={handleNewNote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenArchive={() => setIsArchiveOpen(true)}
      />

      {/* 2. Main Content Canvas: Full-Page Task Detail OR Task List / Kanban Board */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {activeTaskId ? (
          <TaskDetailPage onBack={() => setActiveTaskId(null)} />
        ) : activeView === 'kanban' ? (
          <KanbanBoard />
        ) : (
          <TaskList />
        )}
      </div>

      {/* 4. Quick Capture Modal Spotlight */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
      />

      {/* 5. App Settings / Vault Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 6. Completed Tasks Archive Modal */}
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />

      {/* 7. Cognitive Re-entry Breadcrumb Banner */}
      <BreadcrumbBanner />

      {/* 8. In-App Auto Update Toast Notification */}
      <UpdateToast />
    </div>
  );
}
