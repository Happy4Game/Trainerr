import { createI18n } from 'vue-i18n';
import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';

export type MessageSchema = typeof frFR;
export const supportedLocales = ['fr-FR', 'en-US'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

/** French first, then the phone language when the app speaks it. */
export function pickLocale(preferred: readonly string[]): SupportedLocale {
  for (const tag of preferred) {
    const exact = supportedLocales.find((locale) => locale === tag);
    if (exact) return exact;
    const sameLanguage = supportedLocales.find(
      (locale) => locale.split('-')[0] === tag.split('-')[0],
    );
    if (sameLanguage) return sameLanguage;
  }
  return 'fr-FR';
}

export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: pickLocale(typeof navigator === 'undefined' ? [] : navigator.languages),
  fallbackLocale: 'fr-FR',
  messages: { 'fr-FR': frFR, 'en-US': enUS },
});
