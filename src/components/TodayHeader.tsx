import { AnimatedCircularProgressBar } from './ui/animated-circular-progress-bar';
import { NumberTicker } from './ui/number-ticker';
import { SystemPanel } from './system/SystemPanel';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { colors, text } from '../constants/theme';

interface Props {
  doneCount: number;
  totalCount: number;
}

// The core loop is "complete something, watch the bar move". Level and XP used to live only
// on the Profile tab, so completing a quest on Today produced no visible progression at all
// — this puts the progression where the action is, now inside the reference's framed system
// window.
//
// The red block below it is the design reference's WARNING panel. The reference's copy is
// "EVERY SKIPPED QUEST = PERMANENT XP LOSS", which directly contradicts §2's forgiving,
// non-punishing progression — so the panel was kept as *visual language* and wired to
// something true instead. It reports what is still unclaimed today. No XP is ever deducted
// anywhere in this app (owner's call, recorded as DECISIONS D26).
export function TodayHeader({ doneCount, totalCount }: Props) {
  const character = useCharacterStore((s) => s.character);
  if (!character) return null;

  const p = levelProgress(character.totalXp);
  const pct = Math.min(p.progress * 100, 100);
  const remaining = totalCount - doneCount;

  return (
    <header className="flex flex-col gap-2 px-4 pt-4 pb-1">
      <SystemPanel glow innerClassName="flex items-center gap-4 px-4 py-3">
        <AnimatedCircularProgressBar
          value={pct}
          gaugePrimaryColor={colors.accent}
          gaugeSecondaryColor={colors.panelBorder}
          className="size-14 shrink-0"
        >
          <span className="font-display text-xl text-accent">{p.level}</span>
        </AnimatedCircularProgressBar>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-end justify-between">
            <span className={text.panelLabel}>Level {p.level}</span>
            <span className="font-display text-[13px] text-muted">
              <NumberTicker value={character.totalXp} /> / {p.nextLevelXp} XP
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded border border-edge bg-bg-alt">
            <div
              className="h-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%`, boxShadow: `0 0 8px ${colors.accent}` }}
            />
          </div>
        </div>
      </SystemPanel>

      {totalCount > 0 &&
        (remaining > 0 ? (
          <SystemPanel
            tone="alert"
            brackets={false}
            innerClassName="flex items-baseline justify-between gap-3 px-3 py-1.5"
          >
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-danger">
              {remaining} {remaining === 1 ? 'quest' : 'quests'} unclaimed
            </span>
            <span className="font-display text-[11px] tabular-nums text-muted">
              {doneCount}/{totalCount}
            </span>
          </SystemPanel>
        ) : (
          <SystemPanel brackets={false} innerClassName="px-3 py-1.5">
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-accent text-glow">
              All quests cleared — {totalCount}/{totalCount}
            </span>
          </SystemPanel>
        ))}
    </header>
  );
}
