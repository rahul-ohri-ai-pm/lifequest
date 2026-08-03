import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { colors } from '../../constants/theme';

// The hexagonal radar from the design reference, drawn as SVG rather than pulled from a
// charting library — a polygon and some rings are ~30 lines of geometry, and no chart
// package survives the §3 bundle rule.
//
// The reference plots invented axes (Daily Quests / Discipline / Growth). Here the axes are
// the user's strongest skills, so the shape says something true: a lopsided web is a real
// signal that one area is being neglected.

export interface RadarAxis {
  label: string;
  /** Raw magnitude — levels. Normalised against the largest value in the set. */
  value: number;
}

interface Props {
  axes: RadarAxis[];
  className?: string;
  size?: number;
}

const R = 78;
const C = 100;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(i: number, n: number, t: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [C + R * t * Math.cos(angle), C + R * t * Math.sin(angle)];
}

function polygon(n: number, t: number, values?: number[]): string {
  return Array.from({ length: n }, (_, i) => point(i, n, values ? values[i] : t).join(',')).join(' ');
}

export function SkillRadar({ axes, className, size = 220 }: Props) {
  // A radar needs at least a triangle. Fewer skills than that is the SkillRow list's job.
  if (axes.length < 3) return null;

  const n = axes.length;
  // Normalise against the strongest axis, with a floor so a brand-new character (every
  // skill at level 1) draws a small honest shape instead of dividing by zero.
  const max = Math.max(...axes.map((a) => a.value), 1);
  const values = axes.map((a) => Math.max(a.value / max, 0.08));

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={`Skill balance: ${axes.map((a) => `${a.label} ${a.value}`).join(', ')}`}
    >
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.45} />
          <stop offset="100%" stopColor={colors.accentSecondary} stopOpacity={0.2} />
        </linearGradient>
      </defs>

      {RINGS.map((t) => (
        <polygon
          key={t}
          points={polygon(n, t)}
          fill="none"
          stroke={colors.panelBorder}
          strokeWidth={1}
        />
      ))}

      {axes.map((axis, i) => {
        const [x, y] = point(i, n, 1);
        return <line key={axis.label} x1={C} y1={C} x2={x} y2={y} stroke={colors.panelBorder} strokeWidth={1} />;
      })}

      {/* The shape blooms out of the centre — the one moment of motion the chart gets. */}
      <motion.polygon
        points={polygon(n, 1, values)}
        fill="url(#radar-fill)"
        stroke={colors.accent}
        strokeWidth={1.5}
        style={{ transformOrigin: '100px 100px' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {axes.map((axis, i) => {
        const [vx, vy] = point(i, n, values[i]);
        const [lx, ly] = point(i, n, 1.2);
        return (
          <g key={axis.label}>
            <circle cx={vx} cy={vy} r={3} fill={colors.accent} />
            <text
              x={lx}
              y={ly}
              textAnchor={lx > C + 4 ? 'start' : lx < C - 4 ? 'end' : 'middle'}
              dominantBaseline={ly > C ? 'hanging' : 'auto'}
              className="font-display uppercase"
              fontSize={11}
              letterSpacing={1}
              fill={colors.textSecondary}
            >
              {axis.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
