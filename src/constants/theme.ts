// §5 Design & Visual Style — dark-only "system window" aesthetic
import type { Difficulty } from '../types';

export const colors = {
  background: '#0A0E17',
  backgroundAlt: '#0D1220',
  panel: '#131A2B',
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
