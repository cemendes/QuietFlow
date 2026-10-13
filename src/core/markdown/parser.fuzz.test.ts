import { describe, it, expect } from 'vitest';
import { parseMarkdownDocument, updateTaskInDocument, addTaskToDocument } from './index';

describe('Markdown Parser & Serializer Robustness & Fuzzing Suite', () => {
  it('handles severely broken / unclosed YAML frontmatter without throwing', () => {
    const malformedDocs = [
      `---
title: Unclosed Frontmatter
id: broken-123
# Missing closing dashes!

# Tasks
- [ ] Task 1
`,
      `---
: invalid : yaml : structure : [}}{
---
- [ ] Valid task below broken yaml
`,
      `
---
title: Leading newlines before frontmatter
---
- [ ] Task with leading whitespace frontmatter
`,
      `---
title: "Unclosed quotes in frontmatter
category: test
---
- [ ] Task below unclosed quote
`,
    ];

    for (const doc of malformedDocs) {
      expect(() => {
        const parsed = parseMarkdownDocument(doc);
        expect(parsed).toBeDefined();
        expect(Array.isArray(parsed.tasks)).toBe(true);
      }).not.toThrow();
    }
  });

  it('correctly parses tasks with email addresses, URLs, and markdown links without tag corruption', () => {
    const doc = `
# Tasks
- [ ] Email user.name+tag@example.com regarding SLA @due(2026-09-10) @priority(high) #client
- [ ] Review documentation at https://quietflow.app/docs#getting-started #docs
- [ ] Check [PR #45: Fix Navigation Bug](https://github.com/org/repo/pull/45) @status(in-progress)
- [ ] Cost is \$500/mo with 50% discount #finance
`;

    const parsed = parseMarkdownDocument(doc);
    expect(parsed.tasks).toHaveLength(4);

    expect(parsed.tasks[0].title).toContain('user.name+tag@example.com');
    expect(parsed.tasks[0].tags).toEqual(['client']);
    expect(parsed.tasks[0].priority).toBe('high');

    expect(parsed.tasks[1].title).toContain('https://quietflow.app/docs#getting-started');
    expect(parsed.tasks[1].tags).toEqual(['docs']);

    expect(parsed.tasks[2].title).toContain('[PR #45: Fix Navigation Bug]');
    expect(parsed.tasks[2].status).toBe('in-progress');

    expect(parsed.tasks[3].title).toContain('\$500/mo');
    expect(parsed.tasks[3].tags).toEqual(['finance']);
  });

  it('handles deeply nested subtasks (10 levels deep) cleanly', () => {
    const deepDoc = `
- [ ] Root Task
  - [ ] Subtask Level 1
    - [ ] Subtask Level 2
      - [ ] Subtask Level 3
        - [ ] Subtask Level 4
          - [ ] Subtask Level 5
            - [ ] Subtask Level 6
              - [ ] Subtask Level 7
                - [ ] Subtask Level 8
                  - [ ] Subtask Level 9
                    - [ ] Subtask Level 10
`;

    const parsed = parseMarkdownDocument(deepDoc);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].title).toBe('Root Task');
    expect(parsed.tasks[0].subtasks?.length).toBeGreaterThan(0);
  });

  it('preserves foreign UTF-8 unicode, Japanese/Chinese, Cyrillic, and emojis in tasks', () => {
    const unicodeDoc = `
# Tasks
- [ ] 🚀 Ship production release v1.0.0 #release @priority(urgent)
- [ ] ユーザー登録フローの改善 (Improve user registration flow) #i18n
- [ ] Проверить резервное копирование данных (Verify data backup) @due(2026-10-01)
- [ ] 🌿 QuietFlow 落ち着いたタスク管理 #calm
`;

    const parsed = parseMarkdownDocument(unicodeDoc);
    expect(parsed.tasks).toHaveLength(4);
    expect(parsed.tasks[0].title).toContain('🚀 Ship production release');
    expect(parsed.tasks[1].title).toContain('ユーザー登録フローの改善');
    expect(parsed.tasks[2].title).toContain('Проверить резервное копирование данных');
    expect(parsed.tasks[3].title).toContain('🌿 QuietFlow 落ち着いたタスク管理');
  });

  it('fuzzes with 100 randomly generated garbage and boundary strings without throwing', () => {
    const generateGarbage = (i: number) => {
      const symbols = ['-', '[ ]', '[x]', '[/]', '@', '#', '---', '\n', '\t', '`', '<script>', 'null', 'undefined', '{}'];
      let str = '';
      for (let j = 0; j < 20; j++) {
        str += symbols[(i + j * 7) % symbols.length] + ' ' + String.fromCharCode(32 + ((i * 13 + j) % 90));
      }
      return str;
    };

    for (let i = 0; i < 100; i++) {
      const garbage = generateGarbage(i);
      expect(() => {
        const parsed = parseMarkdownDocument(garbage);
        expect(parsed).toBeDefined();
        if (parsed.tasks.length > 0) {
          updateTaskInDocument(garbage, parsed.tasks[0].id, { status: 'done' });
          addTaskToDocument(garbage, { title: `Fuzz task ${i}` });
        }
      }).not.toThrow();
    }
  });
});
