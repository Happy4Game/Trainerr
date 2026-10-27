/**
 * "Bien débuter" cards (SPEC.md). Texts live in the translation files
 * (`tips.<id>.title` / `.body`). A card marked `toSource` must receive a
 * verified source before the app is released.
 */
export interface Tip {
  readonly id: string;
  readonly theme:
    | 'technique'
    | 'effort'
    | 'progression'
    | 'programme'
    | 'nutrition'
    | 'recovery'
    | 'health'
    | 'motivation'
    | 'etiquette';
  readonly sourceIds: readonly string[];
  readonly status: 'sourced' | 'toSource' | 'coachReview' | 'internal' | 'none';
}

export const TIPS: readonly Tip[] = [
  { id: 'completeReps', theme: 'technique', sourceIds: [], status: 'coachReview' },
  { id: 'warmup', theme: 'technique', sourceIds: [], status: 'coachReview' },
  { id: 'benchElbows', theme: 'technique', sourceIds: ['barbend', 'cressey'], status: 'sourced' },
  { id: 'repsInReserve', theme: 'effort', sourceIds: [], status: 'toSource' },
  { id: 'progression', theme: 'progression', sourceIds: [], status: 'internal' },
  { id: 'frequency', theme: 'programme', sourceIds: ['schoenfeld2016', 'sbs'], status: 'sourced' },
  { id: 'machines', theme: 'programme', sourceIds: ['haugen2023'], status: 'sourced' },
  {
    id: 'cardioOrder',
    theme: 'programme',
    sourceIds: ['eddens2018', 'schumann2022'],
    status: 'sourced',
  },
  { id: 'cardioAmount', theme: 'health', sourceIds: ['who2020'], status: 'sourced' },
  { id: 'cardioIntensity', theme: 'health', sourceIds: ['cdcIntensity'], status: 'sourced' },
  { id: 'protein', theme: 'nutrition', sourceIds: ['morton2018'], status: 'sourced' },
  { id: 'collagen', theme: 'nutrition', sourceIds: ['collagen'], status: 'sourced' },
  { id: 'soreness', theme: 'recovery', sourceIds: [], status: 'toSource' },
  { id: 'sleep', theme: 'recovery', sourceIds: [], status: 'toSource' },
  { id: 'kneeCracking', theme: 'health', sourceIds: ['bjsm2024'], status: 'sourced' },
  { id: 'photo', theme: 'motivation', sourceIds: [], status: 'none' },
  { id: 'etiquette', theme: 'etiquette', sourceIds: [], status: 'none' },
];
