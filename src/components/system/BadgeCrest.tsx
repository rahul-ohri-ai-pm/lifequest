import { useId } from 'react';
import type { BadgeGroup, BadgeTier } from '../../engine/badges';
import { colors } from '../../constants/theme';

// The badge itself: a hexagonal crest, drawn in code (§5 — no illustrated art, no asset
// budget), with a per-group emblem inside it and a per-tier metal.
//
// A locked crest is the *same shape* in outline only. That matters more than it sounds: a
// gallery of silhouettes reads as "there is a specific thing here you have not got yet", where
// a grid of grey squares reads as broken. The emblem is still drawn when locked but not
// hidden, so the shape is a hint; hidden badges get a question mark instead, which is the
// whole point of hiding them.
//
// **Progress is part of the crest**, not a bar underneath it. It was a 2px hairline below the
// label, which is where you put a number you do not want read. As a ring around the badge it
// is the same information at a glance, it scales down to the 44px shelf on Profile without
// becoming invisible, and it gives the entrance animation something to draw.

const TIER_METAL: Record<BadgeTier, { from: string; to: string; edge: string }> = {
  bronze: { from: '#D08A56', to: '#8A5432', edge: '#E8A87C' },
  silver: { from: '#CBD5E1', to: '#7C8899', edge: '#E6ECF5' },
  gold: { from: '#F5D06A', to: '#C08A1E', edge: '#FFE9A8' },
  // §5 keeps violet for the rarest moments, so the top tier is the secondary accent rather
  // than a fifth invented metal.
  legend: { from: '#C4A6FF', to: '#6D28D9', edge: '#E4D6FF' },
};

// Flat-top hexagons about (12,12). Three nested radii: the progress ring, the crest face, and
// the inner bevel. Written out rather than generated — they are constants, and a helper that
// builds three paths from one number is harder to read than the three paths.
const HEX_RING = 'M12 .4l10.05 5.8v11.6L12 23.6 1.95 17.8V6.2z';
const HEX_FACE = 'M12 2.8l7.97 4.6v9.2L12 21.2 4.03 16.6V7.4z';
const HEX_BEVEL = 'M12 4.4l6.58 3.8v7.6L12 19.6 5.42 15.8V8.2z';

function Emblem({ group }: { group: BadgeGroup }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (group) {
    case 'consistency':
      // A flame: the streak mark, which is what this group measures.
      return <path d="M12 7.2c1.9 2.2 3.2 3.6 3.2 5.5a3.2 3.2 0 11-6.4 0c0-1.1.5-2 1.2-2.9.3.6.6 1.1 1.1 1.4-.2-1.3.2-2.4.9-4z" {...p} />;
    case 'volume':
      // A rising stack: more, over time.
      return <path d="M8.6 15.9v-2.7M12 15.9v-5.4M15.4 15.9v-4M7.2 16.9h9.6" {...p} />;
    case 'mastery':
      // A star: rank.
      return <path d="M12 7.4l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" {...p} />;
    case 'secret':
      return <path d="M10.2 10.4a1.9 1.9 0 113.4 1.1c-.6.8-1.6.9-1.6 2M12 15.8h.01" {...p} />;
  }
}

interface Props {
  tier: BadgeTier;
  group: BadgeGroup;
  unlocked: boolean;
  /** Draw a question mark instead of the emblem. Only for locked hidden badges. */
  mystery?: boolean;
  /** 0–1. Omit to draw no ring at all (the moment overlay wants a bare crest). */
  progress?: number;
  size?: number;
  className?: string;
}

export function BadgeCrest({
  tier,
  group,
  unlocked,
  mystery = false,
  progress,
  size = 56,
  className,
}: Props) {
  const id = useId();
  const metal = TIER_METAL[tier];
  const showRing = progress != null;
  // `pathLength` normalises the hexagon's perimeter to 100, so the dash maths is percentages
  // and needs no getTotalLength() call — which would mean measuring in the DOM.
  const offset = 100 - Math.max(0, Math.min(progress ?? 0, 1)) * 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      style={
        unlocked
          ? { filter: `drop-shadow(0 0 6px ${metal.to}88) drop-shadow(0 1px 0 rgb(0 0 0 / 0.6))` }
          : undefined
      }
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={metal.from} />
          <stop offset="100%" stopColor={metal.to} />
        </linearGradient>
        {/* The sweep used for the unlock glint. Static until something tweens the rect. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#fff" stopOpacity={0} />
          <stop offset="50%" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={HEX_FACE} />
        </clipPath>
      </defs>

      {showRing && (
        <>
          <path
            d={HEX_RING}
            fill="none"
            stroke={colors.panelBorder}
            strokeWidth={1.6}
            strokeLinejoin="round"
            opacity={0.75}
          />
          <path
            data-ring
            data-ring-target={offset}
            d={HEX_RING}
            fill="none"
            stroke={unlocked ? metal.edge : colors.accent}
            // Starts at the top vertex and runs clockwise, matching the XP ring on Today.
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={offset}
            // No `filter: drop-shadow` here, tempting as a glow is. A filter on a *child* of
            // the svg gets its own filter region, and Chromium rasterised that region as a
            // visibly lighter rectangle behind every locked crest. It would also be a filter
            // pass per badge, thirty times over, for an effect the accent colour already
            // carries on this background.
          />
        </>
      )}

      <path
        d={HEX_FACE}
        fill={unlocked ? `url(#${id}-metal)` : 'none'}
        fillOpacity={unlocked ? 0.9 : 0}
        stroke={unlocked ? metal.edge : '#22304D'}
        strokeWidth={unlocked ? 0.9 : 1.3}
        strokeLinejoin="round"
      />
      {/* Inner bevel line. Present only when unlocked — it is what makes the crest read as
          struck metal rather than a filled polygon. */}
      {unlocked && (
        <path
          d={HEX_BEVEL}
          fill="none"
          stroke="#0A0E17"
          strokeOpacity={0.35}
          strokeWidth={0.7}
          strokeLinejoin="round"
        />
      )}

      <g style={{ color: unlocked ? '#0A0E17' : '#3A4762' }}>
        {mystery ? (
          <text
            x={12}
            y={15}
            textAnchor="middle"
            fill="currentColor"
            style={{ font: 'bold 6.5px Rajdhani, sans-serif' }}
          >
            ?
          </text>
        ) : (
          <Emblem group={group} />
        )}
      </g>

      {/* Glint. Parked off the left edge at zero opacity; a caller tweens `x` across to make
          light travel over the metal. Clipped to the face so it never leaves the hexagon. */}
      {unlocked && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect
            data-sheen
            x={-14}
            y={0}
            width={9}
            height={24}
            fill={`url(#${id}-sheen)`}
            opacity={0}
            transform="rotate(18 12 12)"
          />
        </g>
      )}
    </svg>
  );
}

export { TIER_METAL };
