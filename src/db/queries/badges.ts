import { getDb } from '../client';

export interface BadgeUnlock {
  badgeKey: string;
  unlockedAt: string;
}

export async function getBadgeUnlocks(): Promise<BadgeUnlock[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ badge_key: string; unlocked_at: string }>(
    'SELECT badge_key, unlocked_at FROM badge_unlocks ORDER BY unlocked_at ASC'
  );
  return rows.map((r) => ({ badgeKey: r.badge_key, unlockedAt: r.unlocked_at }));
}

/**
 * Record newly-earned badges. `INSERT OR IGNORE` so re-evaluating an already-earned badge is a
 * no-op rather than a moved timestamp — the date on a badge is when it was *first* earned, and
 * every launch re-evaluates the whole catalogue.
 */
export async function recordUnlocks(keys: string[], now: Date): Promise<void> {
  if (!keys.length) return;
  const db = await getDb();
  const iso = now.toISOString();
  for (const key of keys) {
    await db.runAsync(
      'INSERT OR IGNORE INTO badge_unlocks (badge_key, unlocked_at) VALUES (?, ?)',
      key,
      iso
    );
  }
}
