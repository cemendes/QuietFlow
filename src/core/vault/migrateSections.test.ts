import { describe, expect, it } from 'vitest';
import type { VaultNode } from '../../store/types';
import { planSectionMigration, runSectionMigration, type MigrationIpc } from './migrateSections';

/** In-memory vault: builds the scanned tree from a flat path → content map, like the browser mock. */
function fakeVault(root: string, files: Record<string, string>, dirs: string[] = []) {
  const contents = new Map(Object.entries(files));
  const directories = new Set(dirs);

  const tree = (): VaultNode => {
    const nodes = new Map<string, VaultNode>();
    const ensure = (path: string): VaultNode => {
      const existing = nodes.get(path);
      if (existing) return existing;
      const node: VaultNode = { name: path.split('/').pop()!, path, isDirectory: true, children: [], fileCount: 0 };
      nodes.set(path, node);
      if (path !== root) ensure(path.slice(0, path.lastIndexOf('/'))).children.push(node);
      return node;
    };
    ensure(root);
    for (const d of directories) ensure(d);
    for (const p of contents.keys()) {
      ensure(p.slice(0, p.lastIndexOf('/'))).children.push({
        name: p.split('/').pop()!,
        path: p,
        isDirectory: false,
        children: [],
        fileCount: 0,
      });
    }
    return nodes.get(root)!;
  };

  const ipc: MigrationIpc = {
    readFile: async (p) => contents.get(p) ?? '',
    createDirectory: async (p) => {
      directories.add(p);
    },
    moveEntry: async (from, to) => {
      for (const [p, c] of [...contents]) {
        if (p === from || p.startsWith(`${from}/`)) {
          contents.delete(p);
          contents.set(to + p.slice(from.length), c);
        }
      }
      for (const d of [...directories]) {
        if (d === from || d.startsWith(`${from}/`)) {
          directories.delete(d);
          directories.add(to + d.slice(from.length));
        }
      }
    },
  };

  return { contents, directories, tree, ipc };
}

const TASK_FILE = '---\ntitle: Today\n---\n\n# Tasks\n- [ ] Pay rent @due(2026-11-01)\n\nSome prose.\n';
const PROSE_FILE = '---\ntitle: Ideas\n---\n\n# Ideas\n\nJust thinking out loud.\n';

describe('planSectionMigration', () => {
  it('sends task files to Tarefas and prose-only files to Anotações', async () => {
    const v = fakeVault('/V', { '/V/today.md': TASK_FILE, '/V/ideas.md': PROSE_FILE });
    const moves = await planSectionMigration(v.tree(), '/V', v.ipc.readFile);
    expect(moves).toEqual(
      expect.arrayContaining([
        { from: '/V/today.md', to: '/V/Tarefas/today.md' },
        { from: '/V/ideas.md', to: '/V/Anotações/ideas.md' },
      ]),
    );
    expect(moves).toHaveLength(2);
  });

  it('moves a folder whole, to Tarefas when any file inside has a task', async () => {
    const v = fakeVault('/V', {
      '/V/Customers/Acme.md': PROSE_FILE,
      '/V/Customers/deep/Beta.md': TASK_FILE,
      '/V/Journal/day.md': PROSE_FILE,
    });
    const moves = await planSectionMigration(v.tree(), '/V', v.ipc.readFile);
    expect(moves).toEqual(
      expect.arrayContaining([
        { from: '/V/Customers', to: '/V/Tarefas/Customers' },
        { from: '/V/Journal', to: '/V/Anotações/Journal' },
      ]),
    );
    expect(moves).toHaveLength(2);
  });

  it('leaves non-markdown files where they are', async () => {
    const v = fakeVault('/V', { '/V/logo.png': 'x', '/V/a.md': PROSE_FILE });
    const moves = await planSectionMigration(v.tree(), '/V', v.ipc.readFile);
    expect(moves).toEqual([{ from: '/V/a.md', to: '/V/Anotações/a.md' }]);
  });

  it('plans nothing once a section folder exists', async () => {
    const v = fakeVault('/V', { '/V/a.md': TASK_FILE }, ['/V/Tarefas']);
    expect(await planSectionMigration(v.tree(), '/V', v.ipc.readFile)).toEqual([]);
  });
});

describe('runSectionMigration', () => {
  it('moves files without touching their content and creates both section folders', async () => {
    const v = fakeVault('/V', { '/V/today.md': TASK_FILE, '/V/ideas.md': PROSE_FILE });
    await runSectionMigration(v.tree(), '/V', v.ipc);
    expect(v.contents.get('/V/Tarefas/today.md')).toBe(TASK_FILE);
    expect(v.contents.get('/V/Anotações/ideas.md')).toBe(PROSE_FILE);
    expect(v.contents.has('/V/today.md')).toBe(false);
    expect(v.directories).toEqual(new Set(['/V/Tarefas', '/V/Anotações']));
  });

  it('is a no-op the second time', async () => {
    const v = fakeVault('/V', { '/V/today.md': TASK_FILE });
    await runSectionMigration(v.tree(), '/V', v.ipc);
    const snapshot = new Map(v.contents);
    v.contents.set('/V/later.md', TASK_FILE);
    await runSectionMigration(v.tree(), '/V', v.ipc);
    expect(v.contents.get('/V/later.md')).toBe(TASK_FILE);
    expect(v.contents.get('/V/Tarefas/today.md')).toBe(snapshot.get('/V/Tarefas/today.md'));
  });

  it('never overwrites: an entry whose name collides at the destination stays in place', async () => {
    // Case-only twins land on the same file on case-insensitive disks (Windows, macOS default).
    const v = fakeVault('/V', { '/V/Plan.md': TASK_FILE, '/V/plan.md': TASK_FILE.replace('Pay', 'Buy') });
    await runSectionMigration(v.tree(), '/V', v.ipc);
    const moved = [...v.contents.keys()].filter((p) => p.startsWith('/V/Tarefas/'));
    const stayed = [...v.contents.keys()].filter((p) => !p.startsWith('/V/Tarefas/'));
    expect(moved).toHaveLength(1);
    expect(stayed).toHaveLength(1);
  });
});
