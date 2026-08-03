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

export function DietIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 21c-4 0-7-3-7-7 0-4.5 3.5-8.5 7-10 3.5 1.5 7 5.5 7 10 0 4-3 7-7 7z" strokeLinejoin="round" />
      <path d="M12 21V8" strokeLinecap="round" />
    </svg>
  );
}

export function CareerIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={3} y={7} width={18} height={13} rx={2} />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18" strokeLinecap="round" />
    </svg>
  );
}

export function ReadingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" strokeLinejoin="round" />
      <path d="M12 6.5v13" strokeLinecap="round" />
    </svg>
  );
}

export function FitnessIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

export function GamingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={2.5} y={7} width={19} height={10} rx={4} />
      <path d="M7 10v4M5 12h4M15.5 11.5h.01M18 13.5h.01" strokeLinecap="round" />
    </svg>
  );
}

export function SocialIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={9} cy={8} r={3} />
      <path d="M3 20c1-3.5 3.5-5 6-5s5 1.5 6 5" strokeLinecap="round" />
      <path d="M16 6.5a3 3 0 010 5.5M18 20c-.4-1.6-1-2.9-1.8-3.9" strokeLinecap="round" />
    </svg>
  );
}

export function TradingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 17l5.5-5.5 3.5 3.5L21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CategoryFallbackIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3l9 9-9 9-9-9 9-9z" strokeLinejoin="round" />
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
