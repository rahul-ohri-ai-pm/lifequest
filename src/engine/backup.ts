// Phase 3 JSON export/import (§10, CLAUDE.md §2 non-goals — this is the backup story a
// no-server app gets instead of cloud sync). Pure shape validation only: parsing a file the
// user hands back to the app is an external input, and the db layer must never `INSERT` a row
// this hasn't already checked field-by-field.
//
// `BackupPayload` mirrors the domain types in `src/types/`, not the raw DB rows — with one
// exception (`BackupStreakReset`) noted below.

import type {
  BadgeUnlock,
  Character,
  Completion,
  SkillDef,
  Skip,
  Streak,
  Task,
} from '../types';

export const BACKUP_FORMAT_VERSION = 1;

export interface TaskSkillLink {
  taskId: string;
  skillId: string;
}

export interface SettingEntry {
  key: string;
  value: string;
}

/**
 * `streak_resets.day` has no home in the domain `StreakReset` type — `db/queries/streaks.ts`
 * drops it because nothing else needs it — but re-inserting a row without it would violate the
 * table's `UNIQUE(streak_id, day)` constraint, so the backup carries it separately.
 */
export interface BackupStreakReset {
  id: string;
  streakId: string;
  brokenStreakLength: number;
  resetAt: string;
  day: string;
}

export interface BackupPayload {
  formatVersion: number;
  exportedAt: string;
  character: Character;
  tasks: Task[];
  completions: Completion[];
  skips: Skip[];
  skills: SkillDef[];
  taskSkills: TaskSkillLink[];
  streaks: Streak[];
  streakResets: BackupStreakReset[];
  badgeUnlocks: BadgeUnlock[];
  settings: SettingEntry[];
}

export class BackupValidationError extends Error {}

function fail(reason: string): never {
  throw new BackupValidationError(reason);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string') fail(`${field} must be a string`);
  return v;
}

function strOrNull(v: unknown, field: string): string | null {
  return v === null || v === undefined ? null : str(v, field);
}

function num(v: unknown, field: string): number {
  if (typeof v !== 'number' || Number.isNaN(v)) fail(`${field} must be a number`);
  return v;
}

function numOrNull(v: unknown, field: string): number | null {
  return v === null || v === undefined ? null : num(v, field);
}

function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  const s = str(v, field);
  if (!(allowed as readonly string[]).includes(s)) {
    fail(`${field} must be one of ${allowed.join(', ')} (got "${s}")`);
  }
  return s as T;
}

function arrayField(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) fail(`${field} must be an array`);
  return v;
}

function parseArray<T>(
  v: unknown,
  field: string,
  parseItem: (item: Record<string, unknown>, i: number) => T
): T[] {
  return arrayField(v, field).map((item, i) => {
    if (!isRecord(item)) fail(`${field}[${i}] must be an object`);
    return parseItem(item, i);
  });
}

const TASK_TYPES = ['todo', 'habit', 'counted'] as const;
const DIFFICULTIES = ['trivial', 'easy', 'medium', 'hard', 'epic'] as const;
const ACTIVE_ARCHIVED = ['active', 'archived'] as const;

function parseTask(v: Record<string, unknown>, i: number): Task {
  const p = `tasks[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    title: str(v.title, `${p}.title`),
    notes: strOrNull(v.notes, `${p}.notes`),
    type: oneOf(v.type, `${p}.type`, TASK_TYPES),
    difficulty: oneOf(v.difficulty, `${p}.difficulty`, DIFFICULTIES),
    // Schedule shape isn't re-validated here — `src/engine/time.ts` already treats an
    // unrecognised schedule as "no schedule" rather than throwing, so a malformed one degrades
    // gracefully on read instead of blocking the whole import.
    schedule: (v.schedule ?? null) as Task['schedule'],
    targetCount: numOrNull(v.targetCount, `${p}.targetCount`),
    dueAt: strOrNull(v.dueAt, `${p}.dueAt`),
    reminderAt: strOrNull(v.reminderAt, `${p}.reminderAt`),
    status: oneOf(v.status, `${p}.status`, ACTIVE_ARCHIVED),
    createdAt: str(v.createdAt, `${p}.createdAt`),
    updatedAt: str(v.updatedAt, `${p}.updatedAt`),
  };
}

function parseCompletion(v: Record<string, unknown>, i: number): Completion {
  const p = `completions[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    taskId: str(v.taskId, `${p}.taskId`),
    completedAt: str(v.completedAt, `${p}.completedAt`),
    progressCount: numOrNull(v.progressCount, `${p}.progressCount`),
    xpAwarded: num(v.xpAwarded, `${p}.xpAwarded`),
    createdAt: str(v.createdAt, `${p}.createdAt`),
  };
}

