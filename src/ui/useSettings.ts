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

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch } as Settings;
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
