---
name: playwright-desktop-testing
description: Playwright E2E testing for desktop webviews, mocking Tauri IPC and virtual markdown filesystems, visual screenshot inspection, and Kanban drag-and-drop testing.
---

# Playwright Desktop Testing Skill

Use this skill when writing, debugging, or running automated Playwright E2E tests and Vitest component specs for the desktop app.

## 1. Mocking Tauri Filesystem & IPC
Since Playwright runs against the browser web bundle, mock native Tauri IPC before tests run:
```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__MOCK_VAULT__ = {
      'Note-1.md': '---\ntitle: Sample\n---\n- [ ] Task 1\n',
    };
  });
});
```

## 2. Testing Keyboard Navigation & Modals
- Verify global and in-app shortcuts:
  ```ts
  await page.keyboard.press('Meta+,'); // Open settings
  await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();

  await page.keyboard.press('Escape'); // Close modal
  await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible();
  ```

## 3. Testing Kanban Drag & Drop
- Test column reordering and status updates:
  ```ts
  const card = page.locator('[data-testid="task-card-1"]');
  const inProgressCol = page.locator('[data-testid="kanban-column-in-progress"]');
  await card.dragTo(inProgressCol);
  ```

## 4. Visual Inspection & Screenshot Journey Loops
- Capture sequential user journey screenshots for AI model inspection:
  ```ts
  await page.screenshot({ path: `${ARTIFACT_DIR}/journey_step1_initial.png` });
  ```

## 5. Testing Canvas Celebrations & Flying Particles
- When testing task completion micro-rewards:
  ```ts
  const checkbox = page.locator('[data-testid^="task-checkbox-"]').first();
  await checkbox.click();
  // Canvas particle overlay is injected into the DOM
  await expect(page.locator('#celebration-canvas-overlay')).toBeAttached();
  ```

## 6. Verification Workflow
- Run tests headless: `npx playwright test`
- Inspect trace on failure: `npx playwright show-trace trace.zip`
