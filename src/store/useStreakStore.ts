import { create } from 'zustand';
import * as streakQueries from '../db/queries/streaks';
import { getAllCompletions } from '../db/queries/completions';
import { computeGlobalStreak, computeHabitStreak, mergeLongest } from '../engine/streaks';
import { dayKeyFor } from '../engine/time';
import type { Streak, Task } from '../types';
import type { StreakState } from '../engine/streaks';

// Streaks are recomputed from the completions log every time the app opens, then written back
// (see reconcileStreaks). That ordering is the whole point: nothing here increments a counter
// when a quest is completed, so being away for a week is not a special case — the next launch
// simply derives the truth, breaks included.
//
// Cost is a full read of `completions`. At a realistic ~1,800 rows/year that is a millisecond
// of array work; when it stops being cheap, the fix is a date-bounded read, not a counter.

interface StreakEntry {
  state: StreakState;
  /** Record from the DB, which can exceed the derived value (§7: never decremented). */
  longest: number;
  resetCount: number;
}

interface StreakStoreState {
  /** Keyed by task id, plus `global` for the active-day streak. */
  byTask: Record<string, StreakEntry>;
  global: StreakEntry | null;
  hydrate(tasks: Task[], now: Date): Promise<void>;
}

const GLOBAL = 'global';

export const useStreakStore = create<StreakStoreState>((set) => ({
  byTask: {},
  global: null,

  hydrate: async (tasks, now) => {
    const [completions, stored] = await Promise.all([getAllCompletions(), streakQueries.getStreaks()]);

    const storedByTask = new Map<string, Streak>();
    let storedGlobal: Streak | undefined;
    for (const s of stored) {
      if (s.taskId === null) storedGlobal = s;
      else storedByTask.set(s.taskId, s);
    }

    // Completion day keys, per task and overall. Local-time keys throughout (D4).
    const daysByTask = new Map<string, Set<string>>();
    const activeDays = new Set<string>();
    for (const c of completions) {
      // A counted task logs several rows a day and only one of them carries XP; every row
      // still means the user did something that day, so all of them count for streaks.
      const key = dayKeyFor(new Date(c.completedAt));
      activeDays.add(key);
      let set = daysByTask.get(c.taskId);
      if (!set) daysByTask.set(c.taskId, (set = new Set()));
      set.add(key);
    }

    const upserts: streakQueries.StreakUpsert[] = [];
    const byTask: Record<string, StreakEntry> = {};

    for (const task of tasks) {
      // Only scheduled habits have a per-habit streak — a one-off todo has nothing to be
      // consecutive about (§7).
      if (!task.schedule) continue;
      const from = dayKeyFor(new Date(task.createdAt));
      const state = computeHabitStreak(task.schedule, daysByTask.get(task.id) ?? new Set(), from, now);
      const prior = storedByTask.get(task.id);
      byTask[task.id] = {
        state,
        longest: mergeLongest(prior?.longestStreak ?? 0, state.longest),
        resetCount: Math.max(prior?.resetCount ?? 0, state.resetCount),
      };
      upserts.push({
        taskId: task.id,
        current: state.current,
        longest: state.longest,
        lastActiveDay: state.lastActiveDay,
        breaks: state.breaks,
      });
    }

    // The global streak starts from the earliest completion — not from the first task's
    // creation, which would count days before the user had anything to do as misses.
    const firstDay = [...activeDays].sort()[0] ?? dayKeyFor(now);
    const globalState = computeGlobalStreak(activeDays, firstDay, now);
    const global: StreakEntry = {
      state: globalState,
      longest: mergeLongest(storedGlobal?.longestStreak ?? 0, globalState.longest),
      resetCount: Math.max(storedGlobal?.resetCount ?? 0, globalState.resetCount),
    };
    upserts.push({
      taskId: null,
      current: globalState.current,
      longest: globalState.longest,
      lastActiveDay: globalState.lastActiveDay,
      breaks: globalState.breaks,
    });

    // Write-to-DB-first (§3): persist, then project into the store from what came back.
    const persisted = await streakQueries.reconcileStreaks(upserts, now);
    const persistedGlobal = persisted.find((s) => s.taskId === null);
    const persistedByTask = new Map(persisted.filter((s) => s.taskId).map((s) => [s.taskId!, s]));

    for (const [taskId, entry] of Object.entries(byTask)) {
      const row = persistedByTask.get(taskId);
      if (row) {
        entry.longest = row.longestStreak;
        entry.resetCount = row.resetCount;
      }
    }
    if (persistedGlobal) {
      global.longest = persistedGlobal.longestStreak;
      global.resetCount = persistedGlobal.resetCount;
    }

    set({ byTask, global });
  },
}));

export { GLOBAL };
