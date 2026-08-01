import { cn } from '../../lib/utils';
import { colors } from '../../constants/theme';

// The design reference puts a framed character portrait above the level readout. §5 rules
// out illustrated and character art outright — that is the constraint that keeps the anime
// look compatible with the "extremely lightweight" goal — so the portrait becomes a
// code-drawn emblem: concentric hexagons, a slowly rotating outer ring of ticks, and the
// level numeral at the centre.
//
// It costs ~1 KB of SVG instead of an image, scales to any size without a second asset, and
// is themed by the same tokens as everything else.

interface Props {
  level: number;
  size?: number;
  className?: string;
}

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

export function Sigil({ level, size = 128, className }: Props) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id="sigil-core">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
            <stop offset="70%" stopColor={colors.accentSecondary} stopOpacity={0.12} />
            <stop offset="100%" stopColor={colors.accentSecondary} stopOpacity={0} />
          </radialGradient>
        </defs>

        <circle cx={50} cy={50} r={44} fill="url(#sigil-core)" />

        {/* Tick ring — the only part that moves, and it moves slowly enough to read as
            ambient rather than as a spinner saying "loading". */}
        <g className="animate-ring" style={{ transformOrigin: '50px 50px', transformBox: 'view-box' }}>
          {Array.from({ length: 24 }, (_, i) => (
            <line
              key={i}
              x1={50}
              y1={4}
              x2={50}
              y2={i % 4 === 0 ? 10 : 7.5}
              stroke={colors.accent}
              strokeWidth={i % 4 === 0 ? 1.4 : 0.7}
              opacity={i % 4 === 0 ? 0.85 : 0.4}
              transform={`rotate(${i * 15} 50 50)`}
            />
          ))}
        </g>

        <polygon points={hexPoints(38)} fill="none" stroke={colors.accent} strokeWidth={1} opacity={0.5} />
        <polygon
          points={hexPoints(30)}
          fill="none"
          stroke={colors.accentSecondary}
          strokeWidth={1.2}
          opacity={0.75}
        />
        <polygon points={hexPoints(21)} fill="none" stroke={colors.accent} strokeWidth={0.7} opacity={0.35} />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-4xl font-bold leading-none text-accent text-glow">{level}</span>
      </div>
    </div>
  );
}
