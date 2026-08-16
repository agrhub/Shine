import { defineStore } from 'pinia';
import http from '@/utils/http';
import type { ScriptItem, SeriesOutline, SupervisionResult } from '@/types/api';

export interface Episode {
  id?: string;
  number: number;
  title: string;
  status: 'draft' | 'in_progress' | 'done';
}

export const useScriptStore = defineStore('script', {
  state: () => ({
    activeScript: null as ScriptItem | null,
    outline: null as SeriesOutline | null,
    supervision: null as SupervisionResult | null,
    isGenerating: false,
    isSupervising: false,
    episodesList: [] as Episode[],
  }),

  actions: {
    async fetchEpisodes(seriesId: string) {
      try {
        const res: any = await http.get(`/series/${seriesId}`);
        const eps = res.data?.episodes || res.episodes || [];
        this.episodesList = eps.map((e: any, idx: number) => ({
          id: e.id,
          number: e.episode_number || idx + 1,
          title: e.title || `Episode ${idx + 1}`,
          status: e.status?.toLowerCase() === 'published' ? 'done' : 'draft',
        }));
      } catch {
        this.episodesList = [];
      }
    },

    async generateScript(seriesId?: string, episodeNumber: number = 1) {
      if (seriesId) {
        try {
          const res: any = await http.get(`/series/${seriesId}`);
          const s = res.data?.series || res.data || res.series || res;
          if (s && s.title) {
            return await this.generateFullScript({
              title: s.title,
              genre: s.genre || 'Suspense',
              tone: s.tone || 'Dramatic & High-Stakes',
              synopsis: s.synopsis || s.description || `${s.title} official series synopsis.`,
              episodeNumber: episodeNumber || 1,
              totalEpisodes: s.episode_count || 20,
            });
          }
        } catch (e) {
          console.warn('[useScriptStore] fetch series failed for generateScript:', e);
        }
      }

      // If seriesId is not specified or not found, fetch latest active series from DB
      try {
        const listRes: any = await http.get('/series');
        const seriesList = listRes.data?.series || listRes.series || listRes.data || [];
        if (Array.isArray(seriesList) && seriesList.length > 0) {
          const s = seriesList[0];
          return await this.generateFullScript({
            title: s.title,
            genre: s.genre || 'Suspense',
            tone: s.tone || 'Dramatic & High-Stakes',
            synopsis: s.synopsis || s.description || `${s.title} official series synopsis.`,
            episodeNumber: episodeNumber || 1,
            totalEpisodes: s.episode_count || 20,
          });
        }
      } catch (e) {
        console.warn('[useScriptStore] fetch series list failed:', e);
      }

      throw new Error('No series found to generate script. Please select or create a series first.');
    },

    async generateFullScript(payload: { title: string; genre: string; tone: string; synopsis: string; episodeNumber?: number; totalEpisodes?: number }) {
      this.isGenerating = true;
      try {
        const res = await http.post('/ai/generate-script', payload) as any;
        if (res.data) {
          this.outline = res.data.outline;
          this.activeScript = res.data.scriptItem;
          this.supervision = res.data.supervision;
        }
        return res.data;
      } finally {
        this.isGenerating = false;
      }
    },

    async generateOutline(payload: { title: string; genre: string; synopsis: string; episodeCount: number }) {
      this.isGenerating = true;
      try {
        const res = await http.post('/ai/generate-outline', payload) as any;
        if (res.data) {
          this.outline = res.data;
        }
        return res.data;
      } finally {
        this.isGenerating = false;
      }
    },

    async superviseActiveScript() {
      if (!this.activeScript) return;
      this.isSupervising = true;
      try {
        const res = await http.post('/ai/supervise-script', { scriptItem: this.activeScript }) as any;
        if (res.data) {
          this.supervision = res.data;
        }
        return res.data;
      } finally {
        this.isSupervising = false;
      }
    },

    updateSceneDialogue(sceneIndex: number, lineIndex: number, newDialogue: string) {
      if (this.activeScript && this.activeScript.scenes[sceneIndex]) {
        this.activeScript.scenes[sceneIndex].lines[lineIndex].dialogue = newDialogue;
      }
    },
  },
});
