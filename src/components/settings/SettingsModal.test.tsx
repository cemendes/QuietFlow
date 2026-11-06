import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SettingsModal from './SettingsModal';
import { setLanguage } from '../../i18n';

describe('SettingsModal language preference', () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage('en');
  });

  afterEach(() => {
    setLanguage('en');
  });

  it('renders in English by default', () => {
    render(<SettingsModal isOpen onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeInTheDocument();
  });

  it('switches the interface to Brazilian Portuguese and back', () => {
    render(<SettingsModal isOpen onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByTestId('language-option-pt-BR'));

    expect(screen.getByRole('heading', { name: 'Preferências' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma' })).toBeInTheDocument();
    expect(localStorage.getItem('quietflow-language')).toBe('pt-BR');

    fireEvent.click(screen.getByTestId('language-option-en'));

    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeInTheDocument();
    expect(localStorage.getItem('quietflow-language')).toBe('en');
  });
});
