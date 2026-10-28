import { describe, expect, it } from 'vitest';
import { restClock, restsTaken } from '@/domain/restTaken';
import type { SetLog } from '@/domain/types';

const set = (id: string, doneAt?: number): SetLog & { id: string } => ({
  id,
  exerciseId: 'x',
  loadKg: 20,
  reps: 10,
  difficulty: 'ok',
  ...(doneAt === undefined ? {} : { doneAt }),
});

describe('rest really taken', () => {
  it('is the time since the set logged just before', () => {
    const rests = restsTaken([set('a', 0), set('b', 95_400), set('c', 275_000)]);
    expect(rests.get('a')).toBeUndefined();
    expect(rests.get('b')).toBe(95);
    expect(rests.get('c')).toBe(180);
  });

  it('is missing when a set has no time', () => {
    const rests = restsTaken([set('a', 0), set('b'), set('c', 60_000)]);
    expect(rests.size).toBe(0);
  });
});

describe('rest clock', () => {
  it('shows minutes and seconds', () => {
    expect(restClock(95)).toBe('1:35');
    expect(restClock(600)).toBe('10:00');
  });
});
