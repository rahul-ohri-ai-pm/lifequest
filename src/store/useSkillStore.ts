import { create } from 'zustand';
import * as skillQueries from '../db/queries/skills';
import { getSetting, setSetting } from '../db/queries/settings';
import type { SkillDef } from '../types';

const MRU_KEY = 'skill_mru';

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

  orderedSkills: () => {
    const { skills, mru } = get();
    const rank = new Map(mru.map((id, i) => [id, i]));
    return [...skills].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id)! : Infinity;
      return ra - rb || a.name.localeCompare(b.name);
    });
  },
}));
