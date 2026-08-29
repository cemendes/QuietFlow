import { describe, it, expect } from 'vitest';
import {
  parseMarkdownDocument,
  updateTaskInDocument,
  addTaskToDocument,
  serializeTaskLine,
} from './index';
import { NewTaskInput } from './types';

const sampleDoc = `---
id: cust-acme-corp
title: Acme Corp
category: Customers
---

# Deliverables & Tasks
- [ ] Review security audit checklist @due(2026-09-01) @priority(high) #deliverable
  - Notes: Coordinate with internal SecOps
- [/] Draft MSA revision @status(in-progress)
- [x] Finalize pricing @completed(2026-08-27)

# Meeting Notes
### Q3 Strategy
Key discussion points.
`;

describe('Markdown Parser & Non-destructive Serializer', () => {
  describe('parseMarkdownDocument', () => {
    it('correctly parses frontmatter and task items', () => {
      const parsed = parseMarkdownDocument(sampleDoc);
      expect(parsed.frontmatter.id).toBe('cust-acme-corp');
      expect(parsed.frontmatter.title).toBe('Acme Corp');
      expect(parsed.frontmatter.category).toBe('Customers');
      expect(parsed.tasks).toHaveLength(3);

      expect(parsed.tasks[0].title).toBe('Review security audit checklist');
      expect(parsed.tasks[0].status).toBe('todo');
      expect(parsed.tasks[0].priority).toBe('high');
      expect(parsed.tasks[0].dueDate).toBe('2026-09-01');
      expect(parsed.tasks[0].tags).toEqual(['deliverable']);
      expect(parsed.tasks[0].notes).toBe('Coordinate with internal SecOps');

      expect(parsed.tasks[1].title).toBe('Draft MSA revision');
      expect(parsed.tasks[1].status).toBe('in-progress');

      expect(parsed.tasks[2].title).toBe('Finalize pricing');
      expect(parsed.tasks[2].status).toBe('done');
      expect(parsed.tasks[2].completedDate).toBe('2026-08-27');
    });

    it('handles document without frontmatter', () => {
      const doc = `# Simple Tasks\n- [ ] Basic task without metadata\n`;
      const parsed = parseMarkdownDocument(doc);
      expect(parsed.frontmatter).toEqual({});
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0].title).toBe('Basic task without metadata');
      expect(parsed.tasks[0].status).toBe('todo');
      expect(parsed.tasks[0].tags).toEqual([]);
    });

    it('ignores checkboxes inside code blocks', () => {
      const doc = `# Guide
\`\`\`markdown
- [ ] This is inside code block
\`\`\`
- [ ] Real task
`;
      const parsed = parseMarkdownDocument(doc);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0].title).toBe('Real task');
    });

    it('parses multiple tags and subtasks', () => {
      const doc = `- [ ] Multi-tag task #urgent #backend #v1
  - [ ] Subtask 1
  - [x] Subtask 2
  - Additional note line
`;
      const parsed = parseMarkdownDocument(doc);
      expect(parsed.tasks).toHaveLength(1);
      expect(parsed.tasks[0].tags).toEqual(['urgent', 'backend', 'v1']);
      expect(parsed.tasks[0].subtasks).toHaveLength(2);
      expect(parsed.tasks[0].subtasks?.[0].title).toBe('Subtask 1');
      expect(parsed.tasks[0].subtasks?.[0].status).toBe('todo');
      expect(parsed.tasks[0].subtasks?.[1].title).toBe('Subtask 2');
      expect(parsed.tasks[0].notes).toContain('Additional note line');
    });

    it('maintains stable task IDs across line shifts when new tasks are prepended', () => {
      const initialDoc = `- [ ] Task Alpha\n- [ ] Task Beta\n`;
      const parsed1 = parseMarkdownDocument(initialDoc);
      const alphaId = parsed1.tasks[0].id;
      const betaId = parsed1.tasks[1].id;

      // Prepend a new task at the top
      const prependedDoc = `- [ ] Task Zero\n- [ ] Task Alpha\n- [ ] Task Beta\n`;
      const parsed2 = parseMarkdownDocument(prependedDoc);

      expect(parsed2.tasks[1].id).toBe(alphaId);
      expect(parsed2.tasks[2].id).toBe(betaId);
    });
  });

  describe('updateTaskInDocument', () => {
    it('updates task status without altering meeting notes or frontmatter', () => {
      const parsed = parseMarkdownDocument(sampleDoc);
      const updated = updateTaskInDocument(sampleDoc, parsed.tasks[0].id, { status: 'done' });
      expect(updated).toContain('- [x] Review security audit checklist');
      expect(updated).toContain('# Meeting Notes\n### Q3 Strategy\nKey discussion points.');
      expect(updated).toContain('title: Acme Corp');
    });

    it('updates task priority, due date, and tags', () => {
      const parsed = parseMarkdownDocument(sampleDoc);
      const updated = updateTaskInDocument(sampleDoc, parsed.tasks[0].id, {
        priority: 'low',
        dueDate: '2026-10-15',
        tags: ['deliverable', 'q4'],
      });
      expect(updated).toContain('@priority(low)');
      expect(updated).toContain('@due(2026-10-15)');
      expect(updated).toContain('#deliverable #q4');
    });

    it('updates task notes cleanly', () => {
      const parsed = parseMarkdownDocument(sampleDoc);
      const updated = updateTaskInDocument(sampleDoc, parsed.tasks[0].id, {
        notes: 'Updated note line 1\nLine 2 info',
      });
      expect(updated).toContain('  - Notes: Updated note line 1\n    Line 2 info');
    });

    it('toggles task from done to todo and removes or clears completed annotation', () => {
      const parsed = parseMarkdownDocument(sampleDoc);
      const updated = updateTaskInDocument(sampleDoc, parsed.tasks[2].id, { status: 'todo' });
      expect(updated).toContain('- [ ] Finalize pricing');
      expect(updated).not.toContain('@completed(2026-08-27)');
    });
  });

  describe('addTaskToDocument', () => {
    it('appends new task to existing task section', () => {
      const newTask: NewTaskInput = {
        title: 'New onboarding session',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-09-05',
        tags: ['onboarding'],
        notes: 'Prepare slides',
      };
      const updated = addTaskToDocument(sampleDoc, newTask);
      expect(updated).toContain('- [ ] New onboarding session @due(2026-09-05) @priority(medium) #onboarding');
      expect(updated).toContain('  - Notes: Prepare slides');
      // Should preserve Meeting Notes section after task section
      expect(updated).toContain('# Meeting Notes');
    });

    it('appends task to document without existing task header', () => {
      const simpleDoc = `# Notes\nSome general notes.\n`;
      const newTask: NewTaskInput = {
        title: 'Stand-alone task',
        status: 'todo',
        priority: 'high',
      };
      const updated = addTaskToDocument(simpleDoc, newTask);
      expect(updated).toContain('- [ ] Stand-alone task @priority(high)');
    });
  });

  describe('serializeTaskLine', () => {
    it('serializes task item into standard Markdown format', () => {
      const line = serializeTaskLine({
        title: 'Ship feature',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-09-10',
        tags: ['core', 'v1'],
      });
      expect(line).toBe('- [/] Ship feature @due(2026-09-10) @priority(high) #core #v1');
    });
  });

  describe('Task Comments & Activity', () => {
    it('parses comments with author and timestamps', () => {
      const docWithComments = `- [ ] Deploy to production @high
  - Notes: Check staging logs before deploy
  - [x] Run smoke tests
  - Comment (Eduardo, 2026-08-29 07:15): Staging verified.
  - Comment (2026-08-29 07:25): Approval received.
`;
      const parsed = parseMarkdownDocument(docWithComments);
      expect(parsed.tasks).toHaveLength(1);
      const task = parsed.tasks[0];
      expect(task.comments).toHaveLength(2);
      expect(task.comments?.[0].author).toBe('Eduardo');
      expect(task.comments?.[0].timestamp).toBe('2026-08-29 07:15');
      expect(task.comments?.[0].content).toBe('Staging verified.');
      expect(task.comments?.[1].author).toBe('You');
      expect(task.comments?.[1].timestamp).toBe('2026-08-29 07:25');
      expect(task.comments?.[1].content).toBe('Approval received.');
    });

    it('round-trips comments through updateTaskInDocument without data loss', () => {
      const doc = `- [ ] Task with discussion
  - Notes: Initial spec
  - [ ] Subtask 1
`;
      const parsed = parseMarkdownDocument(doc);
      const updated = updateTaskInDocument(doc, parsed.tasks[0].id, {
        comments: [
          {
            id: 'c1',
            author: 'You',
            timestamp: '2026-08-29 07:30',
            content: 'Discussed with design team, moving ahead.',
          },
        ],
      });

      expect(updated).toContain('  - Comment (2026-08-29 07:30): Discussed with design team, moving ahead.');
      expect(updated).toContain('  - Notes: Initial spec');
      expect(updated).toContain('  - [ ] Subtask 1');

      const reParsed = parseMarkdownDocument(updated);
      expect(reParsed.tasks[0].comments).toHaveLength(1);
      expect(reParsed.tasks[0].comments?.[0].content).toBe('Discussed with design team, moving ahead.');
    });
  });
});
