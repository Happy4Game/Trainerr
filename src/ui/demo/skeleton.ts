/**
 * Stick figure used to demonstrate the movements. Coordinates are SVG units
 * in a 200 × 170 box, y going down. A pose gives where the hips, hands and
 * feet are; elbows and knees are found by two-bone inverse kinematics, so
 * a movement is described by two poses only (start and end).
 */
export type Point = readonly [number, number];

export const SEGMENTS = {
  torso: 46,
  neck: 7,
  head: 9,
  upperArm: 28,
  forearm: 26,
  thigh: 34,
  shin: 32,
  foot: 12,
} as const;

export interface Pose {
  readonly hip: Point;
  /** Torso angle in degrees from vertical up; positive leans towards +x. */
  readonly torso: number;
  /** Hand target; relative to the shoulder when `handFromShoulder` is set. */
  readonly hand: Point;
  readonly handFromShoulder?: boolean;
  /** Ankle target, in the box. */
  readonly foot: Point;
  /** Which side the elbow / knee bends to: 1 or -1. */
  readonly elbow: 1 | -1;
  readonly knee: 1 | -1;
  /** Foot angle in degrees from vertical down (90 = flat, towards +x). */
  readonly footAngle?: number;
}

export interface Figure {
  readonly head: Point;
  readonly neck: Point;
  readonly shoulder: Point;
  readonly hip: Point;
  readonly elbow: Point;
  readonly hand: Point;
  readonly knee: Point;
  readonly ankle: Point;
  readonly toe: Point;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const scale = (v: Point, k: number): Point => [v[0] * k, v[1] * k];
const fromUp = (deg: number): Point => [Math.sin(rad(deg)), -Math.cos(rad(deg))];
const fromDown = (deg: number): Point => [Math.sin(rad(deg)), Math.cos(rad(deg))];

/**
 * Middle joint of a two-bone chain from `base` reaching `target`. When the
 * target is out of reach, the limb is straight and stops short of it.
 */
export function solveTwoBones(
  base: Point,
  target: Point,
  first: number,
  second: number,
  bend: 1 | -1,
): { joint: Point; end: Point } {
  const dx = target[0] - base[0];
  const dy = target[1] - base[1];
  const raw = Math.hypot(dx, dy);
  // A target on the base itself has no direction: hang the limb straight down.
  const degenerate = raw < 1e-6;
  const distance = degenerate ? 1e-6 : raw;
  const reach = Math.min(
    Math.max(distance, Math.abs(first - second) + 1e-6),
    first + second - 1e-6,
  );
  const direction: Point = degenerate ? [0, 1] : [dx / distance, dy / distance];
  // Law of cosines: angle between the first bone and the base→target line.
  const cos = (first * first + reach * reach - second * second) / (2 * first * reach);
  const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * bend;
  const rotated: Point = [
    direction[0] * Math.cos(angle) - direction[1] * Math.sin(angle),
    direction[0] * Math.sin(angle) + direction[1] * Math.cos(angle),
  ];
  return { joint: add(base, scale(rotated, first)), end: add(base, scale(direction, reach)) };
}

export function figureFor(pose: Pose): Figure {
  const torsoDirection = fromUp(pose.torso);
  const shoulder = add(pose.hip, scale(torsoDirection, SEGMENTS.torso));
  const neck = add(shoulder, scale(torsoDirection, SEGMENTS.neck));
  const head = add(neck, scale(torsoDirection, SEGMENTS.head));
  const handTarget = pose.handFromShoulder ? add(shoulder, pose.hand) : pose.hand;
  const arm = solveTwoBones(shoulder, handTarget, SEGMENTS.upperArm, SEGMENTS.forearm, pose.elbow);
  const leg = solveTwoBones(pose.hip, pose.foot, SEGMENTS.thigh, SEGMENTS.shin, pose.knee);
  const toe = add(leg.end, scale(fromDown(pose.footAngle ?? 90), SEGMENTS.foot));
  return {
    head,
    neck,
    shoulder,
    hip: pose.hip,
    elbow: arm.joint,
    hand: arm.end,
    knee: leg.joint,
    ankle: leg.end,
    toe,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixPoint = (a: Point, b: Point, t: number): Point => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

/** Pose between start (t = 0) and end (t = 1). */
export function interpolate(start: Pose, end: Pose, t: number): Pose {
  return {
    ...start,
    hip: mixPoint(start.hip, end.hip, t),
    torso: mix(start.torso, end.torso, t),
    hand: mixPoint(start.hand, end.hand, t),
    foot: mixPoint(start.foot, end.foot, t),
    footAngle: mix(start.footAngle ?? 90, end.footAngle ?? 90, t),
  };
}

/** Smooth back-and-forth over one cycle: 0 → 1 (concentric), short hold, 1 → 0 slower. */
export function cyclePosition(elapsedMs: number, cycleMs: number): number {
  const phase = (elapsedMs % cycleMs) / cycleMs;
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  if (phase < 0.35) return ease(phase / 0.35);
  if (phase < 0.45) return 1;
  if (phase < 0.95) return 1 - ease((phase - 0.45) / 0.5);
  return 0;
}
