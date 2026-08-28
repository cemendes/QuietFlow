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

async function runAddTaskTest() {
  console.log('🚀 Starting Task Addition Verification Test...');

  const server = spawn('npx', ['vite', '--port', '5191', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5191')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Test server running at http://localhost:5191');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[Browser Console Error]: ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:5191');
    await page.waitForTimeout(1500);

    // Initial state screenshot
    await saveScreenshot(page, 'task-test-1-initial.png', 'Initial State Before Adding Task');

    const initialTaskRows = await page.locator('[data-testid^="task-row-"]').count();
    console.log(`📊 Initial task count on screen: ${initialTaskRows}`);

    // Locate Quick Add input
    const quickAddInput = page.locator('input[aria-label="Quick Add Task"]').first();
    const taskTitle = 'Launch Q4 Marketing Blitz #growth @high due:tomorrow';

    console.log(`✍️ Typing new task: "${taskTitle}"`);
    await quickAddInput.click();
    await quickAddInput.fill(taskTitle);
    await page.waitForTimeout(400);

    // Press Enter to submit
    console.log('⏎ Pressing Enter to add task...');
    await quickAddInput.press('Enter');
    await page.waitForTimeout(800);

    // Post-add screenshot
    await saveScreenshot(page, 'task-test-2-task-added.png', 'State After Adding Task');

    const updatedTaskRows = await page.locator('[data-testid^="task-row-"]').count();
    console.log(`📊 Updated task count on screen: ${updatedTaskRows}`);

    // Verify task title exists in DOM
    const isTaskVisible = await page.locator('text=Launch Q4 Marketing Blitz').first().isVisible();
    const isTagVisible = await page.locator('text=#growth').first().isVisible();
    const isPriorityVisible = await page.locator('text=HIGH').first().isVisible();

    console.log('\n--- Assertion Results ---');
    console.log(`✓ Task title visible: ${isTaskVisible}`);
    console.log(`✓ #growth tag chip parsed & visible: ${isTagVisible}`);
    console.log(`✓ @high priority pill parsed & visible: ${isPriorityVisible}`);
    console.log(`✓ Task list count incremented: ${updatedTaskRows > initialTaskRows}`);

    if (isTaskVisible && isTagVisible && isPriorityVisible && updatedTaskRows > initialTaskRows) {
      console.log('\n🎉 Task Addition Test PASSED perfectly!\n');
    } else {
      console.error('\n❌ Task Addition Test FAILED!\n');
    }

  } catch (err) {
    console.error('Fatal error during task test:', err);
  } finally {
    await browser.close();
    server.kill();
  }
}

runAddTaskTest();
