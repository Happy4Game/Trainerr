import type { PauseLength } from '@/domain/comeback';
import type { ProtectedZone } from '@/domain/muscles';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/domain/notifications';
import type { SportId, WeeklySlot } from '@/domain/planning';
import type { Goal, SessionMinutes } from '@/domain/sessionBuilder';
import { recommendModel, type TrainingModelId } from '@/domain/trainingModels';
import type { SqlDatabase } from '../sqlite/database';

export interface Settings {
  readonly goal: Goal;
  readonly sessionsPerWeek: number;
  readonly sessionMinutes: SessionMinutes;
  readonly model: TrainingModelId;
  readonly supersets: boolean;
  readonly protectedZone?: ProtectedZone;
  readonly level: 'beginner' | 'trained' | 'comeback';
  /** Comeback mode: length of the break and first day back. */
  readonly comeback?: { readonly pause: PauseLength; readonly startedOn: string };
  readonly freeSlots: readonly WeeklySlot[];
  readonly blockedSlots: readonly WeeklySlot[];
  readonly otherSport?: { readonly sport: SportId; readonly slots: readonly WeeklySlot[] };
  readonly notifications: NotificationPrefs;
  /** Discomforts reported during sessions: repeated ones change the advice, and stop nudges. */
  readonly discomforts?: readonly { readonly date: string; readonly zone: string }[];
  /** Set once the first-launch questionnaire is done or skipped. */
  readonly onboarded: boolean;
}

/** Weekday evenings after work and weekend mornings, until the user sets them. */
const DEFAULT_FREE_SLOTS: WeeklySlot[] = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: '18:00', end: '21:00' })),
  ...[6, 7].map((weekday) => ({ weekday, start: '08:00', end: '11:00' })),
];

/** The "Passer" defaults of the questionnaire: hypertrophy, 4 sessions, 1 h. */
export const DEFAULT_SETTINGS: Settings = {
  goal: 'hypertrophy',
  sessionsPerWeek: 4,
  sessionMinutes: 60,
  model: recommendModel(4),
  supersets: false,
  level: 'trained',
  freeSlots: DEFAULT_FREE_SLOTS,
  blockedSlots: [],
  notifications: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false },
  onboarded: false,
};

const KEY = 'settings';

export async function getSettings(db: SqlDatabase): Promise<Settings> {
  const rows = await db.query<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [KEY]);
  const stored = rows[0] ? (JSON.parse(rows[0].value) as Partial<Settings>) : {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(db: SqlDatabase, settings: Settings): Promise<void> {
  await db.run(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [KEY, JSON.stringify(settings)],
  );
}
