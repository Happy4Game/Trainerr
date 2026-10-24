import type { MuscleId } from '@/domain/muscles';
import type { Equipment, ExerciseKind, PplGroup, RepRange } from '@/domain/types';

/**
 * Hand-written additions to free-exercise-db for the usual gym machines:
 * French name, name printed on the machine, aliases, corrections, and short
 * technique cues. The cues are to be proofread by a coach before release.
 */
export interface CuratedOverride {
  readonly nameFr: string;
  readonly machineName?: string;
  readonly aliases?: readonly string[];
  readonly kind?: ExerciseKind;
  readonly group?: PplGroup;
  readonly equipment?: Equipment;
  readonly primaryMuscles?: readonly MuscleId[];
  readonly secondaryMuscles?: readonly MuscleId[];
  readonly repRange?: RepRange;
  readonly cues: readonly string[];
  readonly cuesSource: string;
}

export interface CustomExercise extends CuratedOverride {
  readonly nameEn: string;
  readonly kind: ExerciseKind;
  readonly group: PplGroup;
  readonly equipment: Equipment;
  readonly primaryMuscles: readonly MuscleId[];
  readonly secondaryMuscles: readonly MuscleId[];
}

/** Bumped whenever this file changes, so that phones re-import the catalog. */
export const CURATED_VERSION = 1;

const FEDB = 'free-exercise-db (adapté)';
const BENCH = 'BarBend, Eric Cressey';

