import type { BadgeCode } from '@/domain/achievements';
import type { IsoDate } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';

export interface EarnedBadge {
  readonly code: BadgeCode;
  readonly earnedOn: IsoDate;
}

export async function listBadges(db: SqlDatabase): Promise<EarnedBadge[]> {
  const rows = await db.query<{ code: BadgeCode; earned_on: string }>(
    'SELECT code, earned_on FROM badge ORDER BY earned_on, rowid',
  );
  return rows.map((r) => ({ code: r.code, earnedOn: r.earned_on }));
}

/** Stores the badges not earned yet; returns the new ones. A badge is never lost. */
export async function addBadges(
  db: SqlDatabase,
  codes: readonly BadgeCode[],
  date: IsoDate,
): Promise<BadgeCode[]> {
  const known = new Set((await listBadges(db)).map((b) => b.code));
  const fresh = codes.filter((code) => !known.has(code));
  for (const code of fresh) {
    await db.run('INSERT INTO badge (code, earned_on) VALUES (?, ?)', [code, date]);
  }
  return fresh;
}
