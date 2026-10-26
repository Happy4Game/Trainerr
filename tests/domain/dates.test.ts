import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  isoWeekday,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
} from '@/domain/dates';

describe('calendar dates', () => {
  it('computes the weekday, Monday = 1', () => {
    expect(isoWeekday('2026-10-19')).toBe(1);
    expect(isoWeekday('2026-10-24')).toBe(6);
    expect(isoWeekday('2026-10-25')).toBe(7);
  });

  it('adds days across months and daylight saving changes', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // DST ends on 25 Oct in France
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the Monday of the week', () => {
    expect(startOfWeek('2026-10-24')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
  });

  it('counts days between two dates', () => {
    expect(daysBetween('2026-10-15', '2026-10-22')).toBe(7);
  });

  it('converts times of day', () => {
    expect(timeToMinutes('21:30')).toBe(1290);
    expect(minutesToTime(1290)).toBe('21:30');
    expect(minutesToTime(65)).toBe('01:05');
  });
});
