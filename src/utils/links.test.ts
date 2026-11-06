import { describe, it, expect } from 'vitest';
import { normalizeLinkUrl } from './links';

describe('normalizeLinkUrl', () => {
  it('adds https:// to bare domains so the link is not treated as a relative path', () => {
    expect(normalizeLinkUrl('example.com')).toBe('https://example.com');
    expect(normalizeLinkUrl('  www.ufrj.br/cursos ')).toBe('https://www.ufrj.br/cursos');
  });

  it('keeps URLs that already have a scheme', () => {
    expect(normalizeLinkUrl('http://localhost:1420')).toBe('http://localhost:1420');
    expect(normalizeLinkUrl('https://quietflow.app')).toBe('https://quietflow.app');
    expect(normalizeLinkUrl('mailto:eu@exemplo.com')).toBe('mailto:eu@exemplo.com');
  });

  it('turns a bare e-mail address into a mailto link', () => {
    expect(normalizeLinkUrl('eu@exemplo.com')).toBe('mailto:eu@exemplo.com');
  });

  it('keeps in-page anchors', () => {
    expect(normalizeLinkUrl('#tarefas')).toBe('#tarefas');
  });

  it('rejects empty input and script URLs', () => {
    expect(normalizeLinkUrl('   ')).toBeNull();
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull();
  });
});
