import { getDb } from '../client';
import { withWriteTransaction } from '../transaction';
import type { SkillDef } from '../../types';

interface SkillRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  total_xp: number;
  level: number;
  status: string;
  created_at: string;
}

function rowToSkill(r: SkillRow): SkillDef {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    totalXp: r.total_xp,
    level: r.level,
    status: r.status === 'archived' ? 'archived' : 'active',
    createdAt: r.created_at,
  };
}

// Every skill, archived included. The store keeps the whole set because an archived category
// still has to render on history — a completion logged last month under "Exercise" must not
// turn into a blank row just because the category was retired since.
export async function getSkills(): Promise<SkillDef[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkillRow>('SELECT * FROM skills ORDER BY name ASC');
  return rows.map(rowToSkill);
}

export interface NewSkill {
  name: string;
  color: string;
  icon: string | null;
}

/** Adds a category. Rejects a name already in use, archived rows included — the UNIQUE index
 *  covers them too, and a duplicate-name error is a worse answer than "that one exists". */
export async function createSkill(input: NewSkill, now: Date): Promise<SkillDef> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO skills (id, name, icon, color, total_xp, level, status, created_at)
     VALUES (?, ?, ?, ?, 0, 1, 'active', ?)`,
    id,
    input.name,
    input.icon,
    input.color,
    now.toISOString()
  );
  const row = await db.getFirstAsync<SkillRow>('SELECT * FROM skills WHERE id = ?', id);
  return rowToSkill(row!);
}

export interface SkillPatch {
  name?: string;
  color?: string;
  icon?: string | null;
}

export async function updateSkill(id: string, patch: SkillPatch): Promise<void> {
  const sets: string[] = [];
  const args: Array<string | null> = [];
  if (patch.name !== undefined) { sets.push('name = ?'); args.push(patch.name); }
  if (patch.color !== undefined) { sets.push('color = ?'); args.push(patch.color); }
  if (patch.icon !== undefined) { sets.push('icon = ?'); args.push(patch.icon); }
  if (!sets.length) return;
  const db = await getDb();
  await db.runAsync(`UPDATE skills SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
}

export async function setSkillStatus(id: string, status: 'active' | 'archived'): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE skills SET status = ? WHERE id = ?', status, id);
}

/** True when nothing would be lost by deleting the row outright. */
export async function skillIsEmpty(id: string): Promise<boolean> {
  const db = await getDb();
  const xp = await db.getFirstAsync<{ total_xp: number }>('SELECT total_xp FROM skills WHERE id = ?', id);
  if (!xp || xp.total_xp > 0) return false;
  const link = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM task_skills WHERE skill_id = ?',
    id
  );
  return (link?.n ?? 0) === 0;
}

/**
 * Remove a category. Deletes it only when it holds no XP and no tagged tasks; otherwise
 * archives it, because the alternative is destroying earned XP to tidy a list (D33). Returns
 * what actually happened so the UI can say so rather than guess.
 */
export async function removeSkill(id: string): Promise<'deleted' | 'archived'> {
  if (await skillIsEmpty(id)) {
    const db = await getDb();
    await db.runAsync('DELETE FROM skills WHERE id = ?', id);
    return 'deleted';
  }
  await setSkillStatus(id, 'archived');
  return 'archived';
}

export interface TaskSkillLink {
  taskId: string;
  skillId: string;
}

export async function getAllTaskSkills(): Promise<TaskSkillLink[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ task_id: string; skill_id: string }>(
    'SELECT task_id, skill_id FROM task_skills'
  );
  return rows.map((r) => ({ taskId: r.task_id, skillId: r.skill_id }));
}

// Replace a task's skill tags. Returns the persisted set.
export async function setTaskSkills(taskId: string, skillIds: string[]): Promise<string[]> {
  const db = await getDb();
  await withWriteTransaction(db, async (txn) => {
    await txn.runAsync('DELETE FROM task_skills WHERE task_id = ?', taskId);
    for (const skillId of skillIds) {
      await txn.runAsync('INSERT INTO task_skills (task_id, skill_id) VALUES (?, ?)', taskId, skillId);
    }
  });
  const rows = await db.getAllAsync<{ skill_id: string }>(
    'SELECT skill_id FROM task_skills WHERE task_id = ?',
    taskId
  );
  return rows.map((r) => r.skill_id);
}
