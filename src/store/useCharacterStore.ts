import { create } from 'zustand';
import * as characterQueries from '../db/queries/character';
import { levelForTotalXp } from '../engine/xp';
import type { Character } from '../types';

interface CharacterState {
  character: Character | null;
  // Transient UI signal, not persisted state: the level just crossed, or null. The overlay
  // consumes it and clears it. Derived by comparing before/after on a write, so nothing new
  // is stored and §4's "never store derived stats" rule is untouched.
  justLeveledTo: number | null;
  hydrate(): Promise<void>;
  // Only ever called with a row already persisted by a query function (write-to-DB-first, §3)
  setFromPersisted(character: Character): void;
  clearLevelUp(): void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  justLeveledTo: null,
  hydrate: async () => {
    const character = await characterQueries.getCharacter();
    set({ character });
  },
  setFromPersisted: (character) => {
    const prev = get().character;
    const nextLevel = levelForTotalXp(character.totalXp);
    // `prev` is null on first hydrate — booting into an existing level 12 character is not
    // a level-up. Strictly greater, so undoing a completion back down a level stays quiet.
    const leveledUp = prev != null && nextLevel > levelForTotalXp(prev.totalXp);
    set(leveledUp ? { character, justLeveledTo: nextLevel } : { character });
  },
  clearLevelUp: () => set({ justLeveledTo: null }),
}));
