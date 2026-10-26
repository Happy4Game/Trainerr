export type WeightUnit = 'kg' | 'lb';

export const LB_PER_KG = 2.2046226218;

/**
 * Loads are always stored in kg. In pounds they are shown to the nearest half
 * pound, which is the precision of gym plates and stacks sold in lb.
 */
export function kgToUnit(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return kg;
  return Math.round(kg * LB_PER_KG * 2) / 2;
}

/** Value typed by the user in their unit → kg, to 3 decimals. */
export function unitToKg(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return value;
  return Math.round((value / LB_PER_KG) * 1000) / 1000;
}
