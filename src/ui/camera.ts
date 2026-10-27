import type { Area } from './photo';

/**
 * The camera inside the app (getUserMedia), for body photos: a live preview,
 * the front or back camera, and a self-timer to step back from the phone.
 * https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia
 */
export type Facing = 'user' | 'environment';

/** Seconds before the shot: none, or time to put the phone down and pose. */
export const TIMER_STEPS = [0, 3, 10] as const;
export type TimerStep = (typeof TIMER_STEPS)[number];

export function nextTimer(current: TimerStep): TimerStep {
  return TIMER_STEPS[(TIMER_STEPS.indexOf(current) + 1) % TIMER_STEPS.length] ?? 0;
}

/** Portrait frame, as the gallery shows the photos. */
export const FRAME_RATIO = 3 / 4;

/**
 * The part of the video seen in the frame (`object-fit: cover`): the middle,
 * cut to the frame's shape, so that the photo is what was on screen.
 */
export function coverArea(width: number, height: number, ratio = FRAME_RATIO): Area {
  if (width / height > ratio) {
    const cut = Math.round(height * ratio);
    return { x: Math.round((width - cut) / 2), y: 0, width: cut, height };
  }
  const cut = Math.round(width / ratio);
  return { x: 0, y: Math.round((height - cut) / 2), width, height: cut };
}

export type CameraProblem = 'unsupported' | 'denied' | 'missing' | 'busy' | 'other';

/** Why the camera did not start, from the error getUserMedia gives. */
export function cameraProblem(error: unknown): CameraProblem {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'other';
}

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export function openCamera(facing: Facing): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
  });
}

export function stopCamera(stream: MediaStream | undefined): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

/** Front and back camera: the switch button only shows when there are two. */
export async function cameraCount(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length;
  } catch {
    return 1;
  }
}
