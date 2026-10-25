import type { Point, Pose } from './skeleton';

/** Fixed equipment drawn around the figure. */
export type Prop =
  | { readonly kind: 'floor'; readonly y: number }
  | { readonly kind: 'bench'; readonly x: number; readonly y: number; readonly width: number }
  | { readonly kind: 'seat'; readonly x: number; readonly y: number; readonly back: number }
  | { readonly kind: 'pulley'; readonly at: Point }
  | { readonly kind: 'bar'; readonly y: number; readonly x1: number; readonly x2: number }
  | { readonly kind: 'pad'; readonly on: 'ankle' | 'hip' | 'toe' }
  | { readonly kind: 'platform' };

export interface Movement {
  readonly id: MovementId;
  readonly view: 'side' | 'front';
  readonly props: readonly Prop[];
  readonly start: Pose;
  readonly end: Pose;
  /** Where the load (bar, dumbbells, handle) is held. */
  readonly load: 'hand' | 'none';
  readonly cycleMs?: number;
}

export type MovementId =
  | 'benchPress'
  | 'inclinePress'
  | 'shoulderPress'
  | 'chestPress'
  | 'fly'
  | 'pulldown'
  | 'row'
  | 'pullup'
  | 'curl'
  | 'pushdown'
  | 'overheadExtension'
  | 'lateralRaise'
  | 'frontRaise'
  | 'rearFly'
  | 'squat'
  | 'legPress'
  | 'legExtension'
  | 'lyingLegCurl'
  | 'seatedLegCurl'
  | 'hipAbduction'
  | 'hipAdduction'
  | 'calfRaise'
  | 'crunch'
  | 'plank'
  | 'backExtension'
  | 'hinge'
  | 'dip'
  | 'pushup'
  | 'shrug'
  | 'hipThrust'
  | 'lunge';

const FLOOR = { kind: 'floor', y: 160 } as const;
const STAND: Pose = {
  hip: [100, 92],
  torso: 0,
  hand: [104, 100],
  foot: [100, 158],
  elbow: 1,
  knee: -1,
};
const SIT: Pose = {
  hip: [92, 104],
  torso: -4,
  hand: [104, 90],
  foot: [124, 158],
  elbow: -1,
  knee: -1,
};
const SEAT = { kind: 'seat', x: 92, y: 108, back: -4 } as const;
const LYING: Pose = {
  hip: [70, 110],
  torso: 90,
  hand: [110, 94],
  foot: [44, 158],
  elbow: -1,
  knee: 1,
};
const BENCH = { kind: 'bench', x: 40, y: 116, width: 110 } as const;

