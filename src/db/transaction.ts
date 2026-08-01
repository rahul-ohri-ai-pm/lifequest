import type { SqlDatabase } from './sqlite';

// Every write path that touches XP has to be atomic *and* non-interleaved — that's what the
// `character.total_xp === SUM(completions.xp_awarded)` invariant rests on (GOTCHAS #6, #7).
//
// There is one database connection (the opfs-sahpool VFS is single-connection by design),
// so SQLite gives us no exclusive-transaction primitive to lean on: a second writer could
// BEGIN between our completion INSERT and our character UPDATE. Exclusivity is therefore
// rebuilt in JS — every write transaction, and every read that must not observe a
// half-applied one, goes through a single promise chain and so cannot overlap.
//
// Individual statements are synchronous under this VFS, but the callbacks below are async
// and interleave at every await, so the chain is still doing real work. Use these helpers
// rather than issuing BEGIN/COMMIT by hand.

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
  db: SqlDatabase,
  task: (txn: SqlDatabase) => Promise<void>
): Promise<void> {
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

// For reads that must not observe a partially-applied write transaction.
export async function runSerializedRead<T>(read: () => Promise<T>): Promise<T> {
  return serialize(read);
}
