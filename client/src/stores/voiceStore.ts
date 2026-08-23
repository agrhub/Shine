import { defineStore } from 'pinia';
import http from '@/utils/http';
import i18n from '@/i18n';
import type { VoicePreset, TtsRequest, TtsResponse } from '@/types/api';
import { useTimelineStore } from '@/stores/timelineStore';

export const useVoiceStore = defineStore('voice', {
  state: () => ({
    voicePresets: [] as VoicePreset[],
    selectedVoice: null as VoicePreset | null,
    loading: false,
    generatingTts: false,
    batchProgress: 0,
  }),

  actions: {
    async fetchPresets() {
      this.loading = true;
      try {
        const res: any = await http.get('/voices/presets');
        const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        if (Array.isArray(items) && items.length > 0) {
          this.voicePresets = items;
          if (!this.selectedVoice && this.voicePresets.length > 0) {
            this.selectedVoice = this.voicePresets[0];
          }
        }
      } catch (err) {
        console.error('Failed to fetch voice presets', err);
      } finally {
        this.loading = false;
      }
    },

    selectVoice(voice: VoicePreset) {
      this.selectedVoice = voice;
    },

    async generateTts(req: TtsRequest): Promise<TtsResponse | null> {
      this.generatingTts = true;
      this.batchProgress = 20;
      try {
        const res: any = await http.post('/voices/tts', req);
        this.batchProgress = 100;
        return res?.data?.data || res?.data || null;
      } catch (err) {
        console.error('TTS generation failed', err);
        return null;
      } finally {
        this.generatingTts = false;
      }
    },

    async reAlignDubbing(episodeId: string, audioUrl: string) {
      this.loading = true;
      try {
        const res = await http.post('/voices/dubbing/re-align', { episodeId, audioUrl });
        if (res.data && res.data.data && res.data.data.commands) {
          const timelineStore = useTimelineStore();
          if (timelineStore.executeMany) {
            timelineStore.executeMany(res.data.data.commands);
          }
        }
        return res.data?.data;
      } catch (err) {
        console.error('Dubbing realignment failed', err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async steerEmotion(voiceId: string, emotionTag: string, intensityLevel: number) {
      try {
        const res = await http.post('/voices/steer-emotion', {
          voiceId,
          emotionTag,
          intensityLevel,
        });
        return res.data?.data;
      } catch (err) {
        console.error('Emotion steering failed', err);
        return null;
      }
    },
  },
});
