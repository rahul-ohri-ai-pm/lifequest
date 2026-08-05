import { motion } from 'motion/react';
import { CategorySlot } from './CategorySlot';
import { CategoryIcon } from '../categoryIcons';
import { colors } from '../../constants/theme';

// A skill on the Profile screen.
//
// This replaces a bar whose only mark was an 8px coloured diamond and whose readout was the
// level — which is `1` for every skill until roughly a hundred completions, so the column that
// was supposed to rank them said the same thing seven times. The row now leads with the
// category's own icon in its own colour (the reference's icon column) and reports **XP**, the
// number that actually moves, with the level beside the bar as the milestone.

interface Props {
  name: string;
  iconKey?: string | null;
  color?: string | null;
  level: number;
  totalXp: number;
  /** 0–1 through the current level. */
  progress: number;
  /** Staggers the fill so the list sweeps in rather than snapping. */
  delay?: number;
}

export function SkillRow({ name, iconKey, color, level, totalXp, progress, delay = 0 }: Props) {
  const tint = color ?? colors.accent;
  const pct = Math.max(0, Math.min(progress, 1)) * 100;
  const idle = totalXp === 0;

  return (
    <div className="flex items-center gap-3">
      <CategorySlot color={color} dim={idle} size={38}>
        <CategoryIcon iconKey={iconKey} name={name} size={21} />
      </CategorySlot>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate font-display text-[13px] uppercase tracking-[0.12em] text-fg">
            {name}
          </span>
          <span
            className="shrink-0 font-display text-[10px] uppercase tracking-[0.16em]"
            style={{ color: idle ? colors.textSecondary : tint }}
          >
            Lv {level}
          </span>
          <span className="w-14 shrink-0 text-right font-display text-[13px] tabular-nums text-muted">
            {totalXp} xp
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-bg-alt">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: tint, boxShadow: idle ? undefined : `0 0 8px ${tint}` }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, delay, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
