import type { Difficulty } from '../types';
import { DIFFICULTY_XP, LEVEL_CURVE } from './tuning';

export function xpForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_XP[difficulty];
}

// Cumulative total XP required to REACH `level` (from level 1) — §7
export function xpRequiredForLevel(level: number): number {
  return Math.round((LEVEL_CURVE.base * Math.pow(level, LEVEL_CURVE.exponent)) / 10) * 10;
}

export function levelForTotalXp(totalXp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= totalXp) level++;
  return level;
}

// §7: skill XP is split evenly across all tagged skills; character always gets full XP.
export function splitSkillXp(taskXp: number, tagCount: number): number {
  if (tagCount <= 0) return 0;
  return Math.round(taskXp / tagCount);
}

// XP still needed to reach the next level, and progress within the current step (for XP bars)
export function levelProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0..1 within the current step
} {
  const level = levelForTotalXp(totalXp);
  const currentLevelXp = level === 1 ? 0 : xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const progress = (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return { level, currentLevelXp, nextLevelXp, progress };
}
