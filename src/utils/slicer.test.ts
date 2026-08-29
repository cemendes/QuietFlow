import { describe, it, expect, vi } from 'vitest';
import { sliceTask } from './slicer';

describe('Magic Slicer Task Auto-Breaker Suite', () => {
  it('breaks down financial tasks into low-friction steps via offline heuristic fallback', async () => {
    const steps = await sliceTask('Prepare Annual Tax Return');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]).toContain('receipts');
  });

  it('breaks down document tasks into low-friction steps', async () => {
    const steps = await sliceTask('Draft Master Service Agreement');
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]).toContain('document');
  });

  it('uses Gemini API when API key is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    'Find W2 form in email',
                    'Log into TurboTax',
                    'Fill in income',
                  ]),
                },
              ],
            },
          },
        ],
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const steps = await sliceTask('Do my taxes', { apiKey: 'AIzaFakeKey' });
    expect(steps).toEqual(['Find W2 form in email', 'Log into TurboTax', 'Fill in income']);
  });
});
