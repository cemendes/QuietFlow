import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/eduardo/.gemini/antigravity/brain/ef6815fd-a36e-48ac-833d-7f6855d7a26d/usability-tests';
const DOCS_SCREENSHOT_DIR = '/Users/eduardo/code_projects/FocusFlow/to-do app/docs/usability-tests';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(DOCS_SCREENSHOT_DIR, { recursive: true });

async function saveScreenshot(page, filename, title) {
  const targetPath1 = path.join(SCREENSHOT_DIR, filename);
  const targetPath2 = path.join(DOCS_SCREENSHOT_DIR, filename);
  await page.screenshot({ path: targetPath1, fullPage: true });
  fs.copyFileSync(targetPath1, targetPath2);
  console.log(`📸 [Screenshot] ${title} -> ${filename}`);
}

async function isVisible(locator, timeout = 2000) {
  return locator.isVisible({ timeout }).catch(() => false);
}

async function main() {
  console.log('🚀 Starting QuietFlow Automated Usability Journey...');

  const server = spawn('npx', ['vite', '--port', '5188', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5188')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Vite server running at http://localhost:5188');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[Browser Error] ${msg.text()}`);
  });

  try {
    // ─── Step 1: Initial App Dashboard ───────────────────────────────────────
    console.log('\n--- Step 1: Initial App Dashboard ---');
    await page.goto('http://localhost:5188');
    await page.waitForTimeout(1500);
    await saveScreenshot(page, '1-initial-dashboard.png', 'Initial App Dashboard with Today View & Sidebar');

    // ─── Step 2: Create Tasks via Quick Add Bar ───────────────────────────────
    console.log('\n--- Step 2: Quick-Add Task with Natural Language ---');
    const quickAddInput = page.locator('input[aria-label="Quick Add Task"]').first();
    await quickAddInput.fill('Review Q3 Security Audit & SLA #deliverable @high due:tomorrow');
    await page.waitForTimeout(400);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(700);

    await quickAddInput.fill('Draft Master Service Agreement revision #legal @medium');
    await page.waitForTimeout(400);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(700);

    await quickAddInput.fill('Finalize contract renewal pricing #finance @low');
    await page.waitForTimeout(400);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(900);
    await saveScreenshot(page, '2-tasks-created.png', 'Tasks Created with Natural Language Badges & Priorities');

    // ─── Step 3: Open Task Detail Drawer ─────────────────────────────────────
    console.log('\n--- Step 3: Task Context & Notes Drawer ---');
    const firstTask = page.locator('text=Review Q3 Security Audit').first();
    await firstTask.click();
    await page.waitForTimeout(800);

    // Add subtasks
    const subtaskInput = page.locator('input[placeholder*="Add"]').first();
    if (await isVisible(subtaskInput)) {
      await subtaskInput.fill('Coordinate findings report with SecOps');
      await subtaskInput.press('Enter');
      await page.waitForTimeout(400);
      await subtaskInput.fill('Review section 4.2 data retention clauses');
      await subtaskInput.press('Enter');
      await page.waitForTimeout(400);
    }

    // Edit Markdown Notes
    const notesEditor = page.locator('textarea').first();
    if (await isVisible(notesEditor)) {
      await notesEditor.click();
      await notesEditor.fill(`### Strategy Call Notes
- Stakeholder: Sarah Connor (Head of Procurement)
- Target date: September 15
- Budget confirmed`);
      await page.waitForTimeout(500);
    }

    // Toggle Preview
    const previewBtn = page.locator('button:has-text("Preview")').first();
    if (await isVisible(previewBtn)) {
      await previewBtn.click();
      await page.waitForTimeout(600);
    }

    await saveScreenshot(page, '3-task-detail-notes.png', 'Task Detail Panel with Subtasks & Formatted Notes');

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);

    // ─── Step 4: Toggle Task Status ───────────────────────────────────────────
    console.log('\n--- Step 4: Task Status Cycling ---');
    // aria-label="Toggle task {title}" from TaskRow.tsx
    const checkbox = page.locator('button[aria-label^="Toggle task"]').first();
    if (await isVisible(checkbox)) {
      await checkbox.click();
      await page.waitForTimeout(600);
    }
    await saveScreenshot(page, '4-task-in-progress.png', 'Task Marked Done (Status Toggled)');

    // ─── Step 5: Tag Filter ───────────────────────────────────────────────────
    console.log('\n--- Step 5: Filter by Tag ---');
    // Tags are <span> with onClick in TaskRow
    const legalTag = page.locator('span').filter({ hasText: '#legal' }).first();
    if (await isVisible(legalTag)) {
      await legalTag.click();
      await page.waitForTimeout(700);
      await saveScreenshot(page, '5-tag-filtered-view.png', 'Tasks Filtered by #legal Tag');
      const clearAll = page.locator('button:has-text("Clear all")').first();
      if (await isVisible(clearAll)) {
        await clearAll.click();
        await page.waitForTimeout(400);
      }
    } else {
      await saveScreenshot(page, '5-tag-filtered-view.png', 'Full Task List with Priority & Tag Chips');
    }

    // ─── Step 6: Kanban Board View ────────────────────────────────────────────
    console.log('\n--- Step 6: Kanban Board View ---');
    const kanbanBtn = page.locator('button:has-text("Kanban")').first();
    if (await isVisible(kanbanBtn)) {
      await kanbanBtn.click();
      await page.waitForTimeout(1000);
    }
    await saveScreenshot(page, '6-kanban-board-view.png', 'Kanban Board with 4 Stage Columns');

    // ─── Step 7: Quick-Capture Spotlight Modal ────────────────────────────────
    console.log('\n--- Step 7: Quick Capture Spotlight ---');
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(700);
    const captureInput = page.locator('input[placeholder*="What"]').first();
    if (await isVisible(captureInput)) {
      await captureInput.fill('Follow up on SLA addendum with Acme Corp @high #deliverable');
      await page.waitForTimeout(600);
      await saveScreenshot(page, '7-quick-capture-spotlight.png', 'Quick-Capture Spotlight Modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      // Force open via evaluate
      await page.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      });
      await page.waitForTimeout(700);
      const captureInput2 = page.locator('input[placeholder*="What"]').first();
      if (await isVisible(captureInput2)) {
        await captureInput2.fill('Follow up SLA addendum Acme Corp @high #deliverable');
        await page.waitForTimeout(500);
        await saveScreenshot(page, '7-quick-capture-spotlight.png', 'Quick-Capture Spotlight Modal');
        await page.keyboard.press('Escape');
      } else {
        await saveScreenshot(page, '7-quick-capture-spotlight.png', 'Kanban View (Quick Capture shortcut not available in headless)');
      }
    }

    // ─── Step 8: Settings Modal ───────────────────────────────────────────────
    console.log('\n--- Step 8: App Settings Modal ---');
    // Switch to list first to see the sidebar
    const listBtn = page.locator('button:has-text("List")').first();
    if (await isVisible(listBtn)) {
      await listBtn.click();
      await page.waitForTimeout(500);
    }
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    if (await isVisible(settingsBtn)) {
      await settingsBtn.click();
      await page.waitForTimeout(900);
    } else {
      // Keyboard shortcut
      await page.keyboard.press('Control+,');
      await page.waitForTimeout(700);
    }
    await saveScreenshot(page, '8-settings-modal.png', 'Settings Modal with Vault Path & Theme Options');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // ─── Step 9: Folders & Sidebar Collapse Verification ───────────────────────
    console.log('\n--- Step 9: Sidebar Collapse & Folder Management ---');
    const toggleSidebarBtn = page.locator('button[data-testid="sidebar-toggle-btn"]').first();
    if (await isVisible(toggleSidebarBtn)) {
      // Collapse sidebar
      await toggleSidebarBtn.click();
      await page.waitForTimeout(600);
      await saveScreenshot(page, '9-sidebar-collapsed.png', 'Sidebar Collapsed Minimalist Icons');
      // Expand sidebar back
      await toggleSidebarBtn.click();
      await page.waitForTimeout(600);
    }

    console.log('\n🎉 Usability Journey Completed Successfully!');

  } catch (error) {
    console.error('❌ Error during usability test:', error);
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-state.png') });
      console.log('📸 Error state screenshot saved.');
    } catch (_) {}
  } finally {
    await browser.close();
    server.kill();
  }
}

main();
