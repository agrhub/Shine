import { defineStore } from 'pinia';
import http from '@/utils/http';
import type { KaraokeStyle, SpatialAudioConfig, CliffhangerJob } from '@/types/api';

export const useCaptionStore = defineStore('caption', {
  state: () => ({
    currentStyle: {
      preset: 'pop',
      emojiSentiment: true,
      bassSync: true,
      textColor: '#FFFFFF',
      fontSizePx: 42,
      verticalPosPct: 80,
      outlineWeightPx: 3,
      autoHighlight: true,
      targetLanguage: 'en-US',
    } as KaraokeStyle,

    spatialConfig: {
      trackPans: { dialogue: 0, music: -0.2, sfx: 0.3 },
      reverbProfile: 'penthouse',
      autoDucking: true,
    } as SpatialAudioConfig,

    cliffhangerJob: null as CliffhangerJob | null,
    loading: false,
    generatingCliffhanger: false,
    cliffhangerProgress: 0,
  }),

  actions: {
    async applyKaraokeStyle(episodeId: string, style: Partial<KaraokeStyle>) {
      this.loading = true;
      this.currentStyle = { ...this.currentStyle, ...style };
      try {
        const res = await http.post('/captions/kinetic-style', {
          episodeId,
          style: this.currentStyle,
        });
        return res.data?.data;
      } catch (err) {
        console.error('Failed to apply karaoke style', err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async mixSpatialAudio(episodeId: string, config: Partial<SpatialAudioConfig>) {
      this.loading = true;
      this.spatialConfig = { ...this.spatialConfig, ...config };
      try {
        const res = await http.post('/audio/spatial-mix', {
          episodeId,
          config: this.spatialConfig,
        });
        return res.data?.data;
      } catch (err) {
        console.error('Failed to mix spatial audio', err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async generateCliffhanger(episodeId: string, transitionType: 'glitch' | 'flash' = 'glitch', zoomKeyframe: boolean = true, ctaText?: string) {
      this.generatingCliffhanger = true;
      this.cliffhangerProgress = 15;
      try {
        const res = await http.post('/ai/cliffhanger/generate', {
          episodeId,
          transitionType,
          zoomKeyframe,
          ctaText,
        });

        this.cliffhangerProgress = 100;
        if (res.data && res.data.data) {
          this.cliffhangerJob = res.data.data;
        }
        return res.data?.data;
      } catch (err) {
        console.error('Failed to generate cliffhanger', err);
        return null;
      } finally {
        this.generatingCliffhanger = false;
      }
    },
  },
});
