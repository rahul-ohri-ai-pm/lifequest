import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

// Every write path that touches XP has to be atomic *and* non-interleaved — that's what the
// `character.total_xp === SUM(completions.xp_awarded)` invariant rests on (GOTCHAS #6, #7).
//
// On native, `withExclusiveTransactionAsync` delivers that by running the callback on its own
// connection. Web has no equivalent (expo-sqlite throws outright): the whole database lives in
// one worker behind a single connection. Downgrading to `withTransactionAsync` would keep
// atomicity but quietly drop exclusivity — a second writer could BEGIN between our completion
// INSERT and our character UPDATE. So on web we rebuild exclusivity in JS: every write
// transaction, and every read that must not see a half-applied one, goes through a single
// promise chain and therefore cannot overlap.
//
// Use these helpers instead of calling the expo-sqlite transaction methods directly.

let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  // Run once the previous entry settles, whichever way it settled.
  const run = chain.then(work, work);
  // Keep a rejection from poisoning every later entry in the chain.
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function withWriteTransaction(
  db: SQLiteDatabase,
  task: (txn: SQLiteDatabase) => Promise<void>
): Promise<void> {
  if (Platform.OS !== 'web') {
    await db.withExclusiveTransactionAsync(task);
    return;
  }

  await serialize(async () => {
    await db.execAsync('BEGIN');
    try {
      await task(db);
      await db.execAsync('COMMIT');
    } catch (error) {
      // If BEGIN is what failed there is no transaction to roll back; either way the
      // original error is the one worth reporting.
      await db.execAsync('ROLLBACK').catch(() => undefined);
      throw error;
    }
  });
}

// For reads that must not observe a partially-applied write transaction. No-op on native,
// where writers hold a separate connection and readers are already isolated from them.
export async function runSerializedRead<T>(read: () => Promise<T>): Promise<T> {
  return Platform.OS === 'web' ? serialize(read) : read();
}
