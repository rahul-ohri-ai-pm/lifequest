import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

// GSAP setup for the whole app. Registered once, here, so no component has to remember to
// (a double registration is harmless but a *missing* one fails only at runtime, in the one
// screen nobody opened before shipping).
//
// Why GSAP is here at all when `motion` already is: three effects the design leans on are
// impractical without it — Flip (a quest card physically becoming the detail screen),
// DrawSVG (frame borders drawing themselves on like a HUD powering up), and SplitText
// (per-character title reveals). `motion` stays because every vendored Magic UI primitive
// depends on it. See DECISIONS D28 for the cost and the trade.
gsap.registerPlugin(Flip, SplitText, DrawSVGPlugin);

// Interactive feedback should feel instant; only ambient/celebration beats get room to
// breathe. Keeping the numbers here stops each component inventing its own timing.
gsap.defaults({ ease: 'power3.out', duration: 0.5 });

export { gsap, Flip, SplitText, DrawSVGPlugin };

/**
 * True when the OS asks for less motion. Read at call time rather than cached, because a
 * user can flip the setting while the app is open.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scopes a GSAP timeline to a container and cleans it up properly.
 *
 * `gsap.context()` is the part that matters: it records every tween and ScrollTrigger created
 * inside the callback, and `revert()` both kills them and restores the inline styles GSAP
 * wrote. Without that, React 19's StrictMode double-mount leaves a second set of tweens
 * running against the same nodes, and elements stay stuck at whatever values the killed
 * animation last set — which looks exactly like a layout bug.
 *
 * Under reduced motion the callback still runs, but `gsap.defaults` is switched to
 * zero-duration so everything lands on its final state immediately. That keeps one code path
 * instead of two, and guarantees the end state is identical either way.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: gsap.Context) => void,
  deps: React.DependencyList = []
): void {
  useLayoutEffect(() => {
    if (!scope.current) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context((self) => {
      if (reduced) gsap.defaults({ duration: 0, ease: 'none' });
      setup(self);
      if (reduced) gsap.defaults({ duration: 0.5, ease: 'power3.out' });
    }, scope);
    return () => ctx.revert();
    // The caller owns the dependency list, exactly like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * A ref plus `useGsap` in one call, for the common case of animating a component's own
 * subtree on mount.
 */
export function useGsapScope<T extends HTMLElement = HTMLDivElement>(
  setup: (ctx: gsap.Context) => void,
  deps: React.DependencyList = []
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useGsap(ref, setup, deps);
  return ref;
}
