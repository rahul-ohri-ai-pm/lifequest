import { create } from 'zustand';
import * as badgeQueries from '../db/queries/badges';
import { getAllCompletions } from '../db/queries/completions';
import { getAllSkips } from '../db/queries/skips';
import { evaluateBadges, newlyUnlocked, type BadgeStatus } from '../engine/badges';
import { useCharacterStore } from './useCharacterStore';
import { useSkillStore } from './useSkillStore';
import { useStreakStore } from './useStreakStore';
import type { Task } from '../types';

// Badge state follows the same shape as streaks (D29): the *status* of every badge is derived
// from the log on every evaluation, and only the unlock is persisted. So a badge's progress bar
// is always honest, while the badge itself can never be taken away — which is the asymmetry
// §7 already established for `longest_streak`.
//
// Evaluation runs on hydrate and after every write to the completions log. It costs one pass
// over ~1,800 rows a year for ~30 rules; when that stops being cheap the fix is a dirty-flag on
// the snapshot, not a stored progress column.

interface BadgeStoreState {
  statuses: BadgeStatus[];
  unlockedAt: Record<string, string>;
  /** Earned by an interaction and not yet celebrated. The moment component drains this. */
  pending: string[];
  /**
   * `celebrate: false` records unlocks without queueing a moment. Boot uses it: the first
   * launch after this feature ships legitimately unlocks a pile of badges from existing
   * history, and a nine-badge parade in front of someone who just opened the app is a
   * punishment. Those are found in the gallery instead.
   */
  evaluate(tasks: Task[], now: Date, celebrate?: boolean): Promise<string[]>;
  /** Drop the badge currently being celebrated and move to the next. */
  dismissCurrent(): void;
}

export const useBadgeStore = create<BadgeStoreState>((set, get) => ({
  statuses: [],
  unlockedAt: {},
  pending: [],

  evaluate: async (tasks, now, celebrate = true) => {
    const [completions, skips, unlocks] = await Promise.all([
      getAllCompletions(),
      getAllSkips(),
      badgeQueries.getBadgeUnlocks(),
    ]);

    // Read the other stores rather than re-query: they were hydrated from the same tables at
    // boot, and every mutation path refreshes them before this runs.
    const character = useCharacterStore.getState().character;
    const skills = useSkillStore.getState().skills;
    const streak = useStreakStore.getState();

    const skillXp: Record<string, number> = {};
    for (const s of skills) skillXp[s.id] = s.totalXp;

    let bestHabitStreak = 0;
    for (const entry of Object.values(streak.byTask)) {
      bestHabitStreak = Math.max(bestHabitStreak, entry.longest);
    }

    const snapshot = {
      completions,
      skips,
      tasks,
      totalXp: character?.totalXp ?? 0,
      skillXp,
      globalStreak: {
        current: streak.global?.state.current ?? 0,
        longest: streak.global?.longest ?? 0,
      },
      bestHabitStreak,
      now,
    };

    const already = new Set(unlocks.map((u) => u.badgeKey));
    const fresh = newlyUnlocked(snapshot, already);
    if (fresh.length) await badgeQueries.recordUnlocks(fresh, now);

    const unlockedAt: Record<string, string> = {};
    for (const u of unlocks) unlockedAt[u.badgeKey] = u.unlockedAt;
    for (const key of fresh) unlockedAt[key] = now.toISOString();

    // A badge stays unlocked once recorded, even if its condition no longer holds — so the
    // rendered status is the union of "qualifies now" and "has ever qualified".
    const statuses = evaluateBadges(snapshot).map((s) =>
      unlockedAt[s.rule.key] ? { ...s, unlocked: true, progress: 1 } : s
    );

    set({ statuses, unlockedAt, pending: celebrate ? [...get().pending, ...fresh] : get().pending });
    return fresh;
  },

  dismissCurrent: () => set((st) => ({ pending: st.pending.slice(1) })),
}));
