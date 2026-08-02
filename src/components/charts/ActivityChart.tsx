import { useRef, useState } from 'react';
import { gsap, useGsap } from '../../lib/gsap';
import { colors } from '../../constants/theme';

// Completions over time. The job is magnitude-over-time for ONE series, so this is a single
// hue (sequential), not a categorical palette — colour carries "how much", nothing else.
//
// Bars grow from the baseline, which is the only honest direction for a count: a bar that
// slides in from the side implies movement the data does not have.

export interface Bar {
  /** dayKey, used as the tooltip's label and the React key. */
  day: string;
  count: number;
}

interface Props {
  bars: Bar[];
  /** Replays the grow-in when it changes (i.e. on range change). */
  animateKey: string;
}

function shortLabel(dayKey: string): string {
  const [, m, d] = dayKey.split('-');
  return `${m}/${d}`;
}

export function ActivityChart({ bars, animateKey }: Props) {
  const root = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...bars.map((b) => b.count), 1);

  useGsap(
    root,
    () => {
      const els = gsap.utils.toArray<HTMLElement>('[data-bar]');
      if (!els.length) return;
      gsap.fromTo(
        els,
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.02, amount: Math.min(els.length * 0.02, 0.45) },
        }
      );
    },
    [animateKey]
  );

  if (!bars.length) {
    return <p className="py-6 text-center text-[13px] text-muted">Nothing logged in this range.</p>;
  }

  const active = hover != null ? bars[hover] : null;

  return (
    <div ref={root} className="relative">
      {/* Tooltip: an HTML chart is interactive by default, so every bar is hoverable and the
          readout sits above the plot rather than following the cursor (steadier on touch). */}
      <div className="mb-1 flex h-4 items-center justify-end">
        {active && (
          <span className="font-display text-[11px] uppercase tracking-[0.14em] text-fg">
            {shortLabel(active.day)} · {active.count} {active.count === 1 ? 'quest' : 'quests'}
          </span>
        )}
      </div>

      <div className="flex h-24 items-end gap-[2px]">
        {bars.map((b, i) => (
          <button
            key={b.day}
            type="button"
            // The hit target is the full column height, not just the drawn bar — a 2px-tall
            // bar for a 1-completion day would otherwise be unhittable on a phone.
            className="group flex h-full flex-1 items-end"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${b.day}: ${b.count} completed`}
          >
            <span
              data-bar
              className="w-full origin-bottom rounded-t-[3px] transition-opacity"
              style={{
                height: `${Math.max((b.count / max) * 100, b.count > 0 ? 6 : 2)}%`,
                backgroundColor: b.count > 0 ? colors.accent : colors.panelBorder,
                opacity: hover == null || hover === i ? 1 : 0.45,
                boxShadow: b.count > 0 && hover === i ? `0 0 10px ${colors.accent}` : undefined,
              }}
            />
          </button>
        ))}
      </div>

      <div className="mt-1.5 flex justify-between font-display text-[10px] uppercase tracking-[0.12em] text-muted">
        <span>{shortLabel(bars[0].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
