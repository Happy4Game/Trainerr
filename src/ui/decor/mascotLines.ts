import { TIPS } from '@/data/content/tips';

export type MascotPose = 'trophy' | 'wave' | 'flex' | 'cheer' | 'lift' | 'sleep';

/** How the mascot comes on screen: across, up from the bottom, down from the top, hopping. */
export type MascotEntrance = 'walk' | 'peek' | 'drop' | 'hop';

/** What is celebrated, from the biggest to the smallest moment. */
export type CelebrationKind =
  'session' | 'record' | 'firstSet' | 'halfway' | 'stretching' | 'weighIn' | 'photo';

interface CelebrationStyle {
  readonly poses: readonly MascotPose[];
  readonly entrances: readonly MascotEntrance[];
  /** Number of lines in `decor.celebrations.<kind>` (0, 1, 2…). */
  readonly lines: number;
  readonly confetti: boolean;
}

/** Each moment has its poses, entrances and lines: the mascot rarely does the same twice. */
export const CELEBRATIONS: Readonly<Record<CelebrationKind, CelebrationStyle>> = {
  session: { poses: ['trophy'], entrances: ['walk'], lines: 3, confetti: true },
  record: { poses: ['trophy', 'cheer'], entrances: ['hop', 'drop'], lines: 3, confetti: false },
  firstSet: { poses: ['flex', 'lift'], entrances: ['peek', 'hop'], lines: 3, confetti: false },
  halfway: { poses: ['cheer', 'flex'], entrances: ['peek', 'drop'], lines: 3, confetti: false },
  stretching: { poses: ['cheer', 'wave'], entrances: ['drop', 'walk'], lines: 2, confetti: false },
  weighIn: { poses: ['wave', 'flex'], entrances: ['peek'], lines: 2, confetti: false },
  photo: { poses: ['flex', 'cheer'], entrances: ['peek', 'hop'], lines: 2, confetti: false },
};

/** One element of a list, drawn by `random` (0 ≤ r < 1, Math.random by default). */
export function pickOne<T>(items: readonly T[], random: () => number = Math.random): T {
  const item = items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  if (item === undefined) throw new Error('pickOne: empty list');
  return item;
}

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

/** Number of general lines during a rest (`decor.coach.rest0`…). */
export const REST_LINES = 6;

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
  return { key: 'rest', variant: input.setsDone % REST_LINES };
}
