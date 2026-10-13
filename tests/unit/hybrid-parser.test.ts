import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';

describe('Hybrid Markdown Parser (Document Spans)', () => {
  it('parses mixed prose, headings, code blocks, and tasks into contiguous spans', () => {
    const markdown = `# Architecture Notes

Discussion about Cloud Run.

- [ ] Deliver SOW @priority(high) #core
  - [x] Security review
- [x] Discovery call

### Meeting Notes
Budget approved for $120k.`;

    const doc = parseMarkdownDocument(markdown, 'customers/acme.md');

    expect(doc.tasks).toHaveLength(2);
    expect(doc.tasks[0].title).toBe('Deliver SOW');
    expect(doc.tasks[0].priority).toBe('high');
    expect(doc.spans).toBeDefined();
    expect(doc.spans!.length).toBeGreaterThanOrEqual(4);

    const taskSpan = doc.spans!.find((s) => s.type === 'task' && s.taskId === doc.tasks[0].id);
    expect(taskSpan).toBeDefined();
  });

  it('correctly calculates word count and reading time', () => {
    const markdown = `A quick meeting note with ten words in total here.`;
    const doc = parseMarkdownDocument(markdown, 'notes/quick.md');
    expect(doc.wordCount).toBe(10);
    expect(doc.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    expect(doc.filePath).toBe('notes/quick.md');
  });

  it('ignores checklist items inside fenced code blocks', () => {
    const markdown = `Here is example code:

\`\`\`markdown
- [ ] This is not a real task
\`\`\`

- [ ] This is a real task`;

    const doc = parseMarkdownDocument(markdown, 'test.md');
    expect(doc.tasks).toHaveLength(1);
    expect(doc.tasks[0].title).toBe('This is a real task');
  });
});
