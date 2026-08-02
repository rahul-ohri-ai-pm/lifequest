// Storage durability for the on-device database.
//
// OPFS holds the *only* copy of every quest, completion and XP row — §2 rules out a server,
// so there is nothing to restore from. By default a browser treats origin storage as
// "best-effort": it may evict the whole origin when the device runs low on disk, without
// asking and without warning. `navigator.storage.persist()` asks for the "persistent" bucket
// instead, which browsers only clear on explicit user action.
//
// Grant rules differ and none of them are ours to control: Chrome decides silently from
// engagement signals (installed as a PWA, bookmarked, frequently visited), Firefox prompts,
// Safari grants on home-screen install. So this is a request, not a guarantee — the honest
// outcome is reported back rather than assumed, and Profile shows it.
//
// This is a local browser API. It makes no network call and does not weaken §2.

export type PersistenceState =
  | 'persisted' // the browser will not evict this data on its own
  | 'best-effort' // storage works, but may be cleared under disk pressure
  | 'unsupported'; // no Storage API (older browser, or a context that blocks it)

let request: Promise<PersistenceState> | null = null;

async function ask(): Promise<PersistenceState> {
  // Older browsers, and some embedded webviews, have no navigator.storage at all.
  if (typeof navigator === 'undefined' || !navigator.storage?.persist || !navigator.storage.persisted) {
    return 'unsupported';
  }
  try {
    // Asking again when already granted can re-prompt on some browsers, so check first.
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'best-effort';
  } catch {
    // A rejection here means the environment refused to answer (private window, embedded
    // context). That is not a startup failure — the app works, the data is just evictable.
    return 'unsupported';
  }
}

/**
 * Request durable storage once per page load. Memoized: repeated calls share one request, so
 * Profile can read the state without risking a second permission prompt.
 *
 * Never rejects, and callers must never await it on the boot path — a browser that prompts
 * would otherwise hold the app on its loading spinner until the user answered.
 */
export function ensurePersistentStorage(): Promise<PersistenceState> {
  request ??= ask();
  return request;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

/** Best-effort usage figures for display. Null when the browser won't report them. */
export async function getStorageUsage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage == null || quota == null) return null;
    return { usedBytes: usage, quotaBytes: quota };
  } catch {
    return null;
  }
}
