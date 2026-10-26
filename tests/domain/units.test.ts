import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { kgToUnit, unitToKg } from '@/domain/units';

describe('weight units', () => {
  it('keeps kg as they are', () => {
    expect(kgToUnit(52, 'kg')).toBe(52);
    expect(unitToKg(52, 'kg')).toBe(52);
  });

  it('shows pounds to the nearest half pound', () => {
    expect(kgToUnit(20, 'lb')).toBe(44);
    expect(kgToUnit(52, 'lb')).toBe(114.5);
    expect(kgToUnit(1.25, 'lb')).toBe(3);
  });

  it('converts typed pounds back to kg', () => {
    expect(unitToKg(45, 'lb')).toBe(20.412);
    expect(unitToKg(100, 'lb')).toBe(45.359);
  });

  it('round-trips within half a pound (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 500, noNaN: true }), (kg) => {
        const shown = kgToUnit(kg, 'lb');
        expect(Math.abs(unitToKg(shown, 'lb') - kg)).toBeLessThanOrEqual(0.25 / 2.2046 + 0.001);
      }),
    );
  });
});
