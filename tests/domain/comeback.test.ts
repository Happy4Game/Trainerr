import { describe, expect, it } from 'vitest';
import {
  COMEBACK_PLANS,
  comebackSetsPerExercise,
  comebackStartLoad,
  returnToLevel,
} from '@/domain/comeback';
import { dumbbellSteps, legPressSteps } from '../fixtures/exercises';

describe('comeback after a break', () => {
  it('starts lower the longer the break', () => {
    expect(COMEBACK_PLANS.underOneMonth.startRatio).toBe(0.9);
    expect(COMEBACK_PLANS.oneToThreeMonths.startRatio).toBe(0.8);
    expect(COMEBACK_PLANS.overThreeMonths.startRatio).toBe(0.7);
  });

  it('rounds the start load to the nearest machine step', () => {
    expect(
      comebackStartLoad({ referenceKg: 22, pause: 'overThreeMonths', steps: dumbbellSteps }),
    ).toBe(16);
    expect(
      comebackStartLoad({ referenceKg: 127, pause: 'overThreeMonths', steps: legPressSteps }),
    ).toBe(90);
    expect(
      comebackStartLoad({ referenceKg: 22, pause: 'underOneMonth', steps: dumbbellSteps }),
    ).toBe(20);
  });

  it('caps volume at 3 sets per exercise for the first 2 weeks after a long break', () => {
    expect(comebackSetsPerExercise('overThreeMonths', 0)).toBe(3);
    expect(comebackSetsPerExercise('oneToThreeMonths', 13)).toBe(3);
    expect(comebackSetsPerExercise('oneToThreeMonths', 14)).toBeUndefined();
    expect(comebackSetsPerExercise('underOneMonth', 2)).toBeUndefined();
  });

  it('shows the way back to the old level', () => {
    expect(returnToLevel({ currentKg: 18, referenceKg: 22 })).toEqual({
      percent: 82,
      reached: false,
    });
    expect(returnToLevel({ currentKg: 107, referenceKg: 127 })).toEqual({
      percent: 84,
      reached: false,
    });
    expect(returnToLevel({ currentKg: 22, referenceKg: 22 })).toEqual({
      percent: 100,
      reached: true,
    });
    expect(returnToLevel({ currentKg: 24, referenceKg: 22 })).toEqual({
      percent: 109,
      reached: true,
    });
  });
});
