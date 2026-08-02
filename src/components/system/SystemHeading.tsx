import { useRef } from 'react';
import { gsap, SplitText, useGsap } from '../../lib/gsap';
import { cn } from '../../lib/utils';

// Screen titles assemble character by character, each one dropping in with a slight 3D
// rotation, while the whole word's tracking tightens. It reads as a readout being written
// rather than a heading being shown — which is the entire point of the "system window"
// aesthetic.
//
// SplitText is why GSAP is here: doing this with `motion` means either hand-splitting the
// string into a span per character and managing a stagger by hand, or animating the word as
// one block and losing the effect. SplitText also cleans up after itself (`revert()`), so the
// DOM goes back to a plain text node — important for screen readers, which would otherwise
// read a title one letter at a time.

interface Props {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Re-runs the reveal when this changes — pass the route so titles animate per screen. */
  animateKey?: string;
}

const sizes = {
  sm: { className: 'text-xs', tracking: '0.22em' },
  md: { className: 'text-xl', tracking: '0.14em' },
  lg: { className: 'text-3xl', tracking: '0.1em' },
  xl: { className: 'text-[40px] leading-none', tracking: '0.06em' },
} as const;

export function SystemHeading({ children, className, as: Tag = 'h2', size = 'md', animateKey }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const { className: sizeClass, tracking } = sizes[size];

  useGsap(
    ref,
    () => {
      const el = ref.current;
      if (!el) return;
      const split = new SplitText(el, { type: 'chars' });
      gsap
        .timeline()
        .fromTo(
          split.chars,
          { opacity: 0, yPercent: 60, rotateX: -75 },
          { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.45, stagger: 0.028, ease: 'back.out(1.8)' }
        )
        .fromTo(el, { letterSpacing: '0.42em' }, { letterSpacing: tracking, duration: 0.55 }, 0);
      // Restores the original text node, so assistive tech reads a word, not letters.
      return () => split.revert();
    },
    [animateKey, children]
  );

  return (
    // The key is load-bearing, not a formality. SplitText replaces the text node with a span
    // per character — DOM that React believes it owns. On navigation React commits the new
    // title first and the layout-effect cleanup runs `split.revert()` *after*, which restores
    // the **previous** text and leaves the heading permanently stale (every screen read
    // "TODAY"). Re-keying makes React mount a fresh node instead of patching a split one, so
    // the revert only ever touches the discarded element.
    <Tag
      key={animateKey ?? children}
      ref={ref as React.Ref<never>}
      className={cn('font-display uppercase text-fg text-glow', sizeClass, className)}
      style={{ perspective: 500, letterSpacing: tracking }}
    >
      {children}
    </Tag>
  );
}
