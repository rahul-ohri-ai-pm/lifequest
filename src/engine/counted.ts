// Counted-task award rule (§7): the log entry whose cumulative sum for the day
// FIRST reaches the target carries the full difficulty XP; everything else awards 0.
// Decided at log time against the target at that moment — target edits never retro-adjust.
import type { Difficulty } from '../types';
import { xpForDifficulty } from './xp';

export function xpForCountedLog(
  priorSumToday: number,
  amount: number,
  targetCount: number,
  difficulty: Difficulty
): number {
  const crossesTarget = priorSumToday < targetCount && priorSumToday + amount >= targetCount;
  return crossesTarget ? xpForDifficulty(difficulty) : 0;
}
