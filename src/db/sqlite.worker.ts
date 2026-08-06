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
  | { kind: 'all'; sql: string; params: SqlValue[] }
  // Answered without touching the pool — see `probeStorage`.
  | { kind: 'probe' };

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

// The pool pre-opens one sync access handle per slot and holds them all for the life of the
// page. Six of those at once is more pressure than some engines like — a phone reported
// "The operation failed for an unknown transient reason", which is WebKit's wording for a
// DOMException it does not have a specific code for. So: start small and retry smaller.
// The VFS grows the pool on demand (`addCapacity`) the moment it needs another slot, so a
// low initial capacity costs a little lazy work, not a ceiling.
//
// **Never** pass `clearOnInit` here as a recovery step. It would open cleanly every time by
// deleting the pool — which is the user's entire history, and the one thing this app has no
// server to restore from (§2).
const CAPACITY_ATTEMPTS = [3, 1];

async function openPool(): Promise<Oo1Db> {
  const sqlite3 = await sqlite3InitModule();
  let lastError: unknown;
  for (const initialCapacity of CAPACITY_ATTEMPTS) {
    try {
      const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'lifequest-pool', initialCapacity });
      const db = new pool.OpfsSAHPoolDb('/lifequest.db') as unknown as Oo1Db;
      db.exec('PRAGMA foreign_keys = ON;');
      return db;
    } catch (error) {
      lastError = error;
      // The reported failure calls itself transient, so give the engine a beat before the
      // next attempt rather than hammering it in the same tick.
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const ready: Promise<Oo1Db> = openPool();

// What the environment will actually let us do, step by step.
//
// This exists because the failure it diagnoses cannot be reproduced by the people who can fix
// it: the report came from an iPhone, and the message ("unknown transient reason") names no
// cause. Rather than guess from a screenshot, the failure screen now asks the device. Every
// step is wrapped, so the probe reports a wall it hits rather than hitting it.
async function probeStorage(): Promise<string[]> {
  const g = globalThis as unknown as {
    isSecureContext?: boolean;
    crossOriginIsolated?: boolean;
    navigator?: Navigator;
  };
  const out: string[] = [];
  const note = (label: string, value: unknown) => out.push(`${label}: ${String(value)}`);
  const fail = (label: string, e: unknown) =>
    out.push(`${label}: FAILED ${e instanceof Error ? `${e.name} — ${e.message}` : String(e)}`);

  note('secureContext', g.isSecureContext ?? 'n/a');
  note('crossOriginIsolated', g.crossOriginIsolated ?? 'n/a');
  note('storageApi', !!g.navigator?.storage);
  // `createSyncAccessHandle` is worker-only, so lib.dom's FileSystemFileHandle does not
  // declare it. Feature-detect off the prototype rather than widening the global type.
  note(
    'syncAccessHandleApi',
    typeof FileSystemFileHandle !== 'undefined' &&
      'createSyncAccessHandle' in FileSystemFileHandle.prototype
  );

  let dir: FileSystemDirectoryHandle | undefined;
  try {
    dir = await g.navigator!.storage.getDirectory();
    note('getDirectory', 'ok');
  } catch (e) {
    fail('getDirectory', e);
  }

  if (dir) {
    // A throwaway name, removed again below — the probe must never touch the real pool.
    const name = `.lifequest-probe-${Date.now()}`;
    try {
      const file = await dir.getFileHandle(name, { create: true });
      note('createFile', 'ok');
      try {
        const sync = await (
          file as FileSystemFileHandle & { createSyncAccessHandle(): Promise<{ close(): void }> }
        ).createSyncAccessHandle();
        sync.close();
        note('createSyncAccessHandle', 'ok');
      } catch (e) {
        fail('createSyncAccessHandle', e);
      }
      await dir.removeEntry(name).catch(() => {});
    } catch (e) {
      fail('createFile', e);
    }
  }

  try {
    const { usage, quota } = await g.navigator!.storage.estimate();
    note('quota', `${usage ?? '?'} / ${quota ?? '?'} bytes`);
  } catch (e) {
    fail('quota', e);
  }
  try {
    note('persisted', await g.navigator!.storage.persisted());
  } catch (e) {
    fail('persisted', e);
  }
  return out;
}

function handle(db: Oo1Db, req: WorkerRequest): WorkerResponse {
  switch (req.kind) {
    // Handled before `ready` is awaited; unreachable here, but the switch must be total.
    case 'probe':
      return { id: req.id, ok: true, rows: [] };
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
      // Answered *before* `await ready`, deliberately: the whole point of the probe is to run
      // when the pool has failed to open, and awaiting `ready` first would make the diagnostic
      // fail with exactly the error it was sent to explain.
      if (req.kind === 'probe') {
        self.postMessage({ id: req.id, ok: true, rows: await probeStorage() });
        return;
      }
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
