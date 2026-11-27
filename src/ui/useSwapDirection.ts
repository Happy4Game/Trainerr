import { ref, watch, type Ref } from 'vue';

export type SwapClass = '' | 'tr-from-right' | 'tr-from-left';

/**
 * The side the new content of a segment comes from: a choice to the right of
 * the previous one slides in from the right, and the reverse (Material 3,
 * "shared axis" pattern). Empty before the first change, so that a screen
 * opened on a given view does not slide in.
 *
 * `settle` clears the class once the slide is over: Ionic hides a page left
 * behind (display: none), and showing it again would replay the slide.
 */
export function useSwapDirection<T>(
  value: Ref<T>,
  order: readonly T[],
): { swap: Ref<SwapClass>; settle: () => void } {
  const swap = ref<SwapClass>('');
  watch(value, (next, previous) => {
    const from = order.indexOf(previous);
    const to = order.indexOf(next);
    swap.value =
      from === -1 || to === -1 || to === from ? '' : to > from ? 'tr-from-right' : 'tr-from-left';
  });
  return { swap, settle: () => (swap.value = '') };
}
