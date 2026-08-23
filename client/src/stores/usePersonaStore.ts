import { defineStore } from 'pinia';
import http from '@/utils/http';
import type { Character } from '@/types/api';

export const usePersonaStore = defineStore('persona', {
  state: () => ({
    characters: [] as Character[],
    activeCharacter: null as Character | null,
    isLoading: false,
    isExtractingAnchors: false,
    isGeneratingPortrait: false,
  }),

  actions: {
    async fetchCharacters(seriesId?: string) {
      this.isLoading = true;
      try {
        const res = await http.get('/characters', { params: { seriesId } }) as any;
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

    async createCharacter(payload: { name: string; role: 'protagonist' | 'antagonist' | 'supporter' | 'supporting'; personality?: string; visualTraits?: string; description?: string; seriesId?: string; avatarUrl?: string }) {
      this.isLoading = true;
      try {
        const res = await http.post('/characters', payload) as any;
        const newChar = res.data?.data || res.data;
        if (newChar) {
          this.characters.push(newChar);
          this.activeCharacter = newChar;
        }
        return newChar;
      } finally {
        this.isLoading = false;
      }
    },

    async generatePortrait(characterId: string, payload: { seriesId?: string; name?: string; visualTraits?: string; prompt?: string; style?: string }) {
      this.isGeneratingPortrait = true;
      try {
        const res = await http.post(`/characters/${characterId}/portrait`, payload) as any;
        const data = res.data?.data || res.data;
        if (data?.url || data?.imageUrl) {
          const avatarUrl = data.url || data.imageUrl;
          const idx = this.characters.findIndex(c => c.id === characterId);
          if (idx !== -1) {
            this.characters[idx].avatarUrl = avatarUrl;
            this.characters[idx].avatar = avatarUrl;
          }
          if (this.activeCharacter?.id === characterId) {
            this.activeCharacter.avatarUrl = avatarUrl;
            this.activeCharacter.avatar = avatarUrl;
          }
        }
        return data;
      } finally {
        this.isGeneratingPortrait = false;
      }
    },

    async extractFacialAnchors(characterId: string, payload: { seriesId?: string; name?: string; visualTraits?: string } = {}) {
      this.isExtractingAnchors = true;
      try {
        const res = await http.post(`/characters/${characterId}/anchors`, payload) as any;
        const updated = res.data?.data || res.data;
        if (updated) {
          const idx = this.characters.findIndex(c => c.id === characterId);
          if (idx !== -1) {
            this.characters[idx] = { ...this.characters[idx], ...updated };
          }
          if (this.activeCharacter?.id === characterId) {
            this.activeCharacter = { ...this.activeCharacter, ...updated };
          }
        }
        return updated;
      } finally {
        this.isExtractingAnchors = false;
      }
    },

    async addWardrobeOutfit(characterId: string, item: { name: string; category: string; seriesId?: string; thumbnailUrl?: string; tags?: string[] }) {
      try {
        const res = await http.post(`/characters/${characterId}/wardrobe`, item) as any;
        const newOutfit = res.data?.data || res.data;
        if (newOutfit) {
          const char = this.characters.find(c => c.id === characterId);
          if (char) {
            if (!Array.isArray(char.wardrobe)) char.wardrobe = [];
            char.wardrobe.push(newOutfit);
          }
        }
        return newOutfit;
      } catch (err) {
        throw err;
      }
    },

    setActiveCharacter(character: Character) {
      this.activeCharacter = character;
    },
  },
});

