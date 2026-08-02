import { useRef } from 'react';
import { gsap, useGsap } from '../../lib/gsap';
import { cn } from '../../lib/utils';

// The dashboard's one control, in a single row above the charts (dataviz: filters go above,
// never interleaved between panels — the reader needs to know the range before reading any
// number). The lit segment slides between options rather than blinking on, so it is obvious
// that one control is governing every panel below it.

export const RANGES = [
  { label: 'Day', days: 1 as number | null },
  { label: 'Week', days: 7 as number | null },
  { label: 'Month', days: 30 as number | null },
  { label: 'All', days: null as number | null },
] as const;

interface Props {
  index: number;
  onChange(index: number): void;
}

export function RangeFilter({ index, onChange }: Props) {
  const root = useRef<HTMLDivElement | null>(null);
  const marker = useRef<HTMLSpanElement | null>(null);

  useGsap(
    root,
    () => {
      const btn = root.current?.querySelectorAll<HTMLElement>('button')[index];
      if (!btn || !marker.current) return;
      gsap.to(marker.current, {
        x: btn.offsetLeft,
        width: btn.offsetWidth,
        duration: 0.38,
        ease: 'power3.out',
      });
    },
    [index]
  );

  return (
    <div
      ref={root}
      className="notch [--notch:6px] relative mx-4 flex border border-edge bg-bg-alt p-0.5"
      role="group"
      aria-label="Date range"
    >
      <span
        ref={marker}
        className="notch [--notch:5px] pointer-events-none absolute inset-y-0.5 left-0 bg-accent/20"
        style={{ boxShadow: 'inset 0 0 0 1px var(--color-accent)' }}
        aria-hidden
      />
      {RANGES.map((r, i) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={i === index}
          className={cn(
            'relative flex-1 py-1.5 font-display text-[11px] uppercase tracking-[0.18em] transition-colors',
            i === index ? 'text-accent' : 'text-muted hover:text-fg'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
