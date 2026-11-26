/**
 * Small motion helpers, on top of the CSS tokens of src/theme/variables.css.
 * Rules: 300 ms at most, only what arrives is animated (what leaves goes at
 * once, so that a tap is never delayed), nothing if the phone asks for less
 * motion (prefers-reduced-motion, WCAG 2.3.3).
 */

/** The phone's "remove animations" setting. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * A new screen in the same place (next machine, set entry, end of session):
 * it rises a little while fading in, like the cards of Today (tr-rise).
 * Web Animations API: the element is kept, only its look is animated.
 */
export function riseIn(element: Element | null | undefined): void {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 250, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}

/**
 * For <TransitionGroup @leave="leaveAtOnce">: a line removed from a list goes
 * at once (no ghost left behind while the others move up).
 */
export function leaveAtOnce(_element: Element, done: () => void): void {
  done();
}

/**
 * A number that changes after a tap on + or −: the new one rolls in from
 * below when it goes up, from above when it goes down, like a counter.
 */
export function rollIn(element: Element | null | undefined, direction: 1 | -1): void {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { opacity: 0.2, transform: `translateY(${direction * 45}%)` },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}

/**
 * A button that has just done its job (set logged): it gives a little and a
 * green ring spreads around it, so that the tap visibly counted.
 */
export function confirmPress(element: Element | null | undefined): void {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgb(61 220 132 / 70%)' },
      { transform: 'scale(0.95)', offset: 0.3 },
      { transform: 'scale(1)', boxShadow: '0 0 0 16px rgb(61 220 132 / 0%)' },
    ],
    { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}
