import type { SqlDatabase, SqlValue } from './sqlite';
import type { WorkerRequest, WorkerRequestBody, WorkerResponse } from './sqlite.worker';

// SQLite compiled to WebAssembly, persisting to the browser's on-device OPFS storage.
// Nothing leaves the device and nothing is fetched after first load (§2).
//
// The engine runs in a dedicated worker (src/db/sqlite.worker.ts) because the VFS in use,
// opfs-sahpool, needs createSyncAccessHandle() — a worker-only API. That VFS is a
// deliberate choice over the plain `opfs` one: plain OPFS talks to its worker over
// SharedArrayBuffer, which browsers only grant a cross-origin-isolated page, meaning
// COOP/COEP response headers that static hosts like GitHub Pages cannot set — which is why
// the old build needed a service worker to forge them. sahpool needs none of that.
//
// This module owns the whole worker protocol. Nothing outside it should know that the
// database is not simply a local object.

let dbPromise: Promise<SqlDatabase> | null = null;

function connect(): SqlDatabase {
  const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });

  let nextId = 0;
  const pending = new Map<number, { resolve(rows: unknown[]): void; reject(error: Error): void }>();

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const res = event.data;
    const entry = pending.get(res.id);
    if (!entry) return;
    pending.delete(res.id);
    if (res.ok) entry.resolve(res.rows ?? []);
    else entry.reject(new Error(res.error));
  });

  // A worker that dies (OOM, an unhandled throw during startup) would otherwise leave every
  // caller hanging forever on a promise that can never settle.
  worker.addEventListener('error', (event) => {
    const error = new Error(`SQLite worker failed: ${event.message}`);
    for (const [id, entry] of pending) {
      pending.delete(id);
      entry.reject(error);
    }
    dbPromise = null;
  });

  const request = (req: WorkerRequestBody): Promise<unknown[]> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...req, id } as WorkerRequest);
    });

  return {
    async execAsync(sql) {
      await request({ kind: 'exec', sql });
    },
    async runAsync(sql, ...params) {
      await request({ kind: 'run', sql, params });
    },
    async getAllAsync<T>(sql: string, ...params: SqlValue[]) {
      return (await request({ kind: 'all', sql, params })) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: SqlValue[]) {
      const rows = (await request({ kind: 'all', sql, params })) as T[];
      return rows[0] ?? null;
    },
  };
}

// The opfs-sahpool VFS takes exclusive sync access handles on its pool files, so exactly one
// page at a time can hold the database — a second tab doesn't queue, it fails, and so does the
// first if they race. Claiming a Web Lock first lets us say *that*, instead of reporting a
// storage error that would send the user off checking private mode and HTTPS for a problem
// they can fix by closing a tab. The lock is held for the lifetime of the page: the callback
// returns a promise that never settles, and the browser releases it when the page goes away.
class AnotherTabError extends Error {}

async function claimSingleInstance(): Promise<void> {
  if (!navigator.locks) return; // no Web Locks: fall through and let the VFS decide

  // Note the shape: the outcome is signalled from *inside* the callback, and the promise
  // returned by `request()` is deliberately not awaited. `request()` resolves only once its
  // callback's promise settles, so awaiting it while the callback holds the lock forever
  // would hang startup forever — the app would sit on its loading spinner having
  // successfully acquired the lock. Ask how the lock is released, not just how it is taken.
  await new Promise<void>((resolve, reject) => {
    void navigator.locks.request('lifequest-db', { ifAvailable: true }, (lock) => {
      if (!lock) {
        reject(
          new AnotherTabError(
            'LifeQuest is already open in another tab. The on-device database can only be ' +
              'held by one tab at a time — close the other one and reload.'
          )
        );
        return;
      }
      resolve(); // startup continues…
      return new Promise<never>(() => {}); // …while this keeps the lock until the page dies
    });
  });
}

export function getDb(): Promise<SqlDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      await claimSingleInstance();
      const db = connect();
      // The worker resolves nothing until the pool is open, so the first statement is also
      // the readiness probe: if OPFS is unavailable this is where it surfaces.
      await db.execAsync('SELECT 1');
      return db;
    })().catch((cause: unknown) => {
      dbPromise = null; // let a retry re-attempt rather than caching the failure forever
      if (cause instanceof AnotherTabError) throw cause;
      // Keep the underlying reason in the message, not just in `cause`: the common case is
      // the environment (private window, insecure origin) but the message has to stay
      // useful when it is in fact a real bug, and there is no console to check on a phone.
      const detail = cause instanceof Error ? cause.message : String(cause);
      throw new Error(
        'Could not open the local database. LifeQuest stores everything on-device via ' +
          'OPFS, which browsers block in private windows and on insecure origins — use a ' +
          `normal window over HTTPS or localhost. (${detail})`,
        { cause }
      );
    });
  }
  return dbPromise;
}

/**
 * Ask the browser, in a worker, what it will actually allow — and report each step.
 *
 * Spun up on its own worker rather than reusing the app's: the case this exists for is the one
 * where the app's worker has already failed to open the pool, and a diagnostic that shares the
 * broken thing's fate is no diagnostic. Terminates itself either way.
 *
 * Never rejects. A failure screen that can itself fail is worse than no failure screen.
 */
export async function probeStorage(): Promise<string[]> {
  const lines: string[] = [];
  try {
    lines.push(`ua: ${navigator.userAgent}`);
  } catch {
    /* ignore */
  }
  let worker: Worker | undefined;
  try {
    worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
    const w = worker;
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      // Bounded, because a worker that never answers is exactly the shape of failure this is
      // meant to describe.
      const timer = setTimeout(() => reject(new Error('probe timed out after 8s')), 8000);
      w.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        clearTimeout(timer);
        const res = event.data;
        if (res.ok) resolve(res.rows ?? []);
        else reject(new Error(res.error));
      });
      w.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(new Error(event.message || 'worker failed to start'));
      });
      w.postMessage({ kind: 'probe', id: 0 } as WorkerRequest);
    });
    lines.push(...rows.map(String));
  } catch (error) {
    lines.push(`probe: FAILED ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    worker?.terminate();
  }
  return lines;
}

// Dev-only: drop everything and re-run migrations from scratch (§9 Reset Database).
// Order matters — child tables before the tables they reference.
export async function resetDb(): Promise<SqlDatabase> {
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
