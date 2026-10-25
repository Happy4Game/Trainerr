import { ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import { getSettings, saveSettings, type Settings } from '@/data/repositories/settingsRepository';
import { applyLanguage } from '@/i18n';

const settings = ref<Settings>();
let loading: Promise<Settings> | undefined;

/** Settings shared by every screen, read once per launch. */
export function loadSettings(): Promise<Settings> {
  loading ??= (async () => {
    const { db } = await openAppDatabase();
    settings.value = await getSettings(db);
    applyLanguage(settings.value.language);
    return settings.value;
  })();
  loading.catch(() => (loading = undefined));
  return loading;
}

/** A value set to undefined removes the setting (e.g. the server account). */
export type SettingsPatch = { [K in keyof Settings]?: Settings[K] | undefined };

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  const current = await loadSettings();
  const next = Object.fromEntries(
    Object.entries({ ...current, ...patch }).filter(([, value]) => value !== undefined),
  ) as unknown as Settings;
  const { db } = await openAppDatabase();
  await saveSettings(db, next);
  settings.value = next;
  applyLanguage(next.language);
  loading = Promise.resolve(next);
  return next;
}

export function useSettings() {
  void loadSettings();
  return { settings, updateSettings };
}
