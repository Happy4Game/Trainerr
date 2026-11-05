import {
  addDays,
  daysBetween,
  isoWeekday,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
} from './dates';
import type { WeeklySlot } from './planning';
import type { IsoDate } from './types';

export type NotificationKind =
  'sessionReminder' | 'nudge' | 'weekPlan' | 'weighIn' | 'photo' | 'tip';

/** In the order of the settings screen, and of priority when a day is full. */
export const NOTIFICATION_KINDS: readonly NotificationKind[] = [
  'sessionReminder',
  'nudge',
  'weekPlan',
  'weighIn',
  'photo',
  'tip',
];

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
    weekPlan: true,
    weighIn: true,
    photo: true,
    tip: true,
  },
  quietHours: { start: '22:00', end: '08:00' },
};

/**
 * Preferences saved by an older version: kinds added since are on, kinds
 * removed since are dropped.
 */
export function withDefaultKinds(prefs: NotificationPrefs | undefined): NotificationPrefs {
  const base = { ...DEFAULT_NOTIFICATION_PREFS, enabled: false };
  if (!prefs) return base;
  const kinds = Object.fromEntries(
    NOTIFICATION_KINDS.map((kind) => [kind, prefs.kinds?.[kind] ?? true]),
  ) as Record<NotificationKind, boolean>;
  return { ...base, ...prefs, kinds, quietHours: prefs.quietHours ?? base.quietHours };
}

export const REMINDER_MINUTES_BEFORE = 60;
/** When 1 h before is in the quiet hours (an 8 a.m. session), the reminder comes the evening before. */
export const EVE_TIME = '20:00';
export const NUDGE_EXTRA_DAYS = 3;
export const NUDGE_TIME = '18:00';
export const MAX_IGNORED_NUDGES = 5;
/** The week ahead, on Monday morning. */
export const WEEK_PLAN_WEEKDAY = 1;
export const WEEK_PLAN_TIME = '08:30';
/** Same day of the week as the last weighing, on waking up: comparable weighings. */
export const WEIGH_IN_DAYS = 7;
export const WEIGH_IN_TIME = '08:30';
/** One photo a month is enough to see a change. */
export const PHOTO_DAYS = 28;
export const PHOTO_TIME = '10:00';
/** The tip of the week goes out on Sunday evening, so at most once a week. */
export const TIP_WEEKDAY = 7;
export const TIP_TIME = '18:00';
/** "Un poil plus" de notifications, but never a stream of them. */
export const MAX_PER_DAY = 2;
/** Notifications are planned again each time the app is opened: one week ahead is enough. */
export const HORIZON_DAYS = 7;

export type PlannedNotification =
  | {
      date: IsoDate;
      time: string;
      kind: 'sessionReminder';
      templateId: string;
      /** The session itself: the same day, or the next day for a reminder sent the evening before. */
      sessionDate: IsoDate;
      sessionTime: string;
    }
  | { date: IsoDate; time: string; kind: 'nudge'; daysSince: number }
  | {
      date: IsoDate;
      time: string;
      kind: 'weekPlan';
      count: number;
      first: { date: IsoDate; time: string; templateId: string };
    }
  | { date: IsoDate; time: string; kind: 'weighIn' }
  | { date: IsoDate; time: string; kind: 'photo'; weeksSince: number }
  | { date: IsoDate; time: string; kind: 'tip'; tipId: string };

export interface NotificationInput {
  readonly today: IsoDate;
  /** Minutes since midnight, now: a notification set in the past would go off at once. */
  readonly nowMinutes?: number;
  readonly prefs: NotificationPrefs;
  /** Sessions planned this week and next week. */
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
  /** Last weighing: the weekly reminder only comes to those who weigh themselves. */
  readonly lastWeighingDate?: IsoDate;
  /** Last body photo: the monthly reminder only comes to those who take some. */
  readonly lastPhotoDate?: IsoDate;
}

/**
 * Local notifications for the coming week, all tied to the user's own plan
 * and data: a reminder before each planned session, a gentle nudge when the
 * pace slipped, the week ahead on Monday, the weekly weighing, the monthly
 * photo and the tip of the week. At most two a day, never in the past, in
 * quiet hours nor in a blocked slot. Encouraging tone only.
 */
