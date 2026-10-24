import { addDays, startOfWeek } from './dates';
import type { MuscleId } from './muscles';
import { bestComparableSet, countsForStrength, estimateOneRepMax } from './oneRepMax';
import type { Exercise, IsoDate, SessionLog } from './types';

/** Schoenfeld et al. 2017: 10 to 20 sets per muscle and per week. */
export const WEEKLY_SETS_TARGET = { min: 10, max: 20 } as const;

/** Best estimated 1RM of each session on an exercise (warm-up and slow-tempo sets excluded). */
export function strengthCurve(
  sessions: readonly SessionLog[],
  exerciseId: string,
): { date: IsoDate; oneRepMax: number }[] {
  return sortByDate(sessions).flatMap((session) => {
    const best = bestComparableSet(session.sets.filter((set) => set.exerciseId === exerciseId));
    return best ? [{ date: session.date, oneRepMax: best.oneRepMax }] : [];
  });
}

/** Sum of load × reps over the work sets of a session. */
export function sessionWorkload(session: SessionLog): number {
  return session.sets
    .filter((set) => !set.warmup)
    .reduce((total, set) => total + set.loadKg * set.reps, 0);
}

export function weeklyWorkload(
  sessions: readonly SessionLog[],
): { weekStart: IsoDate; workload: number }[] {
  const weeks = new Map<IsoDate, number>();
  for (const session of sessions) {
    const week = startOfWeek(session.date);
    weeks.set(week, (weeks.get(week) ?? 0) + sessionWorkload(session));
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, workload]) => ({ weekStart, workload }));
}

/** Work sets of the week for each primary muscle (a compound counts for each of them). */
export function weeklySetsPerMuscle(
  sessions: readonly SessionLog[],
  exercises: ReadonlyMap<string, Exercise>,
  weekStart: IsoDate,
): Partial<Record<MuscleId, number>> {
  const weekEnd = addDays(weekStart, 7);
  const counts: Partial<Record<MuscleId, number>> = {};
  for (const session of sessions) {
    if (session.date < weekStart || session.date >= weekEnd) continue;
    for (const set of session.sets) {
      if (set.warmup) continue;
      for (const muscle of exercises.get(set.exerciseId)?.primaryMuscles ?? []) {
        counts[muscle] = (counts[muscle] ?? 0) + 1;
      }
    }
  }
  return counts;
}

export function volumeStatus(weeklySets: number): 'below' | 'inRange' | 'above' {
  if (weeklySets < WEEKLY_SETS_TARGET.min) return 'below';
  return weeklySets > WEEKLY_SETS_TARGET.max ? 'above' : 'inRange';
}

/** Sets still needed this week to reach 10 on each targeted muscle. */
export function missingSetsThisWeek(
  counts: Partial<Record<MuscleId, number>>,
  targetMuscles: readonly MuscleId[],
): Partial<Record<MuscleId, number>> {
  const missing: Partial<Record<MuscleId, number>> = {};
  for (const muscle of targetMuscles) {
    const done = counts[muscle] ?? 0;
    if (done < WEEKLY_SETS_TARGET.min) missing[muscle] = WEEKLY_SETS_TARGET.min - done;
  }
  return missing;
}

/** Days with at least one session, for the regularity heatmap. */
export function trainingDays(sessions: readonly SessionLog[]): IsoDate[] {
  return [...new Set(sessions.map((s) => s.date))].sort();
}

/**
 * Weeks in a row where the target number of sessions was reached. The week in
 * progress counts once reached, and does not break the streak before its end.
 */
export function weeksOnPace(
  sessions: readonly SessionLog[],
  targetPerWeek: number,
  today: IsoDate,
): { current: number; best: number } {
  const days = trainingDays(sessions);
  const first = days[0];
  if (first === undefined) return { current: 0, best: 0 };

  const perWeek = new Map<IsoDate, number>();
  for (const day of days) {
    const week = startOfWeek(day);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const thisWeek = startOfWeek(today);
  let streak = 0;
  let best = 0;
  for (let week = startOfWeek(first); week <= thisWeek; week = addDays(week, 7)) {
    const onPace = (perWeek.get(week) ?? 0) >= targetPerWeek;
    if (onPace) {
      streak += 1;
      best = Math.max(best, streak);
    } else if (week !== thisWeek) {
      streak = 0;
    }
  }
  return { current: streak, best };
}

export interface PersonalRecord {
  readonly bestLoad: { readonly loadKg: number; readonly reps: number; readonly date: IsoDate };
  readonly bestOneRepMax: { readonly value: number; readonly date: IsoDate };
}

/** Heaviest complete work set and best estimated 1RM per exercise, first date reached. */
export function personalRecords(sessions: readonly SessionLog[]): Map<string, PersonalRecord> {
  const records = new Map<string, PersonalRecord>();
  for (const session of sortByDate(sessions)) {
    for (const set of session.sets) {
      if (set.warmup || set.completeReps === false) continue;
      const previous = records.get(set.exerciseId);
      const heavier =
        !previous ||
        set.loadKg > previous.bestLoad.loadKg ||
        (set.loadKg === previous.bestLoad.loadKg && set.reps > previous.bestLoad.reps);
      const oneRepMax = countsForStrength(set) ? estimateOneRepMax(set.loadKg, set.reps) : 0;
      const stronger = !previous || oneRepMax > previous.bestOneRepMax.value;
      if (!heavier && !stronger) continue;
      records.set(set.exerciseId, {
        bestLoad:
          heavier || !previous
            ? { loadKg: set.loadKg, reps: set.reps, date: session.date }
            : previous.bestLoad,
        bestOneRepMax:
          stronger || !previous ? { value: oneRepMax, date: session.date } : previous.bestOneRepMax,
      });
    }
  }
  return records;
}

function sortByDate(sessions: readonly SessionLog[]): SessionLog[] {
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date));
}
