import { personalRecords, weeksOnPace } from './stats';
import type { IsoDate, SessionLog } from './types';

export type BadgeCode =
  | 'firstSession'
  | 'tenSessions'
  | 'fiftySessions'
  | 'firstWeekOnPace'
  | 'fourWeeksOnPace'
  | 'firstRecord'
  | 'backToLevel';

export interface NewRecord {
  readonly exerciseId: string;
  readonly loadKg: number;
  readonly reps: number;
}

/**
 * Records beaten by the last session: a heavier complete set than any before
 * on the same exercise. A first time on an exercise is not a record.
 */
export function newRecords(previous: readonly SessionLog[], session: SessionLog): NewRecord[] {
  const before = personalRecords(previous);
  const after = personalRecords([...previous, session]);
  const records: NewRecord[] = [];
  for (const [exerciseId, record] of after) {
    const old = before.get(exerciseId);
    if (!old) continue;
    const heavier =
      record.bestLoad.loadKg > old.bestLoad.loadKg ||
      (record.bestLoad.loadKg === old.bestLoad.loadKg && record.bestLoad.reps > old.bestLoad.reps);
    if (heavier && record.bestLoad.date === session.date) {
      records.push({ exerciseId, loadKg: record.bestLoad.loadKg, reps: record.bestLoad.reps });
    }
  }
  return records;
}

/** Every badge earned so far. Badges are never lost, and never guilt-tripping. */
export function earnedBadges(input: {
  sessions: readonly SessionLog[];
  sessionsPerWeek: number;
  today: IsoDate;
  recordsBeaten: number;
  backToLevelReached: boolean;
}): BadgeCode[] {
  const count = input.sessions.length;
  const pace = weeksOnPace(input.sessions, input.sessionsPerWeek, input.today);
  const badges: BadgeCode[] = [];
  if (count >= 1) badges.push('firstSession');
  if (count >= 10) badges.push('tenSessions');
  if (count >= 50) badges.push('fiftySessions');
  if (pace.best >= 1) badges.push('firstWeekOnPace');
  if (pace.best >= 4) badges.push('fourWeeksOnPace');
  if (input.recordsBeaten > 0) badges.push('firstRecord');
  if (input.backToLevelReached) badges.push('backToLevel');
  return badges;
}