export function planNotifications(input: NotificationInput): {
  notifications: PlannedNotification[];
  suggestFewerNudges: boolean;
} {
  const { prefs, today } = input;
  const now = input.nowMinutes ?? -1;
  const result: PlannedNotification[] = [];
  const perDay = new Map<IsoDate, number>();
  const suggestFewerNudges = input.ignoredNudges >= MAX_IGNORED_NUDGES;
  if (!prefs.enabled) return { notifications: [], suggestFewerNudges };
  const last = addDays(today, HORIZON_DAYS - 1);

  const allowed = (date: IsoDate, minutes: number) =>
    date >= today &&
    date <= last &&
    (date > today || minutes > now) &&
    minutes >= 0 &&
    minutes < 24 * 60 &&
    (perDay.get(date) ?? 0) < MAX_PER_DAY &&
    !inQuietHours(minutes, prefs.quietHours) &&
    !input.blockedSlots.some(
      (slot) =>
        slot.weekday === isoWeekday(date) &&
        timeToMinutes(slot.start) <= minutes &&
        minutes < timeToMinutes(slot.end),
    );
  const push = (n: PlannedNotification) => {
    perDay.set(n.date, (perDay.get(n.date) ?? 0) + 1);
    result.push(n);
  };
  /** The first day from `from` on (today at the earliest) where `time` is still allowed. */
  const firstAllowed = (from: IsoDate, time: string): IsoDate | undefined => {
    for (let date = from < today ? today : from; date <= last; date = addDays(date, 1)) {
      if (allowed(date, timeToMinutes(time))) return date;
    }
    return undefined;
  };

  const upcoming = [...input.plannedSessions]
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  if (prefs.kinds.sessionReminder) {
    const reminded = new Set<IsoDate>();
    for (const session of upcoming) {
      if (reminded.has(session.date)) continue;
      const reminder = { kind: 'sessionReminder' as const, templateId: session.templateId };
      const at = timeToMinutes(session.start) - REMINDER_MINUTES_BEFORE;
      const eve = addDays(session.date, -1);
      const when = allowed(session.date, at)
        ? { date: session.date, time: minutesToTime(at) }
        : allowed(eve, timeToMinutes(EVE_TIME))
          ? { date: eve, time: EVE_TIME }
          : undefined;
      if (!when) continue;
      reminded.add(session.date);
      push({ ...when, ...reminder, sessionDate: session.date, sessionTime: session.start });
    }
  }

  if (
    prefs.kinds.nudge &&
    input.lastSessionDate &&
    !input.recentDiscomfort &&
    !suggestFewerNudges
  ) {
    const pace = Math.ceil(7 / Math.max(1, input.sessionsPerWeek));
    const due = addDays(input.lastSessionDate, pace + NUDGE_EXTRA_DAYS);
    // A session planned before then is reminded already: no nudge on top.
    const planned = upcoming.some((s) => s.date <= (due < today ? today : due));
    const date = planned ? undefined : firstAllowed(due, NUDGE_TIME);
    if (date) {
      push({
        date,
        time: NUDGE_TIME,
        kind: 'nudge',
        daysSince: daysBetween(input.lastSessionDate, date),
      });
    }
  }

  if (prefs.kinds.weekPlan) {
    const monday = startOfWeek(today);
    const nextMonday =
      isoWeekday(today) === WEEK_PLAN_WEEKDAY && allowed(today, timeToMinutes(WEEK_PLAN_TIME))
        ? monday
        : addDays(monday, 7);
    const week = upcoming.filter((s) => s.date >= nextMonday && s.date < addDays(nextMonday, 7));
    const first = week[0];
    if (first && allowed(nextMonday, timeToMinutes(WEEK_PLAN_TIME))) {
      push({
        date: nextMonday,
        time: WEEK_PLAN_TIME,
        kind: 'weekPlan',
        count: week.length,
        first: { date: first.date, time: first.start, templateId: first.templateId },
      });
    }
  }

  if (prefs.kinds.weighIn && input.lastWeighingDate) {
    const date = firstAllowed(addDays(input.lastWeighingDate, WEIGH_IN_DAYS), WEIGH_IN_TIME);
    if (date) push({ date, time: WEIGH_IN_TIME, kind: 'weighIn' });
  }

  if (prefs.kinds.photo && input.lastPhotoDate) {
    const date = firstAllowed(addDays(input.lastPhotoDate, PHOTO_DAYS), PHOTO_TIME);
    if (date) {
      push({
        date,
        time: PHOTO_TIME,
        kind: 'photo',
        weeksSince: Math.floor(daysBetween(input.lastPhotoDate, date) / 7),
      });
    }
  }

  if (prefs.kinds.tip && input.tipId) {
    const sunday = Array.from({ length: 7 }, (_, i) => addDays(today, i)).find(
      (date) => isoWeekday(date) === TIP_WEEKDAY,
    ) as IsoDate;
    if (allowed(sunday, timeToMinutes(TIP_TIME))) {
      push({ date: sunday, time: TIP_TIME, kind: 'tip', tipId: input.tipId });
    }
  }

  result.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { notifications: result, suggestFewerNudges };
}

function inQuietHours(minutes: number, quiet: { start: string; end: string }): boolean {
  const start = timeToMinutes(quiet.start);
  const end = timeToMinutes(quiet.end);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
