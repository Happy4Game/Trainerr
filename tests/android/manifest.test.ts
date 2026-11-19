import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = readFileSync(
  resolve(import.meta.dirname, '../../android/app/src/main/AndroidManifest.xml'),
  'utf8',
);

const android = (path: string) =>
  readFileSync(resolve(import.meta.dirname, '../../android/app/src/main', path), 'utf8');
const filePaths = android('res/xml/file_paths.xml');
const agent = android('java/fr/trainerr/app/TrainerrBackupAgent.java');
const plugin = android('java/fr/trainerr/app/CloudBackupPlugin.java');

describe('Android manifest', () => {
  it('lets the app see the camera, so that "Take a photo" opens it and not the gallery', () => {
    // Without it, Android 11+ hides the camera app and Capacitor falls back to the file picker.
    expect(manifest).toMatch(
      /<queries>[\s\S]*<intent>\s*<action android:name="android\.media\.action\.IMAGE_CAPTURE" \/>\s*<\/intent>[\s\S]*<\/queries>/,
    );
  });

  it('may use the camera inside the app, without requiring one to install', () => {
    // Capacitor grants getUserMedia only if the CAMERA permission is declared.
    expect(manifest).toContain('<uses-permission android:name="android.permission.CAMERA" />');
    expect(manifest).toMatch(
      /<uses-feature android:name="android\.hardware\.camera" android:required="false" \/>/,
    );
  });

  it('sends nothing to Google Drive unless the user turns it on', () => {
    // Without an agent, allowBackup="true" lets Android copy the database to Drive
    // every day. The agent reads the user's choice (off by default).
    expect(manifest).toContain('android:backupAgent=".TrainerrBackupAgent"');
    expect(manifest).toContain('android:fullBackupOnly="true"');
    expect(agent).toMatch(/deviceToDevice\(data\) \|\| CloudBackupPlugin\.isEnabled\(this\)/);
    expect(plugin).toContain('getBoolean(ENABLED, false)');
  });

  it('shares only the folders it needs through its FileProvider, never the whole storage', () => {
    expect(filePaths).not.toContain('<external-path');
    expect(filePaths).not.toMatch(/path="\."/);
    expect(filePaths).toContain('<external-files-path name="camera_photos" path="Pictures/" />');
    expect(filePaths).toContain('<cache-path name="updates" path="updates/" />');
    expect(filePaths).toContain('<cache-path name="exports" path="exports/" />');
  });
});
