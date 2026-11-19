import { Capacitor, registerPlugin } from '@capacitor/core';
import { loadSettings } from '@/ui/useSettings';

/**
 * Android's automatic backup to the user's Google Drive, off by default.
 *
 * Android copies the data of the apps that allow it to Google Drive about once
 * a day, without asking (https://developer.android.com/identity/data/autobackup).
 * Trainerr lets that copy go only when the user turns "Google backup" on:
 * TrainerrBackupAgent.java reads the choice that CloudBackupPlugin.java keeps
 * on the native side. A transfer straight to a new phone stays allowed.
 */
interface CloudBackupPlugin {
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
}

const CloudBackup = registerPlugin<CloudBackupPlugin>('CloudBackup');

/** Only the Android app has this backup. */
export const cloudBackupAvailable = (): boolean => Capacitor.getPlatform() === 'android';

/** Tells the native side the user's choice (off unless turned on). */
export async function applyCloudBackup(enabled: boolean): Promise<void> {
  if (!cloudBackupAvailable()) return;
  await CloudBackup.setEnabled({ enabled }).catch(() => undefined);
}

/**
 * At each launch: the native side follows the settings, also after a restored
 * backup or an app data reset.
 */
export async function syncCloudBackup(): Promise<void> {
  if (!cloudBackupAvailable()) return;
  await applyCloudBackup((await loadSettings()).cloudBackup === true);
}
