import type { IsoDate } from './types';

/** 1 = Monday … 7 = Sunday (ISO 8601, first day of the week in France). */
export type Weekday = number;

const DAY_MS = 86_400_000;

// Calendar dates are handled as UTC midnights so that daylight saving changes never shift a day.
function toDayNumber(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function fromDayNumber(dayNumber: number): IsoDate {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(date) + days);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function isoWeekday(date: IsoDate): Weekday {
  const day = new Date(toDayNumber(date) * DAY_MS).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** `HH:MM` → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}
