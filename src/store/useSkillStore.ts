import { create } from 'zustand';
import * as skillQueries from '../db/queries/skills';
import { getSetting, setSetting } from '../db/queries/settings';
import type { SkillDef } from '../types';

const MRU_KEY = 'skill_mru';

// Pure, exported so components can memoize it against the raw state they subscribe to.
// A selector that *calls* orderedSkills() hands React a brand-new array on every render,
// which zustand v5 (useSyncExternalStore, no built-in equality check) reads as "the store
// changed" — an infinite re-render loop. It surfaced as React error #185 on web.
export function orderSkillsByMru(skills: SkillDef[], mru: string[]): SkillDef[] {
  const rank = new Map(mru.map((id, i) => [id, i]));
  return [...skills].sort((a, b) => {
    const ra = rank.get(a.id) ?? Infinity;
    const rb = rank.get(b.id) ?? Infinity;
    return ra - rb || a.name.localeCompare(b.name);
  });
}

interface SkillState {
  skills: SkillDef[];
  taskSkills: Record<string, string[]>; // taskId -> skillIds
  mru: string[]; // most-recently-used skill ids, newest first
  hydrate(): Promise<void>;
  refreshSkills(): Promise<void>;
  tagTask(taskId: string, skillIds: string[]): Promise<void>;
  // Skills ordered for capture chips: MRU first, then the rest alphabetically
  orderedSkills(): SkillDef[];
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  taskSkills: {},
  mru: [],

  hydrate: async () => {
    const [skills, links, mruRaw] = await Promise.all([
      skillQueries.getSkills(),
      skillQueries.getAllTaskSkills(),
      getSetting(MRU_KEY),
    ]);
    const taskSkills: Record<string, string[]> = {};
    for (const link of links) {
      (taskSkills[link.taskId] ??= []).push(link.skillId);
    }
    set({ skills, taskSkills, mru: mruRaw ? (JSON.parse(mruRaw) as string[]) : [] });
  },

  refreshSkills: async () => {
    set({ skills: await skillQueries.getSkills() });
  },

  tagTask: async (taskId, skillIds) => {
    const persisted = await skillQueries.setTaskSkills(taskId, skillIds);
    set({ taskSkills: { ...get().taskSkills, [taskId]: persisted } });
    if (persisted.length) {
      const mru = [...persisted, ...get().mru.filter((id) => !persisted.includes(id))].slice(0, 8);
      set({ mru });
      await setSetting(MRU_KEY, JSON.stringify(mru));
    }
  },

  // Imperative callers only (getState().orderedSkills()). Inside a component, subscribe to
  // `skills`/`mru` and memoize orderSkillsByMru instead — see the note on that function.
  orderedSkills: () => {
    const { skills, mru } = get();
    return orderSkillsByMru(skills, mru);
  },
}));
