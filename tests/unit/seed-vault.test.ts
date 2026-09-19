import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTestVault } from '../fixtures/seed-vault';

describe('createTestVault', () => {
  let cleanupFn: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanupFn) {
      await cleanupFn();
      cleanupFn = null;
    }
  });

  it('generates an isolated test vault with project folders and markdown notes', async () => {
    const { vaultPath, cleanup } = await createTestVault();
    cleanupFn = cleanup;

    expect(fs.existsSync(vaultPath)).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, '01 - Projects'))).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, '01 - Projects', 'Q4 Roadmap.md'))).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, '02 - Areas', 'Personal.md'))).toBe(true);
    expect(fs.existsSync(path.join(vaultPath, 'Inbox.md'))).toBe(true);

    const content = fs.readFileSync(path.join(vaultPath, '01 - Projects', 'Q4 Roadmap.md'), 'utf-8');
    expect(content).toContain('- [ ] Launch beta release');
    expect(content).toContain('  - Notes: Beta release checklist');
    expect(content).toContain('  - Comment (You, 2026-09-18 10:00): Ready for QA');
  });
});
