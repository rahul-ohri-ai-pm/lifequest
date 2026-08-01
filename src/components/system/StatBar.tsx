import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { colors } from '../../constants/theme';

// The STR/AGI/INT/STA block from the design reference. There, the four stats are invented
// RPG attributes; here they are the user's actual skills (§6), each of which already
// carries a stored colour — so the reference's colour-coded bars land on real data instead
// of decoration.
//
// The colour is per-row and comes from the database, which is exactly the case
// CONVENTIONS 14 keeps `constants/theme.ts` around for: a value, not a class.

interface Props {
  label: string;
  /** Right-aligned readout — the level, in the reference's `STR: 180` position. */
  value: number | string;
  /** 0–1. Progress through the current level, not lifetime XP. */
  progress: number;
  color?: string | null;
  /** Staggers the fill so a list of skills sweeps in rather than snapping. */
  delay?: number;
  className?: string;
}

export function StatBar({ label, value, progress, color, delay = 0, className }: Props) {
  const tint = color ?? colors.accent;
  const pct = Math.max(0, Math.min(progress, 1)) * 100;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className="size-2 shrink-0 rotate-45 rounded-[1px]"
        style={{ backgroundColor: tint, boxShadow: `0 0 6px ${tint}` }}
        aria-hidden
      />
      <span className="w-28 shrink-0 truncate font-display text-[13px] uppercase tracking-[0.12em] text-fg">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full border border-edge bg-bg-alt">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: tint, boxShadow: `0 0 8px ${tint}` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-display text-[13px] text-muted tabular-nums">
        {value}
      </span>
    </div>
  );
}
