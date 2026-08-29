/**
 * Magic Slicer - Decomposes monolithic tasks into 3-5 low-friction Markdown checklist subtasks.
 * Supports Google Generative Language API (Gemini 2.5 Flash / Gemini 3.7 Flash) with offline heuristic fallback.
 */

export interface SlicerOptions {
  apiKey?: string;
  model?: string;
}

export async function sliceTask(taskTitle: string, options: SlicerOptions = {}): Promise<string[]> {
  const apiKey = options.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '');
  const model = options.model || (typeof window !== 'undefined' ? localStorage.getItem('gemini_model') || 'gemini-2.5-flash' : 'gemini-2.5-flash');

  if (apiKey.trim()) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an ADHD executive dysfunction task breakdown specialist.
Break down the following task into 3 to 5 tiny, ultra-low-friction, concrete action steps that take under 5 minutes to begin.
Return ONLY a raw JSON array of strings, with no markdown formatting and no conversational filler.
Task: "${taskTitle}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic slicer:', err);
    }
  }

  // Offline Heuristic Slicer (Instant Rule-Based Scaffolding)
  const lower = taskTitle.toLowerCase();

  if (lower.includes('tax') || lower.includes('financial') || lower.includes('invoice')) {
    return [
      'Gather relevant receipts and documents from email',
      'Open online tax or accounting portal',
      'Review and enter primary figures',
      'Double check deductions and submit',
    ];
  }

  if (lower.includes('proposal') || lower.includes('agreement') || lower.includes('contract') || lower.includes('doc')) {
    return [
      'Open document draft template',
      'Outline key deliverables and terms',
      'Draft core sections and review pricing',
      'Export PDF and send for review',
    ];
  }

  if (lower.includes('audit') || lower.includes('review') || lower.includes('bug') || lower.includes('test')) {
    return [
      'Isolate specific issue or scope checklist',
      'Run verification reproduction steps',
      'Apply necessary fixes or corrections',
      'Confirm tests pass and document outcome',
    ];
  }

  // General low-friction starter steps
  return [
    `Open relevant workspace and gather materials for "${taskTitle}"`,
    'Complete the first 2-minute starter action',
    'Review progress and execute remaining step',
  ];
}
