import type { Exercise } from '@/domain/types';
import { uniformSteps } from '@/domain/loadSteps';

/** Thibaut's usual machines, as used in the October 2026 sessions. */
export const ex = {
  dbBench: {
    id: 'db-bench',
    kind: 'heavyCompound',
    group: 'push',
    equipment: 'dumbbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['frontDelts', 'triceps'],
  },
  shoulderPress: {
    id: 'shoulder-press',
    kind: 'machineCompound',
    group: 'push',
    equipment: 'machine',
    primaryMuscles: ['frontDelts'],
    secondaryMuscles: ['sideDelts', 'triceps'],
  },
  chestPress: {
    id: 'chest-press',
    kind: 'machineCompound',
    group: 'push',
    equipment: 'machine',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['frontDelts', 'triceps'],
  },
  pecFly: {
    id: 'pec-fly',
    kind: 'isolation',
    group: 'push',
    equipment: 'machine',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['frontDelts'],
  },
  lateralRaise: {
    id: 'lateral-raise',
    kind: 'isolation',
    group: 'push',
    equipment: 'machine',
    primaryMuscles: ['sideDelts'],
    secondaryMuscles: [],
  },
  dumbbellLateralRaise: {
    id: 'db-lateral-raise',
    kind: 'isolation',
    group: 'push',
    equipment: 'dumbbell',
    primaryMuscles: ['sideDelts'],
    secondaryMuscles: [],
  },
  tricepsPushdown: {
    id: 'triceps-pushdown',
    kind: 'isolation',
    group: 'push',
    equipment: 'cable',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
  },
  cableFly: {
    id: 'cable-fly',
    kind: 'isolation',
    group: 'push',
    equipment: 'cable',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['frontDelts'],
  },
  latPulldown: {
    id: 'lat-pulldown',
    kind: 'heavyCompound',
    group: 'pull',
    equipment: 'machine',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'upperBack'],
  },
  seatedRow: {
    id: 'seated-row',
    kind: 'machineCompound',
    group: 'pull',
    equipment: 'machine',
    primaryMuscles: ['upperBack', 'lats'],
    secondaryMuscles: ['biceps', 'rearDelts'],
  },
  divergingSeatedRow: {
    id: 'diverging-seated-row',
    kind: 'machineCompound',
    group: 'pull',
    equipment: 'machine',
    primaryMuscles: ['upperBack'],
    secondaryMuscles: ['lats', 'biceps', 'rearDelts'],
  },
  rearDelt: {
    id: 'rear-delt',
    kind: 'isolation',
    group: 'pull',
    equipment: 'machine',
    primaryMuscles: ['rearDelts'],
    secondaryMuscles: ['upperBack'],
  },
  curl: {
    id: 'curl',
    kind: 'isolation',
    group: 'pull',
    equipment: 'dumbbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
  },
  cableRow: {
    id: 'cable-row',
    kind: 'machineCompound',
    group: 'pull',
    equipment: 'cable',
    primaryMuscles: ['upperBack', 'lats'],
    secondaryMuscles: ['biceps'],
  },
  legPress: {
    id: 'leg-press',
    kind: 'heavyCompound',
    group: 'legs',
    equipment: 'machine',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
  },
  legExtension: {
    id: 'leg-extension',
    kind: 'isolation',
    group: 'legs',
    equipment: 'machine',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    // Range used in the real sessions (8-10), see the golden cases.
    repRange: { min: 8, max: 10 },
  },
  legCurl: {
    id: 'leg-curl',
    kind: 'isolation',
    group: 'legs',
    equipment: 'machine',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['calves'],
  },
  hipAbduction: {
    id: 'hip-abduction',
    kind: 'isolation',
    group: 'legs',
    equipment: 'machine',
    primaryMuscles: ['abductors'],
    secondaryMuscles: ['glutes'],
  },
  backExtension: {
    id: 'back-extension',
    kind: 'isolation',
    group: 'core',
    equipment: 'bodyweight',
    primaryMuscles: ['lowerBack'],
    secondaryMuscles: ['glutes', 'hamstrings'],
  },
} as const satisfies Record<string, Exercise>;

export const allExercises: readonly Exercise[] = Object.values(ex);

/** Weight stack of the selectorized machines at Thibaut's gym. */
export const stackSteps = [25, 32, 39, 45, 52, 59, 66, 73, 79, 86];
export const dumbbellSteps = uniformSteps(2, 40, 2);
export const legPressSteps = [80, 85, 90, 95, 100, 107, 110, 117, 120, 127, 130];
