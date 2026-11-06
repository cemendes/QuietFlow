import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVaultStore } from './vaultStore';
import { ipc } from './ipc';
import { TaskItem, VaultNode } from './types';

// Mock ipc wrapper module
vi.mock('./ipc', () => ({
  ipc: {
    initVault: vi.fn(),
    readFile: vi.fn(),
    writeFileAtomic: vi.fn(),
    createDirectory: vi.fn(),
    deleteEntry: vi.fn(),
    moveEntry: vi.fn(),
    startWatchingVault: vi.fn(),
    listenVaultChanged: vi.fn().mockResolvedValue(() => {}),
    getSavedVaultPath: vi.fn().mockResolvedValue('/MockVault'),
    setSavedVaultPath: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/logoService', () => ({
  loadLogoConfig: vi.fn().mockResolvedValue({}),
  persistFolderEmoji: vi.fn().mockResolvedValue(undefined),
  persistFolderLogo: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  getFolderRelativePath: vi.fn().mockReturnValue(''),
}));

describe('VaultStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({
      vaultPath: null,
      vaultTree: null,
      activeFile: null,
      activeDocument: null,
      tasks: [],
      activeTaskId: null,
      searchQuery: '',
      activeView: 'list',
      selectedTag: null,
      selectedPriority: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const state = useVaultStore.getState();
    expect(state.vaultPath).toBeNull();
    expect(state.vaultTree).toBeNull();
    expect(state.activeFile).toBeNull();
    expect(state.tasks).toEqual([]);
    expect(state.activeTaskId).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.activeView).toBe('list');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('toggles task status optimistically and syncs to disk', async () => {
    const markdownContent = `---
title: Test Note
---

# Tasks
- [ ] Task 1 @priority(high)
`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    const store = useVaultStore.getState();
    useVaultStore.setState({
      activeFile: '/vault/test.md',
      tasks: [
        {
          id: 'task-5-task-1',
          title: 'Task 1',
          status: 'todo',
          priority: 'high',
          tags: [],
          rawLine: '- [ ] Task 1 @priority(high)',
          lineIndex: 5,
          filePath: '/vault/test.md',
        },
      ],
    });

    await store.toggleTask('task-5-task-1');

    // Optimistic state update check
    const updatedTasks = useVaultStore.getState().tasks;
    expect(updatedTasks[0].status).toBe('done');
    expect(updatedTasks[0].completedDate).toBeDefined();

    // Verify IPC call to atomic write with updated content
    expect(ipc.writeFileAtomic).toHaveBeenCalledTimes(1);
    expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
      '/vault/test.md',
      expect.stringContaining('- [x] Task 1 @priority(high) @completed(')
    );
  });

  it('toggles a completed task back to todo', async () => {
    const markdownContent = `---
title: Test Note
---

# Tasks
- [x] Task 1 @completed(2026-08-27)
`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    useVaultStore.setState({
      activeFile: '/vault/test.md',
      tasks: [
        {
          id: 'task-5-task-1',
          title: 'Task 1',
          status: 'done',
          tags: [],
          rawLine: '- [x] Task 1 @completed(2026-08-27)',
          lineIndex: 5,
          filePath: '/vault/test.md',
        },
      ],
    });

    await useVaultStore.getState().toggleTask('task-5-task-1');

    const updatedTasks = useVaultStore.getState().tasks;
    expect(updatedTasks[0].status).toBe('todo');
    expect(updatedTasks[0].completedDate).toBeUndefined();

    expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
      '/vault/test.md',
      expect.stringContaining('- [ ] Task 1')
    );
  });

  it('loads vault tree and starts watching', async () => {
    const mockTree: VaultNode = {
      name: 'MyVault',
      path: '/vault',
      isDirectory: true,
      children: [
        {
          name: 'Inbox.md',
          path: '/vault/Inbox.md',
          isDirectory: false,
          children: [],
          fileCount: 0,
        },
      ],
      fileCount: 1,
    };

    vi.mocked(ipc.initVault).mockResolvedValue(mockTree);
    vi.mocked(ipc.startWatchingVault).mockResolvedValue(undefined);
    vi.mocked(ipc.readFile).mockResolvedValue('# Inbox\n- [ ] First task\n');

    await useVaultStore.getState().loadVault('/vault');

    const state = useVaultStore.getState();
    expect(state.vaultPath).toBe('/vault');
    expect(state.vaultTree).toEqual(mockTree);
    expect(ipc.initVault).toHaveBeenCalledWith('/vault');
    expect(ipc.startWatchingVault).toHaveBeenCalledWith('/vault');
  });

  describe('section folders', () => {
    const sectionedTree = (): VaultNode => ({
      name: 'MyVault',
      path: '/vault',
      isDirectory: true,
      fileCount: 2,
      children: [
        {
          name: 'Anotações',
          path: '/vault/Anotações',
          isDirectory: true,
          fileCount: 1,
          children: [
            { name: 'Ideas.md', path: '/vault/Anotações/Ideas.md', isDirectory: false, children: [], fileCount: 0 },
          ],
        },
        {
          name: 'Tarefas',
          path: '/vault/Tarefas',
          isDirectory: true,
          fileCount: 1,
          children: [
            { name: 'Tarefas.md', path: '/vault/Tarefas/Tarefas.md', isDirectory: false, children: [], fileCount: 0 },
          ],
        },
      ],
    });

    beforeEach(() => {
      vi.mocked(ipc.startWatchingVault).mockResolvedValue(undefined);
      vi.mocked(ipc.readFile).mockResolvedValue('# Tarefas\n- [ ] First task\n');
      useVaultStore.getState().reset();
    });

    it('starts on the Notes section at Anotações, with Tasks remembered at the Tarefas grid', async () => {
      vi.mocked(ipc.initVault).mockResolvedValue(sectionedTree());

      await useVaultStore.getState().loadVault('/vault');

      let state = useVaultStore.getState();
      expect(state.section).toBe('notes');
      expect(state.activeFile).toBeNull();
      expect(state.activeFolder).toBe('/vault/Anotações');
      expect(state.sectionSelection.tasks).toEqual({ file: null, folder: '/vault/Tarefas' });
      expect(ipc.moveEntry).not.toHaveBeenCalled();

      await useVaultStore.getState().setSection('tasks');
      state = useVaultStore.getState();
      expect(state.activeFolder).toBe('/vault/Tarefas');
      expect(state.activeFile).toBeNull();
      expect(state.activeView).toBe('home');
      expect(state.tasks).toEqual([]);
    });

    it('creates the root task list Tarefas/Tarefas.md when Tarefas/ has none', async () => {
      const tree = sectionedTree();
      tree.children[1].children = [];
      vi.mocked(ipc.initVault).mockResolvedValue(tree);

      await useVaultStore.getState().loadVault('/vault');

      expect(ipc.writeFileAtomic).toHaveBeenCalledWith('/vault/Tarefas/Tarefas.md', expect.stringContaining('title: Tarefas'));
    });

    it('turns an old Tarefas/Inbox.md into Tarefas/Tarefas.md, keeping its tasks', async () => {
      const tree = sectionedTree();
      tree.children[1].children = [
        { name: 'Inbox.md', path: '/vault/Tarefas/Inbox.md', isDirectory: false, children: [], fileCount: 0 },
      ];
      vi.mocked(ipc.initVault).mockResolvedValue(tree);
      vi.mocked(ipc.readFile).mockResolvedValue('---\ntitle: Inbox\n---\n\n# Inbox\n- [ ] First task\n');

      await useVaultStore.getState().loadVault('/vault');

      expect(ipc.moveEntry).toHaveBeenCalledWith('/vault/Tarefas/Inbox.md', '/vault/Tarefas/Tarefas.md');
      expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
        '/vault/Tarefas/Tarefas.md',
        '---\ntitle: Tarefas\n---\n\n# Tarefas\n- [ ] First task\n',
      );
    });

    it('migrates a legacy vault into the section folders on first load', async () => {
      vi.mocked(ipc.initVault)
        .mockResolvedValueOnce({
          name: 'MyVault',
          path: '/vault',
          isDirectory: true,
          fileCount: 1,
          children: [
            { name: 'Inbox.md', path: '/vault/Inbox.md', isDirectory: false, children: [], fileCount: 0 },
          ],
        })
        .mockResolvedValue(sectionedTree());

      await useVaultStore.getState().loadVault('/vault');

      expect(ipc.createDirectory).toHaveBeenCalledWith('/vault/Tarefas');
      expect(ipc.createDirectory).toHaveBeenCalledWith('/vault/Anotações');
      expect(ipc.moveEntry).toHaveBeenCalledWith('/vault/Inbox.md', '/vault/Tarefas/Inbox.md');
      expect(useVaultStore.getState().vaultTree).toEqual(sectionedTree());
    });

    it('selectTaskFolder shows the Tasks grid for a folder without loading tasks', () => {
      useVaultStore.setState({ vaultPath: '/vault', vaultTree: sectionedTree(), tasks: [{ id: 'x' } as TaskItem] });

      useVaultStore.getState().selectTaskFolder('/vault/Tarefas');

      const state = useVaultStore.getState();
      expect(state.activeFolder).toBe('/vault/Tarefas');
      expect(state.activeFile).toBeNull();
      expect(state.activeView).toBe('home');
      expect(state.tasks).toEqual([]);
    });

    it('openTaskList opens one list in the Tasks section', async () => {
      useVaultStore.setState({ vaultPath: '/vault', vaultTree: sectionedTree(), section: 'notes', activeView: 'document' });

      await useVaultStore.getState().openTaskList('/vault/Tarefas/Inbox.md');

      const state = useVaultStore.getState();
      expect(state.section).toBe('tasks');
      expect(state.activeFile).toBe('/vault/Tarefas/Inbox.md');
      expect(state.activeView).toBe('list');
      expect(state.tasks.map((t) => t.title)).toEqual(['First task']);
    });
  });

  it('selectFolder aggregates all tasks across all notes inside the folder', async () => {
    const mockTree: VaultNode = {
      name: 'Vault',
      path: '/vault',
      isDirectory: true,
      fileCount: 2,
      children: [
        {
          name: 'CCO',
          path: '/vault/CCO',
          isDirectory: true,
          fileCount: 2,
          children: [
            {
              name: '2026-08-28.md',
              path: '/vault/CCO/2026-08-28.md',
              isDirectory: false,
              fileCount: 0,
              children: [],
            },
            {
              name: '2026-08-29.md',
              path: '/vault/CCO/2026-08-29.md',
              isDirectory: false,
              fileCount: 0,
              children: [],
            },
          ],
        },
      ],
    };

    useVaultStore.setState({ vaultTree: mockTree, vaultPath: '/vault' });

    const note1 = `# Tasks\n- [ ] Task from note 1 @priority(high)`;
    const note2 = `# Tasks\n- [/] Task from note 2 @status(in-progress)`;

    vi.mocked(ipc.readFile).mockImplementation(async (path: string) => {
      if (path === '/vault/CCO/2026-08-28.md') return note1;
      if (path === '/vault/CCO/2026-08-29.md') return note2;
      return '';
    });

    await useVaultStore.getState().selectFolder('/vault/CCO');

    const state = useVaultStore.getState();
    expect(state.activeFolder).toBe('/vault/CCO');
    expect(state.activeFile).toBeNull();
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].title).toBe('Task from note 1');
    expect(state.tasks[0].filePath).toBe('/vault/CCO/2026-08-28.md');
    expect(state.tasks[1].title).toBe('Task from note 2');
    expect(state.tasks[1].filePath).toBe('/vault/CCO/2026-08-29.md');
  });

  it('selects a file and parses tasks into store', async () => {
    const markdownContent = `---
title: Project Plan
---

# Tasks
- [ ] Implement auth @priority(high) #security
  - Notes: Use OAuth2 PKCE flow
- [/] Setup database @priority(medium)
`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);

    await useVaultStore.getState().selectFile('/vault/plan.md');

    const state = useVaultStore.getState();
    expect(state.activeFile).toBe('/vault/plan.md');
    expect(state.activeDocument?.frontmatter.title).toBe('Project Plan');
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].title).toBe('Implement auth');
    expect(state.tasks[0].priority).toBe('high');
    expect(state.tasks[0].tags).toContain('security');
    expect(state.tasks[0].notes).toBe('Use OAuth2 PKCE flow');
    expect(state.tasks[1].status).toBe('in-progress');
  });

  it('updates task properties optimistically and syncs to disk', async () => {
    const markdownContent = `# Tasks\n- [ ] Update documentation\n`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    useVaultStore.setState({
      activeFile: '/vault/docs.md',
      tasks: [
        {
          id: 'task-1-update-documentation',
          title: 'Update documentation',
          status: 'todo',
          tags: [],
          rawLine: '- [ ] Update documentation',
          lineIndex: 1,
          filePath: '/vault/docs.md',
        },
      ],
    });

    await useVaultStore.getState().updateTask('task-1-update-documentation', {
      priority: 'high',
      dueDate: '2026-09-01',
    });

    const task = useVaultStore.getState().tasks[0];
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-09-01');
    expect(ipc.writeFileAtomic).toHaveBeenCalled();
  });

  it('adds a new task to the active document and syncs to disk', async () => {
    const markdownContent = `# Deliverables & Tasks\n- [ ] Existing task\n`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    useVaultStore.setState({
      activeFile: '/vault/tasks.md',
      tasks: [
        {
          id: 'task-1-existing-task',
          title: 'Existing task',
          status: 'todo',
          tags: [],
          rawLine: '- [ ] Existing task',
          lineIndex: 1,
          filePath: '/vault/tasks.md',
        },
      ],
    });

    await useVaultStore.getState().addTask({
      title: 'New shiny feature',
      priority: 'medium',
      tags: ['feature'],
    });

    expect(ipc.writeFileAtomic).toHaveBeenCalled();
    const tasks = useVaultStore.getState().tasks;
    expect(tasks.some((t) => t.title === 'New shiny feature')).toBe(true);
    expect(useVaultStore.getState().isSaving).toBe(false);
  });

  it('handles identical/duplicate task titles uniquely by line index and temp IDs', async () => {
    const markdownContent = `# Tasks\n- [ ] Review PR\n- [ ] Review PR\n`;
    vi.mocked(ipc.readFile).mockResolvedValue(markdownContent);
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    useVaultStore.setState({
      activeFile: '/vault/tasks.md',
      tasks: [
        {
          id: 'task-1-review-pr',
          title: 'Review PR',
          status: 'todo',
          tags: [],
          rawLine: '- [ ] Review PR',
          lineIndex: 1,
          filePath: '/vault/tasks.md',
        },
        {
          id: 'task-2-review-pr',
          title: 'Review PR',
          status: 'todo',
          tags: [],
          rawLine: '- [ ] Review PR',
          lineIndex: 2,
          filePath: '/vault/tasks.md',
        },
      ],
    });

    // Toggle the second identical task
    await useVaultStore.getState().toggleTask('task-2-review-pr');

    const tasks = useVaultStore.getState().tasks;
    expect(tasks[0].status).toBe('todo');
    expect(tasks[1].status).toBe('done');
  });

  it('reverts optimistic state and resets isSaving on failure', async () => {
    vi.mocked(ipc.readFile).mockRejectedValue(new Error('Disk write error'));

    const initialTasks = [
      {
        id: 'task-1-test',
        title: 'Test task',
        status: 'todo' as const,
        tags: [],
        rawLine: '- [ ] Test task',
        lineIndex: 1,
        filePath: '/vault/test.md',
      },
    ];

    useVaultStore.setState({
      activeFile: '/vault/test.md',
      tasks: initialTasks,
    });

    await useVaultStore.getState().toggleTask('task-1-test');

    const state = useVaultStore.getState();
    expect(state.tasks[0].status).toBe('todo');
    expect(state.error).toContain('Disk write error');
    expect(state.isSaving).toBe(false);
  });

  it('supports UI state switching: search, view mode, task selection', () => {
    const store = useVaultStore.getState();

    store.setSearchQuery('review');
    expect(useVaultStore.getState().searchQuery).toBe('review');

    store.setActiveView('kanban');
    expect(useVaultStore.getState().activeView).toBe('kanban');

    store.setActiveTaskId('task-1');
    expect(useVaultStore.getState().activeTaskId).toBe('task-1');

    store.setSelectedTag('work');
    expect(useVaultStore.getState().selectedTag).toBe('work');

    store.setSelectedPriority('high');
    expect(useVaultStore.getState().selectedPriority).toBe('high');
  });

  it('moves task from one markdown file to another atomically', async () => {
    const sourceFile = '/vault/Inbox.md';
    const destFile = '/vault/Projects/Client.md';

    const sourceContent = `# Tasks\n- [ ] Task to move @high #work\n  - Notes: Some notes\n`;
    const destContent = `# Deliverables\n- [ ] Existing client task\n`;

    vi.mocked(ipc.readFile).mockImplementation(async (path: string) => {
      if (path === sourceFile) return sourceContent;
      if (path === destFile) return destContent;
      return '';
    });

    const initialTasks: TaskItem[] = [
      {
        id: 'task-task-to-move',
        title: 'Task to move',
        status: 'todo',
        priority: 'high',
        tags: ['work'],
        notes: 'Some notes',
        filePath: sourceFile,
      },
    ];

    useVaultStore.setState({
      activeFile: sourceFile,
      tasks: initialTasks,
    });

    await useVaultStore.getState().moveTask('task-task-to-move', sourceFile, destFile);

    expect(ipc.writeFileAtomic).toHaveBeenCalledWith(sourceFile, expect.not.stringContaining('Task to move'));
    expect(ipc.writeFileAtomic).toHaveBeenCalledWith(destFile, expect.stringContaining('Task to move'));
  });

  it('renameNote updates the frontmatter title and renames the file, leaving the body untouched', async () => {
    const raw = `---
title: Nova anotação
date: 2026-10-19
---

# Meeting

- [ ] Follow up #work
`;
    const files: Record<string, string> = { '/vault/Nova anotação.md': raw, '/vault/Ideias.md': 'x' };
    const tree = (): VaultNode => ({
      name: 'vault', path: '/vault', isDirectory: true, fileCount: Object.keys(files).length,
      children: Object.keys(files).map((p) => ({
        name: p.slice('/vault/'.length), path: p, isDirectory: false, children: [], fileCount: 0,
      })),
    });
    vi.mocked(ipc.initVault).mockImplementation(async () => tree());
    vi.mocked(ipc.readFile).mockImplementation(async (p: string) => files[p]);
    vi.mocked(ipc.writeFileAtomic).mockImplementation(async (p: string, c: string) => { files[p] = c; });
    vi.mocked(ipc.moveEntry).mockImplementation(async (from: string, to: string) => {
      files[to] = files[from];
      delete files[from];
    });
    useVaultStore.setState({ vaultPath: '/vault', vaultTree: tree() });
    await useVaultStore.getState().selectFile('/vault/Nova anotação.md');

    // "Ideias" is taken, so the file gets a numbered name while the title stays as typed
    const newPath = await useVaultStore.getState().renameNote('/vault/Nova anotação.md', 'Ideias');

    expect(newPath).toBe('/vault/Ideias 2.md');
    expect(files['/vault/Nova anotação.md']).toBeUndefined();
    expect(files['/vault/Ideias 2.md']).toBe(raw.replace('title: Nova anotação', 'title: Ideias'));
    expect(files['/vault/Ideias.md']).toBe('x');
    expect(useVaultStore.getState().activeFile).toBe('/vault/Ideias 2.md');
  });

  it('renameNote keeps a note inside its folder on Windows paths with mixed separators', async () => {
    // Real path shape from the native app: saved vault path uses "/", files inside use "\"
    const vault = 'C:\\Users\\rgrsa/Documents/QuietFlowVault';
    const oldPath = `${vault}\\Nova anotação.md`;
    const files: Record<string, string> = { [oldPath]: '---\ntitle: Nova anotação\n---\n\n' };
    vi.mocked(ipc.initVault).mockImplementation(async () => ({
      name: 'QuietFlowVault', path: vault, isDirectory: true, fileCount: 1,
      children: Object.keys(files).map((p) => ({ name: p.slice(vault.length + 1), path: p, isDirectory: false, children: [], fileCount: 0 })),
    }));
    vi.mocked(ipc.readFile).mockImplementation(async (p: string) => files[p]);
    vi.mocked(ipc.writeFileAtomic).mockImplementation(async (p: string, c: string) => { files[p] = c; });
    vi.mocked(ipc.moveEntry).mockImplementation(async (from: string, to: string) => {
      files[to] = files[from];
      delete files[from];
    });
    useVaultStore.setState({ vaultPath: vault, vaultTree: await ipc.initVault(vault) });
    await useVaultStore.getState().selectFile(oldPath);

    const newPath = await useVaultStore.getState().renameNote(oldPath, 'Reunião');

    expect(newPath).toBe(`${vault}\\Reunião.md`);
    expect(Object.keys(files)).toEqual([`${vault}\\Reunião.md`]);
  });
});

