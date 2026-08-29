import { defineStore } from 'pinia';
import http from '@/utils/http';
import type { ViralTopic } from '@/types/api';

export const useTrendStore = defineStore('trend', {
  state: () => ({
    trends: [] as ViralTopic[],
    selectedRegion: 'United States',
    selectedTopic: null as ViralTopic | null,
    isLoading: false,
  }),

  actions: {
    async fetchViralTopics(country: string = 'United States', language: string = 'en-US') {
      this.selectedRegion = country;
      this.isLoading = true;
      try {
        const res = await http.get(`/ai/trends/viral-topics?country=${country}&lang=${language}`) as any;
        if (res.data) {
          this.trends = res.data;
          if (this.trends.length > 0 && !this.selectedTopic) {
            this.selectedTopic = this.trends[0];
          }
        }
        return res.data;
      } finally {
        this.isLoading = false;
      }
    },

    selectTopic(topic: ViralTopic) {
      this.selectedTopic = topic;
    },
  },
});
