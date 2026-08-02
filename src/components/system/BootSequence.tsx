import { useRef, useState } from 'react';
import { gsap, SplitText, useGsap, prefersReducedMotion } from '../../lib/gsap';

// The system window powering on. A thin seam of light splits open into a frame, the rank
// glyph resolves, the title assembles character by character, then the whole thing irises
// away to reveal the app.
//
// Three rules keep this from becoming the thing people hate about splash screens:
//   1. Once per session (sessionStorage) — not once per navigation, not every cold load.
//   2. Tap anywhere to skip, and the skip is instant, not a fade.
//   3. It never gates data. The app has already booted behind it; this is pure theatre
//      layered on top, so §2's "under 5 seconds to capture a task" is measured from the
//      moment you tap through, not from the animation's end.

const SESSION_KEY = 'lifequest_booted';

export function BootSequence() {
  const [done, setDone] = useState(() => {
    if (typeof sessionStorage === 'undefined') return true;
    // Reduced motion skips the theatre entirely rather than playing it at zero duration —
    // a flash-frame of a full-screen overlay is worse than never showing it.
    if (prefersReducedMotion()) return true;
    return sessionStorage.getItem(SESSION_KEY) === '1';
  });
  const root = useRef<HTMLDivElement | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGsap(
    root,
    () => {
      if (done) return;
      sessionStorage.setItem(SESSION_KEY, '1');

      const split = new SplitText('[data-boot-title]', { type: 'chars' });
      const t = gsap.timeline({ onComplete: () => setDone(true) });
      tl.current = t;

      t.set('[data-boot-frame]', { scaleX: 0, scaleY: 0.004, opacity: 1 })
        .set(split.chars, { opacity: 0, y: 14, rotateX: -80 })
        // A seam of light opens horizontally…
        .to('[data-boot-seam]', { scaleX: 1, duration: 0.42, ease: 'power4.inOut' })
        // …then the window unfolds from it.
        .to('[data-boot-frame]', { scaleX: 1, duration: 0.01 }, '>-0.02')
        .to('[data-boot-seam]', { opacity: 0, duration: 0.2 }, '<')
        .to('[data-boot-frame]', { scaleY: 1, duration: 0.5, ease: 'power4.out' }, '<')
        .from('[data-boot-bracket]', { opacity: 0, scale: 0.4, duration: 0.35, stagger: 0.05 }, '-=0.25')
        .to(
          split.chars,
          { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.035, ease: 'back.out(2)' },
          '-=0.2'
        )
        .from('[data-boot-sub]', { opacity: 0, y: 8, duration: 0.4 }, '-=0.25')
        .to('[data-boot-scan]', { yPercent: 900, duration: 0.7, ease: 'power2.inOut' }, '-=0.5')
        .to({}, { duration: 0.25 })
        // Iris out: the window collapses back to a seam and the overlay clears.
        .to('[data-boot-content]', { opacity: 0, duration: 0.2 })
        .to('[data-boot-frame]', { scaleY: 0.004, duration: 0.3, ease: 'power3.in' }, '<')
        .to(root.current, { opacity: 0, duration: 0.25 }, '-=0.1');

      return () => split.revert();
    },
    [done]
  );

  if (done) return null;

  const skip = () => {
    // Jump the timeline to the end rather than unmounting mid-flight, so GSAP reverts the
    // inline styles it wrote instead of leaving nodes frozen part-way.
    tl.current?.progress(1).kill();
    setDone(true);
  };

  return (
    <div
      ref={root}
      onPointerDown={skip}
      className="fixed inset-0 z-[60] grid place-items-center bg-bg"
      role="presentation"
    >
      {/* The seam of light that the window opens from */}
      <div
        data-boot-seam
        className="absolute h-px w-64 max-w-[70vw] bg-accent"
        style={{ boxShadow: '0 0 24px 2px var(--color-accent)' }}
      />

      <div
        data-boot-frame
        className="notch [--notch:14px] relative grid h-56 w-72 max-w-[86vw] place-items-center overflow-hidden border border-accent/70 bg-panel/80 opacity-0 panel-glow"
      >
        {/* Scanline sweep across the panel interior */}
        <div
          data-boot-scan
          className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-linear-to-b from-transparent via-accent/25 to-transparent"
        />

        {[
          'left-2 top-2',
          'right-2 top-2 rotate-90',
          'right-2 bottom-2 rotate-180',
          'left-2 bottom-2 -rotate-90',
        ].map((pos) => (
          <svg
            key={pos}
            data-boot-bracket
            className={`absolute size-4 text-accent ${pos}`}
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M0.75 11.25V4L4 0.75h7.25" stroke="currentColor" strokeWidth={1.4} />
          </svg>
        ))}

        <div data-boot-content className="flex flex-col items-center gap-2 px-6 text-center">
          <span
            data-boot-title
            className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-fg text-glow"
            style={{ perspective: 400 }}
          >
            LifeQuest
          </span>
          <span data-boot-sub className="font-display text-[10px] uppercase tracking-[0.34em] text-accent">
            System online
          </span>
        </div>
      </div>
    </div>
  );
}