describe('VaultStore content revision & addTaskToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({ activeFile: null, tasks: [], contentRevision: 0, error: null });
  });

  it('writes a task into a list that is not open and bumps contentRevision', async () => {
    vi.mocked(ipc.readFile).mockResolvedValue('# Inbox\n- [ ] Existing\n');
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    await useVaultStore.getState().addTaskToFile('/vault/Tarefas/Inbox.md', { title: 'Brand new', status: 'todo' });

    expect(ipc.writeFileAtomic).toHaveBeenCalledWith(
      '/vault/Tarefas/Inbox.md',
      expect.stringContaining('- [ ] Brand new'),
    );
    expect(useVaultStore.getState().contentRevision).toBe(1);
    expect(useVaultStore.getState().tasks).toEqual([]);
  });

  it('adds through the open list when the target is the active file', async () => {
    useVaultStore.setState({ activeFile: '/vault/Tarefas/Inbox.md' });
    vi.mocked(ipc.readFile).mockResolvedValue('# Inbox\n');
    vi.mocked(ipc.writeFileAtomic).mockResolvedValue(undefined);

    await useVaultStore.getState().addTaskToFile('/vault/Tarefas/Inbox.md', { title: 'Brand new', status: 'todo' });

    expect(useVaultStore.getState().tasks.map((t) => t.title)).toEqual(['Brand new']);
    expect(useVaultStore.getState().contentRevision).toBeGreaterThan(0);
  });
});

