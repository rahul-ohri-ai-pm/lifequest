// Inline SVG icons (§5) — stroke-styled to match the glow-panel treatment, and inline
// rather than an icon-font package so the icon budget never grows past what's used.
interface IconProps {
  className?: string;
  size?: number;
}

const base = { fill: 'none', strokeWidth: 1.8, stroke: 'currentColor' } as const;

export function TodayIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={3} y={5} width={18} height={16} rx={2} />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

export function StatsIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 20V13M12 20V6M19 20v-4" strokeLinecap="round" />
      <path d="M3 21h18" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Task-type marks for the quest row's icon cell. The design reference gives every quest a
// thematic icon (a bicep, a brain, a moon); we can't ship an icon set per task without an
// asset budget, so the icon carries the one thing that is always true and always useful —
// what kind of quest this is.
export function TodoIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HabitIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 12a8 8 0 0113.7-5.6M20 12a8 8 0 01-13.7 5.6" strokeLinecap="round" />
      <path d="M18 3v4h-4M6 21v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CountedIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 19V9M12 19V5M19 19v-6" strokeLinecap="round" />
    </svg>
  );
}

// Streak mark. An angular flame rather than an emoji: §5 rules out icon fonts and the
// aesthetic is code-drawn vector, so 🔥 would be the one un-themed thing on the screen.
export function StreakIcon({ className, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      {/* Outer flame plus an inner curl. The first draft was a single outline whose bottom
          arc dominated, so at large sizes it read as a teardrop rather than a flame. */}
      <path
        d="M12 2.5c3.4 4 5.8 6.6 5.8 10.1a5.8 5.8 0 11-11.6 0c0-2 .8-3.7 2.2-5.4.4 1.2 1.1 2 2 2.5C10.2 7 10.8 4.8 12 2.5z"
        strokeLinejoin="round"
      />
      <path
        d="M12 20a3 3 0 01-3-3c0-1.6 1.3-2.6 3-4.8 1.7 2.2 3 3.2 3 4.8a3 3 0 01-3 3z"
        strokeLinejoin="round"
        opacity={0.55}
      />
    </svg>
  );
}

// ---- Category marks -----------------------------------------------------------------
// One per default skill (§6). Inline SVG, same stroke treatment as everything else — §5
// forbids icon-font packages, and these are the only eight shapes the app will ever need.
// Looked up by skill name so a renamed or user-added category falls back gracefully.

// Duotone: a filled body under a stroked outline. The straight 1.8px hairlines these
// replace were legible but weightless — the reference's category marks are large, solid and
// individually recognisable, and that mass is what makes a list scannable by icon rather than
// by reading every title. Fill is `currentColor` at low alpha, so one colour still drives the
// whole glyph and a skill's stored colour tints body and outline together.
const body = { fill: 'currentColor', fillOpacity: 0.18, stroke: 'currentColor', strokeWidth: 1.6 } as const;

