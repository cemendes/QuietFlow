import { test, expect, Page } from '@playwright/test';
import { AuditReporter, AuditDefect } from './helpers/audit-reporter';
import * as path from 'path';

test.describe('QuietFlow Comprehensive UI Audit & Bug Hunt', () => {
  let reporter: AuditReporter;

  test.beforeAll(() => {
    reporter = new AuditReporter();
  });

  test.afterAll(() => {
    const reportPath = reporter.generateMarkdownReport();
    console.log(`\n========================================`);
    console.log(`UI Audit Punch List Generated at:`);
    console.log(reportPath);
    console.log(`========================================\n`);
  });

  const probe = async (
    page: Page,
    area: string,
    name: string,
    action: () => Promise<void>,
    options?: { selector?: string; verify?: () => Promise<void> }
  ) => {
    const start = Date.now();
    try {
      await action();
      if (options?.verify) {
        await options.verify();
      }
      reporter.record({
        area,
        name,
        selector: options?.selector,
        status: 'passed',
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      let screenshotPath: string | undefined;
      try {
        screenshotPath = await reporter.captureScreenshot(page, `${area}_${name}_failure`);
      } catch (e) {
        // ignore screenshot failure if page closed
      }

      const defect: AuditDefect = {
        id: `P1-${Date.now().toString().slice(-4)}`,
        severity: 'P1',
        area,
        action: name,
        expected: 'Action executes and passes verification cleanly',
        actual: err.message,
        selector: options?.selector,
        screenshotPath,
        errorLog: err.stack || err.message,
      };

      reporter.record({
        area,
        name,
        selector: options?.selector,
        status: 'failed',
        durationMs: Date.now() - start,
        defect,
      });
    }
  };

  test('Comprehensive UI Exploration: All Buttons, Menus, Modals & Workflows', async ({ page }) => {
    reporter.attachSentry(page);

    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="sidebar-toggle-btn"]', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Initial screenshot
    await reporter.captureScreenshot(page, 'initial_app_load');

    // =========================================================================
    // SUITE 1: Sidebar & Vault Navigation
    // =========================================================================
    await probe(page, 'Suite 1: Sidebar', 'Click "My Vault" root view', async () => {
      const vaultBtn = page.locator('button[title="My Vault"]');
      if (await vaultBtn.isVisible()) {
        await vaultBtn.click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Click "Inbox" view', async () => {
      const inboxBtn = page.locator('button[title="Inbox"]');
      if (await inboxBtn.isVisible()) {
        await inboxBtn.click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Toggle Folder Expansion Chevron', async () => {
      const folderContainers = page.locator('[data-testid^="folder-container-"]');
      if (await folderContainers.count() > 0) {
        const firstChevron = folderContainers.first().locator('svg').first();
        if (await firstChevron.isVisible()) {
          await firstChevron.click();
          await page.waitForTimeout(150);
          // Toggle back
          await firstChevron.click();
          await page.waitForTimeout(150);
        }
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Click New Project (+) button', async () => {
      const addFolderBtn = page.locator('[data-testid="add-folder-btn"]');
      if (await addFolderBtn.isVisible()) {
        await addFolderBtn.click();
        await page.waitForTimeout(200);
        // If inline input appears, test typing and canceling/submitting
        const input = page.locator('input[placeholder*="Folder name"], input[placeholder*="Project name"]');
        if (await input.isVisible()) {
          await input.fill('Audit Test Project');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
        }
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Folder Right-Click Context Menu', async () => {
      const folderContainers = page.locator('[data-testid^="folder-container-"]');
      if (await folderContainers.count() > 0) {
        await folderContainers.first().locator('> div').first().click({ button: 'right' });
        await page.waitForTimeout(200);
        const contextMenu = page.locator('[data-testid="folder-context-menu"]');
        if (await contextMenu.isVisible()) {
          await expect(contextMenu.locator('text=Rename')).toBeVisible();
          await expect(contextMenu.locator('text=Add Note')).toBeVisible();
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
        }
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Select Note Item from Tree', async () => {
      const fileItems = page.locator('[data-testid^="file-item-"]');
      if (await fileItems.count() > 0) {
        await fileItems.first().click();
        await page.waitForTimeout(300);
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Note Right-Click Context Menu', async () => {
      const fileItems = page.locator('[data-testid^="file-item-"]');
      if (await fileItems.count() > 0) {
        await fileItems.first().click({ button: 'right' });
        await page.waitForTimeout(200);
        const contextMenu = page.locator('[data-testid="folder-context-menu"]');
        if (await contextMenu.isVisible()) {
          await expect(contextMenu.locator('text=Rename')).toBeVisible();
          await expect(contextMenu.locator('text=Version History')).toBeVisible();
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
        }
      }
    });

    await probe(page, 'Suite 1: Sidebar', 'Sidebar Collapse and Expand Toggle', async () => {
      const toggleBtn = page.locator('[data-testid="sidebar-toggle-btn"]');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        await page.waitForTimeout(200);
        await toggleBtn.click();
        await page.waitForTimeout(200);
      }
    });

    // =========================================================================
    // SUITE 2: Top Focus Header & Global Controls
    // =========================================================================
    await probe(page, 'Suite 2: Focus Header', 'Focus Bucket: Now Only', async () => {
      const nowBtn = page.locator('button:has-text("Now Only"), [data-testid="focus-bucket-now"]');
      if (await nowBtn.first().isVisible()) {
        await nowBtn.first().click();
        await page.waitForTimeout(150);
      }
    });

    await probe(page, 'Suite 2: Focus Header', 'Focus Bucket: Backlog', async () => {
      const backlogBtn = page.locator('button:has-text("Backlog"), [data-testid="focus-bucket-not-now"]');
      if (await backlogBtn.first().isVisible()) {
        await backlogBtn.first().click();
        await page.waitForTimeout(150);
      }
    });

    await probe(page, 'Suite 2: Focus Header', 'Focus Bucket: All Tasks', async () => {
      const allTasksBtn = page.locator('button:has-text("All Tasks"), [data-testid="focus-bucket-all"]');
      if (await allTasksBtn.first().isVisible()) {
        await allTasksBtn.first().click();
        await page.waitForTimeout(150);
      }
    });

    await probe(page, 'Suite 2: Focus Header', 'QuickAddBar typing and date button', async () => {
      const quickAddInput = page.locator('input[placeholder*="Add a task"], input[placeholder*="Quick add"]');
      if (await quickAddInput.first().isVisible()) {
        await quickAddInput.first().fill('Audit Task Sample');
        await page.waitForTimeout(100);

        // Test date popover button if present
        const dateBtn = page.locator('[data-testid="quickadd-date-btn"], button[title*="date" i]');
        if (await dateBtn.first().isVisible()) {
          await dateBtn.first().click();
          await page.waitForTimeout(150);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }

        // Clear quickadd input
        await quickAddInput.first().fill('');
      }
    });

    // =========================================================================
    // SUITE 3: Task List View
    // =========================================================================
    await probe(page, 'Suite 3: Task List', 'Switch to List View', async () => {
      const listBtn = page.locator('button[aria-label="List View"], button[title="List View"]');
      if (await listBtn.first().isVisible()) {
        await listBtn.first().click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 3: Task List', 'Task Checkbox completion toggle', async () => {
      const checkbox = page.locator('[data-testid^="task-checkbox-"], button[role="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(150);
        // Toggle back
        await checkbox.click();
        await page.waitForTimeout(150);
      }
    });

    await probe(page, 'Suite 3: Task List', 'Priority Chip Cycle', async () => {
      const priorityBadge = page.locator('[data-testid^="priority-badge-"], [data-testid^="task-priority-"]').first();
      if (await priorityBadge.isVisible()) {
        await priorityBadge.click();
        await page.waitForTimeout(150);
      }
    });

    await probe(page, 'Suite 3: Task List', 'Click Task to open TaskDetailPage', async () => {
      // Find a task row title
      const taskTitle = page.locator('span.text-slate-800, span.text-stone-800, div[data-testid^="task-row-"]').first();
      if (await taskTitle.isVisible()) {
        await taskTitle.click();
        await page.waitForTimeout(300);

        // Check if TaskDetailPage or TaskDetailPanel mounted
        const taskDetailPage = page.locator('[data-testid="task-detail-page"]');
        if (await taskDetailPage.isVisible()) {
          await reporter.captureScreenshot(page, 'task_detail_page_mounted');
          // Navigate back
          const backBtn = page.locator('[data-testid="back-to-list-btn"]');
          if (await backBtn.isVisible()) {
            await backBtn.click();
            await page.waitForTimeout(200);
          }
        } else {
          // If panel drawer opened
          const closeBtn = page.locator('[data-testid="close-task-detail-btn"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(200);
          }
        }
      }
    });

    // =========================================================================
    // SUITE 4: Kanban Board View
    // =========================================================================
    await probe(page, 'Suite 4: Kanban', 'Switch to Kanban View', async () => {
      const kanbanBtn = page.locator('button[aria-label="Kanban View"], button[title="Kanban View"]');
      if (await kanbanBtn.first().isVisible()) {
        await kanbanBtn.first().click();
        await page.waitForTimeout(300);
        await expect(page.locator('text=Backlog').first()).toBeVisible();
      }
    });

    await probe(page, 'Suite 4: Kanban', 'Kanban Column Elements and Quick Add', async () => {
      const backlogCol = page.locator('[data-testid="kanban-column-backlog"]');
      if (await backlogCol.isVisible()) {
        const addCardBtn = backlogCol.locator('button:has-text("Add Task"), button:has-text("+")').first();
        if (await addCardBtn.isVisible()) {
          await addCardBtn.click();
          await page.waitForTimeout(150);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
      }
    });

    // =========================================================================
    // SUITE 5: Split-Lens Document Canvas & TipTap WYSIWYG
    // =========================================================================
    await probe(page, 'Suite 5: Document Lens', 'Select Note & Switch to Document View', async () => {
      // Click first note in sidebar to ensure active document
      const fileItems = page.locator('[data-testid^="file-item-"]');
      if (await fileItems.count() > 0) {
        await fileItems.first().click();
        await page.waitForTimeout(200);
      }

      const docBtn = page.locator('button[aria-label="Document Lens View"], button[title="Document View"]');
      if (await docBtn.first().isVisible()) {
        await docBtn.first().click();
        await page.waitForTimeout(300);
      }
    });

    await probe(page, 'Suite 5: Document Lens', 'Lens Switcher: Split View', async () => {
      const splitBtn = page.locator('[data-testid="lens-split-btn"]');
      if (await splitBtn.isVisible()) {
        await splitBtn.click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 5: Document Lens', 'Lens Switcher: Tasks Only', async () => {
      const tasksOnlyBtn = page.locator('[data-testid="lens-tasks-only-btn"]');
      if (await tasksOnlyBtn.isVisible()) {
        await tasksOnlyBtn.click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 5: Document Lens', 'Lens Switcher: Notes Only', async () => {
      const notesOnlyBtn = page.locator('[data-testid="lens-notes-only-btn"]');
      if (await notesOnlyBtn.isVisible()) {
        await notesOnlyBtn.click();
        await page.waitForTimeout(200);
      }
    });

    // Return to Split view for full toolbar tests
    await page.locator('[data-testid="lens-split-btn"]').click().catch(() => {});
    await page.waitForTimeout(200);

    await probe(page, 'Suite 5: TipTap WYSIWYG', 'Formatting Toolbar: Bold, Italic, Headings', async () => {
      const toolbar = page.locator('[data-testid="markdown-action-toolbar"]');
      if (await toolbar.isVisible()) {
        await page.locator('[data-testid="toolbar-bold-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-italic-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-h1-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-h2-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-h3-btn"]').click();
        await page.waitForTimeout(100);
      }
    });

    await probe(page, 'Suite 5: TipTap WYSIWYG', 'Formatting Toolbar: Lists, Quotes, Code', async () => {
      const toolbar = page.locator('[data-testid="markdown-action-toolbar"]');
      if (await toolbar.isVisible()) {
        await page.locator('[data-testid="toolbar-bullet-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-ordered-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-task-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-quote-btn"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="toolbar-code-btn"]').click();
        await page.waitForTimeout(100);
      }
    });

    await probe(page, 'Suite 5: TipTap WYSIWYG', '"Add Today\'s Date" button', async () => {
      const dateBtn = page.locator('[data-testid="toolbar-date-btn"]');
      if (await dateBtn.isVisible()) {
        await dateBtn.click();
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 5: TipTap WYSIWYG', 'Raw Markdown View Source Toggle', async () => {
      const sourceToggleBtn = page.locator('[data-testid="toolbar-source-toggle-btn"]');
      if (await sourceToggleBtn.isVisible()) {
        // Toggle to raw markdown
        await sourceToggleBtn.click();
        await page.waitForTimeout(200);
        await expect(page.locator('[data-testid="markdown-source-textarea"]')).toBeVisible();

        // Toggle back to WYSIWYG
        await sourceToggleBtn.click();
        await page.waitForTimeout(200);
        await expect(page.locator('[data-testid="tiptap-editor-content"]')).toBeVisible();
      }
    });

    // =========================================================================
    // SUITE 6: Task Detail Full-Page Canvas
    // =========================================================================
    await probe(page, 'Suite 6: Task Detail', 'Open Full-Page Task Detail Canvas', async () => {
      // Find a task in document task zone or switch to list to open
      const docTask = page.locator('[data-testid^="task-card-"]').first();
      if (await docTask.isVisible()) {
        await docTask.click();
        await page.waitForTimeout(300);
      } else {
        const listBtn = page.locator('button[aria-label="List View"], button[title="List View"]');
        await listBtn.first().click();
        await page.waitForTimeout(200);
        const taskTitle = page.locator('span.text-slate-800, span.text-stone-800').first();
        if (await taskTitle.isVisible()) {
          await taskTitle.click();
          await page.waitForTimeout(300);
        }
      }

      const taskDetailPage = page.locator('[data-testid="task-detail-page"]');
      if (await taskDetailPage.isVisible()) {
        // Test Mark as Done toggle
        const toggleDone = page.locator('[data-testid="toggle-done-btn"]');
        if (await toggleDone.isVisible()) {
          await toggleDone.click();
          await page.waitForTimeout(150);
          await toggleDone.click();
          await page.waitForTimeout(150);
        }

        // Test New Subtask input
        const subtaskInput = page.locator('[data-testid="new-subtask-input"]');
        if (await subtaskInput.isVisible()) {
          await subtaskInput.fill('Audit Subtask 1');
          await page.locator('[data-testid="add-subtask-btn"]').click();
          await page.waitForTimeout(200);
        }

        // Test Comments textarea
        const commentInput = page.locator('[data-testid="new-comment-textarea"]');
        if (await commentInput.isVisible()) {
          await commentInput.fill('Audit automated verification comment');
          await page.locator('[data-testid="post-comment-btn"]').click();
          await page.waitForTimeout(200);
        }

        // Screenshot of filled task detail page
        await reporter.captureScreenshot(page, 'task_detail_page_verified');

        // Test Back to List button
        const backBtn = page.locator('[data-testid="back-to-list-btn"]');
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(300);
        }
      }
    });

    // =========================================================================
    // SUITE 7: Modals, Shortcuts & Overlays
    // =========================================================================
    await probe(page, 'Suite 7: Modals', 'Settings Modal: Open & Cycle Tabs', async () => {
      const settingsFooterBtn = page.locator('button[title="Settings"]');
      if (await settingsFooterBtn.isVisible()) {
        await settingsFooterBtn.click();
      } else {
        await page.keyboard.press('Meta+,');
      }
      await page.waitForTimeout(300);

      const settingsModal = page.locator('[role="dialog"][aria-label="Settings"]');
      if (await settingsModal.isVisible()) {
        // Tab 1: AI & Magic Slicer
        await settingsModal.locator('button:has-text("AI & Magic Slicer")').click();
        await page.waitForTimeout(100);

        // Tab 2: Snapshots & Swap
        await settingsModal.locator('button:has-text("Snapshots & Swap")').click();
        await page.waitForTimeout(100);

        // Tab 3: Theme & Colors
        await settingsModal.locator('button:has-text("Theme & Colors")').click();
        await page.waitForTimeout(100);
        await settingsModal.locator('[data-testid="theme-option-nordic-slate"]').click();
        await page.waitForTimeout(100);
        await settingsModal.locator('[data-testid="theme-option-warm-paper"]').click();
        await page.waitForTimeout(100);

        // Tab 4: Shortcuts
        await settingsModal.locator('button:has-text("Shortcuts")').click();
        await page.waitForTimeout(100);

        // Tab 5: About & Status
        await settingsModal.locator('button:has-text("About & Status")').click();
        await page.waitForTimeout(100);

        // Close Settings
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    });

    await probe(page, 'Suite 7: Modals', 'Zen Theater Modal', async () => {
      const zenBtn = page.locator('[data-testid="zen-mode-header-btn"]');
      if (await zenBtn.isVisible()) {
        await zenBtn.click();
        await page.waitForTimeout(300);

        const zenModal = page.locator('[data-testid="zen-theater-modal"], [role="dialog"][aria-label="Zen Theater"]');
        if (await zenModal.isVisible()) {
          const presetBtn = zenModal.locator('button:has-text("25m"), button:has-text("15m")').first();
          if (await presetBtn.isVisible()) {
            await presetBtn.click();
            await page.waitForTimeout(100);
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    });

    await probe(page, 'Suite 7: Modals', 'Quick File Switcher (Cmd+O)', async () => {
      await page.keyboard.press('Meta+o');
      await page.waitForTimeout(300);

      const switcherModal = page.locator('[data-testid="quick-file-switcher"]');
      if (await switcherModal.isVisible()) {
        const searchInput = page.locator('[data-testid="quick-file-switcher-input"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('Project');
          await page.waitForTimeout(150);
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    });

    // Final screenshot
    await reporter.captureScreenshot(page, 'final_audit_complete');
  });
});
