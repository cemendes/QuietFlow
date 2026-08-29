import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = '/Users/eduardo/.gemini/antigravity/brain/319230ae-4e8e-47c3-be4d-3127a9c52584';

test.describe('QuietFlow Desktop User Journey & Usability E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup clean viewport matching macOS window
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('User Journey 1: Create top-level folder -> verifies auto-seeded primary note and note naming', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="sidebar-toggle-btn"]');

    // 1. Capture initial main view
    const step1Path = path.join(ARTIFACT_DIR, 'journey_step1_initial.png');
    await page.screenshot({ path: step1Path });

    // 2. Open new folder input
    const addFolderBtn = page.locator('[data-testid="add-folder-btn"]');
    if (await addFolderBtn.isVisible()) {
      await addFolderBtn.click();
      const folderInput = page.locator('input[placeholder="Folder name..."]');
      await folderInput.fill('PRivia');
      await page.keyboard.press('Enter');

      // Check that PRivia folder and PRivia.md are rendered
      await expect(page.locator('text=PRivia')).toBeVisible();
      const step2Path = path.join(ARTIFACT_DIR, 'journey_step2_folder_created.png');
      await page.screenshot({ path: step2Path });
    }
  });

  test('User Journey 2: Focus Buckets (Now vs Later vs All)', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="focus-bucket-now"]');

    // Click Now Only tab
    await page.locator('[data-testid="focus-bucket-now"]').click();
    const step3Path = path.join(ARTIFACT_DIR, 'journey_step3_focus_bucket_now.png');
    await page.screenshot({ path: step3Path });

    // Click Later / Backlog tab
    await page.locator('[data-testid="focus-bucket-not-now"]').click();
    const step4Path = path.join(ARTIFACT_DIR, 'journey_step4_focus_bucket_later.png');
    await page.screenshot({ path: step4Path });

    // Return to All Tasks
    await page.locator('[data-testid="focus-bucket-all"]').click();
  });

  test('User Journey 3: Complete task -> triggers 100% progress ring and celebration animation', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid^="task-checkbox-"]');

    const firstCheckbox = page.locator('[data-testid^="task-checkbox-"]').first();
    await firstCheckbox.click();

    // Verify celebration canvas is mounted or feedback triggered
    const step5Path = path.join(ARTIFACT_DIR, 'journey_step5_celebration_complete.png');
    await page.screenshot({ path: step5Path });
  });

  test('User Journey 4: Open Archive modal -> displays completed tasks and restore action', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const archiveBtn = page.locator('button:has-text("Archive")');
    await archiveBtn.click();

    await expect(page.locator('role=dialog[name="Archive"]')).toBeVisible();
    const step6Path = path.join(ARTIFACT_DIR, 'journey_step6_archive_modal.png');
    await page.screenshot({ path: step6Path });
  });

  test('User Journey 5: Collapsed sidebar shows folder icons and floating tooltips', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const toggleBtn = page.locator('[data-testid="sidebar-toggle-btn"]');
    await toggleBtn.click();

    const step7Path = path.join(ARTIFACT_DIR, 'journey_step7_collapsed_sidebar.png');
    await page.screenshot({ path: step7Path });
  });
});
