import { create } from 'zustand';
import { xpForDifficulty } from '../engine/xp';
import { xpForCountedLog } from '../engine/counted';
import { dayKeyFor, dayWindow } from '../engine/time';
import * as taskQueries from '../db/queries/tasks';
import * as completionQueries from '../db/queries/completions';
import * as skipQueries from '../db/queries/skips';
import { useCharacterStore } from './useCharacterStore';
import { useSkillStore } from './useSkillStore';
import type { Completion, Skip, Task } from '../types';
import type { NewTask, TaskPatch } from '../db/queries/tasks';

interface TaskState {
  tasks: Task[];
  completionsToday: Completion[];
  skipsToday: Skip[];
  hydrate(now: Date): Promise<void>;
  addTask(input: NewTask, now: Date): Promise<Task>;
  updateTask(id: string, patch: TaskPatch, now: Date): Promise<void>;
  completeTask(task: Task, now: Date): Promise<Completion>;
  /** Log a quest as completed on a past day (calendar backfill). */
  backfillCompletion(task: Task, day: Date, now: Date): Promise<Completion>;
  logCountedProgress(task: Task, amount: number, now: Date): Promise<Completion>;
  undoCompletion(completionId: string, now: Date): Promise<void>;
  skipTask(task: Task, now: Date): Promise<void>;
  unskipTask(task: Task, now: Date): Promise<void>;
  /** Skip/unskip on an arbitrary local day (calendar backfill). */
  setSkip(task: Task, dayKey: string, now: Date): Promise<void>;
  clearSkip(task: Task, dayKey: string, now: Date): Promise<void>;
  archiveTask(id: string, now: Date): Promise<void>;
  unarchiveTask(id: string, now: Date): Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  completionsToday: [],
  skipsToday: [],

  hydrate: async (now) => {
    const { startIso, endIso } = dayWindow(now);
    const [tasks, completionsToday, skipsToday] = await Promise.all([
      taskQueries.getActiveTasks(),
      completionQueries.getCompletionsBetween(startIso, endIso),
      skipQueries.getSkipsForDay(dayKeyFor(now)),
    ]);
    set({ tasks, completionsToday, skipsToday });
  },

  addTask: async (input, now) => {
    const task = await taskQueries.createTask(input, now);
    set({ tasks: [task, ...get().tasks] });
    return task;
  },

  updateTask: async (id, patch, now) => {
    const task = await taskQueries.updateTask(id, patch, now);
    set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) });
  },

  completeTask: async (task, now) => {
    // Counted tasks log progress via their own flow (M6); this is the one-tap complete.
    const xp = xpForDifficulty(task.difficulty);
    const { completion, character } = await completionQueries.logCompletion(task.id, xp, null, now);
    set({ completionsToday: [...get().completionsToday, completion] });
    useCharacterStore.getState().setFromPersisted(character);
    void useSkillStore.getState().refreshSkills();
    return completion;
  },

  // Calendar backfill. Same write path and the same XP as a live completion — the only
  // difference is `completed_at`, which lands on the chosen day so stats, the calendar and the
  // streak engine all place the work where it actually happened (and a break can be repaired
  // retroactively). Midday is used rather than midnight so a daylight-saving shift can never
  // push the row onto the neighbouring day.
  backfillCompletion: async (task, day, now) => {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0);
    let xp = xpForDifficulty(task.difficulty);
    let progressCount: number | null = null;

    // A counted quest has no retro +1 stepper — backfill means "the target was met that day", so
    // the single row carries whatever was still outstanding and the §7 rule decides its XP
    // against the progress already logged for *that* day (which may be non-zero if some of it
    // was logged live). Read from the DB rather than `completionsToday`: the day in question is
    // usually not today, so the store slice would be about the wrong day entirely.
    if (task.type === 'counted' && task.targetCount != null) {
      const { startIso, endIso } = dayWindow(at);
      const sameDay = await completionQueries.getCompletionsBetween(startIso, endIso);
      const prior = sameDay
        .filter((c) => c.taskId === task.id)
        .reduce((sum, c) => sum + (c.progressCount ?? 0), 0);
      progressCount = Math.max(task.targetCount - prior, 1);
      xp = xpForCountedLog(prior, progressCount, task.targetCount, task.difficulty);
    }

    const { completion, character } = await completionQueries.logCompletion(
      task.id,
      xp,
      progressCount,
      now,
      at
    );
    // `completionsToday` is exactly what its name says. A backfilled row belongs to another
    // day, so adding it here would make Today claim work the user did last Tuesday.
    if (dayKeyFor(at) === dayKeyFor(now)) {
      set({ completionsToday: [...get().completionsToday, completion] });
    }
    useCharacterStore.getState().setFromPersisted(character);
    void useSkillStore.getState().refreshSkills();
    return completion;
  },

  // §7 counted rule: XP decided at log time against the current target; the entry
  // whose cumulative sum first reaches the target carries the full difficulty XP.
  logCountedProgress: async (task, amount, now) => {
    if (task.targetCount == null) throw new Error('logCountedProgress requires a counted task');
    const prior = get()
      .completionsToday.filter((c) => c.taskId === task.id)
      .reduce((sum, c) => sum + (c.progressCount ?? 0), 0);
    const xp = xpForCountedLog(prior, amount, task.targetCount, task.difficulty);
    const { completion, character } = await completionQueries.logCompletion(task.id, xp, amount, now);
    set({ completionsToday: [...get().completionsToday, completion] });
    useCharacterStore.getState().setFromPersisted(character);
    void useSkillStore.getState().refreshSkills();
    return completion;
  },

  undoCompletion: async (completionId, now) => {
    const character = await completionQueries.undoCompletion(completionId, now);
    set({ completionsToday: get().completionsToday.filter((c) => c.id !== completionId) });
    useCharacterStore.getState().setFromPersisted(character);
    void useSkillStore.getState().refreshSkills();
  },

  // §4 Skip: explicit "chose not to do it today" — stats-only, no XP.
  //
  // Day-scoped, because the calendar can now set a skip on a day that has already passed. The
  // guard is the same one `backfillCompletion` needs and for the same reason: `skipsToday` means
  // exactly what its name says, so letting a past-day row into it would make Today's quest log
  // show a habit as skipped that is still open right now.
  setSkip: async (task, dayKey, now) => {
    const skip = await skipQueries.addSkip(task.id, dayKey, now);
    if (dayKey === dayKeyFor(now)) set({ skipsToday: [...get().skipsToday, skip] });
  },

  clearSkip: async (task, dayKey, now) => {
    await skipQueries.removeSkip(task.id, dayKey);
    if (dayKey === dayKeyFor(now)) {
      set({
        skipsToday: get().skipsToday.filter((s) => !(s.taskId === task.id && s.day === dayKey)),
      });
    }
  },

  // Today's callers stay on these; they are the day-scoped pair pinned to now.
  skipTask: async (task, now) => {
    await get().setSkip(task, dayKeyFor(now), now);
  },

  unskipTask: async (task, now) => {
    await get().clearSkip(task, dayKeyFor(now), now);
  },

  archiveTask: async (id, now) => {
    await taskQueries.setTaskStatus(id, 'archived', now);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  unarchiveTask: async (id, now) => {
    const task = await taskQueries.setTaskStatus(id, 'active', now);
    set({ tasks: [task, ...get().tasks] });
  },
}));
