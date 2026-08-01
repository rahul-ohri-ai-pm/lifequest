import { cn } from '../../lib/utils';

// The ornament rule that separates sections in the design reference: a hairline that fades
// out at both ends, with a diamond and tick marks at centre.
//
// The reference prints actual runes here. A rune font is a font — §3 allows exactly one
// display face and no icon packages — so the glyphs are geometric marks instead. Same
// rhythm, zero bytes.

interface Props {
  className?: string;
  /** Centre label, e.g. a section name. Rendered in the display face, caps, wide tracking. */
  label?: string;
}

function Ticks({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={cn('h-2 w-16 shrink-0 text-accent/50', flip && 'scale-x-[-1]')}
      viewBox="0 0 64 8"
      fill="none"
      aria-hidden
    >
      <path d="M0 4h20M26 4h6M38 4h4" stroke="currentColor" strokeWidth={1} />
      <path d="M50 1.5l2.5 2.5L50 6.5" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function RuneDivider({ className, label }: Props) {
  return (
    <div className={cn('flex items-center gap-2 py-1', className)} aria-hidden={!label}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-accent/45" />
      <Ticks flip />
      {label ? (
        <span className="font-display text-[11px] uppercase tracking-[0.28em] text-muted">{label}</span>
      ) : (
        <svg className="size-2 rotate-45 text-accent" viewBox="0 0 8 8" aria-hidden>
          <rect x={1} y={1} width={6} height={6} fill="currentColor" opacity={0.75} />
        </svg>
      )}
      <Ticks />
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-accent/45" />
    </div>
  );
}
