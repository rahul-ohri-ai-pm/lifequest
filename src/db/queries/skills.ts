import { getDb } from '../client';
import type { SkillDef } from '../../types';

interface SkillRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  total_xp: number;
  level: number;
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
    createdAt: r.created_at,
  };
}

export async function getSkills(): Promise<SkillDef[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkillRow>('SELECT * FROM skills ORDER BY name ASC');
  return rows.map(rowToSkill);
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
  await db.withExclusiveTransactionAsync(async (txn) => {
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
