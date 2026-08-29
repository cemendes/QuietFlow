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
    startWatchingVault: vi.fn(),
    listenVaultChanged: vi.fn(),
  },
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
});
