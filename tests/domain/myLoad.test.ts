import { describe, expect, it } from 'vitest';
import { myLoad } from '@/domain/myLoad';

const set = (loadKg: number, reps: number, extra = {}) => ({
  exerciseId: 'x',
  loadKg,
  reps,
  difficulty: 'ok' as const,
  ...extra,
});

describe('load shown for a machine in the catalog', () => {
  it('is the heaviest complete work set of the last session', () => {
    expect(
      myLoad({
        sessions: [
          {
            date: '2026-10-20',
            sets: [set(20, 10), set(25, 8), set(30, 3, { completeReps: false })],
          },
        ],
      }),
    ).toEqual({ loadKg: 25, reps: 8, date: '2026-10-20', source: 'session' });
  });

  it('ignores warm-ups and older sessions', () => {
    expect(
      myLoad({
        sessions: [
          { date: '2026-10-10', sets: [set(40, 10)] },
          { date: '2026-10-20', sets: [set(10, 15, { warmup: true }), set(22.5, 9)] },
        ],
      })?.loadKg,
    ).toBe(22.5);
  });

  it('takes the load noted by hand when it is more recent', () => {
    expect(
      myLoad({
        sessions: [{ date: '2026-10-20', sets: [set(20, 10)] }],
        noted: { loadKg: 30, reps: 8, date: '2026-10-22' },
      }),
    ).toEqual({ loadKg: 30, reps: 8, date: '2026-10-22', source: 'noted' });
  });

  it('keeps the session when the noted load is older', () => {
    expect(
      myLoad({
        sessions: [{ date: '2026-10-20', sets: [set(20, 10)] }],
        noted: { loadKg: 30, reps: 8, date: '2026-10-01' },
      })?.source,
    ).toBe('session');
  });

  it('is unknown without session nor noted load', () => {
    expect(myLoad({ sessions: [] })).toBeUndefined();
  });
});
