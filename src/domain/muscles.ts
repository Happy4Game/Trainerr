export const MUSCLES = [
  'chest',
  'frontDelts',
  'sideDelts',
  'rearDelts',
  'triceps',
  'biceps',
  'forearms',
  'lats',
  'upperBack',
  'traps',
  'lowerBack',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
] as const;

export type MuscleId = (typeof MUSCLES)[number];

export const PUSH_MUSCLES: readonly MuscleId[] = ['chest', 'frontDelts', 'sideDelts', 'triceps'];
export const PULL_MUSCLES: readonly MuscleId[] = [
  'lats',
  'upperBack',
  'traps',
  'rearDelts',
  'biceps',
  'forearms',
];
export const LEG_MUSCLES: readonly MuscleId[] = [
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
];
export const CORE_MUSCLES: readonly MuscleId[] = ['abs', 'obliques', 'lowerBack'];
export const SHOULDER_MUSCLES: readonly MuscleId[] = ['frontDelts', 'sideDelts', 'rearDelts'];

/** Opposing muscles, used for agonist-antagonist supersets. */
export const ANTAGONIST_PAIRS: readonly (readonly [MuscleId, MuscleId])[] = [
  ['quads', 'hamstrings'],
  ['biceps', 'triceps'],
  ['chest', 'upperBack'],
  ['chest', 'lats'],
  ['frontDelts', 'rearDelts'],
  ['abs', 'lowerBack'],
  ['adductors', 'abductors'],
];

export function areAntagonists(a: MuscleId, b: MuscleId): boolean {
  return ANTAGONIST_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Zone the user wants to spare (first-launch questionnaire). */
export type ProtectedZone = 'shoulders' | 'knees' | 'back';

export const PROTECTED_ZONE_MUSCLES: Readonly<Record<ProtectedZone, readonly MuscleId[]>> = {
  shoulders: SHOULDER_MUSCLES,
  knees: ['quads', 'hamstrings'],
  back: ['lowerBack'],
};
