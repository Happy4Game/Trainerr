import { addDays, daysBetween, isoWeekday, minutesToTime, timeToMinutes } from './dates';
import type { WeeklySlot } from './planning';
import type { IsoDate } from './types';

export type NotificationKind =
  'sessionReminder' | 'nudge' | 'record' | 'streak' | 'backToLevel' | 'tip';

export interface NotificationPrefs {
  readonly enabled: boolean;
  readonly kinds: Readonly<Record<NotificationKind, boolean>>;
  readonly quietHours: { readonly start: string; readonly end: string };
}

/** Every kind on; the general switch stays off in the settings until the user accepts. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  kinds: {
    sessionReminder: true,
    nudge: true,
    record: true,
    streak: true,
    backToLevel: true,
    tip: true,
  },
  quietHours: { start: '22:00', end: '08:00' },
};

export const REMINDER_MINUTES_BEFORE = 60;
export const NUDGE_EXTRA_DAYS = 3;
export const NUDGE_TIME = '18:00';
export const MAX_IGNORED_NUDGES = 5;

export type PlannedNotification =
  | { date: IsoDate; time: string; kind: 'sessionReminder'; templateId: string }
  | { date: IsoDate; time: string; kind: 'nudge'; daysSince: number }
  | { date: IsoDate; time: string; kind: 'tip'; tipId: string };

/** The tip of the week goes out on Sunday evening, so at most once a week. */
export const TIP_WEEKDAY = 7;
export const TIP_TIME = '18:00';

export interface NotificationInput {
  readonly today: IsoDate;
  readonly prefs: NotificationPrefs;
  readonly plannedSessions: readonly { date: IsoDate; start: string; templateId: string }[];
  readonly blockedSlots: readonly WeeklySlot[];
  readonly lastSessionDate?: IsoDate;
  readonly sessionsPerWeek: number;
  /** A discomfort or pain was reported recently: no nudge, rest comes first. */
  readonly recentDiscomfort: boolean;
  /** Nudges in a row that were not followed by a session. */
  readonly ignoredNudges: number;
  /** "Bien débuter" card to push this week. */
  readonly tipId?: string;
}

/**
 * Local notifications for the coming days: a reminder 1 h before each planned
 * session, a gentle nudge when the pace slipped by 3 days. At most one a day,
 * never in quiet hours nor in a blocked slot. Encouraging tone only.
 */
export function planNotifications(input: NotificationInput): {
  notifications: PlannedNotification[];
  suggestFewerNudges: boolean;
} {
  const { prefs } = input;
  const result: PlannedNotification[] = [];
  const usedDays = new Set<IsoDate>();
  const suggestFewerNudges = input.ignoredNudges >= MAX_IGNORED_NUDGES;
  if (!prefs.enabled) return { notifications: [], suggestFewerNudges };

  const allowed = (date: IsoDate, minutes: number) =>
    minutes >= 0 &&
    !usedDays.has(date) &&
    !inQuietHours(minutes, prefs.quietHours) &&
    !input.blockedSlots.some(
      (slot) =>
        slot.weekday === isoWeekday(date) &&
        timeToMinutes(slot.start) <= minutes &&
        minutes < timeToMinutes(slot.end),
    );

  if (prefs.kinds.sessionReminder) {
    const upcoming = [...input.plannedSessions]
      .filter((s) => s.date >= input.today)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    for (const session of upcoming) {
      const at = timeToMinutes(session.start) - REMINDER_MINUTES_BEFORE;
      if (!allowed(session.date, at)) continue;
      usedDays.add(session.date);
      result.push({
        date: session.date,
        time: minutesToTime(at),
        kind: 'sessionReminder',
        templateId: session.templateId,
      });
    }
  }

  if (
    prefs.kinds.nudge &&
    input.lastSessionDate &&
    !input.recentDiscomfort &&
    !suggestFewerNudges
  ) {
    const pace = Math.ceil(7 / Math.max(1, input.sessionsPerWeek));
    const daysSince = daysBetween(input.lastSessionDate, input.today);
    const at = timeToMinutes(NUDGE_TIME);
    if (daysSince >= pace + NUDGE_EXTRA_DAYS && allowed(input.today, at)) {
      result.push({ date: input.today, time: NUDGE_TIME, kind: 'nudge', daysSince });
    }
  }

  if (prefs.kinds.tip && input.tipId) {
    const sunday = Array.from({ length: 7 }, (_, i) => addDays(input.today, i)).find(
      (date) => isoWeekday(date) === TIP_WEEKDAY,
    ) as IsoDate;
    if (allowed(sunday, timeToMinutes(TIP_TIME))) {
      result.push({ date: sunday, time: TIP_TIME, kind: 'tip', tipId: input.tipId });
    }
  }

  return { notifications: result, suggestFewerNudges };
}

function inQuietHours(minutes: number, quiet: { start: string; end: string }): boolean {
  const start = timeToMinutes(quiet.start);
  const end = timeToMinutes(quiet.end);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
