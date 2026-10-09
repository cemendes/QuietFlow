/**
 * Magic Slicer - Decomposes monolithic tasks into 3-5 low-friction Markdown checklist subtasks.
 * Supports Google Generative Language API (Gemini 2.5 Flash / Gemini 3.7 Flash) with offline heuristic fallback.
 */

import { getLanguage, translate } from '../i18n';

export interface SlicerOptions {
  apiKey?: string;
  model?: string;
}

export async function sliceTask(taskTitle: string, options: SlicerOptions = {}): Promise<string[]> {
  const apiKey = options.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '');
  const model = options.model || (typeof window !== 'undefined' ? localStorage.getItem('gemini_model') || 'gemini-2.5-flash' : 'gemini-2.5-flash');

  if (apiKey.trim()) {
    const languageHint =
      getLanguage() === 'pt-BR' ? '\nWrite every step in Brazilian Portuguese.' : '';
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
Task: "${taskTitle}"${languageHint}`,
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
  // Keywords cover both English and Portuguese task titles; steps come out in the UI language.
  const lower = taskTitle.toLowerCase();
  const mentions = (...keywords: string[]) => keywords.some((k) => lower.includes(k));

  if (mentions('tax', 'financial', 'invoice', 'imposto', 'financeir', 'fatura', 'nota fiscal')) {
    return [
      translate('slicer.tax.1'),
      translate('slicer.tax.2'),
      translate('slicer.tax.3'),
      translate('slicer.tax.4'),
    ];
  }

  if (mentions('proposal', 'agreement', 'contract', 'doc', 'proposta', 'acordo', 'contrato')) {
    return [
      translate('slicer.doc.1'),
      translate('slicer.doc.2'),
      translate('slicer.doc.3'),
      translate('slicer.doc.4'),
    ];
  }

  if (mentions('audit', 'review', 'bug', 'test', 'revis')) {
    return [
      translate('slicer.review.1'),
      translate('slicer.review.2'),
      translate('slicer.review.3'),
      translate('slicer.review.4'),
    ];
  }

  // General low-friction starter steps
  return [
    translate('slicer.general.1', { title: taskTitle }),
    translate('slicer.general.2'),
    translate('slicer.general.3'),
  ];
}
