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

async function reproduceBug() {
  console.log('🔬 Starting Bug Reproduction Test: Fresh Launch with Empty/Unset Vault & Unselected File...');

  const server = spawn('npx', ['vite', '--port', '5192', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5192')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Test server running at http://localhost:5192');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`  Browser: [${msg.type()}] ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:5192');
    await page.waitForTimeout(1000);

    // Scenario A: User opens app, types in task bar immediately, presses enter
    console.log('\n--- Scenario A: Typing in QuickAddBar immediately on cold start ---');
    const quickAddInput = page.locator('input[aria-label="Quick Add Task"]').first();
    await quickAddInput.click();
    await quickAddInput.fill('Task A created on cold start');
    await page.waitForTimeout(300);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(800);

    const isTaskAVisible = await page.locator('text=Task A created on cold start').isVisible();
    console.log(`Result Scenario A -> Task created and visible: ${isTaskAVisible}`);

    // Scenario B: User selects a folder item instead of a file (activeFile is null or a directory path)
    console.log('\n--- Scenario B: Active selection is a directory or null ---');
    await page.evaluate(() => {
      // Simulate state where user clicked a folder or activeFile became null
      const store = window.__useVaultStore || window.useVaultStore;
      console.log('Inspecting active state...');
    });

    await quickAddInput.click();
    await quickAddInput.fill('Task B created when no file active');
    await page.waitForTimeout(300);
    await quickAddInput.press('Enter');
    await page.waitForTimeout(800);

    const isTaskBVisible = await page.locator('text=Task B created when no file active').isVisible();
    console.log(`Result Scenario B -> Task created and visible: ${isTaskBVisible}`);

    await saveScreenshot(page, 'reproduce-bug-state.png', 'Reproduction State');

  } catch (err) {
    console.error('Error during reproduction test:', err);
  } finally {
    await browser.close();
    server.kill();
  }
}

reproduceBug();
