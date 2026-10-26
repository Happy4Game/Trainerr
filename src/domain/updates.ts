/**
 * Updates published as GitHub Releases by .github/workflows/release.yml: the
 * tag is "v<version name>", the version name ends with the version code
 * (GitHub run number), e.g. v1.0.42 → 42. The APK is an asset of the release.
 */

export const RELEASES_API = 'https://api.github.com/repos/Happy4Game/Trainerr/releases/latest';
/** Only APKs from the project's own releases are ever downloaded. */
export const DOWNLOAD_PREFIX = 'https://github.com/Happy4Game/Trainerr/releases/download/';

/** At most one automatic check a day: GitHub limits requests without an account. */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface AvailableUpdate {
  readonly versionCode: number;
  readonly versionName: string;
  readonly apkUrl: string;
  readonly notes: string;
}

interface ReleaseJson {
  readonly tag_name?: unknown;
  readonly body?: unknown;
  readonly draft?: unknown;
  readonly prerelease?: unknown;
  readonly assets?: readonly { readonly name?: unknown; readonly browser_download_url?: unknown }[];
}

/** Reads the answer of the GitHub API; undefined when it is not a usable release. */
export function parseRelease(json: unknown): AvailableUpdate | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const release = json as ReleaseJson;
  if (release.draft === true || release.prerelease === true) return undefined;
  const tag = typeof release.tag_name === 'string' ? release.tag_name : '';
  const match = /^v(\d+\.\d+\.(\d+))$/.exec(tag);
  if (!match?.[1] || !match[2]) return undefined;
  const apk = (release.assets ?? []).find(
    (a) =>
      typeof a.name === 'string' &&
      a.name.endsWith('.apk') &&
      typeof a.browser_download_url === 'string' &&
      a.browser_download_url.startsWith(DOWNLOAD_PREFIX),
  );
  if (!apk || typeof apk.browser_download_url !== 'string') return undefined;
  return {
    versionCode: Number(match[2]),
    versionName: match[1],
    apkUrl: apk.browser_download_url,
    notes: typeof release.body === 'string' ? release.body.slice(0, 2000) : '',
  };
}

export function isNewer(update: AvailableUpdate | undefined, installedCode: number): boolean {
  return update !== undefined && update.versionCode > installedCode;
}

/** An automatic check is due once a day; a check by hand is always allowed. */
export function checkDue(lastCheck: number | undefined, now: number): boolean {
  return lastCheck === undefined || now - lastCheck >= CHECK_INTERVAL_MS;
}
