import { Capacitor, registerPlugin } from '@capacitor/core';
import { ref } from 'vue';
import {
  checkDue,
  isNewer,
  parseRelease,
  RELEASES_API,
  type AvailableUpdate,
} from '@/domain/updates';
import { loadSettings } from '@/ui/useSettings';

/** Native side: android/app/src/main/java/fr/trainerr/app/AppUpdaterPlugin.java. */
interface AppUpdaterPlugin {
  getVersion(): Promise<{ versionCode: number; versionName: string }>;
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(
    event: 'downloadProgress',
    listener: (progress: { percent: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

/** Only the Android app installs APKs; in the browser the page is always the latest. */
export const updatesSupported = () => Capacitor.getPlatform() === 'android';

export type UpdateState =
  | { kind: 'idle' | 'checking' | 'upToDate' | 'needsPermission' }
  | { kind: 'available'; update: AvailableUpdate }
  | { kind: 'downloading'; update: AvailableUpdate; percent: number }
  | { kind: 'error'; message: string };

const state = ref<UpdateState>({ kind: 'idle' });
const installed = ref<{ versionCode: number; versionName: string }>();
/** Closed with "Later": shown again at the next launch only. */
const dismissed = ref(false);

const LAST_CHECK_KEY = 'trainerr.lastUpdateCheck';
function lastCheck(): number | undefined {
  try {
    const value = Number(localStorage.getItem(LAST_CHECK_KEY));
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
function rememberCheck(now: number): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {
    // Private storage unavailable: the next launch checks again.
  }
}

async function installedVersion() {
  installed.value ??= await AppUpdater.getVersion();
  return installed.value;
}

/** Asks GitHub for the latest release and compares it with the installed version. */
export async function checkForUpdate(): Promise<void> {
  if (!updatesSupported() || state.value.kind === 'checking') return;
  state.value = { kind: 'checking' };
  try {
    const current = await installedVersion();
    const response = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status === 404) {
      state.value = { kind: 'upToDate' };
      return;
    }
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const update = parseRelease(await response.json());
    rememberCheck(Date.now());
    state.value =
      update && isNewer(update, current.versionCode)
        ? { kind: 'available', update }
        : { kind: 'upToDate' };
  } catch (error) {
    state.value = {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** At launch, once a day at most, if the user kept the setting on. */
export async function checkAtStartup(): Promise<void> {
  if (!updatesSupported()) return;
  const settings = await loadSettings();
  if (settings.autoUpdateCheck === false || !checkDue(lastCheck(), Date.now())) return;
  await checkForUpdate();
}

/** Downloads the APK, then Android shows its own install screen. */
export async function installUpdate(update: AvailableUpdate): Promise<void> {
  const { allowed } = await AppUpdater.canInstall();
  if (!allowed) {
    state.value = { kind: 'needsPermission' };
    return;
  }
  state.value = { kind: 'downloading', update, percent: 0 };
  const listener = await AppUpdater.addListener('downloadProgress', ({ percent }) => {
    if (state.value.kind === 'downloading') state.value = { ...state.value, percent };
  });
  try {
    await AppUpdater.downloadAndInstall({ url: update.apkUrl });
    state.value = { kind: 'available', update };
  } catch (error) {
    state.value = {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await listener.remove();
  }
}

export async function openInstallSettings(): Promise<void> {
  await AppUpdater.openInstallSettings();
}

export function useUpdates() {
  if (updatesSupported() && !installed.value) void installedVersion().catch(() => undefined);
  return {
    state,
    installed,
    dismissed,
    supported: updatesSupported(),
    check: checkForUpdate,
    install: installUpdate,
    openInstallSettings,
  };
}
