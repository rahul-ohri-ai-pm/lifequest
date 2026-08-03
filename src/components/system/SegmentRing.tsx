import { useRef } from 'react';
import { gsap, useGsap } from '../../lib/gsap';
import { colors } from '../../constants/theme';

// A progress ring cut into discrete segments.
//
// The straight segmented rail this replaces made the right argument — twenty cells read as a
// game resource where a continuous bar reads as a loading indicator — but it spent the widest
// element on the screen saying one number. Bending it into a ring frees the middle for the
// thing the user actually came to see (their level), which is the structure the reference
// screen uses: one large numeral inside a thick arc, flanked by two secondary counters.
//
// Everything is code-drawn: `segments` <path> arcs, one gradient, one CSS bloom. No filter
// primitives — an feGaussianBlur here would re-rasterise the hero on every repaint, and §3's
// budget does not stretch to a permanently expensive header.

interface Props {
  /** 0..1 within the current level step. */
  progress: number;
  segments?: number;
  size?: number;
  strokeWidth?: number;
  /** Degrees of empty space between neighbouring segments. */
  gap?: number;
  children?: React.ReactNode;
  className?: string;
}

// Blue → violet around the ring, computed per segment rather than declared as an SVG
// gradient. A <linearGradient> is laid out across the element's *bounding box*, so the first
// segment — the one at twelve o'clock, the one the eye starts on — landed halfway along the
// ramp and came out violet. Interpolating by index instead guarantees the ring starts on the
// §5 primary and only reaches the secondary accent at the far end.
function ramp(t: number): string {
  const a = [0x4c, 0x8d, 0xff];
  const b = [0x8b, 0x5c, 0xf6];
  const hex = a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`;
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const x0 = cx + r * Math.cos(from);
  const y0 = cy + r * Math.sin(from);
  const x1 = cx + r * Math.cos(to);
  const y1 = cy + r * Math.sin(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function SegmentRing({
  progress,
  segments = 24,
  size = 168,
  strokeWidth = 11,
  gap = 3.4,
  children,
  className,
}: Props) {
  const root = useRef<HTMLDivElement | null>(null);
  const prevFilled = useRef<number | null>(null);

  const filled = Math.round(Math.min(Math.max(progress, 0), 1) * segments);
  const c = size / 2;
  const r = c - strokeWidth / 2 - 1;
  const step = (Math.PI * 2) / segments;
  const pad = (gap * Math.PI) / 360;

  useGsap(
    root,
    () => {
      const lit = gsap.utils.toArray<SVGPathElement>('[data-seg-on]');
      const from = prevFilled.current;
      prevFilled.current = filled;
      // A brand-new character has nothing lit, and GSAP warns on an empty target list.
      if (!lit.length) return;

      if (from === null) {
        // First paint: the ring draws itself round once, so the hero introduces itself.
        gsap.fromTo(
          lit,
          { opacity: 0, transformOrigin: `${c}px ${c}px`, scale: 0.86 },
          { opacity: 1, scale: 1, duration: 0.34, stagger: 0.022, ease: 'power2.out' }
        );
        return;
      }
      if (filled > from) {
        // XP gained: only the newly-earned segments fire, with a brief thickening pop.
        const gained = lit.slice(from);
        if (!gained.length) return;
        gsap
          .timeline()
          .fromTo(gained, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.05 })
          .fromTo(
            gained,
            { attr: { 'stroke-width': strokeWidth } },
            { attr: { 'stroke-width': strokeWidth + 5 }, duration: 0.16, stagger: 0.05 },
            '<'
          )
          .to(gained, { attr: { 'stroke-width': strokeWidth }, duration: 0.32 }, '>-0.12');
      }
    },
    [filled]
  );

  return (
    <div ref={root} className={className} style={{ width: size, height: size, position: 'relative' }}>
      {/* Bloom behind the arc. A static radial gradient costs one paint; the SVG filter that
          would give the same look costs one per repaint of the region. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-full"
        style={{
          background: `radial-gradient(circle, rgb(76 141 255 / 0.16) 40%, transparent 72%)`,
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        {Array.from({ length: segments }, (_, i) => {
          const on = i < filled;
          // -90° so segment 0 sits at the top and the ring fills clockwise.
          const a0 = -Math.PI / 2 + i * step + pad;
          const a1 = -Math.PI / 2 + (i + 1) * step - pad;
          return (
            <path
              key={i}
              {...(on ? { 'data-seg-on': '' } : {})}
              d={arc(c, c, r, a0, a1)}
              fill="none"
              strokeLinecap="butt"
              strokeWidth={strokeWidth}
              stroke={on ? ramp(i / (segments - 1)) : colors.panelBorder}
              opacity={on ? 1 : 0.45}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
