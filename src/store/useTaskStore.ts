import { create } from 'zustand';
import { xpForDifficulty } from '../engine/xp';
import { dayKeyFor, dayWindow } from '../engine/time';
import * as taskQueries from '../db/queries/tasks';
import * as completionQueries from '../db/queries/completions';
import * as skipQueries from '../db/queries/skips';
import { useCharacterStore } from './useCharacterStore';
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
  undoCompletion(completionId: string, now: Date): Promise<void>;
  skipTask(task: Task, now: Date): Promise<void>;
  unskipTask(task: Task, now: Date): Promise<void>;
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
    return completion;
  },

  undoCompletion: async (completionId, now) => {
    const character = await completionQueries.undoCompletion(completionId, now);
    set({ completionsToday: get().completionsToday.filter((c) => c.id !== completionId) });
    useCharacterStore.getState().setFromPersisted(character);
  },

  // §4 Skip: explicit "chose not to do it today" — stats-only, no XP
  skipTask: async (task, now) => {
    const skip = await skipQueries.addSkip(task.id, dayKeyFor(now), now);
    set({ skipsToday: [...get().skipsToday, skip] });
  },

  unskipTask: async (task, now) => {
    const dayKey = dayKeyFor(now);
    await skipQueries.removeSkip(task.id, dayKey);
    set({ skipsToday: get().skipsToday.filter((s) => !(s.taskId === task.id && s.day === dayKey)) });
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