export const MOVEMENTS: Readonly<Record<MovementId, Movement>> = {
  benchPress: {
    id: 'benchPress',
    view: 'side',
    props: [FLOOR, BENCH],
    start: { ...LYING, hand: [108, 92] },
    end: { ...LYING, hand: [114, 60] },
    load: 'hand',
  },
  inclinePress: {
    id: 'inclinePress',
    view: 'side',
    props: [FLOOR, { kind: 'seat', x: 82, y: 116, back: -40 }],
    start: { hip: [82, 112], torso: -40, hand: [74, 58], foot: [126, 158], elbow: -1, knee: -1 },
    end: { hip: [82, 112], torso: -40, hand: [86, 22], foot: [126, 158], elbow: -1, knee: -1 },
    load: 'hand',
  },
  shoulderPress: {
    id: 'shoulderPress',
    view: 'side',
    props: [FLOOR, SEAT],
    start: { ...SIT, hand: [6, 0], handFromShoulder: true, elbow: 1 },
    end: { ...SIT, hand: [2, -52], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  chestPress: {
    id: 'chestPress',
    view: 'side',
    props: [FLOOR, SEAT],
    start: { ...SIT, hand: [14, 6], handFromShoulder: true, elbow: 1 },
    end: { ...SIT, hand: [52, 6], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  fly: {
    id: 'fly',
    view: 'side',
    props: [FLOOR, SEAT],
    start: { ...SIT, hand: [-8, -4], handFromShoulder: true, elbow: -1 },
    end: { ...SIT, hand: [46, -2], handFromShoulder: true, elbow: -1 },
    load: 'hand',
  },
  pulldown: {
    id: 'pulldown',
    view: 'side',
    props: [FLOOR, { kind: 'seat', x: 92, y: 108, back: -90 }, { kind: 'pulley', at: [104, 2] }],
    start: { ...SIT, torso: -12, hand: [8, -52], handFromShoulder: true, elbow: 1 },
    end: { ...SIT, torso: -18, hand: [12, 4], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  row: {
    id: 'row',
    view: 'side',
    props: [FLOOR, { kind: 'seat', x: 80, y: 128, back: -90 }, { kind: 'pulley', at: [192, 116] }],
    start: { hip: [80, 124], torso: 14, hand: [150, 98], foot: [146, 140], elbow: -1, knee: -1 },
    end: { hip: [80, 124], torso: -4, hand: [96, 96], foot: [146, 140], elbow: -1, knee: -1 },
    load: 'hand',
  },
  pullup: {
    id: 'pullup',
    view: 'side',
    props: [{ kind: 'bar', y: 10, x1: 70, x2: 130 }],
    start: { hip: [100, 118], torso: 0, hand: [100, 12], foot: [96, 166], elbow: 1, knee: -1 },
    end: { hip: [100, 82], torso: 0, hand: [100, 12], foot: [96, 132], elbow: 1, knee: -1 },
    load: 'none',
  },
  curl: {
    id: 'curl',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, hand: [6, 52], handFromShoulder: true },
    end: { ...STAND, hand: [18, 4], handFromShoulder: true },
    load: 'hand',
  },
  pushdown: {
    id: 'pushdown',
    view: 'side',
    props: [FLOOR, { kind: 'pulley', at: [128, 0] }],
    start: { ...STAND, torso: 8, hand: [24, 6], handFromShoulder: true, elbow: 1 },
    end: { ...STAND, torso: 8, hand: [8, 52], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  overheadExtension: {
    id: 'overheadExtension',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, hand: [-14, -20], handFromShoulder: true, elbow: 1 },
    end: { ...STAND, hand: [4, -44], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  lateralRaise: {
    id: 'lateralRaise',
    view: 'front',
    props: [FLOOR],
    start: { ...STAND, hand: [6, 50], handFromShoulder: true, foot: [110, 158], elbow: -1 },
    end: { ...STAND, hand: [50, 2], handFromShoulder: true, foot: [110, 158], elbow: -1 },
    load: 'hand',
  },
  frontRaise: {
    id: 'frontRaise',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, hand: [6, 52], handFromShoulder: true, elbow: 1 },
    end: { ...STAND, hand: [52, -2], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  rearFly: {
    id: 'rearFly',
    view: 'front',
    props: [FLOOR, SEAT],
    start: { ...SIT, torso: 0, hand: [8, 30], handFromShoulder: true, elbow: -1 },
    end: { ...SIT, torso: 0, hand: [50, 4], handFromShoulder: true, elbow: -1 },
    load: 'hand',
  },
  squat: {
    id: 'squat',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, hand: [-6, 6], handFromShoulder: true, elbow: 1 },
    end: { ...STAND, hip: [80, 122], torso: 32, hand: [-6, 6], handFromShoulder: true, elbow: 1 },
    load: 'hand',
  },
  legPress: {
    id: 'legPress',
    view: 'side',
    props: [{ kind: 'seat', x: 74, y: 118, back: -60 }, { kind: 'platform' }],
    start: {
      hip: [74, 114],
      torso: -60,
      hand: [6, 20],
      handFromShoulder: true,
      foot: [102, 86],
      elbow: -1,
      knee: -1,
    },
    end: {
      hip: [74, 114],
      torso: -60,
      hand: [6, 20],
      handFromShoulder: true,
      foot: [134, 70],
      elbow: -1,
      knee: -1,
    },
    load: 'none',
  },
  legExtension: {
    id: 'legExtension',
    view: 'side',
    props: [
      { kind: 'seat', x: 90, y: 108, back: -6 },
      { kind: 'pad', on: 'ankle' },
    ],
    start: {
      ...SIT,
      hip: [90, 104],
      hand: [4, 46],
      handFromShoulder: true,
      foot: [118, 150],
      knee: -1,
    },
    end: {
      ...SIT,
      hip: [90, 104],
      hand: [4, 46],
      handFromShoulder: true,
      foot: [154, 100],
      knee: -1,
    },
    load: 'none',
  },
  lyingLegCurl: {
    id: 'lyingLegCurl',
    view: 'side',
    props: [
      { kind: 'bench', x: 20, y: 120, width: 120 },
      { kind: 'pad', on: 'ankle' },
    ],
    start: {
      hip: [100, 114],
      torso: -90,
      hand: [-10, 20],
      handFromShoulder: true,
      foot: [164, 112],
      elbow: 1,
      knee: 1,
    },
    end: {
      hip: [100, 114],
      torso: -90,
      hand: [-10, 20],
      handFromShoulder: true,
      foot: [124, 80],
      elbow: 1,
      knee: 1,
    },
    load: 'none',
  },
  seatedLegCurl: {
    id: 'seatedLegCurl',
    view: 'side',
    props: [
      { kind: 'seat', x: 90, y: 108, back: -6 },
      { kind: 'pad', on: 'ankle' },
    ],
    start: {
      ...SIT,
      hip: [90, 104],
      hand: [4, 46],
      handFromShoulder: true,
      foot: [154, 102],
      knee: -1,
    },
    end: {
      ...SIT,
      hip: [90, 104],
      hand: [4, 46],
      handFromShoulder: true,
      foot: [114, 150],
      knee: -1,
    },
    load: 'none',
  },
  hipAbduction: {
    id: 'hipAbduction',
    view: 'front',
    props: [FLOOR, SEAT],
    start: { ...SIT, torso: 0, hand: [16, 40], handFromShoulder: true, foot: [114, 156], knee: -1 },
    end: { ...SIT, torso: 0, hand: [16, 40], handFromShoulder: true, foot: [132, 152], knee: -1 },
    load: 'none',
  },
  hipAdduction: {
    id: 'hipAdduction',
    view: 'front',
    props: [FLOOR, SEAT],
    start: { ...SIT, torso: 0, hand: [16, 40], handFromShoulder: true, foot: [132, 152], knee: -1 },
    end: { ...SIT, torso: 0, hand: [16, 40], handFromShoulder: true, foot: [114, 156], knee: -1 },
    load: 'none',
  },
  calfRaise: {
    id: 'calfRaise',
    view: 'side',
    props: [FLOOR],
    // Legs straight; the heels rise while the toes stay on the floor.
    start: {
      ...STAND,
      foot: [100, 156],
      hand: [4, 52],
      handFromShoulder: true,
      footAngle: 90,
    },
    end: {
      ...STAND,
      hip: [100, 84],
      foot: [100, 148],
      hand: [4, 52],
      handFromShoulder: true,
      footAngle: 45,
    },
    load: 'hand',
  },
  crunch: {
    id: 'crunch',
    view: 'side',
    props: [FLOOR],
    start: {
      hip: [96, 150],
      torso: -90,
      hand: [6, -6],
      handFromShoulder: true,
      foot: [134, 158],
      elbow: 1,
      knee: -1,
    },
    end: {
      hip: [96, 150],
      torso: -58,
      hand: [6, -6],
      handFromShoulder: true,
      foot: [134, 158],
      elbow: 1,
      knee: -1,
    },
    load: 'none',
  },
  plank: {
    id: 'plank',
    view: 'side',
    props: [FLOOR],
    start: {
      hip: [104, 134],
      torso: -76,
      hand: [6, 26],
      handFromShoulder: true,
      foot: [164, 158],
      elbow: -1,
      knee: 1,
      footAngle: 170,
    },
    end: {
      hip: [104, 132],
      torso: -76,
      hand: [6, 26],
      handFromShoulder: true,
      foot: [164, 158],
      elbow: -1,
      knee: 1,
      footAngle: 170,
    },
    load: 'none',
    cycleMs: 4000,
  },
  backExtension: {
    id: 'backExtension',
    view: 'side',
    props: [{ kind: 'pad', on: 'hip' }],
    start: {
      hip: [96, 100],
      torso: 150,
      hand: [-8, 8],
      handFromShoulder: true,
      foot: [40, 134],
      elbow: 1,
      knee: 1,
    },
    end: {
      hip: [96, 100],
      torso: 70,
      hand: [-8, 8],
      handFromShoulder: true,
      foot: [40, 134],
      elbow: 1,
      knee: 1,
    },
    load: 'none',
  },
  hinge: {
    id: 'hinge',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, hand: [2, 54], handFromShoulder: true },
    end: { ...STAND, hip: [84, 96], torso: 72, hand: [0, 54], handFromShoulder: true },
    load: 'hand',
  },
  dip: {
    id: 'dip',
    view: 'side',
    props: [{ kind: 'bar', y: 90, x1: 80, x2: 130 }],
    start: { hip: [100, 96], torso: 4, hand: [100, 90], foot: [96, 150], elbow: 1, knee: -1 },
    end: { hip: [100, 120], torso: 18, hand: [100, 90], foot: [92, 166], elbow: 1, knee: -1 },
    load: 'none',
  },
  pushup: {
    id: 'pushup',
    view: 'side',
    props: [FLOOR],
    start: {
      hip: [116, 116],
      torso: -72,
      hand: [72, 158],
      foot: [176, 158],
      elbow: 1,
      knee: 1,
      footAngle: 170,
    },
    end: {
      hip: [116, 140],
      torso: -82,
      hand: [72, 158],
      foot: [176, 158],
      elbow: 1,
      knee: 1,
      footAngle: 170,
    },
    load: 'none',
  },
  shrug: {
    id: 'shrug',
    view: 'front',
    props: [FLOOR],
    start: {
      ...STAND,
      hip: [100, 97],
      hand: [10, 54],
      handFromShoulder: true,
      foot: [110, 158],
      elbow: -1,
    },
    end: {
      ...STAND,
      hip: [100, 90],
      hand: [10, 54],
      handFromShoulder: true,
      foot: [110, 158],
      elbow: -1,
    },
    load: 'hand',
  },
  hipThrust: {
    id: 'hipThrust',
    view: 'side',
    props: [FLOOR, { kind: 'bench', x: 20, y: 110, width: 46 }],
    start: {
      hip: [96, 146],
      torso: -70,
      hand: [10, 8],
      handFromShoulder: true,
      foot: [134, 158],
      elbow: 1,
      knee: -1,
    },
    end: {
      hip: [100, 112],
      torso: -92,
      hand: [10, 8],
      handFromShoulder: true,
      foot: [134, 158],
      elbow: 1,
      knee: -1,
    },
    load: 'none',
  },
  lunge: {
    id: 'lunge',
    view: 'side',
    props: [FLOOR],
    start: { ...STAND, foot: [126, 158], hand: [4, 52], handFromShoulder: true },
    end: { ...STAND, hip: [104, 120], foot: [134, 158], hand: [4, 52], handFromShoulder: true },
    load: 'hand',
  },
};
