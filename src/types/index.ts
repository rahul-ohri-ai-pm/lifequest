// Domain types for all three phases (§4 schema). Types are free; migrations are forever.

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'epic';
export type TaskType = 'todo' | 'habit' | 'counted';
export type TaskStatus = 'active' | 'archived';

export type Schedule = { freq: 'daily' } | { freq: 'custom'; days: number[] }; // days: 0-6, Sun-Sat

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  type: TaskType;
  difficulty: Difficulty;
  schedule: Schedule | null; // habit only (schedule_json)
  targetCount: number | null; // counted only
  dueAt: string | null; // ISO datetime
  reminderAt: string | null; // ISO datetime
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Completion {
  id: string;
  taskId: string;
  completedAt: string; // ISO datetime — source of truth for all stats
  progressCount: number | null; // counted tasks only
  xpAwarded: number;
  createdAt: string;
}

export interface Skip {
  id: string;
  taskId: string;
  day: string; // local dayKey YYYY-MM-DD
  createdAt: string;
}

export interface Character {
  totalXp: number;
  level: number;
  updatedAt: string;
}

// ---- Phase 2 ----

export interface SkillDef {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  totalXp: number;
  level: number;
  createdAt: string;
}

export interface Streak {
  id: string;
  taskId: string | null; // null = global "active day" streak
  currentStreak: number;
  longestStreak: number;
  resetCount: number;
  lastActiveDate: string | null; // dayKey
  updatedAt: string;
}

export interface StreakReset {
  id: string;
  streakId: string;
  brokenStreakLength: number;
  resetAt: string;
}

export interface BadgeUnlock {
  badgeKey: string;
  unlockedAt: string;
}

// ---- Phase 3 ----

export type GoalType = 'skill_level' | 'aggregate_count' | 'streak_length' | 'completion_count';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetJson: string;
  progress: number;
  status: GoalStatus;
  bonusXp: number;
  createdAt: string;
  completedAt: string | null;
}
