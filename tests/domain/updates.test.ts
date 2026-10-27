import { describe, expect, it } from 'vitest';
import { checkDue, CHECK_INTERVAL_MS, isNewer, parseRelease } from '@/domain/updates';

const release = {
  tag_name: 'v1.0.42',
  body: 'Séances types, tractions assistées.',
  draft: false,
  prerelease: false,
  assets: [
    {
      name: 'latest.json',
      browser_download_url:
        'https://github.com/Happy4Game/Trainerr/releases/download/v1.0.42/latest.json',
    },
    {
      name: 'trainerr-1.0.42.apk',
      browser_download_url:
        'https://github.com/Happy4Game/Trainerr/releases/download/v1.0.42/trainerr-1.0.42.apk',
    },
  ],
};

describe('app updates', () => {
  it('read the version code from the tag and the APK from the assets', () => {
    expect(parseRelease(release)).toEqual({
      versionCode: 42,
      versionName: '1.0.42',
      apkUrl:
        'https://github.com/Happy4Game/Trainerr/releases/download/v1.0.42/trainerr-1.0.42.apk',
      notes: 'Séances types, tractions assistées.',
    });
  });

  it('ignore drafts, pre-releases, odd tags and APKs hosted elsewhere', () => {
    expect(parseRelease({ ...release, draft: true })).toBeUndefined();
    expect(parseRelease({ ...release, prerelease: true })).toBeUndefined();
    expect(parseRelease({ ...release, tag_name: 'nightly' })).toBeUndefined();
    expect(
      parseRelease({
        ...release,
        assets: [
          { name: 'trainerr.apk', browser_download_url: 'https://evil.example/trainerr.apk' },
        ],
      }),
    ).toBeUndefined();
    expect(parseRelease(null)).toBeUndefined();
    expect(parseRelease({ message: 'Not Found' })).toBeUndefined();
  });

  it('offer the update only when its version code is higher', () => {
    const update = parseRelease(release);
    expect(isNewer(update, 41)).toBe(true);
    expect(isNewer(update, 42)).toBe(false);
    expect(isNewer(undefined, 1)).toBe(false);
  });

  it('check automatically every half hour at most', () => {
    expect(CHECK_INTERVAL_MS).toBe(30 * 60 * 1000);
    expect(checkDue(undefined, 1000)).toBe(true);
    expect(checkDue(1000, 1000 + CHECK_INTERVAL_MS - 1)).toBe(false);
    expect(checkDue(1000, 1000 + CHECK_INTERVAL_MS)).toBe(true);
  });
});
