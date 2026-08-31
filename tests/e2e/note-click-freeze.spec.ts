import { test, expect } from '@playwright/test';

test.describe('Note Click & Document View Responsiveness Test', () => {
  test('creates folders, notes, rapidly switches between them, and verifies zero freeze', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message + '\n' + err.stack);
    });

    // 1. Navigate to app
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('aside')).toBeVisible();

    // 2. Create a customer folder "Acme Corp"
    const addFolderBtn = page.locator('button[title="New Folder"]');
    if (await addFolderBtn.isVisible()) {
      await addFolderBtn.click();
      const folderInput = page.locator('input[placeholder="Folder name..."]');
      await expect(folderInput).toBeVisible();
      await folderInput.fill('Acme Corp');
      await folderInput.press('Enter');
      await page.waitForTimeout(500);
    }

    // 3. Create another customer folder "Stripe"
    if (await addFolderBtn.isVisible()) {
      await addFolderBtn.click();
      const folderInput = page.locator('input[placeholder="Folder name..."]');
      await expect(folderInput).toBeVisible();
      await folderInput.fill('Stripe');
      await folderInput.press('Enter');
      await page.waitForTimeout(500);
    }

    // 4. Click all visible notes in the sidebar
    const fileItems = page.locator('[data-testid^="file-item-"]');
    let count = await fileItems.count();
    console.log(`Found ${count} total note files`);

    for (let i = 0; i < count; i++) {
      const item = fileItems.nth(i);
      const name = await item.textContent();
      console.log(`Selecting note ${i}: ${name}`);
      await item.click();
      await page.waitForTimeout(300);

      // Verify Document Canvas or Zones render
      const topZone = page.locator('[data-testid="top-tasks-zone"]');
      const bottomZone = page.locator('[data-testid="bottom-notes-zone"]');
      const hasTop = await topZone.isVisible().catch(() => false);
      const hasBottom = await bottomZone.isVisible().catch(() => false);
      expect(hasTop || hasBottom).toBe(true);

      // Try typing in the prose editor if visible
      const editor = page.locator('textarea, [contenteditable="true"]').first();
      if (await editor.isVisible()) {
        await editor.fill(`Testing note content for ${name}\n\n- [ ] Action item generated during test\n`);
        await page.waitForTimeout(200);
      }
    }

    // 5. Test Quick File Switcher (Cmd+O)
    console.log('Testing Quick File Switcher...');
    await page.keyboard.press('Meta+o');
    await page.waitForTimeout(300);
    const switcherModal = page.locator('[data-testid="quick-file-switcher"]');
    if (await switcherModal.isVisible()) {
      const switcherInput = page.locator('[data-testid="quick-file-switcher-input"]');
      if (await switcherInput.isVisible()) {
        await switcherInput.fill('today');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
      }
    }

    // 6. Test Lens Cycling (Cmd+E)
    console.log('Testing Cmd+E Lens toggle...');
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(200);
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(200);
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(200);

    // 7. Rapid note switching stress test
    console.log('Rapid switching between notes...');
    for (let cycle = 0; cycle < 5; cycle++) {
      const total = await fileItems.count();
      for (let i = 0; i < total; i++) {
        await fileItems.nth(i).click();
      }
    }
    await page.waitForTimeout(1000);

    // 8. Assert zero page crashes or infinite loop errors
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter(e => !e.includes('HTMLCanvasElement'))).toEqual([]);
  });
});
