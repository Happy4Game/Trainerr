import { beforeEach, describe, expect, it, vi } from 'vitest';
import { restoredRest, saveRest } from '@/ui/session/restClock';

describe('rest kept across a hard quit', () => {
  beforeEach(() => {
    // The phone's web storage, which survives the app being killed.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  it('goes on after a restart, for the same session only', () => {
    saveRest('s1', 10_000);
    expect(restoredRest('s1', 4_000)).toBe(10_000);
    expect(restoredRest('s2', 4_000)).toBeUndefined();
  });

  it('is gone once over, or when the rest is ended', () => {
    saveRest('s1', 10_000);
    expect(restoredRest('s1', 10_001)).toBeUndefined();
    saveRest('s1', undefined);
    expect(restoredRest('s1', 4_000)).toBeUndefined();
  });
});
