import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('lifequest.db').then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    });
  }
  return dbPromise;
}

// Dev-only: drop everything and reopen fresh (§9 Reset Database)
export async function resetDb(): Promise<SQLiteDatabase> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS skips;
    DROP TABLE IF EXISTS completions;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS character;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS schema_migrations;
  `);
  return db;
}
