import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { keepTodayUpToDate, refreshToday, todayIso } from '@/ui/today';

describe("today's date", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    refreshToday();
  });

  it('a computed that reads it follows the day change', () => {
    refreshToday(new Date(2026, 10, 19, 23, 50));
    const label = computed(() => `day ${todayIso()}`);
    expect(label.value).toBe('day 2026-11-19');
    refreshToday(new Date(2026, 10, 20, 0, 0, 1));
    expect(label.value).toBe('day 2026-11-20');
  });

  it('changes by itself at midnight while the app stays open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 23, 59, 0));
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    refreshToday();
    const stop = keepTodayUpToDate();
    expect(todayIso()).toBe('2026-11-19');
    vi.advanceTimersByTime(2 * 60_000);
    expect(todayIso()).toBe('2026-11-20');
    stop();
  });

  it('is read again when the user comes back to the app', () => {
    let onVisible: (() => void) | undefined;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 22, 0));
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: (_: string, listener: () => void) => (onVisible = listener),
      removeEventListener: vi.fn(),
    });
    refreshToday();
    const stop = keepTodayUpToDate();
    // In the background, Android pauses the timers: the clock jumps instead.
    vi.setSystemTime(new Date(2026, 10, 20, 7, 0));
    onVisible?.();
    expect(todayIso()).toBe('2026-11-20');
    stop();
  });
});
