import { createI18n } from 'vue-i18n';
import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';
import { pseudoMessages } from './pseudo';

export type MessageSchema = typeof frFR;
export const supportedLocales = ['fr-FR', 'en-US'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
/** "system" follows the phone language. */
export type LanguagePreference = 'system' | SupportedLocale;

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

const phoneLanguages = () => (typeof navigator === 'undefined' ? [] : navigator.languages);

/** `?pseudo` in the address switches to the test pseudo-language until the app is reloaded. */
const pseudo =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('pseudo');

const messages: Record<string, MessageSchema> = { 'fr-FR': frFR, 'en-US': enUS };
if (pseudo) messages.pseudo = pseudoMessages(frFR) as MessageSchema;

export const i18n = createI18n({
  legacy: false,
  locale: pseudo ? 'pseudo' : pickLocale(phoneLanguages()),
  fallbackLocale: 'fr-FR',
  messages,
});

/** Applies the language chosen in the settings, without restarting the app. */
export function applyLanguage(preference: LanguagePreference): void {
  if (pseudo) return;
  const locale = preference === 'system' ? pickLocale(phoneLanguages()) : preference;
  i18n.global.locale.value = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}
