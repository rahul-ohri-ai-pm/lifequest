import { create } from 'zustand';
import * as characterQueries from '../db/queries/character';
import type { Character } from '../types';

interface CharacterState {
  character: Character | null;
  hydrate(): Promise<void>;
  // Only ever called with a row already persisted by a query function (write-to-DB-first, §3)
  setFromPersisted(character: Character): void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  hydrate: async () => {
    const character = await characterQueries.getCharacter();
    set({ character });
  },
  setFromPersisted: (character) => set({ character }),
}));
