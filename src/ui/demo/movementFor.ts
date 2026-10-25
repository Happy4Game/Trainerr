import type { MuscleId } from '@/domain/muscles';
import type { Exercise } from '@/domain/types';
import type { MovementId } from './movements';

/** Ordered rules on the English name: the first match wins. */
const NAME_RULES: readonly [RegExp, MovementId][] = [
  [/hack squat|leg press/, 'legPress'],
  [/leg extension/, 'legExtension'],
  [/seated leg curl/, 'seatedLegCurl'],
  [/leg curl/, 'lyingLegCurl'],
  [/abduct/, 'hipAbduction'],
  [/adduct/, 'hipAdduction'],
  [/calf|calves/, 'calfRaise'],
  [/pull-?down|pull down|pullover/, 'pulldown'],
  [/pull-?up|chin-?up/, 'pullup'],
  [/upright row|shrug/, 'shrug'],
  [/face pull|row/, 'row'],
  [/(reverse|rear).*(fly|flye|raise|lateral)|rear delt/, 'rearFly'],
  [/fly|flye|butterfly|cross-?over/, 'fly'],
  [/lateral raise|side lateral|laterals/, 'lateralRaise'],
  [/front raise/, 'frontRaise'],
  [/push-?down|kickback/, 'pushdown'],
  [/curl/, 'curl'],
  [/overhead.*extension|triceps extension|skull|french press/, 'overheadExtension'],
  [/lunge|split squat|step-?up/, 'lunge'],
  [/squat/, 'squat'],
  [/deadlift|good morning|romanian|stiff/, 'hinge'],
  [/hyperextension|back extension/, 'backExtension'],
  [/hip thrust|bridge/, 'hipThrust'],
  [/crunch|sit-?up|leg raise|knee raise/, 'crunch'],
  [/plank/, 'plank'],
  [/dip/, 'dip'],
  [/push-?up/, 'pushup'],
  [/shoulder press|military|overhead press|arnold|push press/, 'shoulderPress'],
  [/incline.*press/, 'inclinePress'],
  [/bench press|floor press/, 'benchPress'],
];

/** Typical movement of the main muscle, when the name says nothing. */
const MUSCLE_FALLBACK: Readonly<Record<MuscleId, MovementId>> = {
  chest: 'benchPress',
  frontDelts: 'shoulderPress',
  sideDelts: 'lateralRaise',
  rearDelts: 'rearFly',
  triceps: 'pushdown',
  biceps: 'curl',
  forearms: 'curl',
  lats: 'pulldown',
  upperBack: 'row',
  traps: 'shrug',
  lowerBack: 'backExtension',
  abs: 'crunch',
  obliques: 'crunch',
  glutes: 'hipThrust',
  quads: 'squat',
  hamstrings: 'hinge',
  adductors: 'hipAdduction',
  abductors: 'hipAbduction',
  calves: 'calfRaise',
};

/** Chest presses on machines and cables are done seated, pushing forward. */
function pressFor(exercise: Exercise): MovementId {
  if (exercise.equipment === 'machine' || exercise.equipment === 'cable') return 'chestPress';
  return 'benchPress';
}

export function movementFor(exercise: Exercise & { readonly nameEn: string }): {
  id: MovementId;
  approximate: boolean;
} {
  const name = exercise.nameEn.toLowerCase();
  const rule = NAME_RULES.find(([pattern]) => pattern.test(name));
  if (rule) {
    const id = rule[1] === 'benchPress' ? pressFor(exercise) : rule[1];
    return { id, approximate: false };
  }
  if (/press/.test(name) && exercise.primaryMuscles[0] === 'chest') {
    return { id: pressFor(exercise), approximate: false };
  }
  const main = exercise.primaryMuscles[0] ?? 'chest';
  return { id: MUSCLE_FALLBACK[main], approximate: true };
}
