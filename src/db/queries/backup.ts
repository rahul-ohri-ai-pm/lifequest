// Phase 3 JSON export/import (§10) — the backup story this offline-first, no-server app gets
// instead of cloud sync (DECISIONS.md D43). Export reads every table through the existing
// query modules; import replaces every row wholesale inside one write transaction.
//
// The `BackupPayload` shape and its field-by-field validation live in `src/engine/backup.ts`
// (pure, unit-tested) — this file only knows how to turn that shape into SQL and back.

import { getDb } from '../client';
import { withWriteTransaction } from '../transaction';
import {
  BACKUP_FORMAT_VERSION,
  type BackupPayload,
  type BackupStreakReset,
} from '../../engine/backup';
import { getActiveTasks, getArchivedTasks } from './tasks';
import { getAllCompletions } from './completions';
import { getAllSkips } from './skips';
import { getSkills, getAllTaskSkills } from './skills';
import { getStreaks } from './streaks';
import { getBadgeUnlocks } from './badges';
import { getCharacter } from './character';
import { getAllSettings } from './settings';

interface StreakResetRow {
  id: string;
  streak_id: string;
  broken_streak_length: number;
  reset_at: string;
  day: string;
}

// Not exposed by db/queries/streaks.ts (`getStreakResets` drops `day` — nothing else reads
// it), so the backup reads the table directly to keep the column the re-insert needs.
async function getBackupStreakResets(): Promise<BackupStreakReset[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StreakResetRow>(
    'SELECT * FROM streak_resets ORDER BY reset_at ASC'
  );
  return rows.map((r) => ({
    id: r.id,
    streakId: r.streak_id,
    brokenStreakLength: r.broken_streak_length,
    resetAt: r.reset_at,
    day: r.day,
  }));
}

export async function exportBackup(now: Date): Promise<BackupPayload> {
  const [tasksActive, tasksArchived, completions, skips, skills, taskSkills, streaks, streakResets, badgeUnlocks, character, settings] =
    await Promise.all([
      getActiveTasks(),
      getArchivedTasks(),
      getAllCompletions(),
      getAllSkips(),
      getSkills(),
      getAllTaskSkills(),
      getStreaks(),
      getBackupStreakResets(),
      getBadgeUnlocks(),
      getCharacter(),
      getAllSettings(),
    ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    character,
    tasks: [...tasksActive, ...tasksArchived],
    completions,
    skips,
    skills,
    taskSkills,
    streaks,
    streakResets,
    badgeUnlocks,
    settings,
  };
}

/**
 * Replaces every domain table with the rows in `payload`, inside one write transaction —
 * either the whole restore lands or none of it does. `schema_migrations` is untouched: a
 * backup restores data onto the schema already running, not a schema of its own.
 *
 * Delete order is children-before-parents and insert order is parents-before-children,
 * matching the FK graph (`PRAGMA foreign_keys = ON` — sqlite.worker.ts).
 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  const db = await getDb();

  await withWriteTransaction(db, async (txn) => {
    await txn.execAsync(`
      DELETE FROM task_skills;
      DELETE FROM streak_resets;
      DELETE FROM completions;
      DELETE FROM skips;
      DELETE FROM streaks;
      DELETE FROM badge_unlocks;
      DELETE FROM tasks;
      DELETE FROM skills;
      DELETE FROM settings;
    `);

    for (const s of payload.skills) {
      await txn.runAsync(
        `INSERT INTO skills (id, name, icon, color, total_xp, level, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.name,
        s.icon,
        s.color,
        s.totalXp,
        s.level,
        s.status,
        s.createdAt
      );
    }

    for (const t of payload.tasks) {
      await txn.runAsync(
        `INSERT INTO tasks (id, title, notes, type, difficulty, schedule_json, target_count,
           due_at, reminder_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.title,
        t.notes,
        t.type,
        t.difficulty,
        t.schedule ? JSON.stringify(t.schedule) : null,
        t.targetCount,
        t.dueAt,
        t.reminderAt,
        t.status,
        t.createdAt,
        t.updatedAt
      );
    }

    for (const c of payload.completions) {
      await txn.runAsync(
        `INSERT INTO completions (id, task_id, completed_at, progress_count, xp_awarded, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        c.id,
        c.taskId,
        c.completedAt,
        c.progressCount,
        c.xpAwarded,
        c.createdAt
      );
    }

    for (const s of payload.skips) {
      await txn.runAsync(
        'INSERT INTO skips (id, task_id, day, created_at) VALUES (?, ?, ?, ?)',
        s.id,
        s.taskId,
        s.day,
        s.createdAt
      );
    }

    for (const link of payload.taskSkills) {
      await txn.runAsync(
        'INSERT INTO task_skills (task_id, skill_id) VALUES (?, ?)',
        link.taskId,
        link.skillId
      );
    }

    for (const st of payload.streaks) {
      await txn.runAsync(
        `INSERT INTO streaks (id, task_id, current_streak, longest_streak, reset_count,
           last_active_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        st.id,
        st.taskId,
        st.currentStreak,
        st.longestStreak,
        st.resetCount,
        st.lastActiveDate,
        st.updatedAt
      );
    }

    for (const r of payload.streakResets) {
      await txn.runAsync(
        `INSERT INTO streak_resets (id, streak_id, broken_streak_length, reset_at, day)
         VALUES (?, ?, ?, ?, ?)`,
        r.id,
        r.streakId,
        r.brokenStreakLength,
        r.resetAt,
        r.day
      );
    }

    for (const b of payload.badgeUnlocks) {
      await txn.runAsync(
        'INSERT INTO badge_unlocks (badge_key, unlocked_at) VALUES (?, ?)',
        b.badgeKey,
        b.unlockedAt
      );
    }

    for (const entry of payload.settings) {
      await txn.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', entry.key, entry.value);
    }

    await txn.runAsync(
      'UPDATE character SET total_xp = ?, level = ?, updated_at = ? WHERE id = 1',
      payload.character.totalXp,
      payload.character.level,
      payload.character.updatedAt
    );
  });
}
