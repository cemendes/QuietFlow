import { describe, expect, it } from 'vitest';
import type { VaultNode } from '../../store/types';
import { SECTION_FOLDERS, sectionOfPath, sectionRootPath, sectionSubtree } from './sections';

const dir = (path: string, children: VaultNode[] = []): VaultNode => ({
  name: path.split(/[\\/]/).pop() || '',
  path,
  isDirectory: true,
  children,
  fileCount: 0,
});
const file = (path: string): VaultNode => ({ ...dir(path), isDirectory: false });

describe('section folders', () => {
  it('uses fixed folder names that do not depend on the UI language', () => {
    expect(SECTION_FOLDERS).toEqual({ tasks: 'Tarefas', notes: 'Anotações' });
  });

  it('finds each section subtree among the vault root children', () => {
    const tasks = dir('/V/Tarefas', [file('/V/Tarefas/Inbox.md')]);
    const notes = dir('/V/Anotações');
    const tree = dir('/V', [notes, tasks, file('/V/loose.md')]);
    expect(sectionSubtree(tree, 'tasks')).toBe(tasks);
    expect(sectionSubtree(tree, 'notes')).toBe(notes);
    expect(sectionSubtree(null, 'notes')).toBeNull();
  });

  it('matches a decomposed (NFD) folder name, as macOS file systems may report it', () => {
    const notes = dir('/V/Anotações'.normalize('NFD'));
    expect(sectionSubtree(dir('/V', [notes]), 'notes')).toBe(notes);
  });

  it('prefers the native path of an existing section folder and falls back to a joined path', () => {
    const tree = dir('C:\\V', [dir('C:\\V\\Tarefas')]);
    expect(sectionRootPath(tree, 'C:\\V', 'tasks')).toBe('C:\\V\\Tarefas');
    expect(sectionRootPath(tree, 'C:\\V', 'notes')).toBe('C:\\V/Anotações');
  });

  it('tells which section a path belongs to, whatever the separators', () => {
    expect(sectionOfPath('/V/Tarefas/Inbox.md', '/V')).toBe('tasks');
    expect(sectionOfPath('C:\\V\\Anotações\\Ideias\\a.md', 'C:\\V')).toBe('notes');
    expect(sectionOfPath('C:\\V/Tarefas\\x.md', 'C:\\V')).toBe('tasks');
    expect(sectionOfPath('/V/Tarefas', '/V')).toBe('tasks');
    expect(sectionOfPath('/V/loose.md', '/V')).toBeNull();
    expect(sectionOfPath('/Other/Tarefas/x.md', '/V')).toBeNull();
    expect(sectionOfPath('/V/TarefasExtra/x.md', '/V')).toBeNull();
  });
});
