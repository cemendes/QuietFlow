import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { en } from './en';
import { ptBR } from './pt-BR';
import {
  detectLanguage,
  initialLanguage,
  formatShortDate,
  formatIsoDate,
  formatDateTime,
  formatDateName,
  getLanguage,
  resolveLanguage,
  setLanguage,
  translate,
} from './index';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage('en');
  });

  afterEach(() => {
    setLanguage('en');
  });

  it('defaults to English', () => {
    expect(getLanguage()).toBe('en');
    expect(translate('sidebar.settings')).toBe('Settings');
  });

  it('falls back to English for unknown or missing stored values', () => {
    expect(resolveLanguage(null)).toBe('en');
    expect(resolveLanguage('fr')).toBe('en');
    expect(resolveLanguage('pt-BR')).toBe('pt-BR');
  });

  it('detects the system language when nothing is stored yet', () => {
    expect(detectLanguage('pt-BR')).toBe('pt-BR');
    expect(detectLanguage('pt')).toBe('pt-BR');
    expect(detectLanguage('pt-PT')).toBe('pt-BR');
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });

  it('prefers the stored choice over the system language', () => {
    expect(initialLanguage('en', 'pt-BR')).toBe('en');
    expect(initialLanguage('pt-BR', 'en-US')).toBe('pt-BR');
    expect(initialLanguage(null, 'pt-BR')).toBe('pt-BR');
    expect(initialLanguage('garbage', 'pt-BR')).toBe('pt-BR');
  });

  it('switches to Brazilian Portuguese and persists the choice', () => {
    setLanguage('pt-BR');

    expect(getLanguage()).toBe('pt-BR');
    expect(translate('sidebar.settings')).toBe('Configurações');
    expect(localStorage.getItem('quietflow-language')).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('interpolates named parameters', () => {
    expect(translate('focus.completedCount', { completed: 2, total: 5 })).toBe('2 of 5 completed');
    setLanguage('pt-BR');
    expect(translate('focus.completedCount', { completed: 2, total: 5 })).toBe('2 de 5 concluídas');
  });

  it('has a non-empty pt-BR translation for every English key', () => {
    const missing = Object.keys(en).filter((key) => !ptBR[key as keyof typeof en]?.trim());
    expect(missing).toEqual([]);
  });

  it('keeps the same placeholders in both languages', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) || []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ptBR[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('formats short dates per language', () => {
    const date = new Date(2026, 8, 5);
    expect(formatShortDate(date, 'en')).toBe('Sep 5');
    expect(formatShortDate(date, 'pt-BR')).toBe('05/09/2026');
  });

  it('formats ISO date strings as DD/MM/YYYY in Brazilian Portuguese', () => {
    expect(formatIsoDate('2026-09-05', 'pt-BR')).toBe('05/09/2026');
    expect(formatIsoDate('2026-09-05', 'en')).toBe('2026-09-05');
    expect(formatIsoDate('2026-08-29 07:15', 'pt-BR')).toBe('29/08/2026 07:15');
    expect(formatIsoDate('not a date', 'pt-BR')).toBe('not a date');
  });

  it('formats date-times with the DD/MM/YYYY day first in Brazilian Portuguese', () => {
    const date = new Date(2026, 8, 5, 14, 7, 3);
    expect(formatDateTime(date, 'pt-BR')).toBe('05/09/2026 14:07');
  });

  it('formats a bare ISO date name for display, leaving other names alone', () => {
    expect(formatDateName('2026-10-18', 'pt-BR')).toBe('18/10/2026');
    expect(formatDateName('Nova anotação', 'pt-BR')).toBe('Nova anotação');
  });
});
