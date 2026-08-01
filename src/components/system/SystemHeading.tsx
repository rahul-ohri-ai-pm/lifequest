import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

// Glowing display caps, with the entrance taken from the motion reference: the title
// resolves out of a blur while its letter-spacing tightens, rather than sliding in. It is
// the one move from that reference that costs nothing — two animated properties, both
// cheap — and it is what makes a heading feel like a system readout materialising instead
// of a DOM node appearing.
//
// <MotionConfig reducedMotion="user"> in main.tsx reduces this to a plain opacity fade for
// anyone who has asked the OS for less motion.

interface Props {
  children: React.ReactNode;
  className?: string;
  /** `h1` on screen titles, `h2`/`h3` for panel headings. */
  as?: 'h1' | 'h2' | 'h3' | 'span';
  size?: 'sm' | 'md' | 'lg';
  /** Re-runs the entrance when this changes — pass the route so titles animate per screen. */
  animateKey?: string;
}

// Tracking is an animation target, so it lives here as a value rather than in a Tailwind
// class — motion needs somewhere to land, and `undefined` is not a keyframe.
const sizes = {
  sm: { className: 'text-xs', tracking: '0.22em' },
  md: { className: 'text-xl', tracking: '0.14em' },
  lg: { className: 'text-3xl', tracking: '0.1em' },
} as const;

const tags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  span: motion.span,
} as const;

export function SystemHeading({ children, className, as = 'h2', size = 'md', animateKey }: Props) {
  const Tag = tags[as];
  const { className: sizeClass, tracking } = sizes[size];

  return (
    <Tag
      key={animateKey}
      initial={{ opacity: 0, filter: 'blur(8px)', letterSpacing: '0.4em' }}
      animate={{ opacity: 1, filter: 'blur(0px)', letterSpacing: tracking }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('font-display uppercase text-fg text-glow', sizeClass, className)}
    >
      {children}
    </Tag>
  );
}
