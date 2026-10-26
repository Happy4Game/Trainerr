import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATE_CONFIG, adjacentLoads, platesFor, type PlateConfig } from '@/domain/plates';

const sum = (plates: readonly number[]) => plates.reduce((a, b) => a + b, 0);

describe('plate calculator', () => {
  it('loads 70 kg on a 20 kg bar: 25 kg per side', () => {
    expect(platesFor(70, DEFAULT_PLATE_CONFIG)).toEqual({
      exact: true,
      loading: { totalKg: 70, perSide: [25] },
    });
  });

  it('places plates from heaviest to lightest', () => {
    expect(platesFor(102.5, DEFAULT_PLATE_CONFIG)).toMatchObject({
      exact: true,
      loading: { perSide: [25, 15, 1.25] },
    });
  });

  it('uses the available pairs only, and finds combinations greedy would miss', () => {
    const config: PlateConfig = {
      barKg: 20,
      plates: [
        { kg: 15, pairs: 1 },
        { kg: 10, pairs: 2 },
      ],
    };
    expect(platesFor(60, config)).toMatchObject({ exact: true, loading: { perSide: [10, 10] } });
  });

  it('counts collars when asked', () => {
    expect(platesFor(75, { ...DEFAULT_PLATE_CONFIG, collarKg: 2.5 })).toMatchObject({
      exact: true,
      loading: { perSide: [25] },
    });
  });

  it('proposes the two closest loads when the exact one is impossible', () => {
    expect(platesFor(71, DEFAULT_PLATE_CONFIG)).toEqual({
      exact: false,
      below: { totalKg: 70, perSide: [25] },
      above: { totalKg: 72.5, perSide: [25, 1.25] },
    });
  });

  it('handles loads lighter than the bar or beyond the plates', () => {
    expect(platesFor(15, DEFAULT_PLATE_CONFIG)).toEqual({
      exact: false,
      above: { totalKg: 20, perSide: [] },
    });
    const small: PlateConfig = { barKg: 20, plates: [{ kg: 10, pairs: 1 }] };
    expect(platesFor(100, small)).toEqual({
      exact: false,
      below: { totalKg: 40, perSide: [10] },
    });
  });

  it('gives the − / + neighbours of a load', () => {
    expect(adjacentLoads(70, DEFAULT_PLATE_CONFIG)).toEqual({ lower: 67.5, higher: 72.5 });
    expect(adjacentLoads(20, DEFAULT_PLATE_CONFIG)).toEqual({ higher: 22.5 });
  });

  it('always reaches the target exactly, or brackets it with the two closest loads (property)', () => {
    const config = fc.record({
      barKg: fc.constantFrom(10, 15, 20),
      plates: fc.uniqueArray(
        fc.record({
          kg: fc.constantFrom(25, 20, 15, 10, 5, 2.5, 1.25),
          pairs: fc.integer({ min: 1, max: 4 }),
        }),
        { selector: (plate) => plate.kg, minLength: 1 },
      ),
    });
    fc.assert(
      fc.property(
        config,
        fc.integer({ min: 0, max: 800 }).map((n) => n / 4),
        (cfg, target) => {
          const result = platesFor(target, cfg);
          const per = (perSide: readonly number[]) => cfg.barKg + 2 * sum(perSide);
          if (result.exact) {
            expect(per(result.loading.perSide)).toBeCloseTo(target, 6);
            return;
          }
          expect(result.below ?? result.above).toBeDefined();
          if (result.below) {
            expect(per(result.below.perSide)).toBeCloseTo(result.below.totalKg, 6);
            expect(result.below.totalKg).toBeLessThan(target);
          }
          if (result.above) {
            expect(per(result.above.perSide)).toBeCloseTo(result.above.totalKg, 6);
            expect(result.above.totalKg).toBeGreaterThan(target);
          }
          // Nothing achievable lies strictly between the two proposals.
          const neighbours = adjacentLoads(target, cfg);
          expect(neighbours.lower).toBe(result.below?.totalKg);
          expect(neighbours.higher).toBe(result.above?.totalKg);
        },
      ),
    );
  });
});