describe('VaultStore saveDocumentProse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({ activeFile: null, activeDocument: null, tasks: [], error: null });
  });

  it("saving a note that is not the active one keeps that note's own frontmatter and leaves the active document alone", async () => {
    const academia = '/vault/Anotações/Academia/Nova anotação.md';
    const financeiro = '/vault/Anotações/Financeiro/Nova anotação.md';
    const disk: Record<string, string> = {
      [academia]: '---\ntitle: Treino\n---\n\ntexto da academia\n',
      [financeiro]: '---\ntitle: Contas\n---\n\nconteudo financeiro\n',
    };
    vi.mocked(ipc.readFile).mockImplementation(async (p: string) => disk[p] ?? '');
    vi.mocked(ipc.writeFileAtomic).mockImplementation(async (p: string, c: string) => {
      disk[p] = c;
    });

    await useVaultStore.getState().selectFile(financeiro);
    // A late auto-save for the note that was open before
    await useVaultStore.getState().saveDocumentProse(academia, 'texto da academia editado');

    expect(disk[academia]).toBe('---\ntitle: Treino\n---\n\ntexto da academia editado\n');
    expect(disk[financeiro]).toBe('---\ntitle: Contas\n---\n\nconteudo financeiro\n');
    const s = useVaultStore.getState();
    expect(s.activeFile).toBe(financeiro);
    expect(s.activeDocument?.filePath).toBe(financeiro);
    expect(s.activeDocument?.body).toContain('conteudo financeiro');
  });
});

