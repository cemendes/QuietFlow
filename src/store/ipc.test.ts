import { describe, it, expect } from 'vitest';
import { ipc } from './ipc';
import { VaultNode } from './types';

const ROOT = '/MockVault';

function findNode(node: VaultNode, path: string): VaultNode | undefined {
  if (node.path === path) return node;
  for (const child of node.children || []) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return undefined;
}

describe('browser mock ipc — vault tree', () => {
  it('lists seeded notes as children of their folder, matching fileCount', async () => {
    const tree = await ipc.initVault(ROOT);
    const customers = findNode(tree, `${ROOT}/Customers`)!;

    expect(customers.isDirectory).toBe(true);
    expect(customers.children.map((c) => c.name)).toEqual(['Acme Corp.md', 'Beta Health.md']);
    expect(customers.fileCount).toBe(2);
  });

  it('shows a note created inside a folder', async () => {
    await ipc.writeFileAtomic(`${ROOT}/Customers/New Note.md`, '# Tasks\n');
    const tree = await ipc.initVault(ROOT);

    const note = findNode(tree, `${ROOT}/Customers/New Note.md`);
    expect(note).toBeDefined();
    expect(note!.isDirectory).toBe(false);
  });

  it('shows an empty subfolder and notes created inside it', async () => {
    await ipc.createDirectory(`${ROOT}/Customers/Archive`);
    let tree = await ipc.initVault(ROOT);

    const archive = findNode(tree, `${ROOT}/Customers/Archive`);
    expect(archive).toBeDefined();
    expect(archive!.isDirectory).toBe(true);
    expect(findNode(tree, `${ROOT}/Customers`)!.children[0].path).toBe(`${ROOT}/Customers/Archive`);

    await ipc.writeFileAtomic(`${ROOT}/Customers/Archive/Old.md`, '# Tasks\n');
    tree = await ipc.initVault(ROOT);
    expect(findNode(tree, `${ROOT}/Customers/Archive/Old.md`)).toBeDefined();
    expect(findNode(tree, `${ROOT}/Customers/Archive`)!.fileCount).toBe(1);
  });

  it('renames a folder together with its contents', async () => {
    await ipc.moveEntry(`${ROOT}/Customers`, `${ROOT}/Clients`);
    const tree = await ipc.initVault(ROOT);

    expect(findNode(tree, `${ROOT}/Customers`)).toBeUndefined();
    expect(findNode(tree, `${ROOT}/Clients/Acme Corp.md`)).toBeDefined();
    expect(findNode(tree, `${ROOT}/Clients/Archive/Old.md`)).toBeDefined();
  });

  it('deletes a folder together with its contents', async () => {
    await ipc.deleteEntry(`${ROOT}/Clients`);
    const tree = await ipc.initVault(ROOT);

    expect(findNode(tree, `${ROOT}/Clients`)).toBeUndefined();
    expect(tree.children.map((c) => c.name)).toEqual(['today.md']);
  });
});
