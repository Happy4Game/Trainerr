import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useSwapDirection } from '@/ui/useSwapDirection';

describe('useSwapDirection', () => {
  const order = ['sessions', 'stats', 'body'] as const;

  it('does not slide before the first change', () => {
    expect(useSwapDirection(ref('stats'), order).swap.value).toBe('');
  });

  it('slides from the side of the new choice', async () => {
    const view = ref<(typeof order)[number]>('sessions');
    const { swap } = useSwapDirection(view, order);
    view.value = 'body';
    await nextTick();
    expect(swap.value).toBe('tr-from-right');
    view.value = 'stats';
    await nextTick();
    expect(swap.value).toBe('tr-from-left');
  });

  it('does not slide for a value outside the list', async () => {
    const view = ref('sessions');
    const { swap } = useSwapDirection(view, order as readonly string[]);
    view.value = 'unknown';
    await nextTick();
    expect(swap.value).toBe('');
  });

  it('stops sliding once settled, so that coming back does not replay it', async () => {
    const view = ref<(typeof order)[number]>('sessions');
    const { swap, settle } = useSwapDirection(view, order);
    view.value = 'stats';
    await nextTick();
    settle();
    expect(swap.value).toBe('');
  });
});
