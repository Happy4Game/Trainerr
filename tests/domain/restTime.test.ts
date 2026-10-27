import { describe, expect, it } from 'vitest';
import { MIN_REST_SECONDS, restAfterSet } from '@/domain/restTime';

describe('rest after a set', () => {
  it('follows the usual rest of the exercise after a correct set', () => {
    expect(restAfterSet(120, 'ok')).toBe(120);
  });

  it('is longer after a hard or failed set, shorter after an easy one', () => {
    expect(restAfterSet(120, 'hard')).toBe(150);
    expect(restAfterSet(120, 'fail')).toBe(180);
    expect(restAfterSet(120, 'easy')).toBe(105);
  });

  it('never goes below the minimum', () => {
    expect(restAfterSet(50, 'easy')).toBe(MIN_REST_SECONDS);
  });
});
