import { describe, expect, it } from 'vitest';
import {
  allTrends,
  bodyWeightTrend,
  exerciseTrend,
  recentRecords,
  regularity,
  trainingBalance,
  weeklyVolume,
} from '@/domain/insights';
import type { SessionLog, SetLog } from '@/domain/types';
import { allExercises } from '../fixtures/exercises';
import { octoberSessions } from '../fixtures/octoberSessions';

const exercises = new Map(allExercises.map((e) => [e.id, e]));

const set = (exerciseId: string, loadKg: number, reps: number, extra: Partial<SetLog> = {}) => ({
  exerciseId,
  loadKg,
  reps,
  difficulty: 'ok' as const,
  ...extra,
});
const session = (date: string, sets: SetLog[]): SessionLog => ({
  id: date,
  date,
  templateId: 'x',
  sets,
});
/** One bench session a week, with the given load × 8. */
const benchWeeks = (loads: number[], start = '2026-09-07') =>
  loads.map((loadKg, i) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i * 7);
    return session(date.toISOString().slice(0, 10), [set('db-bench', loadKg, 8)]);
  });

describe('exercise trend', () => {
  it('reads "+X kg in N weeks" over the last 6 weeks', () => {
    // 7 weekly sessions, 20 → 26 kg, the first one exactly 6 weeks ago.
    const trend = exerciseTrend(benchWeeks([20, 21, 22, 23, 24, 25, 26]), 'db-bench', '2026-10-19');
    expect(trend).toMatchObject({ verdict: 'progressing', sessions: 7, weeks: 6 });
    // Epley at 8 reps: 1RM = load × 1.267, so 6 kg of load ≈ 7.5 kg of 1RM.
    expect(trend?.changeKg).toBe(7.5);
    expect(trend?.points.at(-1)?.bestSet).toEqual({ loadKg: 26, reps: 8 });
  });

  it('flags a stall when the last 3 sessions did not beat the best', () => {
    const trend = exerciseTrend(benchWeeks([20, 22, 24, 24, 23, 24]), 'db-bench', '2026-10-12');
    expect(trend).toMatchObject({ verdict: 'stalled', sessionsSinceBest: 3 });
  });

  it('flags a regression beyond 5 %, and waits for a second session', () => {
    expect(exerciseTrend(benchWeeks([30, 30, 27]), 'db-bench', '2026-09-21')?.verdict).toBe(
      'regressing',
    );
    expect(exerciseTrend(benchWeeks([30]), 'db-bench', '2026-09-07')?.verdict).toBe('tooEarly');
    expect(exerciseTrend(benchWeeks([30, 30]), 'db-bench', '2026-09-14')?.verdict).toBe('steady');
    expect(exerciseTrend([], 'db-bench', '2026-09-14')).toBeUndefined();
  });

  it('compares with the last session before the window when the window has one only', () => {
    const sessions = [...benchWeeks([20]), ...benchWeeks([25], '2026-12-07')];
    const trend = exerciseTrend(sessions, 'db-bench', '2026-12-07');
    expect(trend).toMatchObject({ verdict: 'progressing', weeks: 13 });
  });

  it('leaves warm-up and incomplete sets out of the best set', () => {
    const trend = exerciseTrend(
      [
        session('2026-10-01', [
          set('db-bench', 40, 5, { warmup: true }),
          set('db-bench', 30, 8, { completeReps: false }),
          set('db-bench', 24, 8),
        ]),
      ],
      'db-bench',
      '2026-10-01',
    );
    expect(trend?.points[0]?.bestSet).toEqual({ loadKg: 24, reps: 8 });
  });

  it('lists every exercise of the real October sessions, latest first', () => {
    const trends = allTrends(octoberSessions, '2026-10-24');
    expect(trends[0]?.lastDate).toBe('2026-10-24');
    expect(trends.find((t) => t.exerciseId === 'leg-press')).toMatchObject({
      verdict: 'progressing',
      changeKg: 9.5,
    });
  });
});

describe('weekly volume', () => {
  const week = (monday: string, sets: number) =>
    session(
      monday,
      Array.from({ length: sets }, () => set('db-bench', 20, 10)),
    );

  it('averages the complete weeks, and flags the key muscles under 10 sets', () => {
    const sessions = [week('2026-10-05', 8), week('2026-10-12', 12), week('2026-10-19', 4)];
    const volume = weeklyVolume(sessions, exercises, '2026-10-21');
    expect(volume.weeks).toBe(2);
    expect(volume.perMuscle.chest).toBe(10);
    expect(volume.lagging).not.toContain('chest');
    expect(volume.lagging).toContain('quads');
  });

  it('uses the week in progress when no week is complete yet', () => {
    const volume = weeklyVolume([week('2026-10-19', 6)], exercises, '2026-10-21');
    expect(volume).toMatchObject({ weeks: 0, perMuscle: { chest: 6 } });
    expect(volume.lagging[0]).not.toBe('chest');
    expect(weeklyVolume([], exercises, '2026-10-21')).toEqual({
      perMuscle: {},
      weeks: 0,
      lagging: [],
    });
  });
});

