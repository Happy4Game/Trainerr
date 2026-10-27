import { describe, expect, it } from 'vitest';
import { adjustLine, copyPreset, DEFAULT_LINE } from '@/domain/presets';

const line = (chosenId: string, extra = {}) => ({
  exerciseId: chosenId,
  chosenId,
  sets: 4,
  reps: { min: 6, max: 8 },
  restSeconds: 150,
  role: 'mainCompound' as const,
  why: 'x',
  ...extra,
});

describe('copyPreset', () => {
  it('keeps the order, the sets, reps and rests of each exercise', () => {
    const copy = copyPreset([line('bench'), line('plank', { timed: true, sets: 3 })]);
    expect(copy.exerciseIds).toEqual(['bench', 'plank']);
    expect(copy.lines.bench).toEqual({ sets: 4, reps: { min: 6, max: 8 }, restSeconds: 150 });
    expect(copy.lines.plank).toMatchObject({ sets: 3, timed: true });
  });

  it('keeps one line when two lines end up on the same machine', () => {
    expect(copyPreset([line('press'), line('press')]).exerciseIds).toEqual(['press']);
  });
});

describe('adjustLine', () => {
  it('moves sets, reps and rest one step, within gym values', () => {
    expect(adjustLine(DEFAULT_LINE, 'sets', 1).sets).toBe(4);
    expect(adjustLine({ ...DEFAULT_LINE, sets: 1 }, 'sets', -1).sets).toBe(1);
    expect(adjustLine(DEFAULT_LINE, 'reps', -1).reps).toEqual({ min: 7, max: 11 });
    expect(adjustLine(DEFAULT_LINE, 'rest', 1).restSeconds).toBe(105);
    expect(adjustLine({ ...DEFAULT_LINE, restSeconds: 15 }, 'rest', -1).restSeconds).toBe(15);
  });

  it('counts held seconds by 5', () => {
    const plank = { sets: 3, reps: { min: 30, max: 30 }, restSeconds: 60, timed: true as const };
    expect(adjustLine(plank, 'reps', 1).reps).toEqual({ min: 35, max: 35 });
  });
});
