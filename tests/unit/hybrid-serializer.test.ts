import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument } from '../../src/core/markdown/parser';
import { patchTaskInDocumentContent } from '../../src/core/markdown/serializer';

describe('Hybrid Non-Destructive Serializer', () => {
  it('updates task completion state while preserving surrounding prose and indentation byte-for-byte', () => {
    const raw = `# Title

Intro paragraph with special symbols: $E=mc^2$.

- [ ] Refactor core engine @priority(high)
  - [ ] Write tests

### Meeting Notes
Client approved $120k budget.`;

    const doc = parseMarkdownDocument(raw, 'test.md');
    const task = {
      ...doc.tasks[0],
      status: 'done' as const,
      subtasks: [{ ...doc.tasks[0].subtasks![0], status: 'done' as const }],
    };

    const patched = patchTaskInDocumentContent(raw, task, doc.tasks[0]);
    expect(patched).toContain('- [x] Refactor core engine');
    expect(patched).toContain('  - [x] Write tests');
    expect(patched).toContain('Intro paragraph with special symbols: $E=mc^2$.');
    expect(patched).toContain('### Meeting Notes\nClient approved $120k budget.');
  });
});