/** Keyed by free-exercise-db id. */
export const CURATED: Readonly<Record<string, CuratedOverride>> = {
  Dumbbell_Bench_Press: {
    nameFr: 'Développé couché haltères',
    aliases: ['DC haltères', 'développé couché'],
    kind: 'heavyCompound',
    cues: [
      'Coudes à environ 45° du corps, pas à l’horizontale',
      'Omoplates serrées et basses, pieds bien à plat',
      'Descendre les haltères jusqu’à hauteur de poitrine, sous contrôle',
    ],
    cuesSource: BENCH,
  },
  'Barbell_Bench_Press_-_Medium_Grip': {
    nameFr: 'Développé couché barre',
    aliases: ['DC barre', 'bench press'],
    kind: 'heavyCompound',
    cues: [
      'Coudes à environ 45° du corps',
      'Omoplates serrées, fesses et pieds en contact',
      'Barre au bas des pectoraux, trajectoire contrôlée',
    ],
    cuesSource: BENCH,
  },
  Leverage_Chest_Press: {
    nameFr: 'Développé couché machine',
    machineName: 'Chest Press',
    aliases: ['presse pectoraux'],
    cues: [
      'Régler le siège : poignées à hauteur du milieu de la poitrine',
      'Dos et omoplates collés au dossier',
      'Pousser sans verrouiller les coudes, revenir lentement',
    ],
    cuesSource: FEDB,
  },
  Butterfly: {
    nameFr: 'Écarté à la machine',
    machineName: 'Pec Fly',
    aliases: ['pec deck', 'butterfly', 'pec fly'],
    group: 'push',
    secondaryMuscles: ['frontDelts'],
    cues: [
      'Bras parallèles au sol, coudes légèrement fléchis et fixes',
      'Rapprocher les poignées en serrant les pectoraux',
      'Revenir lentement sans dépasser la ligne des épaules',
    ],
    cuesSource: FEDB,
  },
  Machine_Shoulder_Military_Press: {
    nameFr: 'Développé épaules machine',
    machineName: 'Shoulder Press',
    aliases: ['shoulder press', 'développé militaire machine'],
    secondaryMuscles: ['sideDelts', 'triceps'],
    cues: [
      'Dos bien calé contre le dossier, sans cambrer',
      'Poignées à hauteur des épaules au départ',
      'Pousser jusqu’en haut sans verrouiller les coudes',
    ],
    cuesSource: FEDB,
  },
  Dumbbell_Shoulder_Press: {
    nameFr: 'Développé épaules haltères',
    aliases: ['développé militaire haltères'],
    cues: [
      'Assis, dos contre le dossier, abdos serrés',
      'Haltères à hauteur d’oreilles au départ',
      'Pousser au-dessus de la tête sans cogner les haltères',
    ],
    cuesSource: FEDB,
  },
  Side_Lateral_Raise: {
    nameFr: 'Élévations latérales haltères',
    aliases: ['lateral raise', 'élévations latérales'],
    cues: [
      'Coudes légèrement fléchis, buste droit',
      'Monter les bras sur le côté jusqu’à hauteur d’épaules, pas plus',
      'Descendre lentement, sans élan',
    ],
    cuesSource: FEDB,
  },
  Triceps_Pushdown: {
    nameFr: 'Extension triceps à la poulie',
    machineName: 'Triceps Pushdown',
    aliases: ['poulie haute', 'pushdown', 'extension triceps'],
    cues: [
      'Coudes collés au corps, immobiles',
      'Pousser la barre jusqu’aux cuisses, bras tendus',
      'Remonter lentement jusqu’à l’angle droit',
    ],
    cuesSource: FEDB,
  },
  'Triceps_Pushdown_-_Rope_Attachment': {
    nameFr: 'Extension triceps à la corde',
    aliases: ['poulie haute corde'],
    cues: [
      'Coudes collés au corps, immobiles',
      'En bas, écarter les deux bouts de la corde',
      'Remonter lentement jusqu’à l’angle droit',
    ],
    cuesSource: FEDB,
  },
  'Wide-Grip_Lat_Pulldown': {
    nameFr: 'Tirage vertical',
    machineName: 'Lat Pulldown',
    aliases: ['lat pulldown', 'tirage poitrine', 'tirage nuque'],
    kind: 'heavyCompound',
    cues: [
      'Épaules basses, loin des oreilles',
      'Tirer les coudes vers les hanches',
      'Barre jusqu’en haut de la poitrine, buste légèrement incliné',
    ],
    cuesSource: 'Suivi avec Claude (octobre 2026), free-exercise-db',
  },
  Seated_Cable_Rows: {
    nameFr: 'Tirage horizontal assis',
    machineName: 'Seated Row',
    aliases: ['seated row', 'rowing assis'],
    primaryMuscles: ['upperBack', 'lats'],
    secondaryMuscles: ['biceps', 'rearDelts'],
    cues: [
      'Dos droit, poitrine sortie, genoux légèrement fléchis',
      'Tirer les coudes vers l’arrière en serrant les omoplates',
      'Revenir lentement, bras tendus, sans arrondir le dos',
    ],
    cuesSource: FEDB,
  },
  Reverse_Machine_Flyes: {
    nameFr: 'Oiseau à la machine',
    machineName: 'Rear Delt',
    aliases: ['rear delt', 'reverse fly', 'oiseau'],
    secondaryMuscles: ['upperBack'],
    cues: [
      'Poignées à hauteur d’épaules, poitrine contre le coussin',
      'Bras légèrement fléchis, ouvrir en arc de cercle vers l’arrière',
      'Le mouvement vient de l’épaule, pas du dos',
    ],
    cuesSource: FEDB,
  },
  Face_Pull: {
    nameFr: 'Face pull',
    aliases: ['tirage visage'],
    cues: [
      'Corde à hauteur du visage, bras tendus au départ',
      'Tirer vers le front en écartant les mains',
      'Coudes hauts, omoplates serrées en fin de mouvement',
    ],
    cuesSource: FEDB,
  },
  Dumbbell_Bicep_Curl: {
    nameFr: 'Curl biceps haltères',
    aliases: ['curl', 'curl haltères'],
    cues: [
      'Coudes collés au corps, immobiles',
      'Monter sans balancer le buste',
      'Descendre lentement jusqu’aux bras presque tendus',
    ],
    cuesSource: FEDB,
  },
  Hammer_Curls: {
    nameFr: 'Curl marteau',
    aliases: ['hammer curl'],
    cues: [
      'Paumes face à face pendant tout le mouvement',
      'Coudes fixes le long du corps',
      'Descendre lentement, sans élan',
    ],
    cuesSource: FEDB,
  },
  Pullups: {
    nameFr: 'Tractions',
    aliases: ['pull-up'],
    kind: 'heavyCompound',
    cues: [
      'Partir bras tendus, épaules engagées vers le bas',
      'Tirer la poitrine vers la barre, coudes vers les hanches',
      'Redescendre sous contrôle jusqu’en bas',
    ],
    cuesSource: FEDB,
  },
  Leg_Press: {
    nameFr: 'Presse à cuisses',
    machineName: 'Leg Press',
    aliases: ['leg press', 'presse'],
    kind: 'heavyCompound',
    cues: [
      'Pieds à largeur d’épaules au milieu de la plateforme',
      'Descendre sans décoller le bas du dos du dossier',
      'Pousser sans verrouiller les genoux en haut',
    ],
    cuesSource: FEDB,
  },
  Barbell_Squat: {
    nameFr: 'Squat barre',
    aliases: ['squat'],
    kind: 'heavyCompound',
    cues: [
      'Barre sur le haut du dos, pieds à largeur d’épaules',
      'Genoux dans l’axe des pieds en descendant',
      'Dos neutre, pousser dans le sol pour remonter',
    ],
    cuesSource: FEDB,
  },
  Hack_Squat: {
    nameFr: 'Hack squat',
    machineName: 'Hack Squat',
    cues: [
      'Dos et épaules collés aux coussins',
      'Pieds à largeur d’épaules, genoux dans l’axe des pieds',
      'Descendre sous contrôle, pousser sans verrouiller les genoux',
    ],
    cuesSource: FEDB,
  },
  Leg_Extensions: {
    nameFr: 'Extension des jambes',
    machineName: 'Leg Extension',
    aliases: ['leg extension', 'leg ext'],
    // Fourchette des séances réelles, voir docs/adr/0004.
    repRange: { min: 8, max: 10 },
    cues: [
      'Coussin juste au-dessus des chevilles, genoux à l’angle droit',
      'Tendre les jambes avec les quadriceps, marquer une seconde',
      'Redescendre lentement sans dépasser l’angle droit',
    ],
    cuesSource: FEDB,
  },
  Lying_Leg_Curls: {
    nameFr: 'Leg curl allongé',
    machineName: 'Leg Curl',
    aliases: ['leg curl', 'ischios allongé'],
    cues: [
      'Coussin juste au-dessus des talons, hanches collées au banc',
      'Ramener les talons vers les fesses sans décoller le bassin',
      'Redescendre lentement',
    ],
    cuesSource: FEDB,
  },
  Seated_Leg_Curl: {
    nameFr: 'Leg curl assis',
    machineName: 'Seated Leg Curl',
    aliases: ['leg curl', 'ischios assis'],
    cues: [
      'Genoux alignés avec l’axe de la machine',
      'Ramener les talons sous le siège',
      'Remonter lentement sans verrouiller les genoux',
    ],
    cuesSource: FEDB,
  },
  Thigh_Abductor: {
    nameFr: 'Abduction de hanche',
    machineName: 'Hip Abduction',
    aliases: ['abducteurs', 'hip abduction'],
    cues: [
      'Dos contre le dossier, bassin immobile',
      'Écarter les jambes sous contrôle',
      'Revenir lentement sans laisser claquer les plaques',
    ],
    cuesSource: FEDB,
  },
  Thigh_Adductor: {
    nameFr: 'Adduction de hanche',
    machineName: 'Hip Adduction',
    aliases: ['adducteurs', 'hip adduction'],
    cues: [
      'Dos contre le dossier, bassin immobile',
      'Serrer les jambes sous contrôle',
      'Revenir lentement jusqu’à l’écart de départ',
    ],
    cuesSource: FEDB,
  },
  Hyperextensions_Back_Extensions: {
    nameFr: 'Extension lombaire',
    machineName: 'Back Extension',
    aliases: ['back extension', 'hyperextension', 'lombaires'],
    equipment: 'bodyweight',
    group: 'core',
    kind: 'isolation',
    cues: [
      'Bassin calé sur le coussin, chevilles bloquées',
      'Descendre dos droit, puis remonter jusqu’à l’alignement',
      'Ne pas cambrer au-delà de la ligne du corps',
    ],
    cuesSource: FEDB,
  },
  Seated_Calf_Raise: {
    nameFr: 'Mollets assis',
    machineName: 'Seated Calf Raise',
    cues: [
      'Avant des pieds sur la marche, talons dans le vide',
      'Monter le plus haut possible, marquer une seconde',
      'Descendre lentement pour étirer le mollet',
    ],
    cuesSource: FEDB,
  },
  Standing_Calf_Raises: {
    nameFr: 'Mollets debout',
    machineName: 'Standing Calf Raise',
    cues: [
      'Avant des pieds sur la marche, jambes tendues',
      'Monter le plus haut possible, marquer une seconde',
      'Descendre lentement pour étirer le mollet',
    ],
    cuesSource: FEDB,
  },
  Ab_Crunch_Machine: {
    nameFr: 'Crunch à la machine',
    machineName: 'Ab Crunch',
    aliases: ['abdos machine'],
    group: 'core',
    cues: [
      'Enrouler le buste en rapprochant les côtes du bassin',
      'Expirer en descendant, sans tirer avec les bras',
      'Revenir lentement',
    ],
    cuesSource: FEDB,
  },
  Plank: {
    nameFr: 'Gainage planche',
    aliases: ['planche', 'gainage'],
    group: 'core',
    cues: [
      'Coudes sous les épaules, corps aligné de la tête aux talons',
      'Serrer abdos et fessiers, ne pas creuser le dos',
      'Respirer normalement pendant tout le maintien',
    ],
    cuesSource: FEDB,
  },
};

