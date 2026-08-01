import type { SqlDatabase } from '../sqlite';

export const version = 2;
export const name = 'skills';

// §6 default skills, user-editable later. Colors follow the §5 palette family.
const DEFAULT_SKILLS: Array<[name: string, color: string]> = [
  ['Diet', '#34D399'],
  ['Career', '#4C8DFF'],
  ['Reading', '#8B5CF6'],
  ['Exercise', '#F5B942'],
  ['Gaming', '#EC4899'],
  ['Fitness', '#22D3EE'],
  ['Social', '#F97316'],
  ['Stock Trading', '#A3E635'],
];

export async function up(db: SqlDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE skills (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      icon       TEXT,
      color      TEXT,
      total_xp   INTEGER NOT NULL DEFAULT 0,
      level      INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE task_skills (
      task_id  TEXT NOT NULL REFERENCES tasks(id),
      skill_id TEXT NOT NULL REFERENCES skills(id),
      PRIMARY KEY (task_id, skill_id)
    );
  `);
  const now = new Date().toISOString();
  for (const [skillName, color] of DEFAULT_SKILLS) {
    await db.runAsync(
      'INSERT INTO skills (id, name, icon, color, total_xp, level, created_at) VALUES (?, ?, NULL, ?, 0, 1, ?)',
      crypto.randomUUID(),
      skillName,
      color,
      now
    );
  }
}
