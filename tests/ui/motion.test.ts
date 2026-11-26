import { afterEach, describe, expect, it, vi } from 'vitest';
import { leaveAtOnce, prefersReducedMotion, riseIn } from '@/ui/motion';

function phoneAsksLessMotion(reduce: boolean): void {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: reduce && query.includes('reduce') }),
  });
}

describe('motion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the phone setting', () => {
    phoneAsksLessMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    phoneAsksLessMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('animates a new screen, unless the phone asks for less motion', () => {
    const animate = vi.fn();
    const element = { animate } as unknown as Element;
    phoneAsksLessMotion(false);
    riseIn(element);
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 250 });
    phoneAsksLessMotion(true);
    riseIn(element);
    expect(animate).toHaveBeenCalledOnce();
  });

  it('does nothing without an element', () => {
    phoneAsksLessMotion(false);
    expect(() => riseIn(undefined)).not.toThrow();
  });

  it('removes a line at once', () => {
    const done = vi.fn();
    leaveAtOnce({} as Element, done);
    expect(done).toHaveBeenCalledOnce();
  });
});
