import { createApi } from '@/data/remote/api';
import type { Settings } from '@/data/repositories/settingsRepository';
import { startOfWeek } from '@/domain/dates';
import { personalRecords, weeksOnPace } from '@/domain/stats';
import type { SessionLog } from '@/domain/types';

export const RECORDS_SHARED = 5;

/** Regularity of the week sent to the challenges; records only when the user shares them. */
export async function syncStats(
  settings: Settings,
  sessions: readonly SessionLog[],
  today: string,
  describe: { exerciseName: (id: string) => string; load: (kg: number) => string },
): Promise<void> {
  if (!settings.serverUrl || !settings.account) return;
  const week = startOfWeek(today);
  const records = settings.shareRecords
    ? [...personalRecords(sessions).entries()]
        .sort((a, b) => b[1].bestLoad.date.localeCompare(a[1].bestLoad.date))
        .slice(0, RECORDS_SHARED)
        .map(([id, record]) => ({
          name: describe.exerciseName(id),
          load: `${describe.load(record.bestLoad.loadKg)} × ${record.bestLoad.reps}`,
        }))
    : undefined;
  await createApi(settings.serverUrl, settings.account.token).putStats({
    weekStart: week,
    sessions: new Set(sessions.filter((s) => s.date >= week).map((s) => s.date)).size,
    weeksOnPace: weeksOnPace(sessions, settings.sessionsPerWeek, today).current,
    ...(records ? { records } : {}),
  });
}