describe('VaultStore — untouched new notes are discarded', () => {
  const draft = '/vault/Anotações/Academia/Nova anotação.md';
  const other = '/vault/Anotações/Academia/PR\'s.md';
  const initial = '---\ntitle: Nova anotação\n---\n\n';
  let disk: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();
    disk = { [other]: '---\ntitle: PR\'s\n---\n\nsupino 100kg\n' };
    vi.mocked(ipc.readFile).mockImplementation(async (p: string) => {
      if (!(p in disk)) throw new Error(`missing ${p}`);
      return disk[p];
    });
    vi.mocked(ipc.writeFileAtomic).mockImplementation(async (p: string, c: string) => {
      disk[p] = c;
    });
    vi.mocked(ipc.deleteEntry).mockImplementation(async (p: string) => {
      delete disk[p];
    });
    vi.mocked(ipc.moveEntry).mockImplementation(async (from: string, to: string) => {
      disk[to] = disk[from];
      delete disk[from];
    });
    vi.mocked(ipc.initVault).mockResolvedValue({ name: 'vault', path: '/vault', isDirectory: true, fileCount: 0, children: [] });
    useVaultStore.setState({ vaultPath: '/vault', section: 'notes' });
  });

  const settle = () => new Promise((r) => setTimeout(r, 0));

  it('deletes a new note left without a title or text', async () => {
    await useVaultStore.getState().createFile(draft, initial, { discardIfUntouched: true });
    expect(useVaultStore.getState().activeFile).toBe(draft);

    await useVaultStore.getState().openNote(other);
    await settle();

    expect(ipc.deleteEntry).toHaveBeenCalledWith(draft);
    expect(draft in disk).toBe(false);
    expect(useVaultStore.getState().activeFile).toBe(other);
  });

  it('also discards it when leaving to the notes home or the other section', async () => {
    await useVaultStore.getState().createFile(draft, initial, { discardIfUntouched: true });
    await useVaultStore.getState().setSection('tasks');
    await settle();

    expect(draft in disk).toBe(false);
    // Coming back must not try to reopen the discarded note
    await useVaultStore.getState().setSection('notes');
    expect(useVaultStore.getState().activeFile).toBeNull();
  });

  it('keeps the note once it has text', async () => {
    await useVaultStore.getState().createFile(draft, initial, { discardIfUntouched: true });
    await useVaultStore.getState().saveDocumentProse(draft, 'agachamento');
    await useVaultStore.getState().openNote(other);
    await settle();

    expect(ipc.deleteEntry).not.toHaveBeenCalled();
    expect(disk[draft]).toContain('agachamento');
  });

  it('keeps the note once it has a title', async () => {
    await useVaultStore.getState().createFile(draft, initial, { discardIfUntouched: true });
    const renamed = await useVaultStore.getState().renameNote(draft, 'Treinos');
    await useVaultStore.getState().openNote(other);
    await settle();

    expect(ipc.deleteEntry).not.toHaveBeenCalled();
    expect(disk[renamed]).toContain('title: Treinos');
  });

  it('never discards notes that were not just created', async () => {
    disk[draft] = initial;
    await useVaultStore.getState().openNote(draft);
    await useVaultStore.getState().openNote(other);
    await settle();

    expect(ipc.deleteEntry).not.toHaveBeenCalled();
  });
});
