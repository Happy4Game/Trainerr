import { TIPS } from '@/data/content/tips';

/** Only the tips backed by a source: the mascot never says something unchecked. */
export const MASCOT_TIPS: readonly string[] = TIPS.filter((tip) => tip.status === 'sourced').map(
  (tip) => tip.id,
);

/** Tip of the day: the same all day, another one the next day. */
export function tipOfTheDay(isoDate: string, offset = 0): string {
  const days = Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
  const count = MASCOT_TIPS.length;
  return MASCOT_TIPS[(((days + offset) % count) + count) % count] ?? MASCOT_TIPS[0] ?? 'warmup';
}

export type CoachLine =
  | { readonly key: 'setsLeft'; readonly count: number }
  | { readonly key: 'lastSet' }
  | { readonly key: 'lastMachine' }
  | { readonly key: 'record' }
  | { readonly key: 'rest'; readonly variant: number };

/**
 * What the mascot says during a rest, from the most telling to the most
 * general: a record just beaten, the last set of the session, the last
 * machine, the sets left here, else a word about the rest itself.
 */
export function coachLine(input: {
  readonly recordBeaten: boolean;
  readonly setsLeftHere: number;
  readonly machinesLeft: number;
  readonly setsDone: number;
}): CoachLine {
  if (input.recordBeaten) return { key: 'record' };
  if (input.machinesLeft === 0 && input.setsLeftHere === 1) return { key: 'lastSet' };
  if (input.machinesLeft === 0 && input.setsLeftHere > 1) return { key: 'lastMachine' };
  if (input.setsLeftHere > 0) return { key: 'setsLeft', count: input.setsLeftHere };
  return { key: 'rest', variant: input.setsDone % 3 };
}
