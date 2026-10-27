import { describe, expect, it } from 'vitest';
import { recordsBySession } from '@/domain/stats';
import type { SessionLog } from '@/domain/types';

const session = (id: string, date: string, loads: [string, number, number][]): SessionLog => ({
  id,
  date,
  templateId: 'upperA',
  sets: loads.map(([exerciseId, loadKg, reps]) => ({
    exerciseId,
    loadKg,
    reps,
    difficulty: 'ok',
  })),
});

describe('recordsBySession', () => {
  it('marks the sessions that beat every session before them', () => {
    const records = recordsBySession([
      session('b', '2026-10-03', [['bench', 62.5, 8]]),
      session('a', '2026-10-01', [['bench', 60, 8]]),
      session('c', '2026-10-05', [['bench', 62.5, 8]]),
      session('d', '2026-10-07', [['bench', 62.5, 9]]),
    ]);
    expect([...records.keys()]).toEqual(['b', 'd']);
    expect(records.get('b')).toEqual(new Set(['bench']));
  });

  it('does not count a first time or a warm-up', () => {
    const records = recordsBySession([
      session('a', '2026-10-01', [['bench', 60, 8]]),
      {
        ...session('b', '2026-10-03', [['bench', 50, 8]]),
        sets: [
          { exerciseId: 'bench', loadKg: 80, reps: 5, difficulty: 'ok', warmup: true },
          { exerciseId: 'row', loadKg: 50, reps: 10, difficulty: 'ok' },
        ],
      },
    ]);
    expect(records.size).toBe(0);
  });
});
