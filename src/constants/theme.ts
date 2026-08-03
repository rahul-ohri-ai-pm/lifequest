// §5 Design & Visual Style — dark-only "system window" aesthetic.
//
// Tailwind utilities (bg-panel, text-accent, border-edge, text-epic…) are the primary way
// to reach these colors; the tokens themselves live in src/index.css under @theme. This
// file exists for the handful of places that need a *value* rather than a class: SVG
// stroke/fill props, gauge colors, and inline styles driven by data (a skill's stored
// color, a difficulty ramp entry). Keep the two in sync.
import type { Difficulty } from '../types';

export const colors = {
  background: '#0A0E17',
  backgroundAlt: '#0D1220',
  panel: '#131A2B',
  panelRaised: '#182238',
  panelBorder: '#22304D',
  accent: '#4C8DFF',
  accentSecondary: '#8B5CF6',
  textPrimary: '#E6E9F2',
  textSecondary: '#8A93A8',
  /** Gold. Shares the Epic tier's value on purpose: streaks and Epic quests are the two
   *  "rarest thing on the screen" signals, and they should read as the same signal. */
  epic: '#F5B942',
} as const;

// Rarity/difficulty accent ramp (Trivial→Epic), echoing RPG item-rarity coloring
export const difficultyColors: Record<Difficulty, string> = {
  trivial: '#6B7280',
  easy: '#34D399',
  medium: '#4C8DFF',
  hard: '#8B5CF6',
  epic: '#F5B942',
};

// Tailwind text-color classes for the same ramp, for the common case where a class
// beats an inline style.
export const difficultyTextClass: Record<Difficulty, string> = {
  trivial: 'text-trivial',
  easy: 'text-easy',
  medium: 'text-medium',
  hard: 'text-hard',
  epic: 'text-epic',
};

// Shared type scale (§5): screen titles, panel labels, and large numerals use the display
// face; body text stays on the system font. Exported as class strings so the four routes
// stop each inventing their own.
export const text = {
  screenTitle: 'font-display text-3xl tracking-wide text-fg',
  panelLabel: 'font-display text-xs uppercase tracking-[0.2em] text-muted',
  statNumber: 'font-display text-3xl text-accent',
  meta: 'text-xs text-muted',
} as const;
