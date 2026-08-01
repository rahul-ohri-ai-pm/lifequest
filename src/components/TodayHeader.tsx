import { AnimatedCircularProgressBar } from './ui/animated-circular-progress-bar';
import { NumberTicker } from './ui/number-ticker';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { colors, text } from '../constants/theme';

interface Props {
  doneCount: number;
  totalCount: number;
}

// The core loop is "complete something, watch the bar move". Level and XP used to live
// only on the Profile tab, so completing a quest on Today produced no visible progression
// at all — this puts the progression where the action is. The gauge and the ticker are
// the §5 "motion" budget being spent where the payoff is.
export function TodayHeader({ doneCount, totalCount }: Props) {
  const character = useCharacterStore((s) => s.character);
  if (!character) return null;

  const p = levelProgress(character.totalXp);
  const pct = Math.min(p.progress * 100, 100);

  return (
    <header className="flex flex-col gap-2 px-4 pt-4 pb-1">
      <div className="flex items-center gap-4">
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
              className="h-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      {totalCount > 0 && (
        <p className="text-xs text-muted">
          {doneCount} of {totalCount} done today
        </p>
      )}
    </header>
  );
}
