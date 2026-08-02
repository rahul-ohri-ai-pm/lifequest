import { cn } from '../../lib/utils';

// A HUD section header: a lit marker, the label, a rule that runs to the edge, and a count.
// It gives the screen a spine — without it a stack of framed panels reads as a pile of
// unrelated boxes rather than as one window with regions.
interface Props {
  label: string;
  /** Right-hand readout, e.g. "2 active". */
  meta?: string;
  className?: string;
}

export function SectionBar({ label, meta, className }: Props) {
  return (
    <div className={cn('flex items-center gap-2 px-4 pb-1 pt-4', className)}>
      <span
        className="size-1.5 rotate-45 bg-accent"
        style={{ boxShadow: '0 0 6px var(--color-accent)' }}
        aria-hidden
      />
      <h2 className="font-display text-[11px] uppercase tracking-[0.28em] text-fg">{label}</h2>
      <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      {meta && (
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">{meta}</span>
      )}
    </div>
  );
}
