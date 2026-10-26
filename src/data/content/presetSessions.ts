import type { PresetModel, PresetSession } from '@/domain/presets';

/** Leg session, also the lower day of Upper / Lower. */
const LEGS: PresetSession = {
  id: 'legs',
  exercises: [
    {
      exerciseId: 'Barbell_Squat',
      alternatives: ['Leg_Press', 'Hack_Squat'],
      sets: 4,
      reps: { min: 5, max: 8 },
      restSeconds: 180,
      role: 'mainCompound',
      why: 'squatFirst',
    },
    {
      exerciseId: 'Romanian_Deadlift',
      sets: 3,
      reps: { min: 8, max: 10 },
      restSeconds: 150,
      role: 'mainCompound',
      why: 'rdlSecond',
    },
    {
      exerciseId: 'Dumbbell_Lunges',
      alternatives: ['Barbell_Walking_Lunge'],
      sets: 3,
      reps: { min: 10, max: 10 },
      perSide: true,
      restSeconds: 120,
      role: 'secondaryCompound',
      why: 'lungesThird',
    },
    {
      exerciseId: 'Leg_Extensions',
      sets: 3,
      reps: { min: 12, max: 15 },
      restSeconds: 75,
      role: 'isolation',
      why: 'legExtensionAfterSquat',
    },
    {
      exerciseId: 'Lying_Leg_Curls',
      alternatives: ['Seated_Leg_Curl'],
      sets: 3,
      reps: { min: 12, max: 15 },
      restSeconds: 75,
      role: 'isolation',
      why: 'legCurlAfterRdl',
    },
    {
      exerciseId: 'Standing_Calf_Raises',
      alternatives: ['Seated_Calf_Raise'],
      sets: 3,
      reps: { min: 12, max: 15 },
      restSeconds: 60,
      role: 'isolation',
      why: 'calvesLast',
    },
  ],
};

/**
 * Ready-made sessions, in the recommended order: heavy compound → secondary
 * compound → isolation (ACSM 2009, Simão 2012, Nunes 2021, see sources.ts).
 * Sets, reps and rests to be proofread by a coach.
 */
