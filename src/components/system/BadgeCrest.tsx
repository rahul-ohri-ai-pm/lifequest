import { useId } from 'react';
import type { BadgeGroup, BadgeTier } from '../../engine/badges';

// The badge itself: a hexagonal crest, drawn in code (§5 — no illustrated art, no asset
// budget), with a per-group emblem inside it and a per-tier metal.
//
// A locked crest is the *same shape* in outline only. That matters more than it sounds: a
// gallery of silhouettes reads as "there is a specific thing here you have not got yet", where
// a grid of grey squares reads as broken. The emblem is still drawn when locked but not
// hidden, so the shape is a hint; hidden badges get a question mark instead, which is the
// whole point of hiding them.

const TIER_METAL: Record<BadgeTier, { from: string; to: string; edge: string }> = {
  bronze: { from: '#D08A56', to: '#8A5432', edge: '#E8A87C' },
  silver: { from: '#CBD5E1', to: '#7C8899', edge: '#E6ECF5' },
  gold: { from: '#F5D06A', to: '#C08A1E', edge: '#FFE9A8' },
  // §5 keeps violet for the rarest moments, so the top tier is the secondary accent rather
  // than a fifth invented metal.
  legend: { from: '#C4A6FF', to: '#6D28D9', edge: '#E4D6FF' },
};

/** Hexagon with a flat top, matching the Sigil on Profile. */
const HEX = 'M12 1.6l9 5.2v10.4l-9 5.2-9-5.2V6.8z';

function Emblem({ group }: { group: BadgeGroup }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (group) {
    case 'consistency':
      // A flame: the streak mark, which is what this group measures.
      return <path d="M12 6.4c2.1 2.4 3.5 4 3.5 6.1a3.5 3.5 0 11-7 0c0-1.2.5-2.2 1.3-3.2.3.7.7 1.2 1.2 1.5-.2-1.4.2-2.7 1-4.4z" {...p} />;
    case 'volume':
      // A rising stack: more, over time.
      return <path d="M8 16.5v-3M12 16.5v-6M16 16.5v-4.5M6.5 17.6h11" {...p} />;
    case 'mastery':
      // A star: rank.
      return <path d="M12 6.6l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" {...p} />;
    case 'secret':
      return <path d="M9.9 10a2.2 2.2 0 114 1.2c-.7.9-1.9 1.1-1.9 2.4M12 16.3h.01" {...p} />;
  }
}

interface Props {
  tier: BadgeTier;
  group: BadgeGroup;
  unlocked: boolean;
  /** Draw a question mark instead of the emblem. Only for locked hidden badges. */
  mystery?: boolean;
  size?: number;
  className?: string;
}

export function BadgeCrest({ tier, group, unlocked, mystery = false, size = 56, className }: Props) {
  const id = useId();
  const metal = TIER_METAL[tier];

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
        <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={metal.from} />
          <stop offset="100%" stopColor={metal.to} />
        </linearGradient>
      </defs>

      <path
        d={HEX}
        fill={unlocked ? `url(#${id})` : 'none'}
        fillOpacity={unlocked ? 0.9 : 0}
        stroke={unlocked ? metal.edge : '#22304D'}
        strokeWidth={unlocked ? 1 : 1.4}
        strokeLinejoin="round"
      />
      {/* Inner bevel line. Present only when unlocked — it is what makes the crest read as
          struck metal rather than a filled polygon. */}
      {unlocked && (
        <path
          d="M12 3.9l7 4.1v8.2l-7 4-7-4V8z"
          fill="none"
          stroke="#0A0E17"
          strokeOpacity={0.35}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      )}

      <g style={{ color: unlocked ? '#0A0E17' : '#3A4762' }}>
        {mystery ? (
          <text
            x={12}
            y={15.4}
            textAnchor="middle"
            fill="currentColor"
            style={{ font: 'bold 7px Rajdhani, sans-serif' }}
          >
            ?
          </text>
        ) : (
          <Emblem group={group} />
        )}
      </g>
    </svg>
  );
}

export { TIER_METAL };
