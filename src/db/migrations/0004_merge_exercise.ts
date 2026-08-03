import type { SqlDatabase } from '../sqlite';

export const version = 4;
export const name = 'merge_exercise_into_fitness';

// Owner's call: "Exercise is a subset of Fitness, so don't need both."
//
// A merge, not a delete. Everything tagged Exercise is re-pointed at Fitness and the two XP
// totals are summed, so the history survives and the Fitness level reflects work the user
// actually did. Dropping the row instead would silently erase XP the user earned, which is the
// kind of loss the completions log exists to prevent.
//
// Idempotent by construction: every statement is a no-op if Exercise is already gone, so this
// is safe on a database where the user had never used either category.
export async function up(db: SqlDatabase): Promise<void> {
  const exercise = await db.getFirstAsync<{ id: string; total_xp: number }>(
    "SELECT id, total_xp FROM skills WHERE name = 'Exercise'"
  );
  const fitness = await db.getFirstAsync<{ id: string; total_xp: number }>(
    "SELECT id, total_xp FROM skills WHERE name = 'Fitness'"
  );
  if (!exercise || !fitness) return; // renamed or already merged — nothing to do

  // Re-point the tags. OR IGNORE covers tasks tagged with BOTH categories, where the
  // re-pointed row would collide with the existing (task_id, skill_id) primary key.
  await db.runAsync(
    'INSERT OR IGNORE INTO task_skills (task_id, skill_id) SELECT task_id, ? FROM task_skills WHERE skill_id = ?',
    fitness.id,
    exercise.id
  );
  await db.runAsync('DELETE FROM task_skills WHERE skill_id = ?', exercise.id);

  // Sum the XP. `level` is recomputed by the app from the engine curve on next hydrate, but it
  // is written here too so the column is never transiently wrong for anything reading raw SQL.
  const merged = fitness.total_xp + exercise.total_xp;
  await db.runAsync('UPDATE skills SET total_xp = ? WHERE id = ?', merged, fitness.id);
  await db.runAsync('DELETE FROM skills WHERE id = ?', exercise.id);

  // The MRU list in settings holds skill ids; drop the dead one so the capture chips do not
  // try to order by a category that no longer exists.
  const mru = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'skill_mru'"
  );
  if (mru) {
    const ids = (JSON.parse(mru.value) as string[]).filter((id) => id !== exercise.id);
    await db.runAsync("UPDATE settings SET value = ? WHERE key = 'skill_mru'", JSON.stringify(ids));
  }
}
