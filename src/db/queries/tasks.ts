import { getDb } from '../client';
import type { Difficulty, Schedule, Task, TaskStatus, TaskType } from '../../types';

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  type: TaskType;
  difficulty: Difficulty;
  schedule_json: string | null;
  target_count: number | null;
  due_at: string | null;
  reminder_at: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    type: r.type,
    difficulty: r.difficulty,
    schedule: r.schedule_json ? (JSON.parse(r.schedule_json) as Schedule) : null,
    targetCount: r.target_count,
    dueAt: r.due_at,
    reminderAt: r.reminder_at,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface NewTask {
  title: string;
  difficulty: Difficulty;
  type: TaskType;
  notes?: string | null;
  schedule?: Schedule | null;
  targetCount?: number | null;
  dueAt?: string | null;
  reminderAt?: string | null;
}

export async function createTask(input: NewTask, now: Date): Promise<Task> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const iso = now.toISOString();
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, type, difficulty, schedule_json, target_count,
       due_at, reminder_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    id,
    input.title,
    input.notes ?? null,
    input.type,
    input.difficulty,
    input.schedule ? JSON.stringify(input.schedule) : null,
    input.targetCount ?? null,
    input.dueAt ?? null,
    input.reminderAt ?? null,
    iso,
    iso
  );
  return getTaskById(id);
}

export interface TaskPatch {
  title?: string;
  notes?: string | null;
  difficulty?: Difficulty;
  schedule?: Schedule | null;
  targetCount?: number | null;
  dueAt?: string | null;
  reminderAt?: string | null;
  status?: TaskStatus;
}

export async function updateTask(id: string, patch: TaskPatch, now: Date): Promise<Task> {
  const db = await getDb();
  const current = await getTaskById(id);
  const next = { ...current, ...patch };
  const schedule = patch.schedule !== undefined ? patch.schedule : current.schedule;
  await db.runAsync(
    `UPDATE tasks SET title = ?, notes = ?, difficulty = ?, schedule_json = ?, target_count = ?,
       due_at = ?, reminder_at = ?, status = ?, updated_at = ? WHERE id = ?`,
    next.title,
    next.notes ?? null,
    next.difficulty,
    schedule ? JSON.stringify(schedule) : null,
    next.targetCount ?? null,
    next.dueAt ?? null,
    next.reminderAt ?? null,
    next.status,
    now.toISOString(),
    id
  );
  return getTaskById(id);
}

export async function setTaskStatus(id: string, status: TaskStatus, now: Date): Promise<Task> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', status, now.toISOString(), id);
  return getTaskById(id);
}

export async function getTaskById(id: string): Promise<Task> {
  const db = await getDb();
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  if (!row) throw new Error(`Task not found: ${id}`);
  return rowToTask(row);
}

export async function getActiveTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    "SELECT * FROM tasks WHERE status = 'active' ORDER BY created_at DESC"
  );
  return rows.map(rowToTask);
}

export async function getArchivedTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    "SELECT * FROM tasks WHERE status = 'archived' ORDER BY updated_at DESC"
  );
  return rows.map(rowToTask);
}
