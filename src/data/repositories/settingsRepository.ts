import type { PauseLength } from '@/domain/comeback';
import type { ProtectedZone } from '@/domain/muscles';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/domain/notifications';
import type { NextChoice, SportId, WeeklySlot } from '@/domain/planning';
import type { PlateConfig } from '@/domain/plates';
import type { SessionLine } from '@/domain/presets';
import type { Equipment } from '@/domain/types';
import type { WeightUnit } from '@/domain/units';
import type { LanguagePreference } from '@/i18n';
import type { Goal, SessionMinutes } from '@/domain/sessionBuilder';
import { recommendModel, type TrainingModelId } from '@/domain/trainingModels';
import type { SqlDatabase } from '../sqlite/database';

export interface CustomSession {
  readonly id: string;
  readonly name: string;
  readonly exerciseIds: readonly string[];
  /** Its own sets, reps and rests (a copied ready-made session); the defaults otherwise. */
  readonly lines?: Readonly<Record<string, SessionLine>>;
}

/** Dark by default; light, or the phone setting, on request. */
export type ThemePreference = 'dark' | 'light' | 'system';

/** Template id of a custom session in the history: "custom:<id>". */
export const CUSTOM_PREFIX = 'custom:';

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
  /** Gym whose machines, steps and favorites are used. */
  readonly currentGymId: string;
  /** Equipment available at home, for the home workout. */
  readonly homeEquipment: readonly Equipment[];
  /** Next session picked by the user, to start the rotation elsewhere. */
  readonly nextChoice?: NextChoice;
  /** First day of the current program: cycles and the "change program" reminder count from it. */
  readonly programStart?: string;
  /** Optional Trainerr server (challenges, AI advice); nothing is sent without it. */
  readonly serverUrl?: string;
  readonly account?: { readonly name: string; readonly token: string };
  /** Loads are hidden from friends by default. */
  readonly shareRecords: boolean;
  /** Android: look for a new version on GitHub at launch and back to the app (every 30 min at most). On by default. */
  readonly autoUpdateCheck?: boolean;
  /** Beeps at the end of the rest (app open). On by default. */
  readonly restSound?: boolean;
  /** Bar and plates of the gym, for the plate calculator (20 kg bar and usual plates by default). */
  readonly barbell?: PlateConfig;
  /** Screen kept on during a session. On by default. */
  readonly keepAwake?: boolean;
  /** Android notification during a session (rest countdown, end-of-rest alert). On by default. */
  readonly sessionNotification?: boolean;
  /** The user agreed to send the summary of their week to the AI coach. */
  readonly aiConsent: boolean;
  /** Sessions built by the user: a name and exercises in order. */
  readonly customSessions?: readonly CustomSession[];
  readonly language: LanguagePreference;
  /** Dark by default. */
  readonly theme?: ThemePreference;
  readonly weightUnit: WeightUnit;
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
  currentGymId: 'default',
  homeEquipment: ['dumbbell', 'bodyweight'],
  shareRecords: false,
  aiConsent: false,
  language: 'system',
  weightUnit: 'kg',
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
