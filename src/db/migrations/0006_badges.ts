import type { SqlDatabase } from '../sqlite';

export const version = 6;
export const name = 'badges';

// Only the *unlock* is stored. The catalogue itself lives in `src/engine/badges.ts` (§4's
// schema comment says so explicitly), so adding, renaming or retuning a badge is a code change
// with no migration — which is what makes ~25 rules maintainable.
//
// `unlocked_at` is the whole row on purpose: everything else about a badge — its progress, its
// tier, whether it still qualifies — is derived on read from the completions log (§4's
// never-store-derived-stats rule). What cannot be derived is *that it was earned*, because a
// badge is a one-way door: undoing today's completion must not revoke something earned in
// March. That is the same argument §7 makes for `longest_streak`.
export async function up(db: SqlDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE badge_unlocks (
      badge_key   TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL
    );
  `);
}
