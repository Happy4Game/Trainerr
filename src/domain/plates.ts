export interface PlateConfig {
  readonly barKg: number;
  /** Plates available in the gym, with the number of pairs of each. */
  readonly plates: readonly { readonly kg: number; readonly pairs: number }[];
  /** Weight of one collar, when collars are counted. */
  readonly collarKg?: number;
}

export interface BarLoading {
  readonly totalKg: number;
  /** Plates on each side, heaviest first (the order they go on the bar). */
  readonly perSide: readonly number[];
}

export type PlateResult =
  | { readonly exact: true; readonly loading: BarLoading }
  | { readonly exact: false; readonly below?: BarLoading; readonly above?: BarLoading };

export const DEFAULT_PLATE_CONFIG: PlateConfig = {
  barKg: 20,
  plates: [
    { kg: 25, pairs: 4 },
    { kg: 20, pairs: 2 },
    { kg: 15, pairs: 2 },
    { kg: 10, pairs: 2 },
    { kg: 5, pairs: 2 },
    { kg: 2.5, pairs: 2 },
    { kg: 1.25, pairs: 2 },
  ],
};

// Weights are handled in grams to avoid floating point errors (1.25 + 2.5 …).
const toGrams = (kg: number) => Math.round(kg * 1000);
const toKg = (grams: number) => grams / 1000;

export function platesFor(targetKg: number, config: PlateConfig): PlateResult {
  const combinations = sideCombinations(config);
  const fixed = fixedGrams(config);
  const target = toGrams(targetKg);
  const perSideTarget = (target - fixed) / 2;
  const loading = (perSide: number): BarLoading => ({
    totalKg: toKg(fixed + 2 * perSide),
    perSide: (combinations.get(perSide) ?? []).map(toKg),
  });

  if (combinations.has(perSideTarget)) return { exact: true, loading: loading(perSideTarget) };

  const sums = [...combinations.keys()];
  const below = sums.filter((sum) => sum < perSideTarget);
  const above = sums.filter((sum) => sum > perSideTarget);
  return {
    exact: false,
    ...(below.length > 0 ? { below: loading(Math.max(...below)) } : {}),
    ...(above.length > 0 ? { above: loading(Math.min(...above)) } : {}),
  };
}

/** Closest achievable totals strictly below and above a load (the − / + buttons). */
export function adjacentLoads(
  loadKg: number,
  config: PlateConfig,
): { lower?: number; higher?: number } {
  const fixed = fixedGrams(config);
  const load = toGrams(loadKg);
  const totals = [...sideCombinations(config).keys()].map((perSide) => fixed + 2 * perSide);
  const lower = totals.filter((total) => total < load);
  const higher = totals.filter((total) => total > load);
  return {
    ...(lower.length > 0 ? { lower: toKg(Math.max(...lower)) } : {}),
    ...(higher.length > 0 ? { higher: toKg(Math.min(...higher)) } : {}),
  };
}

function fixedGrams(config: PlateConfig): number {
  return toGrams(config.barKg) + 2 * toGrams(config.collarKg ?? 0);
}

/**
 * Every achievable weight per side (in grams), with the plates to use.
 * Exhaustive rather than greedy: 15 + 10 + 10 cannot make 20, but 10 + 10 can.
 * Among equal sums: fewest plates, then heaviest plates first.
 */
function sideCombinations(config: PlateConfig): Map<number, number[]> {
  const plates = [...config.plates]
    .filter((plate) => plate.kg > 0 && plate.pairs > 0)
    .sort((a, b) => b.kg - a.kg);
  let combinations = new Map<number, number[]>([[0, []]]);
  for (const plate of plates) {
    const grams = toGrams(plate.kg);
    const next = new Map(combinations);
    for (const [sum, used] of combinations) {
      for (let count = 1; count <= plate.pairs; count++) {
        const candidate = [...used, ...Array<number>(count).fill(grams)];
        const key = sum + count * grams;
        const existing = next.get(key);
        if (!existing || isBetter(candidate, existing)) next.set(key, candidate);
      }
    }
    combinations = next;
  }
  return combinations;
}

function isBetter(candidate: number[], existing: number[]): boolean {
  if (candidate.length !== existing.length) return candidate.length < existing.length;
  const sortedCandidate = [...candidate].sort((a, b) => b - a);
  const sortedExisting = [...existing].sort((a, b) => b - a);
  for (let i = 0; i < sortedCandidate.length; i++) {
    const a = sortedCandidate[i] as number;
    const b = sortedExisting[i] as number;
    if (a !== b) return a > b;
  }
  return false;
}
