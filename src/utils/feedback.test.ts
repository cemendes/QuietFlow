import { describe, it, expect } from 'vitest';
import { triggerCompletionFeedback } from './feedback';

describe('Completion Feedback Test Suite', () => {
  it('does not throw when audio context is invoked on task completion in node/jsdom environment', () => {
    expect(() => triggerCompletionFeedback()).not.toThrow();
  });
});
