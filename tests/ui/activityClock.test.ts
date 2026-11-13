import { beforeEach, describe, expect, it, vi } from 'vitest';
import { savedActivity, saveActivity } from '@/ui/session/activityClock';

describe('last action kept across a hard quit', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  it('is read back for the same session only', () => {
    saveActivity('s1', 4_000);
    expect(savedActivity('s1')).toBe(4_000);
    expect(savedActivity('s2')).toBeUndefined();
  });

  it('is forgotten once the session is over', () => {
    saveActivity('s1', 4_000);
    saveActivity(undefined, 0);
    expect(savedActivity('s1')).toBeUndefined();
  });

  it('survives a broken storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('refused');
      },
      setItem: () => {
        throw new Error('refused');
      },
      removeItem: () => {
        throw new Error('refused');
      },
    });
    expect(() => saveActivity('s1', 1)).not.toThrow();
    expect(savedActivity('s1')).toBeUndefined();
  });
});