export function DietIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path
        d="M12 7.4c1.3-1 2.6-1.2 3.9-.6 1.8.8 2.9 2.9 2.9 5.4 0 4-2.6 8-4.9 8-.9 0-1.3-.5-1.9-.5s-1 .5-1.9.5c-2.3 0-4.9-4-4.9-8 0-2.5 1.1-4.6 2.9-5.4 1.3-.6 2.6-.4 3.9.6z"
        {...body}
        strokeLinejoin="round"
      />
      <path d="M12 7.4V4.6M12 4.6c0-1.2 1-2.1 2.6-2.1 0 1.3-1 2.1-2.6 2.1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CareerIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={2.8} y={7} width={18.4} height={13.2} rx={2.2} {...body} />
      <path d="M8.8 7V5.2a2 2 0 012-2h2.4a2 2 0 012 2V7" strokeLinecap="round" />
      <path d="M2.8 12.4h18.4" strokeLinecap="round" />
      <rect x={10.4} y={10.9} width={3.2} height={3} rx={0.8} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReadingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 6.6C10.4 5 7.9 4.4 3.8 4.4v13.2c4.1 0 6.6.6 8.2 2.2V6.6z" {...body} strokeLinejoin="round" />
      <path d="M12 6.6c1.6-1.6 4.1-2.2 8.2-2.2v13.2c-4.1 0-6.6.6-8.2 2.2V6.6z" {...body} strokeLinejoin="round" />
      <path d="M6.4 8.4h3M6.4 11.4h3M14.6 8.4h3M14.6 11.4h3" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function FitnessIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={5.4} y={6.6} width={3.4} height={10.8} rx={1.1} {...body} />
      <rect x={15.2} y={6.6} width={3.4} height={10.8} rx={1.1} {...body} />
      <path d="M2.6 9.6v4.8M21.4 9.6v4.8" strokeLinecap="round" />
      <path d="M8.8 12h6.4" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export function GamingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path
        d="M7.4 7h9.2a4.6 4.6 0 014.5 3.7l.7 4.1A2.9 2.9 0 0119 18.2c-1 0-1.6-.5-2.3-1.2l-.9-.9H8.2l-.9.9c-.7.7-1.3 1.2-2.3 1.2a2.9 2.9 0 01-2.8-3.4l.7-4.1A4.6 4.6 0 017.4 7z"
        {...body}
        strokeLinejoin="round"
      />
      <path d="M6.6 10.6v3.2M5 12.2h3.2" strokeLinecap="round" />
      <circle cx={16} cy={11.4} r={1} fill="currentColor" stroke="none" />
      <circle cx={18} cy={13.6} r={1} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SocialIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={9.2} cy={7.8} r={3.4} {...body} />
      <path d="M2.6 20c.9-3.7 3.5-5.4 6.6-5.4S14.9 16.3 15.8 20z" {...body} strokeLinejoin="round" />
      <circle cx={17} cy={9} r={2.4} {...body} />
      <path d="M17.6 14.8c2 .6 3.3 2.2 3.8 4.4" strokeLinecap="round" />
    </svg>
  );
}

export function TradingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      {/* Candlesticks rather than a plain up-arrow: this is the one category whose whole
          activity is reading a chart, and a rising arrow is also every other "progress" mark
          in the app. */}
      <path d="M6.4 6.6v11M12 3.6v13.2M17.6 8.4v9" strokeLinecap="round" opacity={0.75} />
      <rect x={4.6} y={9} width={3.6} height={6.2} rx={0.8} {...body} />
      <rect x={10.2} y={6} width={3.6} height={7.4} rx={0.8} {...body} />
      <rect x={15.8} y={10.6} width={3.6} height={5} rx={0.8} {...body} />
      <path d="M3 21h18" strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

export function CategoryFallbackIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.8l9.2 9.2-9.2 9.2L2.8 12z" {...body} strokeLinejoin="round" />
      <path d="M12 7.6L16.4 12 12 16.4 7.6 12z" strokeLinejoin="round" opacity={0.65} />
    </svg>
  );
}

const CATEGORY_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  diet: DietIcon,
  career: CareerIcon,
  reading: ReadingIcon,
  fitness: FitnessIcon,
  exercise: FitnessIcon, // merged into Fitness by migration 0004; kept so old data still renders
  gaming: GamingIcon,
  social: SocialIcon,
  'stock trading': TradingIcon,
};

/**
 * Icon for a category name, falling back to a neutral rune for renamed or user-added ones.
 *
 * Deliberately a component that takes the *name*, rather than a helper returning a component
 * type. Resolving to a type during a parent's render (`const Icon = categoryIcon(x)`) trips
 * react-hooks/static-components, and the warning is right in principle: if the resolved
 * identity ever changed, React would unmount and remount the subtree rather than update it.
 */
export function CategoryIcon({ name, className, size = 18 }: IconProps & { name: string | null | undefined }) {
  const Icon = CATEGORY_ICONS[(name ?? '').trim().toLowerCase()] ?? CategoryFallbackIcon;
  return <Icon className={className} size={size} />;
}

export function UndoIcon({ className, size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 9h10a5 5 0 010 10h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 5.5L4 9l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SkipIcon({ className, size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 5l8 7-8 7z" strokeLinejoin="round" />
      <path d="M18 5v14" strokeLinecap="round" />
    </svg>
  );
}

// XP mark — the counterpart to StreakIcon in the status hero's two flanking counters.
export function BoltIcon({ className, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M13.5 2.5L5 13.5h6L10.5 21.5 19 10.5h-6l.5-8z" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
