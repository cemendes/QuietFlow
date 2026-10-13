import { useCallback, useSyncExternalStore } from 'react';
import { en, TranslationKey } from './en';
import { ptBR } from './pt-BR';

export type { TranslationKey };
export type Language = 'en' | 'pt-BR';
export type TranslationParams = Record<string, string | number>;
export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export const LANGUAGE_STORAGE_KEY = 'quietflow-language';
export const DEFAULT_LANGUAGE: Language = 'en';

/** Languages offered in Settings, labelled in their own language. */
export const LANGUAGES: { code: Language; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
];

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  'pt-BR': ptBR,
};

const SHORT_MONTHS: Record<Language, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};

export function resolveLanguage(raw: string | null | undefined): Language {
  return LANGUAGES.some((l) => l.code === raw) ? (raw as Language) : DEFAULT_LANGUAGE;
}

/** Maps a system locale (e.g. `navigator.language`) to a supported language. */
export function detectLanguage(systemLocale: string | null | undefined): Language {
  return systemLocale?.toLowerCase().startsWith('pt') ? 'pt-BR' : DEFAULT_LANGUAGE;
}

/** An explicit saved choice always wins; the system language is only used on first launch. */
export function initialLanguage(
  stored: string | null | undefined,
  systemLocale: string | null | undefined
): Language {
  return LANGUAGES.some((l) => l.code === stored)
    ? (stored as Language)
    : detectLanguage(systemLocale);
}

function readStoredLanguage(): Language {
  const systemLocale = typeof navigator !== 'undefined' ? navigator.language : undefined;
  try {
    return initialLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY), systemLocale);
  } catch {
    return detectLanguage(systemLocale);
  }
}

let language: Language = readStoredLanguage();
const listeners = new Set<() => void>();

function applyDocumentLanguage() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

applyDocumentLanguage();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLanguage(): Language {
  return language;
}

export function setLanguage(next: Language): void {
  language = next;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    // Storage unavailable — the choice still applies for this session
  }
  applyDocumentLanguage();
  for (const listener of listeners) {
    listener();
  }
}

function translateIn(lang: Language, key: TranslationKey, params?: TranslationParams): string {
  const template = dictionaries[lang][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match
  );
}

/** Translate outside of React (utils, store). Components should use `useTranslation` instead. */
export function translate(key: TranslationKey, params?: TranslationParams): string {
  return translateIn(language, key, params);
}

/** "Sep 5" in English, "5 set" in Brazilian Portuguese. */
export function formatShortDate(date: Date, lang: Language = language): string {
  const month = SHORT_MONTHS[lang][date.getMonth()];
  return lang === 'pt-BR' ? `${date.getDate()} ${month}` : `${month} ${date.getDate()}`;
}

/** Subscribes the component to language changes and returns a `t` bound to the current language. */
export function useTranslation() {
  const current = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  const t = useCallback<TranslateFn>(
    (key, params) => translateIn(current, key, params),
    [current]
  );
  return { t, language: current, setLanguage };
}
