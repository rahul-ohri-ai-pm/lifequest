import { useMemo, useRef, useState } from 'react';
import { BadgeCrest, TIER_METAL } from '../components/system/BadgeCrest';
import { SystemPanel } from '../components/system/SystemPanel';
import { RuneDivider } from '../components/system/RuneDivider';
import { SectionBar } from '../components/system/SectionBar';
import { useBadgeStore } from '../store/useBadgeStore';
import { sortForGallery, type BadgeGroup, type BadgeStatus } from '../engine/badges';
import { gsap, useGsap } from '../lib/gsap';
import { cn } from '../lib/utils';
import { text } from '../constants/theme';

// The badge gallery.
//
// Three states per badge, and they are deliberately different from each other:
//  - **unlocked** — struck metal, its name, and the date it was earned
//  - **locked** — outline crest, its condition, and a real progress readout ("6 / 10 quests"),
//    because a locked badge that will not tell you how close you are is just a tease
//  - **hidden and locked** — a question mark and no condition at all; the catalogue is a
//    spoiler otherwise, and the point of a secret badge is to be found rather than pursued
//
// Grouped by theme rather than shown as one 30-cell grid: the groups are what make the set
// legible ("I am strong on consistency, weak on breadth"), which a flat grid cannot say.

const GROUP_LABEL: Record<BadgeGroup, string> = {
  consistency: 'Consistency',
  volume: 'Volume',
  mastery: 'Mastery',
  secret: 'Secrets',
};
const GROUP_ORDER: BadgeGroup[] = ['consistency', 'volume', 'mastery', 'secret'];

function plural(n: number, unit: string) {
  if (unit === 'XP') return unit;
  return n === 1 ? unit : `${unit}s`;
}

function BadgeTile({ status, onSelect }: { status: BadgeStatus; onSelect(): void }) {
  const { rule, unlocked, progress, value } = status;
  const mystery = !unlocked && !!rule.hidden;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-badge-tile
      aria-label={mystery ? 'Undiscovered badge' : `${rule.name}${unlocked ? ', unlocked' : ', locked'}`}
      className="flex flex-col items-center gap-1.5 py-1"
    >
      <BadgeCrest tier={rule.tier} group={rule.group} unlocked={unlocked} mystery={mystery} size={54} />
      <span
        className={cn(
          'line-clamp-2 text-center font-display text-[10px] uppercase leading-tight tracking-[0.1em]',
          unlocked ? 'text-fg' : 'text-muted'
        )}
      >
        {mystery ? '???' : rule.name}
      </span>
      {!unlocked && !mystery && (
        <span className="font-display text-[9px] tabular-nums text-muted/70">
          {Math.min(value, rule.target)}/{rule.target}
        </span>
      )}
      {!unlocked && !mystery && (
        <span className="h-[2px] w-9 bg-edge/70">
          <span className="block h-full bg-accent" style={{ width: `${progress * 100}%` }} />
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
  const grouped = useMemo(() => {
    const map = new Map<BadgeGroup, BadgeStatus[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const s of sortForGallery(statuses)) map.get(s.rule.group)!.push(s);
    return map;
  }, [statuses]);

  // The crests strike in, group by group. Keyed on the count so it replays when something
  // unlocks rather than on every render.
  useGsap(
    root,
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>('[data-badge-tile]');
      if (!tiles.length) return;
      gsap.fromTo(
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
        }
      );
    },
    [statuses.length, unlockedCount]
  );

  return (
    <div ref={root} className="p-4 pb-8">
      <SystemPanel glow innerClassName="flex items-center gap-4 px-4 py-4">
        <BadgeCrest tier="gold" group="mastery" unlocked={unlockedCount > 0} size={54} />
        <div className="flex flex-col gap-0.5">
          <span className={text.panelLabel}>Earned</span>
          <span className="font-display text-3xl leading-none tabular-nums text-fg text-glow">
            {unlockedCount}
            <span className="text-lg text-muted"> / {statuses.length}</span>
          </span>
        </div>
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
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()} role="presentation">
            <SystemPanel glow innerClassName="flex flex-col items-center gap-2 px-5 py-6">
              <BadgeCrest
                tier={selected.rule.tier}
                group={selected.rule.group}
                unlocked={selected.unlocked}
                mystery={!selected.unlocked && !!selected.rule.hidden}
                size={84}
              />
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
                  <span className="font-display text-sm tabular-nums text-accent">
                    {Math.min(selected.value, selected.rule.target)} / {selected.rule.target}{' '}
                    {plural(selected.rule.target, selected.rule.unit)}
                  </span>
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
