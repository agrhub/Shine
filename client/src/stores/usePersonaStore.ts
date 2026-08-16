import { defineStore } from 'pinia';
import http from '@/utils/http';
import type { Character } from '@/types/api';

export const usePersonaStore = defineStore('persona', {
  state: () => ({
    characters: [] as Character[],
    activeCharacter: null as Character | null,
    isLoading: false,
    isExtractingAnchors: false,
  }),

  actions: {
    async fetchCharacters() {
      this.isLoading = true;
      try {
        const res = await http.get('/characters') as any;
        if (res.data) {
          this.characters = res.data;
          if (this.characters.length > 0 && !this.activeCharacter) {
            this.activeCharacter = this.characters[0];
          }
        }
        return res.data;
      } finally {
        this.isLoading = false;
      }
    },

    async createCharacter(payload: { name: string; role: 'protagonist' | 'antagonist' | 'supporting'; description: string }) {
      this.isLoading = true;
      try {
        const res = await http.post('/characters', payload) as any;
        if (res.data) {
          this.characters.push(res.data);
          this.activeCharacter = res.data;
        }
        return res.data;
      } finally {
        this.isLoading = false;
      }
    },

    async extractFacialAnchors(characterId: string) {
      this.isExtractingAnchors = true;
      try {
        const res = await http.post(`/characters/${characterId}/anchors`, {}) as any;
        if (res.data) {
          const idx = this.characters.findIndex(c => c.id === characterId);
          if (idx !== -1) {
            this.characters[idx] = res.data;
          }
          if (this.activeCharacter?.id === characterId) {
            this.activeCharacter = res.data;
          }
        }
        return res.data;
      } finally {
        this.isExtractingAnchors = false;
      }
    },

    async addWardrobeOutfit(characterId: string, item: { name: string; category: string }) {
      try {
        const res = await http.post(`/characters/${characterId}/wardrobe`, item) as any;
        if (res.data) {
          const char = this.characters.find(c => c.id === characterId);
          if (char) {
            char.wardrobe.push(res.data);
          }
        }
        return res.data;
      } catch (err) {
        throw err;
      }
    },

    setActiveCharacter(character: Character) {
      this.activeCharacter = character;
    },
  },
});
