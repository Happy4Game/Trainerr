import {
  addDays,
  daysBetween,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
  type Weekday,
} from './dates';
import type { SessionTemplate } from './trainingModels';
import type { IsoDate, PplGroup } from './types';

/** A recurring weekly time slot, `HH:MM` in local time. */
export interface WeeklySlot {
  readonly weekday: Weekday;
  readonly start: string;
  readonly end: string;
}

export type SportId = 'cycling' | 'running' | 'football' | 'swimming' | 'combat' | 'other';

/**
 * Which session must not sit next to a sport, and on which days relative to
 * it (0 = same day, 1 = the day after, -1 = the day before). Starting rules,
 * to be validated by a coach.
 */
export const SPORT_RULES: Readonly<
  Record<SportId, { readonly group?: PplGroup; readonly dayOffsets: readonly number[] }>
> = {
  cycling: { group: 'legs', dayOffsets: [0, 1] },
  running: { group: 'legs', dayOffsets: [-1, 0, 1] },
  football: { group: 'legs', dayOffsets: [-1, 0, 1] },
  swimming: { dayOffsets: [] },
  combat: { group: 'push', dayOffsets: [-1, 0, 1] },
  other: { dayOffsets: [] },
};

export interface PlanningInput {
  /** Monday of the planned week. */
  readonly weekStart: IsoDate;
  readonly rotation: readonly SessionTemplate[];
  readonly lastDoneTemplateId?: string;
  /** Next session chosen by the user: wins over the one after the last session done. */
  readonly nextTemplateId?: string;
  /** Days before it are over: their slot stays, closed, with no session to come. */
  readonly fromDate?: IsoDate;
  /** Days with a finished session: closed too, and they count for the week. */
  readonly doneDates?: readonly IsoDate[];
  readonly sessionsPerWeek: number;
  readonly sessionMinutes: number;
  readonly freeSlots: readonly WeeklySlot[];
  readonly blockedSlots: readonly WeeklySlot[];
  readonly otherSports: readonly {
    readonly sport: SportId;
    readonly slots: readonly WeeklySlot[];
  }[];
}

export interface PlanSlot {
  readonly date: IsoDate;
  readonly weekday: Weekday;
  readonly start: string;
  readonly end: string;
}

export interface PlannedSession extends PlanSlot {
  readonly templateId: string;
}

/** The user's pick for the next session, valid until another session is done. */
export interface NextChoice {
  readonly templateId: string;
  /** Last session done when the choice was made; none for a first session. */
  readonly afterSessionId?: string;
}

export const MAX_SESSIONS_PER_WEEK = 6; // at least one full rest day
const SEARCH_STEP_MINUTES = 5;

/** The rotation continues from the last session done: a skipped day loses nothing. */
export function nextTemplate(
  rotation: readonly SessionTemplate[],
  lastDoneTemplateId: string | undefined,
): SessionTemplate {
  const index = rotation.findIndex((t) => t.id === lastDoneTemplateId);
  return rotation[(index + 1) % rotation.length] as SessionTemplate;
}

/** Next session: the user's choice if no session was done since, the rotation otherwise. */
export function dueTemplate(
  rotation: readonly SessionTemplate[],
  last: { readonly id: string; readonly templateId: string } | undefined,
  choice: NextChoice | undefined,
): SessionTemplate {
  const chosen =
    choice && choice.afterSessionId === last?.id
      ? rotation.find((t) => t.id === choice.templateId)
      : undefined;
  return chosen ?? nextTemplate(rotation, last?.templateId);
}

/**
 * The sessions of a week on the free slots. Past or done days keep their slot,
 * closed; the coming slots take the rotation from the next session due, so a
 * missed session moves to the next slot instead of being lost.
 */
