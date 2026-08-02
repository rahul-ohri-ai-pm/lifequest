import { useRef } from 'react';
import { SystemPanel } from './system/SystemPanel';
import { Sigil } from './system/Sigil';
import { StreakIcon } from './icons';
import { useStreakStore } from '../store/useStreakStore';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { gsap, useGsap } from '../lib/gsap';
import { colors } from '../constants/theme';

// The status window: who you are, at a glance, before anything else on the screen.
//
// The XP bar is deliberately *segmented* rather than a smooth fill. A continuous bar reads as
// a loading indicator; twenty discrete cells read as a game resource, and they give the
// completion effect something to land on — cells light up one after another instead of a
// width tweening, which is both more legible at a glance and far more satisfying.

const CELLS = 20;

interface Props {
  doneCount: number;
  totalCount: number;
  xpToday: number;
}

export function StatusHero({ doneCount, totalCount, xpToday }: Props) {
  const character = useCharacterStore((s) => s.character);
  const global = useStreakStore((s) => s.global);
  const root = useRef<HTMLDivElement | null>(null);
  const prevFilled = useRef<number | null>(null);

  const p = character ? levelProgress(character.totalXp) : null;
  const filled = p ? Math.round(Math.min(p.progress, 1) * CELLS) : 0;

  useGsap(
    root,
    () => {
      const cells = gsap.utils.toArray<HTMLElement>('[data-cell]');
      const from = prevFilled.current;
      prevFilled.current = filled;

      // GSAP warns on an empty target list, and a brand-new character has zero filled cells
      // — so every first boot logged "GSAP target not found" to the console.
      if (!filled) return;

      if (from === null) {
        // First paint: sweep the whole rail in so the hero introduces itself.
        gsap.fromTo(
          cells.slice(0, filled),
          { opacity: 0, scaleY: 0.2 },
          { opacity: 1, scaleY: 1, duration: 0.3, stagger: 0.025, ease: 'power2.out' }
        );
        return;
      }
      if (filled > from) {
        // XP gained: only the newly-earned cells fire, with a brief overshoot glow.
        const gained = cells.slice(from, filled);
        if (!gained.length) return;
        gsap
          .timeline()
          .fromTo(gained, { opacity: 0, scaleY: 0.3 }, { opacity: 1, scaleY: 1, duration: 0.22, stagger: 0.04 })
          .to(gained, { boxShadow: `0 0 12px ${colors.accent}`, duration: 0.16, stagger: 0.04 }, '<')
          .to(gained, { boxShadow: `0 0 4px ${colors.accent}`, duration: 0.4 }, '>-0.1');
      }
    },
    [filled]
  );

  if (!character || !p) return null;

  return (
    <div ref={root} className="px-4 pt-2">
      <SystemPanel glow innerClassName="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-4">
          <Sigil level={p.level} size={72} />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted">Level</span>
            <span className="font-display text-4xl font-bold leading-none text-fg text-glow">{p.level}</span>
          </div>

          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-display text-[10px] uppercase tracking-[0.24em] text-muted">Today</span>
            <span className="font-display text-2xl leading-none text-accent" data-xp-target>
              +{xpToday}
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.18em] text-muted">
              {doneCount}/{totalCount} cleared
            </span>
          </div>
        </div>

        {/* The global active-day streak (§7). Shown even at zero, because "0 days" is the
            honest state and hiding it would make a broken streak vanish rather than register.
            `longest` is the record, which never decreases. */}
        {global && (
          <div className="flex items-center gap-2 border-t border-edge/60 pt-2.5">
            <StreakIcon
              className={global.state.current > 0 ? 'text-epic' : 'text-muted'}
              size={16}
            />
            <span
              className={`font-display text-lg leading-none tabular-nums ${
                global.state.current > 0 ? 'text-epic' : 'text-muted'
              }`}
              style={global.state.current > 0 ? { textShadow: '0 0 10px rgb(245 185 66 / 0.5)' } : undefined}
            >
              {global.state.current}
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">
              day streak
            </span>
            <span className="ml-auto font-display text-[10px] uppercase tracking-[0.16em] text-muted">
              best {global.longest}
              {global.resetCount > 0 && ` · ${global.resetCount} reset${global.resetCount > 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* Segmented XP rail */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-[3px]">
            {Array.from({ length: CELLS }, (_, i) => (
              <span
                key={i}
                data-cell
                className="h-2.5 flex-1 origin-bottom"
                style={
                  i < filled
                    ? { backgroundColor: colors.accent, boxShadow: `0 0 4px ${colors.accent}` }
                    : { backgroundColor: colors.panelBorder, opacity: 0.5 }
                }
              />
            ))}
          </div>
          <span className="shrink-0 font-display text-[11px] tabular-nums text-muted">
            {character.totalXp}/{p.nextLevelXp}
          </span>
        </div>
      </SystemPanel>
    </div>
  );
}
