import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = readFileSync(
  resolve(import.meta.dirname, '../../android/app/src/main/AndroidManifest.xml'),
  'utf8',
);

describe('Android manifest', () => {
  it('lets the app see the camera, so that "Take a photo" opens it and not the gallery', () => {
    // Without it, Android 11+ hides the camera app and Capacitor falls back to the file picker.
    expect(manifest).toMatch(
      /<queries>[\s\S]*<intent>\s*<action android:name="android\.media\.action\.IMAGE_CAPTURE" \/>\s*<\/intent>[\s\S]*<\/queries>/,
    );
  });
});
