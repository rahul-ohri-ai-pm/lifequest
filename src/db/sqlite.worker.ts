import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { SqlValue } from './sqlite';

// SQLite lives in this worker, and it has to: the opfs-sahpool VFS reaches OPFS through
// FileSystemFileHandle.createSyncAccessHandle(), which browsers expose *only* in a worker
// context. Running the same code on the main thread fails at install time with
// "Missing required OPFS APIs." — the APIs are there, just not on that thread.
//
// This is still not the SharedArrayBuffer path: sahpool uses synchronous access handles
// against a pre-opened pool of files, so the page needs no cross-origin isolation and no
// COOP/COEP headers (which is why public/sw.js no longer forges any).

// Split from the id so the caller can build a body without Omit<> collapsing the union.
export type WorkerRequestBody =
  | { kind: 'exec'; sql: string }
  | { kind: 'run'; sql: string; params: SqlValue[] }
  | { kind: 'all'; sql: string; params: SqlValue[] };

export type WorkerRequest = WorkerRequestBody & { id: number };

export type WorkerResponse =
  | { id: number; ok: true; rows?: unknown[] }
  | { id: number; ok: false; error: string };

// Declared locally rather than pulling in lib.webworker, which collides with lib.dom.
declare const self: {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage(message: WorkerResponse): void;
};

interface Oo1Db {
  exec(sql: string): void;
  exec(opts: {
    sql: string;
    bind?: SqlValue[];
    returnValue?: 'resultRows';
    rowMode?: 'object';
  }): unknown[];
}

const ready: Promise<Oo1Db> = (async () => {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'lifequest-pool' });
  const db = new pool.OpfsSAHPoolDb('/lifequest.db') as unknown as Oo1Db;
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
})();

function handle(db: Oo1Db, req: WorkerRequest): WorkerResponse {
  switch (req.kind) {
    case 'exec':
      db.exec(req.sql);
      return { id: req.id, ok: true };
    case 'run':
      db.exec({ sql: req.sql, bind: req.params.length ? req.params : undefined });
      return { id: req.id, ok: true };
    case 'all':
      return {
        id: req.id,
        ok: true,
        rows: db.exec({
          sql: req.sql,
          bind: req.params.length ? req.params : undefined,
          returnValue: 'resultRows',
          rowMode: 'object',
        }),
      };
  }
}

// Requests are chained rather than handled concurrently. Each exec is synchronous once the
// pool is open, but the `await ready` in flight for the first few messages would otherwise
// let them resume in completion order — and BEGIN/COMMIT pairs must not interleave
// (see transaction.ts and GOTCHAS #6, #7).
//
// The chain starts *resolved* and `ready` is awaited inside the try, not folded into the
// chain's seed. Seeding it with `ready.then(…)` looks equivalent and is not: if the pool
// fails to open, the seed is a rejected promise, every `.then` after it is skipped, no
// response is ever posted, and the app hangs on its loading spinner forever instead of
// showing the error. Failing to open the database has to be a reply, not a silence.
let queue: Promise<void> = Promise.resolve();

self.onmessage = (event) => {
  const req = event.data;
  queue = queue.then(async () => {
    try {
      self.postMessage(handle(await ready, req));
    } catch (error) {
      self.postMessage({
        id: req.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
