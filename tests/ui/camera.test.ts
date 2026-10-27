import { describe, expect, it } from 'vitest';
import { cameraProblem, coverArea, nextTimer } from '@/ui/camera';

describe('camera inside the app', () => {
  it('keeps the middle of the video, cut to the portrait frame seen on screen', () => {
    // Landscape 1920 × 1080: the sides are cut.
    expect(coverArea(1920, 1080)).toEqual({ x: 555, y: 0, width: 810, height: 1080 });
    // Tall 1080 × 1920: the top and bottom are cut.
    expect(coverArea(1080, 1920)).toEqual({ x: 0, y: 240, width: 1080, height: 1440 });
    // Already 3:4.
    expect(coverArea(900, 1200)).toEqual({ x: 0, y: 0, width: 900, height: 1200 });
  });

  it('goes round the self-timer: off, 3 s, 10 s', () => {
    expect([nextTimer(0), nextTimer(3), nextTimer(10)]).toEqual([3, 10, 0]);
  });

  it('tells why the camera did not start', () => {
    const error = (name: string) => new DOMException('', name);
    expect(cameraProblem(error('NotAllowedError'))).toBe('denied');
    expect(cameraProblem(error('NotFoundError'))).toBe('missing');
    expect(cameraProblem(error('NotReadableError'))).toBe('busy');
    expect(cameraProblem(new Error('?'))).toBe('other');
    expect(cameraProblem('?')).toBe('other');
  });
});
