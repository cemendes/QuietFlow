import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';

export type DefectSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export interface AuditDefect {
  id: string;
  severity: DefectSeverity;
  area: string;
  action: string;
  expected: string;
  actual: string;
  selector?: string;
  screenshotPath?: string;
  errorLog?: string;
}

export interface TestedElement {
  area: string;
  name: string;
  selector?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  defect?: AuditDefect;
}

export class AuditReporter {
  private testedElements: TestedElement[] = [];
  private defects: AuditDefect[] = [];
  private unhandledErrors: string[] = [];
  private consoleWarnings: string[] = [];
  private screenshotDir: string;
  private outputDir: string;

  constructor(outputDir: string = path.join(process.cwd(), 'test-results')) {
    this.outputDir = outputDir;
    this.screenshotDir = path.join(outputDir, 'audit-screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  attachSentry(page: Page) {
    page.on('pageerror', (err) => {
      const msg = `[Uncaught Page Error] ${err.message}\n${err.stack || ''}`;
      this.unhandledErrors.push(msg);
      this.defects.push({
        id: `P0-${this.defects.length + 1}`,
        severity: 'P0',
        area: 'Runtime / React Engine',
        action: 'Page execution',
        expected: 'Clean execution without unhandled exceptions',
        actual: err.message,
        errorLog: msg,
      });
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = `[Console Error] ${msg.text()}`;
        this.unhandledErrors.push(text);
        this.defects.push({
          id: `P2-${this.defects.length + 1}`,
          severity: 'P2',
          area: 'Console Diagnostics',
          action: 'Console output',
          expected: 'No console error diagnostics',
          actual: msg.text(),
          errorLog: text,
        });
      } else if (msg.type() === 'warning') {
        this.consoleWarnings.push(`[Console Warning] ${msg.text()}`);
      }
    });
  }

  async captureScreenshot(page: Page, label: string): Promise<string> {
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${Date.now()}_${safeLabel}.png`;
    const fullPath = path.join(this.screenshotDir, filename);
    await page.screenshot({ path: fullPath });
    return fullPath;
  }

  record(element: TestedElement) {
    this.testedElements.push(element);
    if (element.defect) {
      this.defects.push(element.defect);
    }
  }

  getDefects(): AuditDefect[] {
    return this.defects;
  }

  generateMarkdownReport(): string {
    const p0s = this.defects.filter(d => d.severity === 'P0');
    const p1s = this.defects.filter(d => d.severity === 'P1');
    const p2s = this.defects.filter(d => d.severity === 'P2');
    const p3s = this.defects.filter(d => d.severity === 'P3');

    let md = `# QuietFlow UI Audit Punch List\n\n`;
    md += `**Date:** ${new Date().toISOString()}  \n`;
    md += `**Total Elements Probed:** ${this.testedElements.length}  \n`;
    md += `**Total Defects Found:** ${this.defects.length}  \n\n`;

    md += `## Defect Summary\n\n`;
    md += `- 🔴 **P0 (Blocker / Crash):** ${p0s.length}\n`;
    md += `- 🟠 **P1 (Broken Interaction):** ${p1s.length}\n`;
    md += `- 🟡 **P2 (Console Error / Warning):** ${p2s.length}\n`;
    md += `- 🔵 **P3 (Visual / Layout Glitch):** ${p3s.length}\n\n`;

    if (this.defects.length === 0) {
      md += `### 🎉 All Tested Elements & Interactions Passed Cleanly!\n\n`;
      md += `No blockers, broken clicks, console errors, or layout clipping detected across tested suites.\n\n`;
    } else {
      md += `## Discovered Issues\n\n`;
      for (const d of this.defects) {
        md += `### [${d.severity}] ${d.id}: ${d.action} (${d.area})\n\n`;
        md += `- **Area:** ${d.area}\n`;
        md += `- **Action:** ${d.action}\n`;
        if (d.selector) md += `- **Selector:** \`${d.selector}\`\n`;
        md += `- **Expected:** ${d.expected}\n`;
        md += `- **Actual:** ${d.actual}\n`;
        if (d.screenshotPath) md += `- **Screenshot:** \`${path.relative(process.cwd(), d.screenshotPath)}\`\n`;
        if (d.errorLog) {
          md += `- **Error Log:**\n\`\`\`\n${d.errorLog.slice(0, 1000)}\n\`\`\`\n`;
        }
        md += `\n---\n\n`;
      }
    }

    md += `## Detailed Inventory of Probed Elements\n\n`;
    md += `| Area | Element / Action | Status | Duration |\n`;
    md += `| :--- | :--- | :---: | :---: |\n`;
    for (const el of this.testedElements) {
      const statusIcon = el.status === 'passed' ? '✅' : el.status === 'failed' ? '❌' : '⚠️';
      md += `| ${el.area} | ${el.name} | ${statusIcon} | ${el.durationMs}ms |\n`;
    }

    const reportPath = path.join(this.outputDir, 'audit-punch-list.md');
    fs.writeFileSync(reportPath, md, 'utf-8');
    return reportPath;
  }
}