export const PRESET_MODELS: readonly PresetModel[] = [
  {
    id: 'push',
    sessions: [
      {
        id: 'push',
        exercises: [
          {
            exerciseId: 'Barbell_Bench_Press_-_Medium_Grip',
            alternatives: ['Dumbbell_Bench_Press', 'Leverage_Chest_Press'],
            sets: 4,
            reps: { min: 6, max: 8 },
            restSeconds: 150,
            role: 'mainCompound',
            why: 'benchFirst',
          },
          {
            exerciseId: 'Incline_Dumbbell_Press',
            sets: 3,
            reps: { min: 8, max: 10 },
            restSeconds: 120,
            role: 'secondaryCompound',
            why: 'inclineSecond',
          },
          {
            exerciseId: 'Machine_Shoulder_Military_Press',
            alternatives: ['Dumbbell_Shoulder_Press'],
            sets: 3,
            reps: { min: 8, max: 10 },
            restSeconds: 120,
            role: 'secondaryCompound',
            why: 'shoulderPressAfterChest',
          },
          {
            exerciseId: 'Side_Lateral_Raise',
            alternatives: ['trainerr:machine-lateral-raise'],
            sets: 3,
            reps: { min: 12, max: 15 },
            restSeconds: 75,
            role: 'isolation',
            why: 'lateralRaiseAfterPress',
          },
          {
            exerciseId: 'Triceps_Pushdown',
            alternatives: ['Triceps_Pushdown_-_Rope_Attachment'],
            sets: 3,
            reps: { min: 10, max: 12 },
            restSeconds: 75,
            role: 'isolation',
            why: 'tricepsLast',
          },
        ],
      },
    ],
  },
  {
    id: 'pull',
    sessions: [
      {
        id: 'pull',
        exercises: [
          {
            exerciseId: 'Pullups',
            alternatives: ['trainerr:assisted-pullup', 'Wide-Grip_Lat_Pulldown'],
            sets: 4,
            reps: { min: 6, max: 8 },
            restSeconds: 150,
            role: 'mainCompound',
            why: 'pullupsFirst',
          },
          {
            exerciseId: 'Bent_Over_Barbell_Row',
            alternatives: ['Leverage_Iso_Row', 'trainerr:diverging-seated-row'],
            sets: 3,
            reps: { min: 8, max: 10 },
            restSeconds: 120,
            role: 'mainCompound',
            why: 'rowSecond',
          },
          {
            exerciseId: 'Seated_Cable_Rows',
            sets: 3,
            reps: { min: 10, max: 12 },
            restSeconds: 90,
            role: 'secondaryCompound',
            why: 'cableRowThird',
          },
          {
            exerciseId: 'Face_Pull',
            alternatives: ['Reverse_Machine_Flyes'],
            sets: 3,
            reps: { min: 12, max: 15 },
            restSeconds: 60,
            role: 'isolation',
            why: 'facePullAfterRows',
          },
          {
            exerciseId: 'Dumbbell_Bicep_Curl',
            alternatives: ['Hammer_Curls'],
            sets: 3,
            reps: { min: 10, max: 12 },
            restSeconds: 75,
            role: 'isolation',
            why: 'curlLast',
          },
        ],
      },
    ],
  },
  { id: 'legs', sessions: [LEGS] },
  {
    id: 'fullBodyBeginner',
    sessions: [
      {
        id: 'fullBodyBeginner',
        exercises: [
          {
            exerciseId: 'Leg_Press',
            sets: 3,
            reps: { min: 10, max: 10 },
            restSeconds: 120,
            role: 'mainCompound',
            why: 'beginnerLegPress',
          },
          {
            exerciseId: 'Leverage_Chest_Press',
            sets: 3,
            reps: { min: 10, max: 10 },
            restSeconds: 120,
            role: 'mainCompound',
            why: 'beginnerChestPress',
          },
          {
            exerciseId: 'Wide-Grip_Lat_Pulldown',
            sets: 3,
            reps: { min: 10, max: 10 },
            restSeconds: 120,
            role: 'mainCompound',
            why: 'beginnerPulldown',
          },
          {
            exerciseId: 'Leverage_Iso_Row',
            alternatives: ['Seated_Cable_Rows', 'trainerr:diverging-seated-row'],
            sets: 3,
            reps: { min: 10, max: 10 },
            restSeconds: 90,
            role: 'secondaryCompound',
            why: 'beginnerRow',
          },
          {
            exerciseId: 'Plank',
            sets: 3,
            reps: { min: 30, max: 30 },
            timed: true,
            restSeconds: 60,
            role: 'isolation',
            why: 'plankLast',
          },
        ],
      },
    ],
  },
  {
    id: 'upperLower',
    sessions: [
      {
        id: 'upper',
        exercises: [
          {
            exerciseId: 'Barbell_Bench_Press_-_Medium_Grip',
            alternatives: ['Dumbbell_Bench_Press', 'Leverage_Chest_Press'],
            sets: 4,
            reps: { min: 6, max: 8 },
            restSeconds: 150,
            role: 'mainCompound',
            why: 'upperBench',
          },
          {
            exerciseId: 'Bent_Over_Barbell_Row',
            alternatives: ['Leverage_Iso_Row', 'trainerr:diverging-seated-row'],
            sets: 4,
            reps: { min: 6, max: 8 },
            restSeconds: 150,
            role: 'mainCompound',
            why: 'upperRow',
          },
          {
            exerciseId: 'Machine_Shoulder_Military_Press',
            alternatives: ['Dumbbell_Shoulder_Press'],
            sets: 3,
            reps: { min: 8, max: 10 },
            restSeconds: 120,
            role: 'secondaryCompound',
            why: 'upperShoulderPress',
          },
          {
            exerciseId: 'Wide-Grip_Lat_Pulldown',
            alternatives: ['trainerr:assisted-pullup'],
            sets: 3,
            reps: { min: 8, max: 10 },
            restSeconds: 120,
            role: 'secondaryCompound',
            why: 'upperPulldown',
          },
          {
            exerciseId: 'Dumbbell_Bicep_Curl',
            alternatives: ['Hammer_Curls'],
            sets: 3,
            reps: { min: 10, max: 12 },
            restSeconds: 75,
            role: 'isolation',
            why: 'upperCurl',
          },
          {
            exerciseId: 'Triceps_Pushdown',
            alternatives: ['Triceps_Pushdown_-_Rope_Attachment'],
            sets: 3,
            reps: { min: 10, max: 12 },
            restSeconds: 75,
            role: 'isolation',
            why: 'upperTriceps',
          },
        ],
      },
      // The lower day is the leg session.
      { ...LEGS, id: 'lower' },
    ],
  },
];

export function presetSession(id: string): PresetSession | undefined {
  return PRESET_MODELS.flatMap((m) => m.sessions).find((s) => s.id === id);
}
