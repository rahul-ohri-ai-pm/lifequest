import { useEffect, useRef } from 'react';
import { SystemPanel } from './SystemPanel';
import { BadgeCrest, TIER_METAL } from './BadgeCrest';
import { useBadgeStore } from '../../store/useBadgeStore';
import { BADGES } from '../../engine/badges';
import { gsap, useGsap, prefersReducedMotion } from '../../lib/gsap';

// The badge-unlock takeover.
//
// Structured like StreakMoment so the two read as the same app: dim the screen, strike the
// crest in, name it, then let it settle. What is different is the *queue* — several badges can
// land on one completion ("Apprentice" and "Kindling" from the same tap), and showing them
// simultaneously would waste both. They play one after another, and a tap skips to the next.
//
// The queue lives in the store rather than in local state. It is not a rendering detail — it
// survives navigation, and mirroring it into component state would mean an effect whose only
// job is to copy one source of truth into another.
//
// It never fires on a cold start, but that is decided at the source: boot calls
// `resyncDerived(now, false)`, which records unlocks without queueing them. An earlier version
// tried to infer it here — treat the first delivery as boot and swallow it — and that quietly
// ate the user's *first real badge*, because boot usually unlocks nothing at all and so never
// consumed its turn. Inferring intent from delivery order was the mistake; the caller knows.

const HOLD_MS = 2600;

export function BadgeMoment() {
  const queue = useBadgeStore((s) => s.pending);
  const dismissCurrent = useBadgeStore((s) => s.dismissCurrent);
  const root = useRef<HTMLDivElement | null>(null);

  const current = queue[0] ?? null;
  const rule = current ? BADGES.find((b) => b.key === current) : undefined;

  useEffect(() => {
    if (!rule) return;
    const t = setTimeout(dismissCurrent, HOLD_MS);
    return () => clearTimeout(t);
  }, [rule, dismissCurrent]);

  useGsap(
    root,
    () => {
      if (!rule) return;
      const tl = gsap.timeline();
      tl.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.18 })
        // The crest lands hard — it is the moment.
        .fromTo(
          '[data-crest]',
          { scale: 0.3, opacity: 0, rotate: -25 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' },
          0.04
        )
        .fromTo('[data-badge-kicker]', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 }, 0.3)
        .fromTo('[data-badge-name]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.42)
        .fromTo('[data-badge-desc]', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.6);

      if (!prefersReducedMotion()) {
        // A single shockwave ring, scaled out and faded. One transient tween, nothing left
        // running at rest (CONVENTIONS 13b).
        tl.fromTo(
          '[data-shock]',
          { scale: 0.4, opacity: 0.65 },
          { scale: 2.4, opacity: 0, duration: 0.75, ease: 'power2.out' },
          0.12
        );
      }
    },
    [rule?.key]
  );

  if (!rule) return null;
  const metal = TIER_METAL[rule.tier];

  return (
    <div
      ref={root}
      onPointerDown={dismissCurrent}
      className="fixed inset-0 z-[60] grid place-items-center bg-bg/90 p-6 opacity-0"
      role="status"
      aria-live="polite"
    >
      <SystemPanel glow className="w-full max-w-xs" innerClassName="flex flex-col items-center gap-2 px-6 py-8">
        <div className="relative grid place-items-center">
          <span
            data-shock
            aria-hidden
            className="pointer-events-none absolute size-24 rounded-full opacity-0"
            style={{ border: `2px solid ${metal.edge}` }}
          />
          <span data-crest className="block">
            <BadgeCrest tier={rule.tier} group={rule.group} unlocked size={104} />
          </span>
        </div>

        <span
          data-badge-kicker
          className="font-display text-[10px] uppercase tracking-[0.36em] text-muted"
        >
          Badge unlocked
        </span>
        <span
          data-badge-name
          className="text-center font-display text-2xl uppercase leading-tight tracking-[0.12em]"
          style={{ color: metal.edge, textShadow: `0 0 18px ${metal.to}99` }}
        >
          {rule.name}
        </span>
        <p data-badge-desc className="text-center text-sm text-muted">
          {rule.description}
        </p>

        {queue.length > 1 && (
          <span className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-muted/70">
            +{queue.length - 1} more
          </span>
        )}
      </SystemPanel>
    </div>
  );
}
