import { cn } from '../../lib/utils';

// The signature element of the design reference (§5): a "system window" frame — chamfered
// corners, a 1px gradient edge, and corner brackets sitting just inside it.
//
// The edge is a gradient, and a gradient cannot be a border. The fix is the standard
// two-layer sandwich: the outer element carries the gradient as its *background* and 1px of
// padding, the inner element paints the panel fill on top. Both are clipped by the same
// `notch` polygon, so the visible result is a 1px gradient outline that follows the cut
// corners. Doing it this way (rather than with pseudo-elements) keeps it composable with
// `overflow-hidden` children like BorderBeam.
//
// Everything here is CSS and one small SVG path — no images, no new dependency (§3).

type Tone = 'default' | 'alert' | 'quiet';

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  /** Corner brackets. On by default; off for dense rows where four more marks is noise. */
  brackets?: boolean;
  /** Outer bloom. Deliberately opt-in — if every panel glows, none of them reads (§5). */
  glow?: boolean;
  className?: string;
  /** Applied to the inner fill layer — padding, layout, and the like belong here. */
  innerClassName?: string;
}

const toneEdge: Record<Tone, string> = {
  // Blue → violet keeps the §5 primary in front and uses violet in its secondary role.
  default: 'bg-linear-to-br from-accent/70 via-accent-2/45 to-accent/25',
  alert: 'bg-linear-to-br from-danger/80 via-danger/40 to-danger/20',
  quiet: 'bg-linear-to-br from-edge via-edge to-edge/40',
};

const toneBracket: Record<Tone, string> = {
  default: 'text-accent/80',
  alert: 'text-danger/80',
  quiet: 'text-edge',
};

const toneGlow: Record<Tone, string> = {
  default: 'panel-glow',
  alert: 'panel-glow-alert',
  quiet: '',
};

// One 12×12 elbow, drawn once and rotated into each corner.
function Brackets({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-[3px]', className)} aria-hidden>
      {[
        'left-0 top-0',
        'right-0 top-0 rotate-90',
        'right-0 bottom-0 rotate-180',
        'left-0 bottom-0 -rotate-90',
      ].map((pos) => (
        <svg key={pos} className={cn('absolute size-3', pos)} viewBox="0 0 12 12" fill="none">
          <path d="M0.75 11.25V4L4 0.75h7.25" stroke="currentColor" strokeWidth={1.2} />
        </svg>
      ))}
    </div>
  );
}

export function SystemPanel({
  children,
  tone = 'default',
  brackets = true,
  glow = false,
  className,
  innerClassName,
}: Props) {
  return (
    <div className={cn('notch p-px', toneEdge[tone], glow && toneGlow[tone], className)}>
      <div className={cn('notch relative h-full bg-panel', toneBracket[tone], innerClassName)}>
        {brackets && <Brackets />}
        {children}
      </div>
    </div>
  );
}