describe('training balance', () => {
  it('counts the October sets by movement', () => {
    const balance = trainingBalance(octoberSessions, exercises, '2026-10-24');
    expect(balance.sets.push + balance.sets.pull + balance.sets.legs).toBeGreaterThan(0);
    expect(balance.sets.push).toBeGreaterThan(0);
  });

  it('flags push dominance and forgotten legs', () => {
    const sessions = [
      session('2026-10-20', [
        ...Array.from({ length: 10 }, () => set('db-bench', 20, 10)),
        ...Array.from({ length: 5 }, () => set('lat-pulldown', 40, 10)),
        set('leg-press', 100, 10),
      ]),
    ];
    expect(trainingBalance(sessions, exercises, '2026-10-21')).toMatchObject({
      pushPull: 'pushDominant',
      upperLower: 'upperDominant',
    });
    expect(trainingBalance([], exercises, '2026-10-21')).toMatchObject({
      pushPull: 'unknown',
      upperLower: 'unknown',
    });
  });

  it('sees pull dominance and leg-only weeks', () => {
    const sessions = [
      session('2026-10-20', [
        ...Array.from({ length: 2 }, () => set('db-bench', 20, 10)),
        ...Array.from({ length: 5 }, () => set('lat-pulldown', 40, 10)),
        ...Array.from({ length: 30 }, () => set('leg-press', 100, 10)),
      ]),
    ];
    expect(trainingBalance(sessions, exercises, '2026-10-21')).toMatchObject({
      pushPull: 'pullDominant',
      upperLower: 'lowerDominant',
    });
  });
});

describe('regularity', () => {
  it('averages sessions per week and counts days since the last one', () => {
    const r = regularity(octoberSessions, '2026-10-27');
    // 6 sessions from 15 to 27 October: 13 days, a bit less than 2 weeks.
    expect(r.perWeek).toBeCloseTo(3.2, 1);
    expect(r.daysSinceLast).toBe(3);
    expect(r.calendar).toHaveLength(12);
    expect(r.calendar.at(-1)?.[0]).toMatchObject({ date: '2026-10-26', trained: false });
    expect(r.calendar.flat().filter((d) => d.trained)).toHaveLength(6);
  });

  it('is empty before the first session', () => {
    expect(regularity([], '2026-10-27')).toMatchObject({ perWeek: 0, daysSinceLast: undefined });
  });
});

describe('recent records', () => {
  it('keeps records beaten in the last 30 days, not first sessions', () => {
    const records = recentRecords(octoberSessions, '2026-10-27');
    expect(records.map((r) => r.exerciseId)).toContain('leg-press');
    expect(records.map((r) => r.exerciseId)).not.toContain('pec-fly');
    expect((records[0]?.date ?? '') >= (records.at(-1)?.date ?? '')).toBe(true);
    expect(recentRecords(octoberSessions, '2027-01-27')).toEqual([]);
  });
});

describe('body weight trend', () => {
  it('gives the weekly change over the last 4 weeks', () => {
    const trend = bodyWeightTrend(
      [
        { date: '2026-09-01', weightKg: 80 },
        { date: '2026-10-01', weightKg: 78 },
        { date: '2026-10-08', weightKg: 77.6 },
        { date: '2026-10-15', weightKg: 77.2 },
        { date: '2026-10-22', weightKg: 76.8 },
        { date: '2026-10-23' },
      ],
      '2026-10-27',
    );
    expect(trend?.latestKg).toBe(76.8);
    expect(trend?.perWeekKg).toBe(-0.4);
    expect(trend?.points).toHaveLength(5);
  });

  it('needs two weighings a week apart for a trend', () => {
    expect(
      bodyWeightTrend(
        [
          { date: '2026-10-20', weightKg: 80 },
          { date: '2026-10-22', weightKg: 79 },
        ],
        '2026-10-27',
      )?.perWeekKg,
    ).toBeUndefined();
    expect(bodyWeightTrend([], '2026-10-27')).toBeUndefined();
  });
});
