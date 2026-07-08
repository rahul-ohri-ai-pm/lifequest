import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 1;
export const name = 'init';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE tasks (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      notes         TEXT,
      type          TEXT NOT NULL CHECK (type IN ('todo','habit','counted')),
      difficulty    TEXT NOT NULL CHECK (difficulty IN ('trivial','easy','medium','hard','epic')),
      schedule_json TEXT,
      target_count  INTEGER,
      due_at        TEXT,
      reminder_at   TEXT,
      status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE completions (
      id             TEXT PRIMARY KEY,
      task_id        TEXT NOT NULL REFERENCES tasks(id),
      completed_at   TEXT NOT NULL,
      progress_count INTEGER,
      xp_awarded     INTEGER NOT NULL,
      created_at     TEXT NOT NULL
    );
    CREATE INDEX idx_completions_task ON completions(task_id);
    CREATE INDEX idx_completions_at ON completions(completed_at);

    CREATE TABLE skips (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id),
      day        TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (task_id, day)
    );
    CREATE INDEX idx_skips_day ON skips(day);

    CREATE TABLE character (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      total_xp   INTEGER NOT NULL DEFAULT 0,
      level      INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    INSERT INTO character (id, total_xp, level, updated_at)
      VALUES (1, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
