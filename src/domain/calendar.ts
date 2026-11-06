import { addDays, startOfWeek } from './dates';
import type { IsoDate, SessionLog } from './types';

/**
 * The calendar of the sessions done: a month as weeks (Monday first, as in
 * France and ISO 8601), or one week, and the sessions of each day.
 */

/** First day of the month of `date`. */
export const startOfMonth = (date: IsoDate): IsoDate => `${date.slice(0, 7)}-01`;

/** Same day of the month `months` later (day 1: the calendar only needs the month). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + months;
  const first = new Date(Date.UTC(year, month, 1));
  return first.toISOString().slice(0, 10);
}

/**
 * The weeks shown for the month of `date`: whole weeks from the Monday before
 * the 1st to the Sunday after the last day; days of the other months are null.
 */
export function monthGrid(date: IsoDate): (IsoDate | null)[][] {
  const first = startOfMonth(date);
  const month = first.slice(0, 7);
  const weeks: (IsoDate | null)[][] = [];
  for (let monday = startOfWeek(first); monday.slice(0, 7) <= month; monday = addDays(monday, 7)) {
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
    if (!days.some((d) => d.slice(0, 7) === month)) break;
    weeks.push(days.map((d) => (d.slice(0, 7) === month ? d : null)));
  }
  return weeks;
}

/** The 7 days of the week of `date`, Monday first. */
export const weekDays = (date: IsoDate): IsoDate[] =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(startOfWeek(date), i));

/** Sessions done, by day. */
export function sessionsByDay<S extends Pick<SessionLog, 'date'>>(
  sessions: readonly S[],
): Map<IsoDate, S[]> {
  const byDay = new Map<IsoDate, S[]>();
  for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  return byDay;
}
