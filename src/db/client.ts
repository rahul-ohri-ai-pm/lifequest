import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let dbPromise: Promise<SQLiteDatabase> | null = null;

// On web, expo-sqlite runs SQLite as WebAssembly in a worker and reaches it through a
// SharedArrayBuffer, which browsers withhold from pages that aren't cross-origin
// isolated. Without this check the failure surfaces as an opaque "SharedArrayBuffer is
// not defined" from inside the worker; the real cause is always headers or origin, so
// say so. public/sw.js is what supplies the headers on static hosts.
function assertWebPrerequisites(): void {
  if (Platform.OS !== 'web') return;
  if (typeof SharedArrayBuffer !== 'undefined') return;
  throw new Error(
    'Could not open the local database: this tab is not cross-origin isolated, so ' +
      'SQLite (WebAssembly) has no SharedArrayBuffer available. Reloading usually fixes ' +
      'it — the service worker adds the required headers when it first installs. If it ' +
      'keeps failing, the page is probably running over plain HTTP or in a private ' +
      'window, where service workers are blocked; use HTTPS or localhost.'
  );
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    assertWebPrerequisites();
    dbPromise = openDatabaseAsync('lifequest.db').then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    });
  }
  return dbPromise;
}

// Dev-only: drop everything and reopen fresh (§9 Reset Database).
// Order matters — child tables before the tables they reference.
export async function resetDb(): Promise<SQLiteDatabase> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS task_skills;
    DROP TABLE IF EXISTS skips;
    DROP TABLE IF EXISTS completions;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS skills;
    DROP TABLE IF EXISTS character;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS schema_migrations;
  `);
  return db;
}
