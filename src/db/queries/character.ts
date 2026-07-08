import { getDb } from '../client';
import type { Character } from '../../types';

interface CharacterRow {
  total_xp: number;
  level: number;
  updated_at: string;
}

export function rowToCharacter(r: CharacterRow): Character {
  return { totalXp: r.total_xp, level: r.level, updatedAt: r.updated_at };
}

export async function getCharacter(): Promise<Character> {
  const db = await getDb();
  const row = await db.getFirstAsync<CharacterRow>('SELECT * FROM character WHERE id = 1');
  if (!row) throw new Error('Character row missing — migrations not run?');
  return rowToCharacter(row);
}
