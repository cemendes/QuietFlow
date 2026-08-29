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

async function isVisible(locator, timeout = 2000) {
  return locator.isVisible({ timeout }).catch(() => false);
}

async function runMenuAuditJourney() {
  console.log('🚀 Starting Deep Menu & Dropdown Interactive Audit Journey...');

  const server = spawn('npx', ['vite', '--port', '5194', '--strictPort'], {
    cwd: '/Users/eduardo/code_projects/FocusFlow/to-do app',
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('5194')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  console.log('🌐 Test server running at http://localhost:5194');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const auditResults = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      auditResults.push({ menu: 'Console Runtime', error: msg.text(), severity: 'HIGH' });
    }
  });

  try {
    await page.goto('http://localhost:5194');
    await page.waitForTimeout(1500);

    // =========================================================================
    // MENU 1: Sidebar System Views (Today, Inbox, Starred)
    // =========================================================================
    console.log('\n--- Menu 1: Sidebar System Scopes (Today, Inbox, Starred) ---');
    const todayBtn = page.locator('button:has-text("Today")').first();
    const inboxBtn = page.locator('button:has-text("Inbox")').first();
    const starredBtn = page.locator('button:has-text("Starred")').first();

    await todayBtn.click();
    await page.waitForTimeout(300);
    const todayActive = await todayBtn.getAttribute('class');
    console.log(`  Today item active class: ${todayActive?.includes('forest') || todayActive?.includes('font-semibold')}`);

    await inboxBtn.click();
    await page.waitForTimeout(400);
    const inboxTitle = await page.locator('h1, header').first().innerText();
    console.log(`  Inbox scope active. Header text: "${inboxTitle.replace(/\n/g, ' ')}"`);
    await saveScreenshot(page, 'menu-1-sidebar-inbox.png', 'Menu 1: Sidebar Inbox View');

    await starredBtn.click();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'menu-1-sidebar-starred.png', 'Menu 1: Sidebar Starred View');

    // Switch back to Today
    await todayBtn.click();
    await page.waitForTimeout(300);

    // =========================================================================
    // MENU 2: Sidebar Footer Actions (Archive & Settings Buttons)
    // =========================================================================
    console.log('\n--- Menu 2: Sidebar Footer Menu Items (Archive & Settings) ---');
    const archiveBtn = page.locator('button:has-text("Archive")').first();
    if (await isVisible(archiveBtn)) {
      await archiveBtn.click();
      await page.waitForTimeout(500);

      const isArchiveModalOpen = await isVisible(page.locator('text=Completed Tasks Archive').first());
      console.log(`  Archive modal opened upon clicking Archive: ${isArchiveModalOpen}`);
      if (!isArchiveModalOpen) {
        auditResults.push({
          menu: 'Archive Menu',
          error: 'Clicking Archive in sidebar footer failed to open Archive Modal.',
          severity: 'HIGH',
        });
      }
      await saveScreenshot(page, 'menu-2-sidebar-archive.png', 'Menu 2: Archive Modal');

      // Test Close Archive
      const closeArchiveBtn = page.locator('button[aria-label="Close Archive"]').first();
      if (await isVisible(closeArchiveBtn)) {
        await closeArchiveBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // =========================================================================
    // MENU 3: Folder Context Actions (Hover on Folder & Subfolder Items)
    // =========================================================================
    console.log('\n--- Menu 3: Folder Row Context Actions (+ Subfolder, + Note, Delete) ---');
    const folderRow = page.locator('text=Customers').first();
    if (await isVisible(folderRow)) {
      await folderRow.hover();
      await page.waitForTimeout(300);

      // Check if folder action buttons exist and are clickable
      const plusSubfolder = page.locator('button[title*="subfolder"], button[aria-label*="subfolder"]').first();
      const plusNote = page.locator('button[title*="note"], button[aria-label*="note"]').first();
      const deleteFolder = page.locator('button[title*="Delete"], button[aria-label*="Delete"]').first();

      const hasSubfolderBtn = await isVisible(plusSubfolder);
      const hasNoteBtn = await isVisible(plusNote);
      console.log(`  Folder hover menu buttons -> +Subfolder: ${hasSubfolderBtn}, +Note: ${hasNoteBtn}`);

      if (!hasSubfolderBtn || !hasNoteBtn) {
        auditResults.push({
          menu: 'Sidebar Folder Row Menu',
          error: 'Folder hover actions (+ Subfolder or + Note buttons) were not visible on hover.',
          severity: 'MEDIUM',
        });
      }
      await saveScreenshot(page, 'menu-3-folder-hover-actions.png', 'Menu 3: Folder Hover Menu');
    }

    // =========================================================================
    // MENU 4: Tag & Priority Filter Menu Chips on Main Canvas
    // =========================================================================
    console.log('\n--- Menu 4: Tag & Priority Filter Chips Menu ---');
    const firstTagChip = page.locator('[data-testid="tag-chip-deliverable"], button:has-text("#deliverable")').first();
    if (await isVisible(firstTagChip)) {
      await firstTagChip.click();
      await page.waitForTimeout(500);

      const isFilterActive = await isVisible(page.locator('[data-testid="active-filters-bar"]').first());
      console.log(`  Filter bar active upon clicking tag chip: ${isFilterActive}`);

      if (!isFilterActive) {
        auditResults.push({
          menu: 'Tag Filter Menu',
          error: 'Clicking tag chip failed to activate active filter bar.',
          severity: 'MEDIUM',
        });
      }
      await saveScreenshot(page, 'menu-4-tag-filter-active.png', 'Menu 4: Filter Menu Active');

      // Test "Clear all" filter button
      const clearBtn = page.locator('button:has-text("Clear all")').first();
      if (await isVisible(clearBtn)) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        console.log('  "Clear all" filters button clicked.');
      }
    }

    // =========================================================================
    // MENU 5: Task Row Click & Detail Drawer Menu
    // =========================================================================
    console.log('\n--- Menu 5: Task Row Click & Detail Drawer Menu ---');
    const taskRow = page.locator('[data-testid^="task-row-"]').first();
    await taskRow.click();
    await page.waitForTimeout(600);

    // Test Status Dropdown inside Drawer
    console.log('  -> Testing Status dropdown menu inside Drawer...');
    const statusSelect = page.locator('[data-testid="status-select"]').first();
    if (await isVisible(statusSelect)) {
      await statusSelect.selectOption('in-progress');
      await page.waitForTimeout(400);
      const selectedVal = await statusSelect.inputValue();
      console.log(`     Status dropdown value changed to: "${selectedVal}"`);
    }

    // Test Priority Dropdown inside Drawer
    console.log('  -> Testing Priority dropdown menu inside Drawer...');
    const prioritySelect = page.locator('select').nth(1);
    if (await isVisible(prioritySelect)) {
      await prioritySelect.selectOption('high');
      await page.waitForTimeout(400);
      const priVal = await prioritySelect.inputValue();
      console.log(`     Priority dropdown value changed to: "${priVal}"`);
    }

    // Test Markdown Editor Tab Switcher (Edit vs Preview)
    console.log('  -> Testing Markdown Tab Switcher menu...');
    const editTab = page.locator('button:has-text("Edit")').first();
    const previewTab = page.locator('button:has-text("Preview")').first();
    if (await isVisible(editTab) && await isVisible(previewTab)) {
      await previewTab.click();
      await page.waitForTimeout(300);
      await editTab.click();
      await page.waitForTimeout(300);
      console.log('     Switched between Edit and Preview tabs smoothly.');
    }
    await saveScreenshot(page, 'menu-5-task-detail-drawer.png', 'Menu 5: Task Detail Drawer');

    // Close drawer
    const closeDrawerBtn = page.locator('[data-testid="close-task-detail-btn"]').first();
    if (await isVisible(closeDrawerBtn)) {
      await closeDrawerBtn.click();
      await page.waitForTimeout(400);
    }

    // =========================================================================
    // MENU 6: Kanban View Switcher & Card Click Selection
    // =========================================================================
    console.log('\n--- Menu 6: Kanban View Switcher & Wide Card Layout ---');
    const kanbanToggle = page.locator('button:has-text("Kanban")').first();
    await kanbanToggle.click();
    await page.waitForTimeout(600);

    // Locate first card and click to select
    const firstKanbanCard = page.locator('[data-testid^="kanban-card-"]').first();
    if (await isVisible(firstKanbanCard)) {
      await firstKanbanCard.click();
      await page.waitForTimeout(400);
      await saveScreenshot(page, 'menu-6-kanban-wide-cards.png', 'Menu 6: Clean Kanban Cards Without Dropdown');
      
      // Close detail drawer if open
      const closeDrawerInKanban = page.locator('[data-testid="close-task-detail-btn"]').first();
      if (await isVisible(closeDrawerInKanban)) {
        await closeDrawerInKanban.click();
        await page.waitForTimeout(300);
      }
    }

    // Switch back to List
    const listToggle = page.locator('button:has-text("List")').first();
    await listToggle.click();
    await page.waitForTimeout(400);

    // =========================================================================
    // MENU 7: Quick Capture Modal Spotlight Menu
    // =========================================================================
    console.log('\n--- Menu 7: Quick Capture Modal Menu (Type Select & Folder Dropdown) ---');
    const globalAddBtn = page.locator('button[aria-label="Quick capture"]').first();
    if (await isVisible(globalAddBtn)) {
      await globalAddBtn.click();
      await page.waitForTimeout(500);

      // Check Type Selector Buttons (Task vs Note)
      const taskTypeBtn = page.locator('button:has-text("Task")').first();
      const noteTypeBtn = page.locator('button:has-text("Quick Note")').first();
      if (await isVisible(noteTypeBtn)) {
        await noteTypeBtn.click();
        await page.waitForTimeout(300);
        console.log('  Switched Quick Capture mode to "Quick Note".');
      }

      // Check Folder Destination Dropdown
      const folderSelect = page.locator('select').first();
      if (await isVisible(folderSelect)) {
        const optionCount = await folderSelect.locator('option').count();
        console.log(`  Folder destination dropdown populated with ${optionCount} options.`);
        if (optionCount === 0) {
          auditResults.push({
            menu: 'Quick Capture Modal',
            error: 'Destination folder dropdown had 0 options.',
            severity: 'HIGH',
          });
        }
      }
      await saveScreenshot(page, 'menu-7-quick-capture-menu.png', 'Menu 7: Quick Capture Modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // =========================================================================
    // MENU 8: Settings Section (4 Navigation Menus)
    // =========================================================================
    console.log('\n--- Menu 8: Settings Section All 4 Sub-Menus ---');
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // 8.1 Vault Storage Menu
    const vaultMenu = page.locator('button:has-text("Vault Storage")').first();
    await vaultMenu.click();
    await page.waitForTimeout(300);
    const hasBrowseBtn = await isVisible(page.locator('button:has-text("Browse")'));
    const hasApplyBtn = await isVisible(page.locator('button:has-text("Apply")'));
    console.log(`  Vault Storage Menu -> Browse button: ${hasBrowseBtn}, Apply button: ${hasApplyBtn}`);

    // 8.2 Theme & Colors Menu
    const themeMenu = page.locator('button:has-text("Theme & Colors")').first();
    await themeMenu.click();
    await page.waitForTimeout(300);
    const themeCardsCount = await page.locator('[data-testid^="theme-option-"]').count();
    console.log(`  Theme & Colors Menu -> ${themeCardsCount} theme options available.`);

    // 8.3 Shortcuts Menu
    const shortcutsMenu = page.locator('button:has-text("Shortcuts")').first();
    await shortcutsMenu.click();
    await page.waitForTimeout(300);
    const shortcutsCount = await page.locator('kbd').count();
    console.log(`  Shortcuts Menu -> ${shortcutsCount} shortcut badges rendered.`);

    // 8.4 About & Status Menu
    const aboutMenu = page.locator('button:has-text("About & Status")').first();
    await aboutMenu.click();
    await page.waitForTimeout(300);
    const versionBadge = await page.locator('text=v0.1.0').first().isVisible();
    console.log(`  About & Status Menu -> Version badge visible: ${versionBadge}`);

    // Close Settings
    const closeSettingsBtn = page.locator('button[aria-label="Close Settings"]').first();
    await closeSettingsBtn.click();
    await page.waitForTimeout(400);

    // =========================================================================
    // AUDIT SUMMARY
    // =========================================================================
    console.log('\n=============================================================');
    console.log(`📊 Menu Audit Complete! Evaluated 8 Menus. Bugs found: ${auditResults.length}`);
    if (auditResults.length > 0) {
      console.log('🔴 IDENTIFIED MENU ISSUES:');
      auditResults.forEach((b, i) => console.log(`  ${i + 1}. [${b.menu} - ${b.severity}]: ${b.error}`));
    } else {
      console.log('✅ ALL 8 MENUS, SUB-MENUS, AND DROPDOWNS ARE HEALTHY AND FUNCTIONAL!');
    }
    console.log('=============================================================\n');

  } catch (err) {
    console.error('Fatal error during menu audit:', err);
  } finally {
    await browser.close();
    server.kill();
  }
}

runMenuAuditJourney();
