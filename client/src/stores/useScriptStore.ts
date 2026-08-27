import { defineStore } from 'pinia';
import http from '@/utils/http';
import { useSeriesStore } from '@/stores/useSeriesStore';
import type { Episode, ScriptItem, SeriesOutline, SupervisionResult } from '@/types/api';

// export interface Episode {
//   id?: string;
//   number: number;
//   title: string;
//   status: 'draft' | 'in_progress' | 'done';
// }

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
              visual_style: s.visual_style || 'realistic',
              synopsis: s.synopsis || s.description || `${s.title} official series synopsis.`,
              episode_number: episodeNumber || 1,
              total_episodes: s.episode_count || 20,
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
            visual_style: s.visual_style || 'realistic',
            synopsis: s.synopsis || s.description || `${s.title} official series synopsis.`,
            episode_number: episodeNumber || 1,
            total_episodes: s.episode_count || 20,
          });
        }
      } catch (e) {
        console.warn('[useScriptStore] fetch series list failed:', e);
      }

      throw new Error('No series found to generate script. Please select or create a series first.');
    },

    async generateFullScript(payload: { title: string; genre: string; visual_style?: string; synopsis: string; episode_number?: number; total_episodes?: number }) {
      this.isGenerating = true;
      try {
        const res = await http.post('/ai/generate-script', payload) as any;
        if (res.data) {
          this.outline = res.data.outline;
          this.activeScript = res.data.script_item;
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
        if (this.activeScript.scenes[sceneIndex].lines?.[lineIndex]) {
          this.activeScript.scenes[sceneIndex].lines[lineIndex].dialogue = newDialogue;
        }
      }
    },

    // ─── GOOGLE FLOW STORYBOARD STUDIO ACTIONS ───────────────────────────────
    async extractScreenplayAssets(screenplay: string, seriesId?: string, episodeId?: string) {
      const seriesStore = useSeriesStore();
      const sId = seriesId || seriesStore.currentSeries?.id;
      const epId = episodeId || (seriesStore.activeEpisode as any)?.id;
      const res: any = await http.post('/assets/screenplay/extract', {
        screenplay,
        series_id: sId,
        episode_id: epId,
      });
      return res.data || { characters: [], locations: [], props: [] };
    },

    async describeScreenplayAssets(payload: {
      screenplay: string;
      characters?: string[];
      locations?: string[];
      props?: string[];
      series_id?: string;
      episode_id?: string;
    }) {
      const seriesStore = useSeriesStore();
      const sId = payload.series_id || seriesStore.currentSeries?.id;
      const epId = payload.episode_id || (seriesStore.activeEpisode as any)?.id;
      const res: any = await http.post('/assets/screenplay/describe-assets', {
        ...payload,
        series_id: sId,
        episode_id: epId,
      });
      return res.data || { characters: {}, locations: {}, props: {} };
    },

    async analyzeScreenplay(payload: {
      screenplay: string;
      series_id?: string;
      episode_id?: string;
      existing_characters?: any[];
      existing_locations?: any[];
      existing_props?: any[];
      target_duration_seconds?: number;
    }) {
      const seriesStore = useSeriesStore();
      const sId = payload.series_id || seriesStore.currentSeries?.id;
      const epId = payload.episode_id || (seriesStore.activeEpisode as any)?.id;
      const res: any = await http.post('/assets/screenplay/analyze', {
        ...payload,
        series_id: sId,
        episode_id: epId,
      });
      return res.data || { characters: [], locations: [], props: [], scenes: [], total_duration_seconds: 0 };
    },

    async generateCharacterSheet(payload: { character_name: string; physical_characteristics: string; clothing_and_accessories?: string; visual_style?: string; reference_image_url?: string }) {
      const res: any = await http.post('/assets/character/sheet', payload);
      return res.data || { image_url: '' };
    },

    async generateLocationSheet(payload: { location_name: string; physical_characteristics: string; time_of_day?: string; visual_style?: string }) {
      const res: any = await http.post('/assets/location/sheet', payload);
      return res.data || { image_url: '' };
    },

    async generatePropSheet(payload: { prop_name: string; physical_characteristics: string; visual_style?: string }) {
      const res: any = await http.post('/assets/prop/sheet', payload);
      return res.data || { image_url: '' };
    },

    async breakdownSceneToShots(payload: { scene_title: string; scene_content: string; available_assets: any[] }) {
      const res: any = await http.post('/assets/screenplay/breakdown-shots', payload);
      return res.data?.shots || [];
    },

    async generateShotImage(payload: { shot: any; assets: any[]; visual_style?: string; aspect_ratio?: string }) {
      const res: any = await http.post('/assets/storyboard/shot-image', payload);
      return res.data || { image_url: '' };
    },
  },
});
