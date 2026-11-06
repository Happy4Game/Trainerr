import { describe, expect, it } from 'vitest';
import { addMonths, monthGrid, sessionsByDay, startOfMonth, weekDays } from '@/domain/calendar';

describe('session calendar', () => {
  it('lays a month out in whole weeks, Monday first', () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const weeks = monthGrid('2026-11-17');
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('moves month by month across the years', () => {
    expect(startOfMonth('2026-11-17')).toBe('2026-11-01');
    expect(addMonths('2026-11-17', 2)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
  });

  it('gives the 7 days of a week, Monday first', () => {
    expect(weekDays('2026-11-06')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });

  it('groups the sessions by day, two on a day included', () => {
    const byDay = sessionsByDay([
      { id: 'a', date: '2026-11-02' },
      { id: 'b', date: '2026-11-04' },
      { id: 'c', date: '2026-11-04' },
    ]);
    expect(byDay.get('2026-11-04')?.map((s) => s.id)).toEqual(['b', 'c']);
    expect(byDay.get('2026-11-03')).toBeUndefined();
  });
});
