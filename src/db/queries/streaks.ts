import { getDb } from '../client';
import { withWriteTransaction } from '../transaction';
import type { Streak, StreakReset } from '../../types';
import type { StreakBreak } from '../../engine/streaks';

interface StreakRow {
  id: string;
  task_id: string | null;
  current_streak: number;
  longest_streak: number;
  reset_count: number;
  last_active_date: string | null;
  updated_at: string;
}

interface ResetRow {
  id: string;
  streak_id: string;
  broken_streak_length: number;
  reset_at: string;
  day: string;
}

function toStreak(r: StreakRow): Streak {
  return {
    id: r.id,
    taskId: r.task_id,
    currentStreak: r.current_streak,
    longestStreak: r.longest_streak,
    resetCount: r.reset_count,
    lastActiveDate: r.last_active_date,
    updatedAt: r.updated_at,
  };
}

export async function getStreaks(): Promise<Streak[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StreakRow>('SELECT * FROM streaks');
  return rows.map(toStreak);
}

export async function getStreakResets(): Promise<StreakReset[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ResetRow>(
    'SELECT * FROM streak_resets ORDER BY reset_at DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    streakId: r.streak_id,
    brokenStreakLength: r.broken_streak_length,
    resetAt: r.reset_at,
  }));
}

export interface StreakUpsert {
  /** null = the single global "active day" streak. */
  taskId: string | null;
  current: number;
  /** Freshly derived; merged with the stored value so a record can never go down (§7). */
  longest: number;
  lastActiveDay: string | null;
  breaks: StreakBreak[];
}

/**
 * Writes derived streak state back, reconciling rather than overwriting.
 *
 * Two things make this safe to run on every launch, which is exactly what happens:
 *   * `longest_streak` takes MAX(stored, derived), so undoing a completion cannot erase a
 *     record (§7 — longest is never decremented).
 *   * `streak_resets` rows are keyed UNIQUE(streak_id, day), so re-deriving the same history
 *     is idempotent. Without that key, opening the app twice would double every historical
 *     break, and `reset_count` — a number the user sees — would inflate forever.
 *
 * `reset_count` is then read back from the log rather than incremented, so the counter and the
 * history it summarises cannot disagree.
 */
export async function reconcileStreaks(upserts: StreakUpsert[], now: Date): Promise<Streak[]> {
  const db = await getDb();
  const iso = now.toISOString();

  await withWriteTransaction(db, async (txn) => {
    for (const u of upserts) {
      const existing = await txn.getFirstAsync<StreakRow>(
        u.taskId === null
          ? 'SELECT * FROM streaks WHERE task_id IS NULL'
          : 'SELECT * FROM streaks WHERE task_id = ?',
        ...(u.taskId === null ? [] : [u.taskId])
      );

      const id = existing?.id ?? crypto.randomUUID();
      const longest = Math.max(existing?.longest_streak ?? 0, u.longest);

      if (existing) {
        await txn.runAsync(
          `UPDATE streaks SET current_streak = ?, longest_streak = ?, last_active_date = ?,
             updated_at = ? WHERE id = ?`,
          u.current,
          longest,
          u.lastActiveDay,
          iso,
          id
        );
      } else {
        await txn.runAsync(
          `INSERT INTO streaks (id, task_id, current_streak, longest_streak, reset_count,
             last_active_date, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)`,
          id,
          u.taskId,
          u.current,
          longest,
          u.lastActiveDay,
          iso
        );
      }

      // Idempotent: the UNIQUE(streak_id, day) key absorbs re-derivations of known breaks.
      for (const b of u.breaks) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO streak_resets (id, streak_id, broken_streak_length, reset_at, day)
           VALUES (?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          id,
          b.brokenLength,
          iso,
          b.day
        );
      }

      // Derive the count from the rows themselves so the two can never drift apart.
      await txn.runAsync(
        `UPDATE streaks SET reset_count =
           (SELECT COUNT(*) FROM streak_resets WHERE streak_id = ?) WHERE id = ?`,
        id,
        id
      );
    }
  });

  return getStreaks();
}