export function planWeek(input: PlanningInput): {
  sessions: PlannedSession[];
  closedSlots: PlanSlot[];
  unplaced: number;
} {
  const dateOf = (weekday: Weekday) => addDays(input.weekStart, weekday - 1);
  const done = input.doneDates ?? [];
  const closed = (weekday: Weekday) =>
    (input.fromDate !== undefined && dateOf(weekday) < input.fromDate) ||
    done.includes(dateOf(weekday));
  const windows = new Map<Weekday, number>();
  for (let weekday = 1; weekday <= 7; weekday++) {
    const start = earliestStart(input, weekday);
    if (start !== undefined) windows.set(weekday, start);
  }
  const candidates = [...windows.keys()];
  const wanted = Math.min(input.sessionsPerWeek, MAX_SESSIONS_PER_WEEK);
  const preferred = spread(candidates, wanted);
  const fallback = candidates.filter((day) => !preferred.includes(day));
  // Sessions done on another day of the week count too.
  const doneElsewhere = done.filter((date) => {
    const weekday = daysBetween(input.weekStart, date) + 1;
    return weekday >= 1 && weekday <= 7 && !preferred.includes(weekday as Weekday);
  }).length;
  const target = Math.max(0, wanted - doneElsewhere);

  const chosen = input.rotation.find((t) => t.id === input.nextTemplateId);
  const first = input.rotation.indexOf(
    chosen ?? nextTemplate(input.rotation, input.lastDoneTemplateId),
  );
  const queue = Array.from(
    { length: wanted },
    (_, i) => input.rotation[(first + i) % input.rotation.length] as SessionTemplate,
  );

  const assigned = new Map<Weekday, SessionTemplate | 'closed'>();
  for (const weekday of [...preferred, ...fallback]) {
    if (assigned.size >= target) break;
    if (closed(weekday)) {
      if (preferred.includes(weekday)) assigned.set(weekday, 'closed');
      continue;
    }
    const index = queue.findIndex((t) => !conflictsWithSport(t, weekday, input.otherSports));
    if (index === -1) continue;
    assigned.set(weekday, queue.splice(index, 1)[0] as SessionTemplate);
  }

  const slot = (weekday: Weekday): PlanSlot => {
    const start = windows.get(weekday) as number;
    return {
      date: dateOf(weekday),
      weekday,
      start: minutesToTime(start),
      end: minutesToTime(start + input.sessionMinutes),
    };
  };
  const byDay = [...assigned.entries()].sort(([a], [b]) => a - b);
  const sessions = byDay.flatMap(([weekday, t]) =>
    t === 'closed' ? [] : [{ ...slot(weekday), templateId: t.id }],
  );
  const closedSlots = byDay.flatMap(([weekday, t]) => (t === 'closed' ? [slot(weekday)] : []));
  return { sessions, closedSlots, unplaced: target - assigned.size };
}

/** This week from today, then next week going on from this week's last session. */
export function planFromToday(
  input: Omit<PlanningInput, 'weekStart' | 'fromDate'> & { readonly today: IsoDate },
): { thisWeek: ReturnType<typeof planWeek>; nextWeek: ReturnType<typeof planWeek> } {
  const monday = startOfWeek(input.today);
  const thisWeek = planWeek({ ...input, weekStart: monday, fromDate: input.today });
  const last = thisWeek.sessions.at(-1)?.templateId;
  const { nextTemplateId, doneDates: _done, lastDoneTemplateId: lastDone, ...rest } = input;
  const nextWeek = planWeek({
    ...rest,
    weekStart: addDays(monday, 7),
    ...(last
      ? { lastDoneTemplateId: last }
      : nextTemplateId
        ? { nextTemplateId }
        : lastDone
          ? { lastDoneTemplateId: lastDone }
          : {}),
  });
  return { thisWeek, nextWeek };
}

/** Earliest start on a day that fits the session in free time, avoiding everything blocked. */
function earliestStart(input: PlanningInput, weekday: Weekday): number | undefined {
  const busy = [...input.blockedSlots, ...input.otherSports.flatMap((sport) => sport.slots)]
    .filter((slot) => slot.weekday === weekday)
    .map((slot) => [timeToMinutes(slot.start), timeToMinutes(slot.end)] as const);

  const free = input.freeSlots
    .filter((slot) => slot.weekday === weekday)
    .map((slot) => [timeToMinutes(slot.start), timeToMinutes(slot.end)] as const)
    .sort(([a], [b]) => a - b);

  for (const [freeStart, freeEnd] of free) {
    for (
      let start = freeStart;
      start + input.sessionMinutes <= freeEnd;
      start += SEARCH_STEP_MINUTES
    ) {
      const end = start + input.sessionMinutes;
      if (busy.every(([busyStart, busyEnd]) => end <= busyStart || busyEnd <= start)) return start;
    }
  }
  return undefined;
}

function conflictsWithSport(
  t: SessionTemplate,
  weekday: Weekday,
  sports: PlanningInput['otherSports'],
): boolean {
  return sports.some(({ sport, slots }) => {
    const rule = SPORT_RULES[sport];
    if (!rule.group || !t.groups.includes(rule.group)) return false;
    return slots.some((slot) =>
      rule.dayOffsets.some((offset) => ((slot.weekday - 1 + offset + 7) % 7) + 1 === weekday),
    );
  });
}

/** Picks `count` days spread as evenly as possible (4 out of 7 → Mon, Tue, Thu, Sat). */
function spread(days: readonly Weekday[], count: number): Weekday[] {
  if (count >= days.length) return [...days];
  return Array.from(
    { length: count },
    (_, i) => days[Math.floor((i * days.length) / count)] as Weekday,
  );
}
