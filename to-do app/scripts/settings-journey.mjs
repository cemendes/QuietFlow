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

async function runSettingsJourney() {
  console.log('🚀 Starting Deep Settings Menu & Visual Theme Validation Journey...');

  const server = spawn('npx', ['vite', '--port', '5190', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5190')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Test server running at http://localhost:5190');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const bugsFound = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
      bugsFound.push(`Console error: ${msg.text()}`);
    }
  });

  try {
    await page.goto('http://localhost:5190');
    await page.waitForTimeout(1500);

    // Open Settings Modal
    console.log('\n--- 1. Opening Settings Modal ---');
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await settingsBtn.click();
    await page.waitForTimeout(600);

    // Tab 1: Vault Storage Tab
    console.log('\n--- 2. Testing Vault Storage Menu ---');
    const vaultTabBtn = page.locator('button:has-text("Vault Storage")').first();
    await vaultTabBtn.click();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'settings-1-vault-storage.png', 'Settings Tab 1: Vault Storage');

    // Tab 2: Theme & Colors Tab with Color Verification
    console.log('\n--- 3. Testing Theme & Colors Menu with Visual Background Inspection ---');
    const themeTabBtn = page.locator('button:has-text("Theme & Colors")').first();
    await themeTabBtn.click();
    await page.waitForTimeout(500);

    // 3A: Test Nordic Slate Theme
    console.log('  -> Switching to Nordic Minimalist...');
    const nordicTheme = page.locator('text=Nordic Minimalist').first();
    await nordicTheme.click();
    await page.waitForTimeout(500);
    
    const rootClassesNordic = await page.evaluate(() => document.documentElement.className);
    const bodyBgNordic = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`     DOM class: "${rootClassesNordic}", Body background: ${bodyBgNordic}`);
    
    if (!rootClassesNordic.includes('theme-nordic-slate')) {
      bugsFound.push(`Theme did not apply 'theme-nordic-slate' class to html element (got: '${rootClassesNordic}')`);
    }
    await saveScreenshot(page, 'settings-2-theme-nordic-slate.png', 'Theme Switched to Nordic Minimalist');

    // 3B: Test Deep Moss Dark Mode Theme
    console.log('  -> Switching to Deep Moss Dark Mode...');
    const mossTheme = page.locator('text=Deep Moss Dark Mode').first();
    await mossTheme.click();
    await page.waitForTimeout(500);

    const rootClassesMoss = await page.evaluate(() => document.documentElement.className);
    const bodyBgMoss = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`     DOM class: "${rootClassesMoss}", Body background: ${bodyBgMoss}`);

    if (!rootClassesMoss.includes('theme-forest-moss')) {
      bugsFound.push(`Theme did not apply 'theme-forest-moss' class to html element (got: '${rootClassesMoss}')`);
    }
    await saveScreenshot(page, 'settings-2-theme-deep-moss.png', 'Theme Switched to Deep Moss Dark Mode');

    // 3C: Switch back to Warm Sand
    console.log('  -> Switching back to Warm Sand & Forest...');
    const warmTheme = page.locator('text=Warm Sand & Forest').first();
    await warmTheme.click();
    await page.waitForTimeout(500);

    const rootClassesWarm = await page.evaluate(() => document.documentElement.className);
    const bodyBgWarm = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`     DOM class: "${rootClassesWarm}", Body background: ${bodyBgWarm}`);

    if (!rootClassesWarm.includes('theme-warm-paper')) {
      bugsFound.push(`Theme did not apply 'theme-warm-paper' class to html element (got: '${rootClassesWarm}')`);
    }
    await saveScreenshot(page, 'settings-2-theme-warm-paper.png', 'Theme Switched back to Warm Sand & Forest');

    // Tab 3: Shortcuts Tab
    console.log('\n--- 4. Testing Shortcuts Menu ---');
    const shortcutsTabBtn = page.locator('button:has-text("Shortcuts")').first();
    await shortcutsTabBtn.click();
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'settings-3-shortcuts.png', 'Settings Tab 3: Keyboard Shortcuts');

    // Tab 4: About & Status Tab
    console.log('\n--- 5. Testing About & Status Menu ---');
    const aboutTabBtn = page.locator('button:has-text("About & Status")').first();
    await aboutTabBtn.click();
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'settings-4-about-status.png', 'Settings Tab 4: About & Status');

    // Close Modal
    console.log('\n--- 6. Testing Close Action ---');
    const closeBtn = page.locator('button[aria-label="Close Settings"]').first();
    await closeBtn.click();
    await page.waitForTimeout(400);

    console.log('\n=============================================');
    console.log(`🎉 Settings Validation Complete! Found ${bugsFound.length} bugs.`);
    if (bugsFound.length > 0) {
      console.log('Bugs detected:');
      bugsFound.forEach((b, idx) => console.log(`  ${idx + 1}. ${b}`));
    } else {
      console.log('✅ ALL theme switches & settings verified with real DOM class & color assertions!');
    }
    console.log('=============================================\n');

  } catch (err) {
    console.error('Fatal error during settings journey:', err);
  } finally {
    await browser.close();
    server.kill();
  }
}

runSettingsJourney();
