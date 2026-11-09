import { describe, expect, it } from 'vitest';
import { CUSTOM_EXERCISES, CURATED } from '@/data/catalog/curated';
import { MACHINE_SPLITS, moveMachineSettings, pendingSplit } from '@/domain/machineSplits';

describe('machine splits', () => {
  it('only names machines of the catalog, the old one first', () => {
    for (const split of MACHINE_SPLITS) {
      expect(split.choices[0]).toBe(split.fromId);
      for (const id of split.choices) expect(id in CURATED || id in CUSTOM_EXERCISES).toBe(true);
    }
  });

  it('asks only users with sets on the old machine, once', () => {
    const used = new Set(['Leg_Press']);
    expect(pendingSplit(MACHINE_SPLITS, {}, (id) => used.has(id))?.id).toBe('legPress');
    expect(pendingSplit(MACHINE_SPLITS, { legPress: 'Leg_Press' }, (id) => used.has(id))).toBe(
      undefined,
    );
    expect(pendingSplit(MACHINE_SPLITS, {}, () => false)).toBe(undefined);
  });

  it('moves the rep range, the custom sessions and the swaps to the new machine', () => {
    const moved = moveMachineSettings(
      {
        machineRepRanges: { Leg_Press: { min: 10, max: 15 }, Butterfly: { min: 12, max: 15 } },
        swaps: { Barbell_Squat: 'Leg_Press' },
        customSessions: [
          {
            exerciseIds: ['Leg_Press', 'Leg_Extensions'],
            lines: { Leg_Press: { sets: 4 } },
          },
        ],
      },
      'Leg_Press',
      'trainerr:seated-leg-press',
    );
    expect(moved.machineRepRanges).toEqual({
      'trainerr:seated-leg-press': { min: 10, max: 15 },
      Butterfly: { min: 12, max: 15 },
    });
    expect(moved.swaps).toEqual({
      Barbell_Squat: 'trainerr:seated-leg-press',
      // The ready-made sessions that still name the 45° press propose the horizontal one.
      Leg_Press: 'trainerr:seated-leg-press',
    });
    expect(moved.customSessions?.[0]).toEqual({
      exerciseIds: ['trainerr:seated-leg-press', 'Leg_Extensions'],
      lines: { 'trainerr:seated-leg-press': { sets: 4 } },
    });
  });

  it('keeps what the new machine already had, and changes nothing when the old one is kept', () => {
    const settings = {
      machineRepRanges: {
        Leg_Press: { min: 10, max: 15 },
        'trainerr:seated-leg-press': { min: 8, max: 12 },
      },
      swaps: { Leg_Press: 'Hack_Squat' },
    };
    const moved = moveMachineSettings(settings, 'Leg_Press', 'trainerr:seated-leg-press');
    expect(moved.machineRepRanges).toEqual({ 'trainerr:seated-leg-press': { min: 8, max: 12 } });
    expect(moved.swaps).toEqual({ Leg_Press: 'Hack_Squat' });
    expect(moveMachineSettings(settings, 'Leg_Press', 'Leg_Press')).toBe(settings);
  });
});
