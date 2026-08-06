import { useMemo, useRef, useState } from 'react';
import { BadgeCrest, TIER_METAL } from '../components/system/BadgeCrest';
import { SystemPanel } from '../components/system/SystemPanel';
import { RuneDivider } from '../components/system/RuneDivider';
import { SectionBar } from '../components/system/SectionBar';
import { NumberTicker } from '../components/ui/number-ticker';
import { useBadgeStore } from '../store/useBadgeStore';
import { sortForGallery, type BadgeGroup, type BadgeStatus } from '../engine/badges';
import { gsap, useGsap, prefersReducedMotion } from '../lib/gsap';
import { cn } from '../lib/utils';
import { colors, text } from '../constants/theme';

// The badge gallery.
//
// Three states per badge, and they are deliberately different from each other:
//  - **unlocked** — struck metal, a full ring, and a glint that travels over it once
//  - **locked** — outline crest inside a ring that draws to exactly how far along you are,
//    plus the raw count ("6 / 10 quests"); a locked badge that will not tell you how close
//    you are is just a tease
//  - **hidden and locked** — a question mark and no condition at all; the catalogue is a
//    spoiler otherwise, and the point of a secret badge is to be found rather than pursued
//
// Grouped by theme rather than shown as one 30-cell grid: the groups are what make the set
// legible ("I am strong on consistency, weak on breadth"), which a flat grid cannot say.
//
// Every animation here is a **transient timeline that ends** (CONVENTIONS 13b). The rings draw
// once, the glints travel once, the near-complete crests pulse once. At rest the screen has
// nothing running — the check that matters is `document.getAnimations().length` on arrival,
// not on first paint.

const GROUP_LABEL: Record<BadgeGroup, string> = {
  consistency: 'Consistency',
  volume: 'Volume',
  mastery: 'Mastery',
  secret: 'Secrets',
};
const GROUP_ORDER: BadgeGroup[] = ['consistency', 'volume', 'mastery', 'secret'];

/** Locked badges this close to done are worth pointing at. */
const NEARLY_THERE = 0.75;

// GSAP's function-based value: each ring path carries its own end offset in a data attribute,
// written by BadgeCrest from the same progress the label reports — so one tween animates thirty
// rings to thirty different values without the caller knowing any of them.
const ringTarget = (_i: number, el: Element) => Number((el as SVGElement & { dataset: DOMStringMap }).dataset.ringTarget ?? 0);

function plural(n: number, unit: string) {
  if (unit === 'XP') return unit;
  return n === 1 ? unit : `${unit}s`;
}

function BadgeTile({ status, onSelect }: { status: BadgeStatus; onSelect(): void }) {
  const { rule, unlocked, progress, value } = status;
  const mystery = !unlocked && !!rule.hidden;
  const nearly = !unlocked && progress >= NEARLY_THERE;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-badge-tile
      data-nearly={nearly ? '' : undefined}
      aria-label={mystery ? 'Undiscovered badge' : `${rule.name}${unlocked ? ', unlocked' : ', locked'}`}
      className="flex flex-col items-center gap-1.5 py-1"
    >
      <span data-crest-wrap className="block">
        <BadgeCrest
          tier={rule.tier}
          group={rule.group}
          unlocked={unlocked}
          mystery={mystery}
          progress={progress}
          size={58}
        />
      </span>
      <span
        className={cn(
          'line-clamp-2 text-center font-display text-[10px] uppercase leading-tight tracking-[0.1em]',
          unlocked ? 'text-fg' : 'text-muted'
        )}
      >
        {mystery ? '???' : rule.name}
      </span>
      {!unlocked && (
        <span
          className={cn(
            'font-display text-[9px] tabular-nums',
            nearly ? 'text-accent' : 'text-muted/70'
          )}
        >
          {mystery ? '—' : `${Math.min(value, rule.target)}/${rule.target}`}
        </span>
      )}
    </button>
  );
}

