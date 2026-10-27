import type { Equipment } from './types';

/** Loads available on a machine, in kg, sorted ascending. */
export type LoadSteps = readonly number[];

/**
 * A jump to the next step is a "missing step" when it is larger than both
 * thresholds (e.g. a stack going 52 → 59 kg). Dumbbells going 16 → 18 kg are
 * +12.5 % but only 2 kg, so they jump normally. Values to be validated.
 */
export const MISSING_STEP_MIN_RATIO = 0.1;
export const MISSING_STEP_MIN_KG = 2.5;

const EPSILON = 1e-9;

export function uniformSteps(min: number, max: number, increment: number): number[] {
  const count = Math.floor((max - min) / increment + EPSILON);
  return Array.from({ length: count + 1 }, (_, i) => roundKg(min + i * increment));
}

export function normalizeSteps(steps: readonly number[]): number[] {
  return [...new Set(steps.filter((load) => load > 0))].sort((a, b) => a - b);
}

/** Lightest step strictly heavier than the load. */
export function stepUp(steps: LoadSteps, loadKg: number): number | undefined {
  return steps.find((step) => step > loadKg + EPSILON);
}

/**
 * "+" on a load: the next step, or past the heaviest one by the last gap
 * (a machine heavier than its known steps, weights added on top).
 */
export function stepUpOrBeyond(steps: LoadSteps, loadKg: number): number {
  const next = stepUp(steps, loadKg);
  if (next !== undefined) return next;
  const [before, last] = steps.slice(-2);
  const gap = before !== undefined && last !== undefined ? last - before : 5;
  return roundKg(loadKg + gap);
}

/** Heaviest step strictly lighter than the load. */
export function stepDown(steps: LoadSteps, loadKg: number): number | undefined {
  return steps.findLast((step) => step < loadKg - EPSILON);
}

/** Closest step; on a tie, the lighter one. */
export function nearestStep(steps: LoadSteps, targetKg: number): number {
  assertNotEmpty(steps);
  return steps.reduce((best, step) =>
    Math.abs(step - targetKg) < Math.abs(best - targetKg) - EPSILON ? step : best,
  );
}

/** Heaviest step not above the target, or the lightest step if all are above. */
export function floorStep(steps: LoadSteps, targetKg: number): number {
  assertNotEmpty(steps);
  return steps.findLast((step) => step <= targetKg + EPSILON) ?? (steps[0] as number);
}

export function isMissingStepJump(fromKg: number, toKg: number): boolean {
  const jump = toKg - fromKg;
  return jump > MISSING_STEP_MIN_KG + EPSILON && jump > fromKg * MISSING_STEP_MIN_RATIO + EPSILON;
}

export function roundKg(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function assertNotEmpty(steps: LoadSteps): void {
  if (steps.length === 0) throw new Error('No load steps configured for this machine.');
}

/** Reads a load typed by the user: "2,5", "2.5" or "52 kg". Undefined if not a positive number. */
export function parseLoad(text: string): number | undefined {
  const cleaned = text
    .trim()
    .replace(/\s*kg$/i, '')
    .replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return value > 0 ? value : undefined;
}

/** Steps used until the user enters the real ones for a machine. */
export function defaultStepsFor(equipment: Equipment): number[] {
  switch (equipment) {
    case 'dumbbell':
      return uniformSteps(2, 80, 2);
    case 'barbell':
      // 20 kg bar, then a pair of 1.25 kg plates at a time.
      return uniformSteps(20, 250, 2.5);
    case 'bodyweight':
      // Extra weight on top of the body weight.
      return uniformSteps(0, 100, 5);
    case 'machine':
      // Plate-loaded machines (leg press, hack squat) go well past a stack.
      return uniformSteps(5, 400, 5);
    case 'cable':
      return uniformSteps(5, 200, 5);
  }
}

/** Below this, a typed load is not worth more precision: gym add-on weights start at 0.5 kg. */
export const MIN_FINE_STEP_KG = 0.5;
/** Small weights clipped on top of a stack (magnetic add-ons, "poids d'appoint"). */
export const COMMON_ADD_ONS_KG: readonly number[] = [1.25, 2.5];

/** How loads are reached on one machine, beyond its plates. */
export interface MachineLoadSetup {
  /** Precision of a load typed by hand, at least MIN_FINE_STEP_KG. */
  readonly fineStepKg?: number;
  /** Add-on weights available, each usable once on top of a plate. */
  readonly addOnsKg?: readonly number[];
}

/** Every load reachable with a plate and any combination of the add-ons. */
export function withAddOns(steps: LoadSteps, addOnsKg: readonly number[] = []): number[] {
  const sums = addOnsKg
    .filter((a) => a > 0)
    .reduce<number[]>((acc, addOn) => [...acc, ...acc.map((s) => roundKg(s + addOn))], [0]);
  // 0 stays a step: a body weight exercise starts with no extra load.
  const loads = steps.flatMap((step) => sums.map((sum) => roundKg(step + sum)));
  return [...new Set(loads.filter((load) => load >= 0))].sort((a, b) => a - b);
}

/** A load typed by hand, rounded to the machine precision (0.5 kg at least). */
export function snapToFineStep(loadKg: number, fineStepKg = MIN_FINE_STEP_KG): number {
  const step = Math.max(MIN_FINE_STEP_KG, fineStepKg);
  return roundKg(Math.round(loadKg / step + EPSILON) * step);
}

/**
 * What to put on the machine for a load: the plate of the stack and the
 * add-ons on top. Undefined when the load is not reachable exactly.
 */
export function stackBreakdown(
  loadKg: number,
  steps: LoadSteps,
  addOnsKg: readonly number[] = [],
): { plateKg: number; addOnsKg: number[] } | undefined {
  const combos = addOnsKg
    .filter((a) => a > 0)
    .reduce<number[][]>((acc, addOn) => [...acc, ...acc.map((c) => [...c, addOn])], [[]])
    // Fewest add-ons first: one 2.5 kg rather than two 1.25 kg.
    .sort((a, b) => a.length - b.length);
  for (const combo of combos) {
    const extra = combo.reduce((sum, a) => sum + a, 0);
    const plate = steps.find((step) => Math.abs(step + extra - loadKg) < 1e-6);
    if (plate !== undefined) return { plateKg: plate, addOnsKg: combo };
  }
  return undefined;
}
