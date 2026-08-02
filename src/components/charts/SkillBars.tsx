import { useRef } from 'react';
import { gsap, useGsap } from '../../lib/gsap';
import { colors } from '../../constants/theme';

// Per-skill breakdown — the §10 Phase 2 skill dashboard.
//
// Colour decision, and it is deliberate: **the bars are one hue, not eight.** Ranking eight
// skills is a magnitude job, and magnitude takes a sequential single hue. Running the dataviz
// validator over the app's eight skill colours settled it empirically — no eight-hue set can
// pass all-pairs CVD separation on this dark surface (best achievable ΔE 7.3 against a target
// of 8, and the candidates that scored highest were muted colours that would gut the §5 neon
// look). Eight hues is at the stated token ceiling for a reason.
//
// So identity is carried by the skill's own colour on a small marker that ALWAYS sits beside
// its name — colour plus label, never colour alone — while length carries the comparison. The
// palette keeps its character and nothing depends on telling violet from blue at a glance.

export interface SkillRow {
  id: string;
  name: string;
  color: string | null;
  level: number;
  xp: number;
  count: number;
}

interface Props {
  rows: SkillRow[];
  animateKey: string;
  emptyText: string;
}

export function SkillBars({ rows, animateKey, emptyText }: Props) {
  const root = useRef<HTMLDivElement | null>(null);
  const max = Math.max(...rows.map((r) => r.xp), 1);

  useGsap(
    root,
    () => {
      const fills = gsap.utils.toArray<HTMLElement>('[data-fill]');
      const nums = gsap.utils.toArray<HTMLElement>('[data-count-to]');
      if (fills.length) {
        gsap.fromTo(
          fills,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05 }
        );
      }
      // Count the XP figures up rather than printing them: the number arriving at the same
      // time as the bar it labels is what makes the row feel measured rather than drawn.
      nums.forEach((el, i) => {
        const target = Number(el.dataset.countTo ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 0.7,
          delay: i * 0.05,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(obj.v));
          },
        });
      });
    },
    [animateKey]
  );

  if (!rows.length) {
    return <p className="py-4 text-center text-[13px] text-muted">{emptyText}</p>;
  }

  return (
    <div ref={root} className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.id}>
          <div className="mb-1 flex items-baseline gap-2">
            {/* Identity marker — never on its own, always immediately left of the name. */}
            <span
              className="size-2 shrink-0 rotate-45 rounded-[1px]"
              style={{
                backgroundColor: r.color ?? colors.accent,
                boxShadow: `0 0 6px ${r.color ?? colors.accent}`,
              }}
              aria-hidden
            />
            <span className="truncate font-display text-[13px] uppercase tracking-[0.12em] text-fg">
              {r.name}
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-muted">
              Lv {r.level}
            </span>
            <span className="ml-auto shrink-0 font-display text-[13px] tabular-nums text-accent">
              <span data-count-to={r.xp}>0</span>
              <span className="text-[10px] text-muted"> XP</span>
            </span>
            <span className="shrink-0 font-display text-[10px] tabular-nums text-muted">
              ×{r.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-alt">
            <div
              data-fill
              className="h-full origin-left rounded-full"
              style={{
                width: `${(r.xp / max) * 100}%`,
                backgroundColor: colors.accent,
                boxShadow: `0 0 6px ${colors.accent}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
