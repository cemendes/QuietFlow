import { describe, it, expect, vi } from 'vitest';
import { ensureRootTaskList } from './rootTaskList';
import type { VaultNode } from '../../store/types';

const file = (path: string): VaultNode => ({
  name: path.split(/[\\/]/).pop()!,
  path,
  isDirectory: false,
  fileCount: 0,
  children: [],
});

function vault(tasksChildren: VaultNode[], root = '/vault', sep = '/'): VaultNode {
  return {
    name: 'vault',
    path: root,
    isDirectory: true,
    fileCount: 0,
    children: [
      { name: 'Tarefas', path: `${root}${sep}Tarefas`, isDirectory: true, fileCount: 0, children: tasksChildren },
      { name: 'Anotações', path: `${root}${sep}Anotações`, isDirectory: true, fileCount: 0, children: [] },
    ],
  };
}

function fakeIpc(disk: Record<string, string>) {
  return {
    readFile: vi.fn(async (p: string) => disk[p]),
    writeFile: vi.fn(async (p: string, c: string) => {
      disk[p] = c;
    }),
    moveEntry: vi.fn(async (from: string, to: string) => {
      disk[to] = disk[from];
      delete disk[from];
    }),
  };
}

describe('ensureRootTaskList', () => {
  it('turns an old Inbox.md into Tarefas.md, keeping its tasks and renaming its title', async () => {
    const disk: Record<string, string> = {
      '/vault/Tarefas/Inbox.md': '---\ntitle: Inbox\n---\n\n# Inbox\n- [ ] Comprar whey #saude\n- [x] Pagar academia\n',
    };
    const ipc = fakeIpc(disk);

    const changed = await ensureRootTaskList(vault([file('/vault/Tarefas/Inbox.md')]), '/vault', ipc);

    expect(changed).toBe(true);
    expect(disk['/vault/Tarefas/Inbox.md']).toBeUndefined();
    expect(disk['/vault/Tarefas/Tarefas.md']).toBe(
      '---\ntitle: Tarefas\n---\n\n# Tarefas\n- [ ] Comprar whey #saude\n- [x] Pagar academia\n',
    );
  });

  it('keeps native Windows separators', async () => {
    const root = 'C:\\Users\\me/Documents/QuietFlowVault';
    const inbox = `${root}\\Tarefas\\Inbox.md`;
    const disk: Record<string, string> = { [inbox]: '# Inbox\n' };
    const ipc = fakeIpc(disk);

    await ensureRootTaskList(vault([file(inbox)], root, '\\'), root, ipc);

    expect(ipc.moveEntry).toHaveBeenCalledWith(inbox, `${root}\\Tarefas\\Tarefas.md`);
  });

  it('creates Tarefas.md when there is no root list at all', async () => {
    const disk: Record<string, string> = {};
    const ipc = fakeIpc(disk);

    const changed = await ensureRootTaskList(vault([]), '/vault', ipc);

    expect(changed).toBe(true);
    expect(disk['/vault/Tarefas/Tarefas.md']).toBe('---\ntitle: Tarefas\n---\n\n');
  });

  it('does nothing when Tarefas.md already exists', async () => {
    const disk: Record<string, string> = { '/vault/Tarefas/Tarefas.md': '- [ ] a\n' };
    const ipc = fakeIpc(disk);

    const changed = await ensureRootTaskList(
      vault([file('/vault/Tarefas/Tarefas.md'), file('/vault/Tarefas/Inbox.md')]),
      '/vault',
      ipc,
    );

    expect(changed).toBe(false);
    expect(ipc.moveEntry).not.toHaveBeenCalled();
    expect(ipc.writeFile).not.toHaveBeenCalled();
  });
});
