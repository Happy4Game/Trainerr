import type { ThemePreference } from '@/data/repositories/settingsRepository';

const KEY = 'trainerr-theme';
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function isDark(preference: ThemePreference): boolean {
  return preference === 'system' ? (media()?.matches ?? true) : preference === 'dark';
}

let current: ThemePreference = 'dark';

/** Puts Ionic's dark palette on or off; remembered locally so the next launch does not flash. */
export function applyTheme(preference: ThemePreference): void {
  current = preference;
  document.documentElement.classList.toggle('ion-palette-dark', isDark(preference));
  try {
    localStorage.setItem(KEY, preference);
  } catch {
    // Private mode: the theme still applies, it is just not remembered before the settings load.
  }
}

/** First paint, before the settings are read from the database. */
export function applyStoredTheme(): void {
  let stored: string | null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  applyTheme(stored === 'light' || stored === 'system' ? stored : 'dark');
  media()?.addEventListener?.('change', () => {
    if (current === 'system') applyTheme('system');
  });
}
