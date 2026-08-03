import { SegmentRing } from './system/SegmentRing';
import { WeekStrip } from './system/WeekStrip';
import { BoltIcon, StreakIcon } from './icons';
import { useStreakStore } from '../store/useStreakStore';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { weekStrip } from '../engine/stats';
import { colors } from '../constants/theme';

// The status window: who you are, at a glance, before anything else on the screen.
//
// Structure is lifted from the reference screen — week strip, one big ring with the headline
// numeral inside it, two flanking counters, three small labelled meters — and nothing else is.
// The reference is a light-mode green nutrition tracker; §5 is dark-only with an electric-blue
// primary, so the layout was adopted and the skin was not (the same call recorded in D26).

interface Props {
  doneCount: number;
  totalCount: number;
  xpToday: number;
}

/** One of the three meters under the ring: a hairline bar, a caption, and a value. */
function Meter({
  label,
  value,
  fill,
  color,
}: {
  label: string;
  value: string;
  fill: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="h-[3px] w-full max-w-16 bg-edge/60">
        <span
          className="block h-full"
          style={{
            width: `${Math.round(Math.min(Math.max(fill, 0), 1) * 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </span>
      <span className="font-display text-[9px] uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className="font-display text-sm leading-none tabular-nums text-fg">{value}</span>
    </div>
  );
}

export function StatusHero({ doneCount, totalCount, xpToday }: Props) {
  const character = useCharacterStore((s) => s.character);
  const global = useStreakStore((s) => s.global);
  const activeDays = useStreakStore((s) => s.activeDays);

  const p = character ? levelProgress(character.totalXp) : null;
  if (!character || !p) return null;

  const today = new Date();
  const streak = global?.state.current ?? 0;
  const longest = global?.longest ?? 0;
  const weekActive = weekStrip(activeDays, today).filter((d) => d.active).length;
  const toNext = Math.max(p.nextLevelXp - character.totalXp, 0);

  return (
    // Gradient-edge sandwich (as in SystemPanel), but only the bottom padding is exposed —
    // so the ramp runs *downwards* into the one hairline that is actually visible.
    <div className="shelf bg-linear-to-b from-transparent via-accent/25 to-accent/70 pb-px">
      <div className="shelf bg-linear-to-b from-panel-raised via-panel to-bg px-4 pt-3 pb-5">
        <WeekStrip activeDays={activeDays} today={today} />

        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Left flank: what today has been worth so far. Also where the completion burst
              flies to, so the number it lands on is the number it just changed. */}
          <div className="flex w-[68px] flex-col items-center gap-1" data-xp-target>
            <BoltIcon className="text-accent" size={15} />
            <span className="font-display text-2xl leading-none tabular-nums text-fg">
              +{xpToday}
            </span>
            <span className="font-display text-[9px] uppercase tracking-[0.18em] text-muted">
              XP today
            </span>
          </div>

          <SegmentRing progress={p.progress} size={164} strokeWidth={10}>
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-muted">
              Level
            </span>
            <span className="font-display text-[3.25rem] font-bold leading-[0.95] text-fg text-glow tabular-nums">
              {p.level}
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.12em] text-muted">
              {toNext} xp to lv {p.level + 1}
            </span>
          </SegmentRing>

          {/* Right flank: the global active-day streak (§7). Shown at zero too — hiding it
              would make a break vanish rather than register, which §7 exists to prevent. */}
          <div className="flex w-[68px] flex-col items-center gap-1">
            <StreakIcon className={streak > 0 ? 'text-epic' : 'text-muted'} size={15} />
            <span
              className={`font-display text-2xl leading-none tabular-nums ${
                streak > 0 ? 'text-epic' : 'text-muted'
              }`}
              style={streak > 0 ? { textShadow: '0 0 10px rgb(245 185 66 / 0.5)' } : undefined}
            >
              {streak}
            </span>
            <span className="font-display text-[9px] uppercase tracking-[0.18em] text-muted">
              Day streak
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-edge/50 pt-3">
          <Meter
            label="Cleared"
            value={`${doneCount}/${totalCount}`}
            fill={totalCount ? doneCount / totalCount : 0}
            color={colors.accent}
          />
          <Meter
            label="Week"
            value={`${weekActive}/7`}
            fill={weekActive / 7}
            color={colors.accentSecondary}
          />
          <Meter
            label="Best"
            value={`${longest}d`}
            fill={longest ? streak / longest : 0}
            color={colors.epic}
          />
        </div>
      </div>
    </div>
  );
}
