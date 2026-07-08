// §7 tunable constants
import type { Difficulty } from '../types';

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  trivial: 5,
  easy: 10,
  medium: 25,
  hard: 50,
  epic: 100,
};

export const LEVEL_CURVE = {
  base: 100,
  exponent: 1.5,
} as const;
