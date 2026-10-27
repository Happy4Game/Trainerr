import { describe, expect, it } from 'vitest';
import { estimateMinutes, loadChange } from '@/domain/sessionPreview';

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
