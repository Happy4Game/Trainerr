import type { SetLog } from './types';

/**
 * Rest really taken before each set, in seconds: the time since the set logged
 * just before it in the session, whatever the machine. Missing when either set
 * has no time (added after the session, or logged before this was recorded).
 */
export function restsTaken<T extends SetLog & { readonly id: string }>(
  sets: readonly T[],
): ReadonlyMap<string, number> {
  const rests = new Map<string, number>();
  for (let index = 1; index < sets.length; index++) {
    const before = sets[index - 1]?.doneAt;
    const set = sets[index] as T;
    if (before === undefined || set.doneAt === undefined || set.doneAt <= before) continue;
    rests.set(set.id, Math.round((set.doneAt - before) / 1000));
  }
  return rests;
}

/** 95 → "1:35". */
export function restClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