function parseSkip(v: Record<string, unknown>, i: number): Skip {
  const p = `skips[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    taskId: str(v.taskId, `${p}.taskId`),
    day: str(v.day, `${p}.day`),
    createdAt: str(v.createdAt, `${p}.createdAt`),
  };
}

function parseSkill(v: Record<string, unknown>, i: number): SkillDef {
  const p = `skills[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    name: str(v.name, `${p}.name`),
    icon: strOrNull(v.icon, `${p}.icon`),
    color: strOrNull(v.color, `${p}.color`),
    totalXp: num(v.totalXp, `${p}.totalXp`),
    level: num(v.level, `${p}.level`),
    status: oneOf(v.status, `${p}.status`, ACTIVE_ARCHIVED),
    createdAt: str(v.createdAt, `${p}.createdAt`),
  };
}

function parseTaskSkillLink(v: Record<string, unknown>, i: number): TaskSkillLink {
  const p = `taskSkills[${i}]`;
  return { taskId: str(v.taskId, `${p}.taskId`), skillId: str(v.skillId, `${p}.skillId`) };
}

function parseStreak(v: Record<string, unknown>, i: number): Streak {
  const p = `streaks[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    taskId: strOrNull(v.taskId, `${p}.taskId`),
    currentStreak: num(v.currentStreak, `${p}.currentStreak`),
    longestStreak: num(v.longestStreak, `${p}.longestStreak`),
    resetCount: num(v.resetCount, `${p}.resetCount`),
    lastActiveDate: strOrNull(v.lastActiveDate, `${p}.lastActiveDate`),
    updatedAt: str(v.updatedAt, `${p}.updatedAt`),
  };
}

function parseStreakReset(v: Record<string, unknown>, i: number): BackupStreakReset {
  const p = `streakResets[${i}]`;
  return {
    id: str(v.id, `${p}.id`),
    streakId: str(v.streakId, `${p}.streakId`),
    brokenStreakLength: num(v.brokenStreakLength, `${p}.brokenStreakLength`),
    resetAt: str(v.resetAt, `${p}.resetAt`),
    day: str(v.day, `${p}.day`),
  };
}

function parseBadgeUnlock(v: Record<string, unknown>, i: number): BadgeUnlock {
  const p = `badgeUnlocks[${i}]`;
  return { badgeKey: str(v.badgeKey, `${p}.badgeKey`), unlockedAt: str(v.unlockedAt, `${p}.unlockedAt`) };
}

function parseSetting(v: Record<string, unknown>, i: number): SettingEntry {
  const p = `settings[${i}]`;
  return { key: str(v.key, `${p}.key`), value: str(v.value, `${p}.value`) };
}

function parseCharacter(v: unknown): Character {
  if (!isRecord(v)) fail('character must be an object');
  return {
    totalXp: num(v.totalXp, 'character.totalXp'),
    level: num(v.level, 'character.level'),
    updatedAt: str(v.updatedAt, 'character.updatedAt'),
  };
}

/**
 * Structural validation for a file the user hands back to the app. Throws
 * `BackupValidationError` with a specific, user-showable reason on the first problem found —
 * no DB, no I/O, fully deterministic, so this is unit-tested directly (§8).
 */
export function parseBackupPayload(data: unknown): BackupPayload {
  if (!isRecord(data)) fail('The file is not a LifeQuest backup (expected a JSON object).');

  const formatVersion = num(data.formatVersion, 'formatVersion');
  if (formatVersion !== BACKUP_FORMAT_VERSION) {
    fail(
      `This backup is format version ${formatVersion}, but this version of LifeQuest reads ` +
        `version ${BACKUP_FORMAT_VERSION}. Open it with a matching app version.`
    );
  }

  return {
    formatVersion,
    exportedAt: str(data.exportedAt, 'exportedAt'),
    character: parseCharacter(data.character),
    tasks: parseArray(data.tasks, 'tasks', parseTask),
    completions: parseArray(data.completions, 'completions', parseCompletion),
    skips: parseArray(data.skips, 'skips', parseSkip),
    skills: parseArray(data.skills, 'skills', parseSkill),
    taskSkills: parseArray(data.taskSkills, 'taskSkills', parseTaskSkillLink),
    streaks: parseArray(data.streaks, 'streaks', parseStreak),
    streakResets: parseArray(data.streakResets, 'streakResets', parseStreakReset),
    badgeUnlocks: parseArray(data.badgeUnlocks, 'badgeUnlocks', parseBadgeUnlock),
    settings: parseArray(data.settings, 'settings', parseSetting),
  };
}
