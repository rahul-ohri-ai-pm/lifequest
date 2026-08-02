import type { SqlDatabase } from '../sqlite';

export const version = 3;
export const name = 'streaks';

// §4 schema for streaks. Worth being explicit about what these tables are *for*, because
// `current_streak` looks like a violation of the "never store derived stats" rule and isn't
// quite:
//
//   * `current_streak` and `last_active_date` ARE derivable from the completions log, and the
//     app derives them on read (src/engine/streaks.ts). They are mirrored here only so a
//     future feature can query streaks in SQL without replaying the log; the engine's value
//     wins on every conflict.
//   * `longest_streak` and `reset_count` genuinely cannot be re-derived, and that is the real
//     reason this table exists. §7 says longest "is a running max and is never decremented" —
//     if it were derived, undoing today's completion would silently erase a record set months
//     ago. Same for the lifetime break count. These are monotonic facts about history, not a
//     cache of it.
//
// `streak_resets` is a log, not a cache: one row per break, so the stats screen can show
// resets over time. This is the deliberate alternative to streak freezes (§7) — the owner
// wanted breaks visible and counted rather than forgiven.
export async function up(db: SqlDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE streaks (
      id               TEXT PRIMARY KEY,
      task_id          TEXT,
      current_streak   INTEGER NOT NULL DEFAULT 0,
      longest_streak   INTEGER NOT NULL DEFAULT 0,
      reset_count      INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      updated_at       TEXT NOT NULL
    );

    -- One streak row per habit, plus exactly one global row (task_id IS NULL). A partial
    -- unique index is what keeps the global row single — a plain UNIQUE(task_id) would allow
    -- many NULLs, since SQLite treats NULLs as distinct.
    CREATE UNIQUE INDEX idx_streaks_task ON streaks(task_id) WHERE task_id IS NOT NULL;
    CREATE UNIQUE INDEX idx_streaks_global ON streaks((1)) WHERE task_id IS NULL;

    CREATE TABLE streak_resets (
      id                   TEXT PRIMARY KEY,
      streak_id            TEXT NOT NULL REFERENCES streaks(id),
      broken_streak_length INTEGER NOT NULL,
      reset_at             TEXT NOT NULL,
      -- The dayKey the break happened on. Not in the original §4 sketch, but without it a
      -- re-derivation cannot tell which recorded break corresponds to which missed day, so
      -- reconciliation would duplicate rows on every launch.
      day                  TEXT NOT NULL,
      UNIQUE (streak_id, day)
    );

    CREATE INDEX idx_streak_resets_streak ON streak_resets(streak_id);
  `);
}
