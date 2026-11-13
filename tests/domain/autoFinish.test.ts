import { describe, expect, it } from 'vitest';
import { AUTO_FINISH_MINUTES, autoFinishAt, lastActivity } from '@/domain/autoFinish';

const MIN = 60_000;

describe('session closed by itself', () => {
  it('closes 10 min after the last action, once everything is done', () => {
    expect(AUTO_FINISH_MINUTES).toBe(10);
    expect(autoFinishAt({ allDone: true, lastActivityAt: 1_000 })).toBe(1_000 + 10 * MIN);
  });

  it('never closes while an exercise is left, or without a known last action', () => {
    expect(autoFinishAt({ allDone: false, lastActivityAt: 1_000 })).toBeUndefined();
    expect(autoFinishAt({ allDone: true, lastActivityAt: undefined })).toBeUndefined();
  });

  it('waits for the cardio planned after the weights first', () => {
    expect(autoFinishAt({ allDone: true, lastActivityAt: 0, cardioAfterMinutes: 20 })).toBe(
      30 * MIN,
    );
    expect(autoFinishAt({ allDone: true, lastActivityAt: 0, cardioAfterMinutes: -5 })).toBe(
      10 * MIN,
    );
  });

  it('starts again from the latest sign of life after a restart', () => {
    expect(lastActivity(undefined, [5, 9, undefined], 2)).toBe(9);
    expect(lastActivity(12, [5, 9], 2)).toBe(12);
    expect(lastActivity(undefined, [], 2)).toBe(2);
    expect(lastActivity(undefined, [], undefined)).toBeUndefined();
  });
});
