import { describe, expect, it } from 'vitest';
import { i18n, pickLocale } from '@/i18n';
import { pseudoMessages } from '@/i18n/pseudo';

const t = (locale: string, key: string, count: number) => {
  i18n.global.locale.value = locale;
  return i18n.global.t(key, count);
};

describe('translations', () => {
  it('uses the plural rules of each language (CLDR)', () => {
    expect(t('fr-FR', 'catalog.count', 0)).toBe('0 exercice');
    expect(t('fr-FR', 'catalog.count', 1)).toBe('1 exercice');
    expect(t('fr-FR', 'catalog.count', 2)).toBe('2 exercices');
    expect(t('en-US', 'catalog.count', 0)).toBe('0 exercises');
    expect(t('en-US', 'catalog.count', 1)).toBe('1 exercise');
  });

  it('picks French first, then the phone language when the app speaks it', () => {
    expect(pickLocale(['en-GB', 'fr-FR'])).toBe('en-US');
    expect(pickLocale(['de-DE'])).toBe('fr-FR');
    expect(pickLocale(['fr-CA'])).toBe('fr-FR');
  });

  it('pseudo-language keeps placeholders and plural bars', () => {
    const pseudo = pseudoMessages({ a: '{count} série | {count} séries' }) as { a: string };
    expect(pseudo.a).toMatch(/^⟦\{count\} šé.*~+⟧ \| ⟦\{count\} .*~+⟧$/);
  });
});
