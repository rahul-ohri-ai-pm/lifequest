// §5 Design & Visual Style — dark-only "system window" aesthetic
import type { Difficulty } from '../types';

export const colors = {
  background: '#0A0E17',
  backgroundAlt: '#0D1220',
  panel: '#131A2B',
  panelRaised: '#182238', // a completed/active card lifts off the list
  panelBorder: '#22304D', // quiet divider; the accent border is reserved for emphasis
  accent: '#4C8DFF',
  accentSecondary: '#8B5CF6',
  textPrimary: '#E6E9F2',
  textSecondary: '#8A93A8',
} as const;

export const difficultyColors: Record<Difficulty, string> = {
  trivial: '#6B7280',
  easy: '#34D399',
  medium: '#4C8DFF',
  hard: '#8B5CF6',
  epic: '#F5B942',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

// 1px glow border treatment for panels (§5)
export const glow = {
  borderWidth: 1,
  borderColor: colors.accent,
  shadowColor: colors.accent,
  shadowOpacity: 0.35,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 0 },
  elevation: 4,
} as const;

// A stronger glow, reserved for the one element on screen that is *the* moment —
// a completed quest, a level-up. Ordinary panels use `glow`; if everything glows
// equally then nothing reads as emphasised, which is what the first build did.
export const glowStrong = {
  shadowColor: colors.accent,
  shadowOpacity: 0.9,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
} as const;

// §5 typography. Rajdhani (display) is for headers, numbers, and level-up moments
// only — body text stays on the system font, which is both the spec and the
// cheaper render. Weights loaded in app/_layout.tsx must match these names.
export const type = {
  display: 'Rajdhani_700Bold',
  displayRegular: 'Rajdhani_400Regular',
} as const;

// Screen titles, panel headers, and any large numeral share one scale so the
// four tabs stop each inventing their own.
export const text = {
  screenTitle: { fontFamily: type.display, fontSize: 28, letterSpacing: 1 },
  panelLabel: {
    fontFamily: type.display,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  statNumber: { fontFamily: type.display, fontSize: 30, color: colors.accent },
  cardTitle: { fontSize: 16, color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
} as const;
