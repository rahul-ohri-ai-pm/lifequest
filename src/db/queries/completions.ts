import * as Crypto from 'expo-crypto';
import { getDb } from '../client';
import { levelForTotalXp } from '../../engine/xp';
import { rowToCharacter } from './character';
import type { Character, Completion } from '../../types';

interface CompletionRow {
  id: string;
  task_id: string;
  completed_at: string;
  progress_count: number | null;
  xp_awarded: number;
  created_at: string;
}

function rowToCompletion(r: CompletionRow): Completion {
  return {
    id: r.id,
    taskId: r.task_id,
    completedAt: r.completed_at,
    progressCount: r.progress_count,
    xpAwarded: r.xp_awarded,
    createdAt: r.created_at,
  };
}

interface CharacterRow {
  total_xp: number;
  level: number;
  updated_at: string;
}

// Invariant (§4): character.total_xp must always equal SUM(completions.xp_awarded).
async function assertXpInvariant(): Promise<void> {
  if (!__DEV__) return;
  const db = await getDb();
  const sum = await db.getFirstAsync<{ s: number | null }>(
    'SELECT SUM(xp_awarded) AS s FROM completions'
  );
  const char = await db.getFirstAsync<{ total_xp: number }>(
    'SELECT total_xp FROM character WHERE id = 1'
  );
  if ((sum?.s ?? 0) !== char?.total_xp) {
    throw new Error(
      `XP invariant violated: SUM(xp_awarded)=${sum?.s ?? 0} but character.total_xp=${char?.total_xp}`
    );
  }
}

export interface CompletionResult {
  completion: Completion;
  character: Character;
}

// Atomic: completion insert + character XP/level update in one exclusive transaction.
// xpAwarded is computed by the caller via src/engine (queries stay thin).
export async function logCompletion(
  taskId: string,
  xpAwarded: number,
  progressCount: number | null,
  now: Date
): Promise<CompletionResult> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const iso = now.toISOString();
  let completion: Completion | undefined;
  let character: Character | undefined;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO completions (id, task_id, completed_at, progress_count, xp_awarded, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      taskId,
      iso,
      progressCount,
      xpAwarded,
      iso
    );
    const char = await txn.getFirstAsync<CharacterRow>('SELECT * FROM character WHERE id = 1');
    if (!char) throw new Error('Character row missing');
    const totalXp = char.total_xp + xpAwarded;
    await txn.runAsync(
      'UPDATE character SET total_xp = ?, level = ?, updated_at = ? WHERE id = 1',
      totalXp,
      levelForTotalXp(totalXp),
      iso
    );
    const cRow = await txn.getFirstAsync<CompletionRow>('SELECT * FROM completions WHERE id = ?', id);
    const charRow = await txn.getFirstAsync<CharacterRow>('SELECT * FROM character WHERE id = 1');
    completion = rowToCompletion(cRow!);
    character = rowToCharacter(charRow!);
  });

  await assertXpInvariant();
  return { completion: completion!, character: character! };
}

// Exact inverse of logCompletion: delete the row, reverse exactly its xp_awarded (§4 Undo).
export async function undoCompletion(completionId: string, now: Date): Promise<Character> {
  const db = await getDb();
  let character: Character | undefined;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<CompletionRow>(
      'SELECT * FROM completions WHERE id = ?',
      completionId
    );
    if (!row) throw new Error(`Completion not found: ${completionId}`);
    await txn.runAsync('DELETE FROM completions WHERE id = ?', completionId);
    const char = await txn.getFirstAsync<CharacterRow>('SELECT * FROM character WHERE id = 1');
    if (!char) throw new Error('Character row missing');
    const totalXp = char.total_xp - row.xp_awarded;
    await txn.runAsync(
      'UPDATE character SET total_xp = ?, level = ?, updated_at = ? WHERE id = 1',
      totalXp,
      levelForTotalXp(totalXp),
      now.toISOString()
    );
    const charRow = await txn.getFirstAsync<CharacterRow>('SELECT * FROM character WHERE id = 1');
    character = rowToCharacter(charRow!);
  });

  await assertXpInvariant();
  return character!;
}

// Completions within a local-day window (caller derives boundaries from local time).
export async function getCompletionsBetween(startIso: string, endIso: string): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions WHERE completed_at >= ? AND completed_at < ? ORDER BY completed_at ASC',
    startIso,
    endIso
  );
  return rows.map(rowToCompletion);
}

export async function getAllCompletions(): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions ORDER BY completed_at ASC'
  );
  return rows.map(rowToCompletion);
}

export async function getCompletionsForTask(taskId: string): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions WHERE task_id = ? ORDER BY completed_at ASC',
    taskId
  );
  return rows.map(rowToCompletion);
}