/** Machines of the gym missing from free-exercise-db. */
export const CUSTOM_EXERCISES: Readonly<Record<string, CustomExercise>> = {
  'trainerr:diverging-seated-row': {
    nameFr: 'Tirage horizontal divergent',
    nameEn: 'Diverging Seated Row',
    machineName: 'Diverging Seated Row',
    aliases: ['diverging row', 'rowing divergent'],
    kind: 'machineCompound',
    group: 'pull',
    equipment: 'machine',
    primaryMuscles: ['upperBack'],
    secondaryMuscles: ['lats', 'biceps', 'rearDelts'],
    cues: [
      'Poitrine contre le coussin, poignées à hauteur du bas de la poitrine',
      'Tirer les coudes vers l’arrière en serrant les omoplates',
      'Revenir lentement, bras tendus',
    ],
    cuesSource: 'Trainerr, à relire par un coach',
  },
  'trainerr:machine-lateral-raise': {
    nameFr: 'Élévations latérales machine',
    nameEn: 'Machine Lateral Raise',
    machineName: 'Lateral Raise',
    aliases: ['lateral raise', 'élévations latérales'],
    kind: 'isolation',
    group: 'push',
    equipment: 'machine',
    primaryMuscles: ['sideDelts'],
    secondaryMuscles: ['traps'],
    cues: [
      'Épaules alignées avec l’axe de la machine',
      'Monter les coudes sur le côté jusqu’à hauteur d’épaules',
      'Descendre lentement, sans hausser les épaules',
    ],
    cuesSource: 'Trainerr, à relire par un coach',
  },
};