export default function Badges() {
  const statuses = useBadgeStore((s) => s.statuses);
  const unlockedAt = useBadgeStore((s) => s.unlockedAt);
  const root = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<BadgeStatus | null>(null);

  const unlockedCount = statuses.filter((s) => s.unlocked).length;
  const collectionPct = statuses.length ? (unlockedCount / statuses.length) * 100 : 0;
  const grouped = useMemo(() => {
    const map = new Map<BadgeGroup, BadgeStatus[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const s of sortForGallery(statuses)) map.get(s.rule.group)!.push(s);
    return map;
  }, [statuses]);

  useGsap(
    root,
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>('[data-badge-tile]');
      if (!tiles.length) return;
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline();

      // The collection bar fills first — the headline before the detail.
      tl.fromTo('[data-collection-fill]', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, 0);

      // Crests strike in.
      tl.fromTo(
        tiles,
        { opacity: 0, scale: 0.7, y: 10 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.4,
          ease: 'back.out(1.7)',
          stagger: { each: 0.02, amount: Math.min(tiles.length * 0.02, 0.6) },
          clearProps: 'transform',
        },
        0.05
      );

      if (reduced) return;

      // Every ring draws from empty to its real value, so the number is *shown* arriving
      // rather than just printed. Function-based end value: each path carries its own target
      // in a data attribute, set by BadgeCrest from the same progress the label reports.
      const rings = gsap.utils.toArray<SVGPathElement>('[data-ring]');
      if (rings.length) {
        tl.fromTo(
          rings,
          { attr: { 'stroke-dashoffset': 100 } },
          {
            attr: { 'stroke-dashoffset': ringTarget },
            duration: 0.75,
            ease: 'power2.out',
            stagger: { each: 0.015, amount: Math.min(rings.length * 0.015, 0.5) },
          },
          0.2
        );
      }

      // Light travels across each earned crest, once. This is the "it is metal" beat, and it
      // only plays on badges the user actually owns — a glint on a locked silhouette would be
      // rewarding the wrong thing.
      const sheens = gsap.utils.toArray<SVGRectElement>('[data-sheen]');
      if (sheens.length) {
        tl.fromTo(
          sheens,
          { attr: { x: -14 }, opacity: 0 },
          {
            attr: { x: 26 },
            opacity: 1,
            duration: 0.85,
            ease: 'power1.inOut',
            stagger: 0.09,
            onComplete: () => gsap.set(sheens, { opacity: 0 }),
          },
          0.55
        );
      }

      // One nudge for the badges that are nearly there — the ones worth chasing this week.
      const nearly = gsap.utils.toArray<HTMLElement>('[data-nearly] [data-crest-wrap]');
      if (nearly.length) {
        tl.to(nearly, { scale: 1.12, duration: 0.28, yoyo: true, repeat: 1, ease: 'sine.inOut', stagger: 0.08 }, 0.9);
      }
    },
    [statuses.length, unlockedCount]
  );

  // The detail sheet's crest turns over as it opens, and its ring redraws. Separate from the
  // grid timeline so opening a badge does not replay the whole gallery.
  const sheet = useRef<HTMLDivElement | null>(null);
  useGsap(
    sheet,
    () => {
      if (!selected) return;
      const tl = gsap.timeline();
      tl.fromTo(sheet.current, { opacity: 0 }, { opacity: 1, duration: 0.16 }).fromTo(
        '[data-sheet-crest]',
        { rotateY: -90, scale: 0.8, opacity: 0 },
        { rotateY: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' },
        0.02
      );
      if (!prefersReducedMotion()) {
        tl.fromTo(
          '[data-sheet-crest] [data-ring]',
          { attr: { 'stroke-dashoffset': 100 } },
          {
            attr: { 'stroke-dashoffset': ringTarget },
            duration: 0.7,
            ease: 'power2.out',
          },
          0.2
        );
      }
    },
    [selected?.rule.key]
  );

  return (
    <div ref={root} className="p-4 pb-8">
      <SystemPanel glow innerClassName="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-4">
          <BadgeCrest tier="gold" group="mastery" unlocked={unlockedCount > 0} size={54} />
          <div className="flex flex-col gap-0.5">
            <span className={text.panelLabel}>Earned</span>
            <span className="font-display text-3xl leading-none tabular-nums text-fg text-glow">
              <NumberTicker value={unlockedCount} />
              <span className="text-lg text-muted"> / {statuses.length}</span>
            </span>
          </div>
          <span className="ml-auto font-display text-2xl tabular-nums text-accent">
            {Math.round(collectionPct)}%
          </span>
        </div>

        {/* Collection progress. The gallery had a count but no sense of the whole. */}
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-bg-alt">
          <span
            data-collection-fill
            className="block h-full origin-left rounded-full bg-linear-to-r from-accent to-accent-2"
            style={{ width: `${collectionPct}%`, boxShadow: `0 0 8px ${colors.accent}` }}
          />
        </span>
      </SystemPanel>

      {GROUP_ORDER.map((group) => {
        const items = grouped.get(group) ?? [];
        if (!items.length) return null;
        const got = items.filter((i) => i.unlocked).length;
        return (
          <div key={group}>
            <SectionBar label={GROUP_LABEL[group]} meta={`${got}/${items.length}`} />
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-1 pt-2 pb-4">
              {items.map((s) => (
                <BadgeTile key={s.rule.key} status={s} onSelect={() => setSelected(s)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Detail sheet. A tile is too small to carry a condition and a date, and a tooltip is
          not a thing on a phone. */}
      {selected && (
        <div
          ref={sheet}
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 opacity-0"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()} role="presentation">
            <SystemPanel glow innerClassName="flex flex-col items-center gap-2 px-5 py-6">
              <span data-sheet-crest className="block" style={{ perspective: 600 }}>
                <BadgeCrest
                  tier={selected.rule.tier}
                  group={selected.rule.group}
                  unlocked={selected.unlocked}
                  mystery={!selected.unlocked && !!selected.rule.hidden}
                  progress={selected.progress}
                  size={92}
                />
              </span>
              <span
                className="font-display text-xl uppercase tracking-[0.14em]"
                style={{ color: selected.unlocked ? TIER_METAL[selected.rule.tier].edge : undefined }}
              >
                {!selected.unlocked && selected.rule.hidden ? '???' : selected.rule.name}
              </span>
              <RuneDivider className="my-1 w-full" />
              <p className="text-center text-sm text-muted">
                {!selected.unlocked && selected.rule.hidden
                  ? 'A secret badge. Keep playing.'
                  : selected.rule.description}
              </p>
              {selected.unlocked ? (
                <span className={text.panelLabel}>
                  {unlockedAt[selected.rule.key]
                    ? `Earned ${unlockedAt[selected.rule.key].slice(0, 10)}`
                    : 'Earned'}
                </span>
              ) : (
                !selected.rule.hidden && (
                  <div className="flex w-full flex-col items-center gap-1.5">
                    <span className="font-display text-sm tabular-nums text-accent">
                      {Math.min(selected.value, selected.rule.target)} / {selected.rule.target}{' '}
                      {plural(selected.rule.target, selected.rule.unit)}
                    </span>
                    <span className="h-1.5 w-40 overflow-hidden rounded-full bg-bg-alt">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{
                          width: `${selected.progress * 100}%`,
                          boxShadow: `0 0 8px ${colors.accent}`,
                        }}
                      />
                    </span>
                  </div>
                )
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-2 font-display text-[11px] uppercase tracking-[0.2em] text-muted"
              >
                Close
              </button>
            </SystemPanel>
          </div>
        </div>
      )}
    </div>
  );
}
