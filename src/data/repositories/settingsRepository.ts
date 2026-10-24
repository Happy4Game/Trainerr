import type { ProtectedZone } from '@/domain/muscles';
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
  /** Set once the first-launch questionnaire is done or skipped. */
  readonly onboarded: boolean;
}

/** The "Passer" defaults of the questionnaire: hypertrophy, 4 sessions, 1 h. */
export const DEFAULT_SETTINGS: Settings = {
  goal: 'hypertrophy',
  sessionsPerWeek: 4,
  sessionMinutes: 60,
  model: recommendModel(4),
  supersets: false,
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
