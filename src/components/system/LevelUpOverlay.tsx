import { useEffect, useRef } from 'react';
import { SystemPanel } from './SystemPanel';
import { Sigil } from './Sigil';
import { useCharacterStore } from '../../store/useCharacterStore';
import { gsap, SplitText, useGsap, prefersReducedMotion } from '../../lib/gsap';
import { colors } from '../../constants/theme';

// §7: "leveling up triggers a celebration animation". This is the one full-screen moment in
// the app, and deliberately the *only* one — §5's rule is that if everything glows equally,
// nothing reads as emphasised. Everything else earns a bar cell or a bloom; this earns the
// whole viewport.
//
// Levelling happens rarely enough (280 XP for level 2, and the curve grows) that it can
// afford to be loud without wearing out. Roughly 2.4s, and a tap ends it immediately.

const DISMISS_MS = 3200;

export function LevelUpOverlay() {
  const level = useCharacterStore((s) => s.justLeveledTo);
  const clear = useCharacterStore((s) => s.clearLevelUp);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (level == null) return;
    const t = setTimeout(clear, DISMISS_MS);
    return () => clearTimeout(t);
  }, [level, clear]);

  useGsap(
    root,
    () => {
      if (level == null) return;
      const reduced = prefersReducedMotion();
      const split = new SplitText('[data-lvl-word]', { type: 'chars' });

      const t = gsap.timeline();
      t.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.18 })
        // Shockwave: a ring punches outward from the centre as the panel lands.
        .fromTo(
          '[data-shock]',
          { scale: 0, opacity: 0.9 },
          { scale: 3.4, opacity: 0, duration: 0.8, ease: 'power2.out' },
          0.05
        )
        .fromTo(
          '[data-lvl-panel]',
          { scale: 0.6, opacity: 0, rotateX: -35 },
          { scale: 1, opacity: 1, rotateX: 0, duration: 0.5, ease: 'back.out(1.7)' },
          0.05
        )
        .fromTo(
          split.chars,
          { opacity: 0, yPercent: 120 },
          { opacity: 1, yPercent: 0, duration: 0.34, stagger: 0.04, ease: 'back.out(2)' },
          0.3
        )
        // The number slams in and the panel takes the hit.
        .fromTo(
          '[data-lvl-num]',
          { scale: 2.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'power4.out' },
          0.45
        );

      if (!reduced) {
        // A short, decaying shake — enough to feel like an impact, not enough to nauseate.
        t.to('[data-lvl-panel]', { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: 'none' }, 0.82)
          .set('[data-lvl-panel]', { x: 0 })
          .fromTo(
            '[data-spark]',
            { scale: 0, opacity: 1 },
            {
              scale: 1,
              opacity: 0,
              duration: 0.7,
              ease: 'power2.out',
              stagger: { each: 0.03, from: 'random' },
            },
            0.5
          );
      }

      return () => split.revert();
    },
    [level]
  );

  if (level == null) return null;

  return (
    <div
      ref={root}
      onPointerDown={clear}
      className="fixed inset-0 z-[60] grid place-items-center bg-bg/85 p-6 opacity-0"
      style={{ perspective: 800 }}
      role="status"
      aria-live="polite"
    >
      {/* Shockwave ring */}
      <span
        data-shock
        className="pointer-events-none absolute size-40 rounded-full border-2 border-accent"
        aria-hidden
      />

      {/* Radial sparks */}
      {!prefersReducedMotion() &&
        Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            data-spark
            aria-hidden
            className="pointer-events-none absolute h-16 w-px origin-bottom bg-linear-to-t from-transparent to-accent"
            style={{ transform: `rotate(${i * 30}deg) translateY(-90px)` }}
          />
        ))}

      <div data-lvl-panel className="w-full max-w-xs">
        <SystemPanel glow innerClassName="flex flex-col items-center gap-2 overflow-hidden px-6 py-7">
          <span
            data-lvl-word
            className="font-display text-xs uppercase tracking-[0.4em] text-accent text-glow"
          >
            Level Up
          </span>

          <div data-lvl-num className="my-1">
            <Sigil level={level} size={116} />
          </div>

          <span className="font-display text-[10px] uppercase tracking-[0.24em] text-muted">
            Tap to continue
          </span>
        </SystemPanel>
      </div>

      <span className="sr-only">Level {level} reached</span>
      <style>{`[data-shock]{box-shadow:0 0 40px ${colors.accent}}`}</style>
    </div>
  );
}
