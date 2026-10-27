import { describe, expect, it } from 'vitest';
import {
  averageSpeedKmh,
  CARDIO_MACHINES,
  cardioMachine,
  invalidCardioFields,
  moderateMinutes,
  paceSeconds,
  recommendedCardioPosition,
  weeklyCardio,
} from '@/domain/cardio';
import { MUSCLES } from '@/domain/muscles';

describe('cardio machines', () => {
  it('have unique ids and known muscles', () => {
    expect(new Set(CARDIO_MACHINES.map((m) => m.id)).size).toBe(CARDIO_MACHINES.length);
    for (const m of CARDIO_MACHINES) {
      for (const muscle of [...m.primaryMuscles, ...m.secondaryMuscles])
        expect(MUSCLES).toContain(muscle);
    }
    expect(cardioMachine('rower')?.icon).toBe('waves');
    expect(cardioMachine('nope')).toBeUndefined();
  });
});

describe('cardio entries', () => {
  it('need minutes and plausible values', () => {
    expect(invalidCardioFields({ cardioId: 'bike', minutes: 20, avgHr: 140 })).toEqual([]);
    expect(invalidCardioFields({ cardioId: 'bike', minutes: Number.NaN })).toEqual(['minutes']);
    expect(invalidCardioFields({ cardioId: 'treadmill', minutes: 20, speedKmh: 120 })).toEqual([
      'speedKmh',
    ]);
  });

  it('give the average speed and pace', () => {
    expect(averageSpeedKmh({ cardioId: 'bike', minutes: 20, distanceKm: 8.4 })).toBe(25.2);
    expect(averageSpeedKmh({ cardioId: 'treadmill', minutes: 20, speedKmh: 10 })).toBe(10);
    expect(paceSeconds({ cardioId: 'treadmill', minutes: 25, distanceKm: 5 })).toBe(300);
    // The rower counts per 500 m.
    expect(paceSeconds({ cardioId: 'rower', minutes: 8, distanceKm: 2 })).toBe(120);
    expect(paceSeconds({ cardioId: 'bike', minutes: 20 })).toBeUndefined();
  });
});

describe('weekly cardio (WHO 2020)', () => {
  it('counts a vigorous minute double and an easy one not at all', () => {
    expect(moderateMinutes({ minutes: 20, effort: 'vigorous' })).toBe(40);
    expect(moderateMinutes({ minutes: 20, effort: 'light' })).toBe(0);
    expect(moderateMinutes({ minutes: 20 })).toBe(20);
  });

  it('adds up Monday to Sunday of the current week', () => {
    // 2026-10-26 is a Monday.
    const week = weeklyCardio(
      [
        { date: '2026-10-25', minutes: 60 },
        { date: '2026-10-26', minutes: 30, effort: 'moderate' },
        { date: '2026-10-28', minutes: 60, effort: 'vigorous' },
      ],
      '2026-10-29',
    );
    expect(week).toEqual({ minutes: 90, moderate: 150, reached: true });
  });
});

describe('cardio before or after (Eddens 2018, Schumann 2022)', () => {
  it('goes after the weights for strength or on a legs day', () => {
    expect(recommendedCardioPosition('strength', ['push'])).toEqual({
      position: 'after',
      reason: 'lowerStrength',
    });
    expect(recommendedCardioPosition('hypertrophy', ['legs'], cardioMachine('bike'))).toEqual({
      position: 'after',
      reason: 'legsDay',
    });
  });

  it('leaves the choice otherwise', () => {
    expect(recommendedCardioPosition('hypertrophy', ['push', 'pull']).position).toBe('either');
    expect(recommendedCardioPosition('maintenance', ['legs'], cardioMachine('rower')).reason).toBe(
      'noDifference',
    );
  });
});
