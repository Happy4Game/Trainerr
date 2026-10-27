import { describe, expect, it } from 'vitest';
import {
  estimateMinutes,
  loadChange,
  sessionMinutes,
  volumeGainPercent,
  workload,
} from '@/domain/sessionPreview';

describe('estimateMinutes', () => {
  it('counts about 2.5 minutes a set, rounded to 5', () => {
    expect(estimateMinutes(10)).toBe(25);
    expect(estimateMinutes(15)).toBe(40);
  });
  it('never says less than 10 minutes', () => {
    expect(estimateMinutes(1)).toBe(10);
  });
});

describe('loadChange', () => {
  it('is a first time with no history', () => {
    expect(loadChange({ proposedKg: 20, lastLoadsKg: [] })).toEqual({ kind: 'first' });
  });
  it('compares with the heaviest set of last time', () => {
    expect(loadChange({ proposedKg: 67.5, lastLoadsKg: [60, 65] })).toEqual({
      kind: 'up',
      deltaKg: 2.5,
    });
    expect(loadChange({ proposedKg: 65, lastLoadsKg: [60, 65] })).toEqual({ kind: 'same' });
    expect(loadChange({ proposedKg: 60, lastLoadsKg: [65] })).toEqual({ kind: 'down', deltaKg: 5 });
  });
  it('counts less help as a step up on a help machine', () => {
    expect(loadChange({ proposedKg: 35, lastLoadsKg: [40, 45], assisted: true })).toEqual({
      kind: 'up',
      deltaKg: 5,
    });
  });
});

describe('workload', () => {
  it('adds load × reps of the work sets only', () => {
    expect(
      workload([
        { loadKg: 20, reps: 10, warmup: true },
        { loadKg: 60, reps: 8 },
        { loadKg: 60, reps: 7.5 },
      ]),
    ).toBe(930);
  });
});

describe('volumeGainPercent', () => {
  it('gives the gain in whole percent', () => {
    expect(volumeGainPercent(1000, 1080)).toBe(8);
  });
  it('says nothing when the volume did not go up, or without a previous session', () => {
    expect(volumeGainPercent(1000, 1000)).toBeUndefined();
    expect(volumeGainPercent(1000, 900)).toBeUndefined();
    expect(volumeGainPercent(0, 900)).toBeUndefined();
  });
});

describe('sessionMinutes', () => {
  it('rounds to the minute', () => {
    expect(sessionMinutes(0, 52.6 * 60_000)).toBe(53);
  });
  it('says nothing without a start or for a session left open for hours', () => {
    expect(sessionMinutes(undefined, 1)).toBeUndefined();
    expect(sessionMinutes(0, 5 * 60 * 60_000)).toBeUndefined();
  });
});
