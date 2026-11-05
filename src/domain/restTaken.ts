import type { SetLog } from './types';

/**
 * Rest really taken before each set, in seconds, in the order of the sets: the
 * time since the set logged just before it in the session, whatever the machine.
 * Missing when either set has no time (added after the session, or logged
 * before this was recorded).
 */
export function restsBefore(sets: readonly Pick<SetLog, 'doneAt'>[]): (number | undefined)[] {
  return sets.map((set, index) => {
    const before = sets[index - 1]?.doneAt;
    if (before === undefined || set.doneAt === undefined || set.doneAt <= before) return undefined;
    return Math.round((set.doneAt - before) / 1000);
  });
}

/** Same, by set id. */
export function restsTaken<T extends SetLog & { readonly id: string }>(
  sets: readonly T[],
): ReadonlyMap<string, number> {
  const rests = new Map<string, number>();
  restsBefore(sets).forEach((rest, index) => {
    if (rest !== undefined) rests.set((sets[index] as T).id, rest);
  });
  return rests;
}

/** Mean of the rests known in the session, in whole seconds; missing when none is known. */
export function averageRest(sets: readonly SetLog[]): number | undefined {
  const rests = restsBefore(sets).filter((rest): rest is number => rest !== undefined);
  if (rests.length === 0) return undefined;
  return Math.round(rests.reduce((sum, rest) => sum + rest, 0) / rests.length);
}

/** 95 → "1:35". */
export function restClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
