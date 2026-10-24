import { describe, expect, it } from 'vitest';
import {
  missingSetsThisWeek,
  personalRecords,
  sessionWorkload,
  strengthCurve,
  trainingDays,
  volumeStatus,
  weeklySetsPerMuscle,
  weeklyWorkload,
  weeksOnPace,
} from '@/domain/stats';
import type { SessionLog } from '@/domain/types';
import { allExercises } from '../fixtures/exercises';
import { octoberSessions } from '../fixtures/octoberSessions';

const exercises = new Map(allExercises.map((e) => [e.id, e]));

describe('strength curve', () => {
  it('keeps the best estimated 1RM of each session', () => {
    expect(strengthCurve(octoberSessions, 'leg-press')).toEqual([
      { date: '2026-10-17', oneRepMax: expect.closeTo(133.33, 2) },
      { date: '2026-10-24', oneRepMax: expect.closeTo(142.67, 2) },
    ]);
  });

  it('leaves out slow-tempo and incomplete sets', () => {
    expect(strengthCurve(octoberSessions, 'curl')).toEqual([
      { date: '2026-10-16', oneRepMax: expect.closeTo(11.2, 2) }, // 8 × 12, not 9 × 10 slow
      { date: '2026-10-22', oneRepMax: expect.closeTo(12.3, 2) },
    ]);
    expect(strengthCurve(octoberSessions, 'lat-pulldown')).toEqual([
      { date: '2026-10-16', oneRepMax: expect.closeTo(52, 2) }, // 39 × 10, not 45 × 8 incomplete
    ]);
  });
});

describe('workload', () => {
  it('sums load × reps per session, without warm-ups', () => {
    const session = octoberSessions[0] as SessionLog;
    expect(sessionWorkload(session)).toBe(16 * 12 + 18 * 9 + 18 * 8 + 52 * 12 * 2);
  });

  it('groups workload by week, Monday first', () => {
    const weeks = weeklyWorkload(octoberSessions);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-12', '2026-10-19']);
    expect(weeks[1]?.workload).toBe(32 * 10 + 18 * 10 + 39 * 9 + 32 * 12 + 9 * 11 + 107 * 10 * 3);
  });
});

describe('sets per muscle', () => {
  it('counts work sets for each primary muscle of the week', () => {
    const counts = weeklySetsPerMuscle(octoberSessions, exercises, '2026-10-12');
    expect(counts.chest).toBe(5); // 3 DC + 2 pec fly
    expect(counts.quads).toBe(3); // 2 leg press + 1 leg extension
    expect(counts.glutes).toBe(2);
    expect(counts.lats).toBe(3);
    expect(counts.triceps).toBeUndefined(); // secondary muscles do not count
  });

  it('compares the weekly count with the 10–20 target', () => {
    expect(volumeStatus(9)).toBe('below');
    expect(volumeStatus(10)).toBe('inRange');
    expect(volumeStatus(20)).toBe('inRange');
    expect(volumeStatus(21)).toBe('above');
  });

  it('lists the sets still missing this week', () => {
    expect(
      missingSetsThisWeek({ chest: 5, quads: 12, lats: 10 }, ['chest', 'quads', 'biceps']),
    ).toEqual({
      chest: 5,
      biceps: 10,
    });
  });
});

describe('regularity', () => {
  it('lists the days with a session (heatmap)', () => {
    expect(trainingDays(octoberSessions)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-20',
      '2026-10-22',
      '2026-10-24',
    ]);
  });

  it('counts weeks in a row at the target pace', () => {
    expect(weeksOnPace(octoberSessions, 3, '2026-10-24')).toEqual({ current: 2, best: 2 });
    expect(weeksOnPace(octoberSessions, 4, '2026-10-24')).toEqual({ current: 0, best: 0 });
  });

  it('does not break the streak during a week still in progress', () => {
    const lastWeekOnly = octoberSessions.filter((s) => s.date < '2026-10-19');
    expect(weeksOnPace(lastWeekOnly, 3, '2026-10-21')).toEqual({ current: 1, best: 1 });
  });

  it('breaks the streak after a missed week', () => {
    const late: SessionLog = { id: 'x', date: '2026-11-03', templateId: 'pushA', sets: [] };
    expect(weeksOnPace([...octoberSessions, late], 1, '2026-11-03')).toEqual({
      current: 1,
      best: 2,
    });
  });

  it('handles no sessions at all', () => {
    expect(weeksOnPace([], 3, '2026-10-24')).toEqual({ current: 0, best: 0 });
  });
});

describe('personal records', () => {
  it('keeps the best load and the best estimated 1RM per exercise, with the date', () => {
    const records = personalRecords(octoberSessions);
    expect(records.get('leg-press')).toEqual({
      bestLoad: { loadKg: 107, reps: 10, date: '2026-10-24' },
      bestOneRepMax: { value: expect.closeTo(142.67, 2), date: '2026-10-24' },
    });
    // The incomplete 45 kg set is not a record.
    expect(records.get('lat-pulldown')?.bestLoad).toEqual({
      loadKg: 39,
      reps: 10,
      date: '2026-10-16',
    });
  });
});
