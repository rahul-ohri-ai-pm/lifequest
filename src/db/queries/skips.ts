import { getDb } from '../client';
import type { Skip } from '../../types';

interface SkipRow {
  id: string;
  task_id: string;
  day: string;
  created_at: string;
}

function rowToSkip(r: SkipRow): Skip {
  return { id: r.id, taskId: r.task_id, day: r.day, createdAt: r.created_at };
}

export async function addSkip(taskId: string, dayKey: string, now: Date): Promise<Skip> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.runAsync(
    'INSERT INTO skips (id, task_id, day, created_at) VALUES (?, ?, ?, ?)',
    id,
    taskId,
    dayKey,
    now.toISOString()
  );
  const row = await db.getFirstAsync<SkipRow>('SELECT * FROM skips WHERE id = ?', id);
  return rowToSkip(row!);
}

export async function removeSkip(taskId: string, dayKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM skips WHERE task_id = ? AND day = ?', taskId, dayKey);
}

export async function getAllSkips(): Promise<Skip[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkipRow>('SELECT * FROM skips');
  return rows.map(rowToSkip);
}

export async function getSkipsForDay(dayKey: string): Promise<Skip[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkipRow>('SELECT * FROM skips WHERE day = ?', dayKey);
  return rows.map(rowToSkip);
}
