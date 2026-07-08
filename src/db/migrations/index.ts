import type { SQLiteDatabase } from 'expo-sqlite';
import * as m0001 from './0001_init';

interface Migration {
  version: number;
  name: string;
  up(db: SQLiteDatabase): Promise<void>;
}

// Forward-only, applied in order (§4). Register new migrations here.
const MIGRATIONS: Migration[] = [m0001];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const row = await db.getFirstAsync<{ v: number | null }>(
    'SELECT MAX(version) AS v FROM schema_migrations'
  );
  const applied = row?.v ?? 0;

  for (const migration of MIGRATIONS.sort((a, b) => a.version - b.version)) {
    if (migration.version <= applied) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      await txn.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString()
      );
    });
  }
}
