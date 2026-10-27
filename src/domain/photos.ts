import { daysBetween } from './dates';
import type { IsoDate } from './types';

/**
 * Body photos, to see the change over time. The same pose, light and place
 * each time make the comparison fair; the pose is kept with each photo.
 */
export type PhotoPose = 'front' | 'side' | 'back';
export const PHOTO_POSES: readonly PhotoPose[] = ['front', 'side', 'back'];

export interface DatedPhoto {
  readonly id: string;
  readonly date: IsoDate;
  readonly pose?: PhotoPose;
}

export interface PhotoInTime<P extends DatedPhoto> {
  readonly photo: P;
  /** Sessions done up to that day, included. */
  readonly sessions: number;
  /** Whole weeks since the first photo. */
  readonly weeks: number;
}

export interface PhotoMonth<P extends DatedPhoto> {
  /** "2026-10" */
  readonly month: string;
  readonly photos: readonly PhotoInTime<P>[];
}

const byDate = <P extends DatedPhoto>(a: P, b: P) => a.date.localeCompare(b.date);

/** Photos of a pose; every photo when no pose is asked. Untagged photos count as any pose. */
export function photosOfPose<P extends DatedPhoto>(
  photos: readonly P[],
  pose: PhotoPose | undefined,
): P[] {
  return photos.filter((p) => !pose || !p.pose || p.pose === pose);
}

/**
 * The gallery, newest month first and newest photo first in a month, each
 * photo with the sessions done by then and the weeks since the first photo.
 */
export function photoTimeline<P extends DatedPhoto>(
  photos: readonly P[],
  sessionDates: readonly IsoDate[],
): PhotoMonth<P>[] {
  const sorted = [...photos].sort(byDate);
  const first = sorted[0]?.date;
  const dates = [...sessionDates].sort();
  const months = new Map<string, PhotoInTime<P>[]>();
  for (const photo of sorted.reverse()) {
    const month = photo.date.slice(0, 7);
    const list = months.get(month) ?? [];
    list.push({
      photo,
      sessions: dates.filter((d) => d <= photo.date).length,
      weeks: first ? Math.floor(daysBetween(first, photo.date) / 7) : 0,
    });
    months.set(month, list);
  }
  return [...months].map(([month, list]) => ({ month, photos: list }));
}

/** First and last photo of a pose, and what lies between them, for the side-by-side view. */
export function photoComparison<P extends DatedPhoto>(
  photos: readonly P[],
  sessionDates: readonly IsoDate[],
): { before: P; after: P; weeks: number; sessions: number } | undefined {
  const sorted = [...photos].sort(byDate);
  const before = sorted[0];
  const after = sorted.at(-1);
  if (!before || !after || before === after) return undefined;
  return {
    before,
    after,
    weeks: Math.floor(daysBetween(before.date, after.date) / 7),
    sessions: sessionDates.filter((d) => d > before.date && d <= after.date).length,
  };
}

/**
 * Date of an imported photo: the file's date (when the phone wrote it), never
 * in the future. The user can correct it afterwards.
 */
export function importedPhotoDate(lastModified: number, today: IsoDate): IsoDate {
  if (!Number.isFinite(lastModified) || lastModified <= 0) return today;
  const d = new Date(lastModified);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return local > today ? today : local;
}
