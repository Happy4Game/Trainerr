import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@/data/catalog/catalog';
import { movementFor } from '@/ui/demo/movementFor';
import { MOVEMENTS } from '@/ui/demo/movements';
import {
  cyclePosition,
  figureFor,
  interpolate,
  SEGMENTS,
  solveTwoBones,
  type Point,
} from '@/ui/demo/skeleton';

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('stick figure', () => {
  it('keeps the bone lengths whatever the target (property)', () => {
    const point = fc.tuple(
      fc.double({ min: 0, max: 200, noNaN: true }),
      fc.double({ min: 0, max: 170, noNaN: true }),
    );
    fc.assert(
      fc.property(point, point, fc.constantFrom<1 | -1>(1, -1), (base, target, bend) => {
        const { joint, end } = solveTwoBones(base, target, 28, 26, bend);
        expect(distance(base, joint)).toBeCloseTo(28, 4);
        expect(distance(joint, end)).toBeCloseTo(26, 3);
      }),
    );
  });

  it('reaches a target within reach exactly', () => {
    const { end } = solveTwoBones([0, 0], [30, 20], 28, 26, 1);
    expect(end[0]).toBeCloseTo(30, 6);
    expect(end[1]).toBeCloseTo(20, 6);
  });

  it('bends the knee forward when standing up straight is not possible', () => {
    const f = figureFor({
      hip: [100, 120],
      torso: 0,
      hand: [100, 140],
      foot: [100, 158],
      elbow: 1,
      knee: -1,
    });
    expect(f.knee[0]).toBeGreaterThan(100);
  });

  it('cycles 0 → 1 → 0 smoothly', () => {
    expect(cyclePosition(0, 2800)).toBe(0);
    expect(cyclePosition(2800 * 0.4, 2800)).toBe(1);
    expect(cyclePosition(2800 * 0.7, 2800)).toBeGreaterThan(0);
    expect(cyclePosition(2800 * 0.7, 2800)).toBeLessThan(1);
  });
});

describe('movements', () => {
  it('every movement stays in the drawing box, with no broken numbers', () => {
    for (const movement of Object.values(MOVEMENTS)) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const f = figureFor(interpolate(movement.start, movement.end, t));
        for (const [name, [x, y]] of Object.entries(f)) {
          expect(Number.isFinite(x) && Number.isFinite(y), `${movement.id} ${name}`).toBe(true);
          expect(x, `${movement.id} ${name}.x`).toBeGreaterThanOrEqual(-SEGMENTS.head);
          expect(x, `${movement.id} ${name}.x`).toBeLessThanOrEqual(200 + SEGMENTS.head);
          expect(y, `${movement.id} ${name}.y`).toBeGreaterThanOrEqual(-SEGMENTS.head);
          expect(y, `${movement.id} ${name}.y`).toBeLessThanOrEqual(175);
        }
      }
    }
  });

  it('the start and end of every moving exercise differ', () => {
    for (const movement of Object.values(MOVEMENTS)) {
      if (movement.id === 'plank') continue;
      const a = figureFor(movement.start);
      const b = figureFor(movement.end);
      const moved = Object.keys(a).some(
        (k) => distance(a[k as keyof typeof a], b[k as keyof typeof b]) > 5,
      );
      expect(moved, movement.id).toBe(true);
    }
  });
});

describe('demonstration of each exercise', () => {
  const catalog = buildCatalog();
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const id = (exerciseId: string) => {
    const exercise = byId.get(exerciseId);
    if (!exercise) throw new Error(`Unknown exercise ${exerciseId}`);
    return movementFor(exercise).id;
  };

  it('shows the right movement for the gym machines', () => {
    expect(id('Butterfly')).toBe('fly');
    expect(id('Dumbbell_Bench_Press')).toBe('benchPress');
    expect(id('Leverage_Chest_Press')).toBe('chestPress');
    expect(id('Machine_Shoulder_Military_Press')).toBe('shoulderPress');
    expect(id('Wide-Grip_Lat_Pulldown')).toBe('pulldown');
    expect(id('Seated_Cable_Rows')).toBe('row');
    expect(id('Reverse_Machine_Flyes')).toBe('rearFly');
    expect(id('Side_Lateral_Raise')).toBe('lateralRaise');
    expect(id('Triceps_Pushdown')).toBe('pushdown');
    expect(id('Dumbbell_Bicep_Curl')).toBe('curl');
    expect(id('Leg_Press')).toBe('legPress');
    expect(id('Leg_Extensions')).toBe('legExtension');
    expect(id('Lying_Leg_Curls')).toBe('lyingLegCurl');
    expect(id('Seated_Leg_Curl')).toBe('seatedLegCurl');
    expect(id('Thigh_Abductor')).toBe('hipAbduction');
    expect(id('Thigh_Adductor')).toBe('hipAdduction');
    expect(id('Barbell_Squat')).toBe('squat');
    expect(id('Plank')).toBe('plank');
    expect(id('Hyperextensions_Back_Extensions')).toBe('backExtension');
    expect(id('trainerr:diverging-seated-row')).toBe('row');
    expect(id('trainerr:machine-lateral-raise')).toBe('lateralRaise');
  });

  it('gives every exercise a demonstration, an exact one for most of them', () => {
    const results = catalog.map(movementFor);
    for (const r of results) expect(MOVEMENTS[r.id]).toBeDefined();
    const exact = results.filter((r) => !r.approximate).length;
    expect(exact / results.length).toBeGreaterThan(0.75);
  });
});
