import { describe, it, expect } from 'vitest';
import { setFrontmatterTitle } from './frontmatterTitle';

describe('setFrontmatterTitle', () => {
  it('replaces only the title line and keeps everything else untouched', () => {
    const raw = `---\ntitle: Nova anotação\ndate: 2026-10-19\ntags: [a, b]\n---\n\n# Heading\n\n- [ ] task @due(2026-10-20)\n\n\`\`\`ts\ntitle: not frontmatter\n\`\`\`\n`;
    const out = setFrontmatterTitle(raw, 'Reunião com cliente');
    expect(out).toBe(raw.replace('title: Nova anotação', 'title: Reunião com cliente'));
  });

  it('adds a title line to frontmatter that has none', () => {
    const raw = `---\ndate: 2026-10-19\n---\n\nBody\n`;
    expect(setFrontmatterTitle(raw, 'Ideias')).toBe(`---\ntitle: Ideias\ndate: 2026-10-19\n---\n\nBody\n`);
  });

  it('creates a frontmatter block when the file has none', () => {
    expect(setFrontmatterTitle('Body only\n', 'Ideias')).toBe(`---\ntitle: Ideias\n---\n\nBody only\n`);
  });

  it('quotes titles that YAML would misread', () => {
    const out = setFrontmatterTitle(`---\ntitle: x\n---\n`, 'Plano: fase 2');
    expect(out).toBe(`---\ntitle: "Plano: fase 2"\n---\n`);
  });

  it('preserves CRLF line endings', () => {
    const raw = `---\r\ntitle: Old\r\ndate: 2026-10-19\r\n---\r\n\r\nBody\r\n`;
    expect(setFrontmatterTitle(raw, 'New')).toBe(raw.replace('title: Old', 'title: New'));
  });
});
