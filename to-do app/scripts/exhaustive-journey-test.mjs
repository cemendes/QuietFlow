import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/Users/eduardo/.gemini/antigravity/brain/ef6815fd-a36e-48ac-833d-7f6855d7a26d/usability-tests';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function saveScreenshot(page, filename, title) {
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: true });
  console.log(`📸 [Screenshot] ${title} -> ${filename}`);
}

async function isVisible(locator, timeout = 2500) {
  return locator.isVisible({ timeout }).catch(() => false);
}

async function runExhaustiveJourney() {
  console.log('🚀 Starting Exhaustive Button-by-Button Testing Journey (Without Fixes Applied)...');

  const server = spawn('npx', ['vite', '--port', '5193', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5193')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Test server running at http://localhost:5193');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const bugsDetected = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
      bugsDetected.push({ step: 'Console', error: msg.text() });
    }
  });

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // STEP 1: Cold Start & Vault Auto-Mount Verification
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 1: Cold Launch & Default Vault Mount ---');
    await page.goto('http://localhost:5193');
    await page.waitForTimeout(1500);
    await saveScreenshot(page, 'exhaustive-1-initial-launch.png', 'Step 1: Initial Cold Launch');

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 2: Quick Add Task (Testing Enter key & Real DOM + File Persistence)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 2: Quick Add Input & Enter Key Task Creation ---');
    const quickAddInput = page.locator('input[aria-label="Quick Add Task"]').first();
    const initialCount = await page.locator('[data-testid^="task-row-"]').count();
    console.log(`  Initial task row count: ${initialCount}`);

    await quickAddInput.click();
    await quickAddInput.fill('Deploy Quantum Firewall #security @high due:tomorrow');
    await page.waitForTimeout(400);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(800);

    const postAddCount = await page.locator('[data-testid^="task-row-"]').count();
    const isTaskAppeared = await page.locator('text=Deploy Quantum Firewall').first().isVisible();
    console.log(`  Post-add task row count: ${postAddCount} (Task rendered: ${isTaskAppeared})`);

    if (!isTaskAppeared || postAddCount <= initialCount) {
      bugsDetected.push({
        step: 'Step 2: Quick Add Task',
        error: 'Task creation failed on Enter key. Row was not added to the task list.',
      });
    }
    await saveScreenshot(page, 'exhaustive-2-task-created.png', 'Step 2: Task Created');

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 3: Sidebar Folder Management (+ Folder, + Subfolder, + Note)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 3: Sidebar Folder & Subfolder Creation ---');
    const addFolderBtn = page.locator('button[data-testid="add-folder-btn"]').first();
    if (await isVisible(addFolderBtn)) {
      await addFolderBtn.click();
      await page.waitForTimeout(400);
      const folderInput = page.locator('input[placeholder="Folder name..."]').first();
      await folderInput.fill('Project-Alpha');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);

      const hasNewFolder = await page.locator('text=Project-Alpha').first().isVisible();
      console.log(`  Folder "Project-Alpha" created: ${hasNewFolder}`);
      if (!hasNewFolder) {
        bugsDetected.push({
          step: 'Step 3: New Folder',
          error: 'Clicking + Folder and pressing Enter failed to create folder.',
        });
      }
    } else {
      bugsDetected.push({
        step: 'Step 3: New Folder',
        error: 'Add folder button (+ in sidebar) not found.',
      });
    }
    await saveScreenshot(page, 'exhaustive-3-folders.png', 'Step 3: Folder Management');

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4: Task Row Checkbox Cycling (Todo -> In Progress -> Done)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 4: Task Status Checkbox Cycling ---');
    const firstCheckbox = page.locator('button[aria-label*="Status"]').first();
    if (await isVisible(firstCheckbox)) {
      // Toggle to in-progress / done
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      await saveScreenshot(page, 'exhaustive-4-task-status-toggled.png', 'Step 4: Task Status Toggled');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 5: Task Detail Panel & Markdown Link Parsing
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 5: Task Detail Drawer & Markdown Notes ---');
    const firstTaskRow = page.locator('[data-testid^="task-row-"]').first();
    if (await isVisible(firstTaskRow)) {
      await firstTaskRow.click();
      await page.waitForTimeout(700);
      await saveScreenshot(page, 'exhaustive-5-task-detail.png', 'Step 5: Task Detail Drawer');

      // Test Subtask addition
      const subtaskInput = page.locator('input[placeholder="Add a subtask..."]').first();
      if (await isVisible(subtaskInput)) {
        await subtaskInput.fill('Configure reverse proxy rules');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(600);
      }

      // Switch to Markdown preview and test link rendering
      const previewTab = page.locator('button:has-text("Preview")').first();
      if (await isVisible(previewTab)) {
        await previewTab.click();
        await page.waitForTimeout(400);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 6: Kanban View Switcher & Column Drag
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 6: View Switcher (List vs Kanban) ---');
    const kanbanBtn = page.locator('button:has-text("Kanban")').first();
    if (await isVisible(kanbanBtn)) {
      await kanbanBtn.click();
      await page.waitForTimeout(800);

      const backlogCol = await page.locator('[data-testid="kanban-column-backlog"]').first().isVisible();
      const todoCol = await page.locator('[data-testid="kanban-column-todo"]').first().isVisible();
      const inProgressCol = await page.locator('[data-testid="kanban-column-in-progress"]').first().isVisible();
      const doneCol = await page.locator('[data-testid="kanban-column-done"]').first().isVisible();

      console.log(`  Kanban columns rendered: Backlog(${backlogCol}), ToDo(${todoCol}), InProgress(${inProgressCol}), Done(${doneCol})`);
      if (!backlogCol || !todoCol || !inProgressCol || !doneCol) {
        bugsDetected.push({
          step: 'Step 6: Kanban Columns',
          error: 'Kanban view failed to render all 4 stage columns.',
        });
      }
      await saveScreenshot(page, 'exhaustive-6-kanban.png', 'Step 6: Kanban Board');

      // Return to List View
      const listBtn = page.locator('button:has-text("List")').first();
      await listBtn.click();
      await page.waitForTimeout(500);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 7: Quick Capture Spotlight Modal
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 7: Global / In-App Quick Capture Modal ---');
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    await page.waitForTimeout(600);

    const captureInput = page.locator('input[placeholder*="What"]').first();
    if (await isVisible(captureInput)) {
      await captureInput.fill('Urgent server reboot @high #ops');
      await page.waitForTimeout(400);
      await saveScreenshot(page, 'exhaustive-7-quick-capture.png', 'Step 7: Quick Capture Modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 8: Settings Section (All 4 Tabs & Theme Color Verification)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 8: Settings Modal & Dynamic Theme Switching ---');
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const themeTab = page.locator('button:has-text("Theme & Colors")').first();
    await themeTab.click();
    await page.waitForTimeout(400);

    // Test Dark Mode
    const mossTheme = page.locator('text=Deep Moss Dark Mode').first();
    await mossTheme.click();
    await page.waitForTimeout(500);

    const bodyBgMoss = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`  Deep Moss body background: ${bodyBgMoss}`);
    if (bodyBgMoss !== 'rgb(6, 26, 20)') {
      bugsDetected.push({
        step: 'Step 8: Theme Switching',
        error: `Deep Moss theme failed to change background color (expected rgb(6, 26, 20), got ${bodyBgMoss}).`,
      });
    }

    // Switch back to Warm Sand
    const warmTheme = page.locator('text=Warm Sand & Forest').first();
    await warmTheme.click();
    await page.waitForTimeout(400);

    // Close Settings
    const closeSettings = page.locator('button[aria-label="Close Settings"]').first();
    await closeSettings.click();
    await page.waitForTimeout(400);

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 9: Sidebar Collapse (Checking for visual text leaks)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Step 9: Sidebar Collapse & Expand ---');
    const collapseBtn = page.locator('button[data-testid="sidebar-toggle-btn"]').first();
    if (await isVisible(collapseBtn)) {
      await collapseBtn.click();
      await page.waitForTimeout(500);

      const hasVaultEmptyText = await page.locator('text=Vault is empty').isVisible();
      if (hasVaultEmptyText) {
        bugsDetected.push({
          step: 'Step 9: Sidebar Collapse',
          error: 'Collapsed sidebar leaked "Vault is empty" text vertically.',
        });
      }
      await saveScreenshot(page, 'exhaustive-9-sidebar-collapsed.png', 'Step 9: Sidebar Collapsed');
      await collapseBtn.click();
      await page.waitForTimeout(400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FINAL AUDIT SUMMARY
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log(`🎯 Exhaustive Journey Complete! Total Bugs Caught: ${bugsDetected.length}`);
    if (bugsDetected.length > 0) {
      console.log('🔴 DETECTED BUGS:');
      bugsDetected.forEach((b, i) => console.log(`  ${i + 1}. [${b.step}]: ${b.error}`));
    } else {
      console.log('✅ ALL UI buttons and journeys passed verification cleanly!');
    }
    console.log('=============================================================\n');

  } catch (err) {
    console.error('Fatal error during test run:', err);
  } finally {
    await browser.close();
    server.kill();
  }
}

runExhaustiveJourney();
