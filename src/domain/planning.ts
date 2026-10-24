import { addDays, minutesToTime, timeToMinutes, type Weekday } from './dates';
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
  readonly sessionsPerWeek: number;
  readonly sessionMinutes: number;
  readonly freeSlots: readonly WeeklySlot[];
  readonly blockedSlots: readonly WeeklySlot[];
  readonly quietHours: { readonly start: string; readonly end: string };
  readonly otherSports: readonly {
    readonly sport: SportId;
    readonly slots: readonly WeeklySlot[];
  }[];
}

export interface PlannedSession {
  readonly date: IsoDate;
  readonly weekday: Weekday;
  readonly start: string;
  readonly end: string;
  readonly templateId: string;
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

export function planWeek(input: PlanningInput): {
  sessions: PlannedSession[];
  unplaced: number;
} {
  const wanted = Math.min(input.sessionsPerWeek, MAX_SESSIONS_PER_WEEK);
  const windows = new Map<Weekday, number>();
  for (let weekday = 1; weekday <= 7; weekday++) {
    const start = earliestStart(input, weekday);
    if (start !== undefined) windows.set(weekday, start);
  }
  const candidates = [...windows.keys()];
  const preferred = spread(candidates, wanted);
  const fallback = candidates.filter((day) => !preferred.includes(day));

  const first = input.rotation.indexOf(nextTemplate(input.rotation, input.lastDoneTemplateId));
  const queue = Array.from(
    { length: wanted },
    (_, i) => input.rotation[(first + i) % input.rotation.length] as SessionTemplate,
  );

  const assigned = new Map<Weekday, SessionTemplate>();
  for (const weekday of [...preferred, ...fallback]) {
    if (queue.length === 0) break;
    const index = queue.findIndex((t) => !conflictsWithSport(t, weekday, input.otherSports));
    if (index === -1) continue;
    assigned.set(weekday, queue.splice(index, 1)[0] as SessionTemplate);
  }

  const sessions = [...assigned.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, t]) => {
      const start = windows.get(weekday) as number;
      return {
        date: addDays(input.weekStart, weekday - 1),
        weekday,
        start: minutesToTime(start),
        end: minutesToTime(start + input.sessionMinutes),
        templateId: t.id,
      };
    });
  return { sessions, unplaced: wanted - sessions.length };
}

/** Earliest start on a day that fits the session in free time, avoiding everything blocked. */
function earliestStart(input: PlanningInput, weekday: Weekday): number | undefined {
  const busy = [...input.blockedSlots, ...input.otherSports.flatMap((sport) => sport.slots)]
    .filter((slot) => slot.weekday === weekday)
    .map((slot) => [timeToMinutes(slot.start), timeToMinutes(slot.end)] as const);
  busy.push(...quietIntervals(input.quietHours));

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

/** Quiet hours may wrap around midnight (22:00 → 08:00). */
function quietIntervals(quiet: { start: string; end: string }): (readonly [number, number])[] {
  const start = timeToMinutes(quiet.start);
  const end = timeToMinutes(quiet.end);
  if (start === end) return [];
  return start < end
    ? [[start, end]]
    : [
        [start, 24 * 60],
        [0, end],
      ];
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
