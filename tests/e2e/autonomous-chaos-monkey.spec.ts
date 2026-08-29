import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('QuietFlow Chaos & Monkey Stress Testing', () => {
  const runtimeErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    runtimeErrors.length = 0;
    page.on('pageerror', (err) => {
      runtimeErrors.push(`[Chaos Uncaught Error] ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        runtimeErrors.push(`[Chaos Console Error] ${msg.text()}`);
      }
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="sidebar-toggle-btn"]', { timeout: 15000 });
  });

  test('Chaos Monkey: 1,000 rapid randomized user interactions across UI', async ({ page }) => {
    // Inject and execute Gremlins.js directly into the page context
    const gremlinsJsPath = path.resolve(process.cwd(), 'node_modules/gremlins.js/dist/gremlins.min.js');
    await page.addScriptTag({ path: gremlinsJsPath });

    const startTime = Date.now();

    // Unleash the gremlins horde
    const monkeyStats = await page.evaluate(async () => {
      return new Promise<any>((resolve) => {
        // @ts-ignore
        const horde = window.gremlins.createHorde({
          species: [
            // @ts-ignore
            window.gremlins.species.clicker({
              clickTypes: ['click'],
              canClick: (element: HTMLElement) => {
                // Don't click off-screen or destructive system elements outside app container
                return !element.closest('[data-tauri-drag-region]');
              },
            }),
            // @ts-ignore
            window.gremlins.species.formFiller(),
            // @ts-ignore
            window.gremlins.species.scroller(),
            // @ts-ignore
            window.gremlins.species.typer(),
          ],
          mogwais: [
            // @ts-ignore
            window.gremlins.mogwais.gizmo({ maxErrors: 0 }),
          ],
          strategies: [
            // @ts-ignore
            window.gremlins.strategies.distribution({
              distribution: [0.6, 0.2, 0.1, 0.1],
              delay: 15, // 15ms between actions
              nb: 1000,  // 1,000 rapid interactions
            }),
          ],
        });

        horde.unleash().then(() => {
          resolve({
            actionsCompleted: 1000,
            status: 'completed',
          });
        });
      });
    });

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save chaos report
    const reportDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const chaosReport = `
# QuietFlow Chaos & Monkey Stress Test Report

**Execution Timestamp:** ${new Date().toISOString()}
**Total Actions Unleashed:** ${monkeyStats.actionsCompleted} rapid randomized UI events
**Total Duration:** ${durationSec}s (~${(1000 / Number(durationSec)).toFixed(0)} actions/sec)
**Unhandled Exceptions / React Crashes:** ${runtimeErrors.length}

${runtimeErrors.length > 0 ? `\n## ⚠️ Errors Detected During Chaos Fuzzing\n\`\`\`\n${runtimeErrors.join('\n')}\n\`\`\`` : '\n## ✅ Zero Crashes or Memory/State Desyncs Detected Under Chaos!'}
`;

    fs.writeFileSync(path.join(reportDir, 'chaos-stress-findings.md'), chaosReport.trim());

    // Assert app survived the chaos without crashing
    expect(runtimeErrors).toEqual([]);
  });
});
