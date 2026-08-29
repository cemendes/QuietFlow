import { describe, it, expect } from 'vitest';
import { triggerCelebration, CELEBRATION_THEMES } from './celebrations';

describe('Celebrations Engine Test Suite', () => {
  it('contains at least 10 unique celebratory kid-friendly and meme themes', () => {
    expect(CELEBRATION_THEMES.length).toBeGreaterThanOrEqual(10);
    const themeNames = CELEBRATION_THEMES.map((t) => t.name);
    expect(themeNames).toContain('Unicorn Soar');
    expect(themeNames).toContain('Banana Minion');
    expect(themeNames).toContain('Smurf Victory');
    expect(themeNames).toContain('Doge Wow');
    expect(themeNames).toContain('Nyan Cat');
  });

  it('runs triggerCelebration without throwing errors in mock DOM environment', () => {
    expect(() => triggerCelebration(0)).not.toThrow();
  });
});
