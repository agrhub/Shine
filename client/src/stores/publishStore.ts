import { defineStore } from 'pinia';
import http from '@/utils/http';
import i18n from '@/i18n';
import { ElMessage } from 'element-plus';
import type { PublishJob } from '@/types/api';

export interface SocialConnection {
  _id?: string;
  platform: 'youtube' | 'tiktok' | 'facebook';
  channelId: string;
  channelName: string;
  isActive: boolean;
}

export interface PlatformComment {
  id: string;
  platform: string;
  author: string;
  authorAvatar?: string;
  text: string;
  likes: number;
  timestamp: string;
  replyCount?: number;
}

export interface SentimentAnalysisResult {
  sentiment: string;
  positiveRatio: number;
  topReactionTropes: string[];
  audienceComplaints: string[];
  scriptSuggestions: string[];
  retentionForecast: number;
}

export const usePublishStore = defineStore('publish', {
  state: () => ({
    activePublishJob: null as PublishJob | null,
    publishedJobs: [] as PublishJob[],
    coverVariants: [] as Array<{ id: string; url: string; title: string; score: number }>,
    publishing: false,
    generatingCover: false,
    platformProgress: {
      tiktok: 0,
      youtube: 0,
      instagram: 0,
      facebook: 0,
      douyin: 0,
    } as Record<string, number>,
    eventSource: null as EventSource | null,

    // Social Accounts & Engagement state
    connections: [] as SocialConnection[],
    isLoadingConnections: false,
    comments: [] as PlatformComment[],
    isLoadingComments: false,
    sentimentAnalysis: null as SentimentAnalysisResult | null,
    isAnalyzingSentiment: false,
  }),

  actions: {
    async fetchConnections() {
      this.isLoadingConnections = true;
      try {
        const res: any = await http.get('/social/connections');
        this.connections = res.data?.connections || res.connections || [];
        return this.connections;
      } catch (err) {
        console.warn('Failed to fetch social connections', err);
        return [];
      } finally {
        this.isLoadingConnections = false;
      }
    },

    async fetchComments(episodeId: string, platform?: string) {
      this.isLoadingComments = true;
      try {
        const res: any = await http.get('/engagement/comments', {
          params: { episodeId, platform },
        });
        this.comments = res.data?.data?.comments || res.data?.comments || [];
        return this.comments;
      } catch (err) {
        console.warn('Failed to fetch comments', err);
        this.comments = [];
        return [];
      } finally {
        this.isLoadingComments = false;
      }
    },

    async replyToComment(commentId: string, platform: string, text: string) {
      try {
        const res: any = await http.post('/engagement/reply', {
          commentId,
          platform,
          text,
        });
        ElMessage.success('Reply posted successfully');
        return res.data;
      } catch (err: any) {
        ElMessage.error(err?.response?.data?.error || err.message || 'Failed to post reply');
        throw err;
      }
    },

    async analyzeComments(episodeId: string, commentsList?: PlatformComment[]) {
      const targetComments = commentsList || this.comments;
      if (targetComments.length === 0) {
        ElMessage.warning('No comments available to analyze.');
        return null;
      }
      this.isAnalyzingSentiment = true;
      try {
        const res: any = await http.post('/engagement/analyze', {
          episodeId,
          comments: targetComments,
        });
        this.sentimentAnalysis = res.data?.data?.analysis || res.data?.analysis || null;
        ElMessage.success('Audience sentiment analyzed with Gemini');
        return this.sentimentAnalysis;
      } catch (err: any) {
        ElMessage.error(err?.response?.data?.message || 'Sentiment analysis failed');
        return null;
      } finally {
        this.isAnalyzingSentiment = false;
      }
    },

    async applyFeedbackToScript(seriesId: string, targetEpisodeNumber: number = 2, customNotes?: string) {
      try {
        const res: any = await http.post('/engagement/feedback-to-script', {
          seriesId,
          targetEpisodeNumber,
          analysis: this.sentimentAnalysis,
          customNotes,
        });
        ElMessage.success('Audience feedback incorporated into Episode script!');
        return res.data?.data;
      } catch (err: any) {
        ElMessage.error(err?.response?.data?.message || 'Failed to apply feedback to script');
        throw err;
      }
    },

    async publishEpisode(
      episodeId: string,
      platforms: ('tiktok' | 'youtube' | 'instagram' | 'facebook' | 'douyin')[],
      caption: string = '',
      hashtags: string[] = [],
      coverUrl: string = '',
      seriesId: string = 'series-001'
    ): Promise<PublishJob | null> {
      this.publishing = true;
      try {
        const startedMsg = i18n.global.t('toast.publishStarted', { platform: platforms.join(', ') });
        ElMessage.info(startedMsg);

        const res = await http.post('/publish/multi-platform', {
          episodeId,
          seriesId,
          platforms,
          caption,
          hashtags,
          coverUrl,
        });

        if (res.data && res.data.data) {
          const job: PublishJob = res.data.data;
          this.activePublishJob = job;
          this.publishedJobs.unshift(job);
          
          this.connectSse(job.id);
          return job;
        }
        return null;
      } catch (err: any) {
        console.error('Publish episode failed', err);
        const msg = err?.response?.data?.message || 'Failed to initiate publishing';
        ElMessage.error(msg);
        return null;
      } finally {
        this.publishing = false;
      }
    },

    connectSse(jobId: string) {
      if (this.eventSource) {
        this.eventSource.close();
      }
      const sseUrl = `${http.defaults.baseURL || '/api'}/render/stream?jobId=${encodeURIComponent(jobId)}`;
      const es = new EventSource(sseUrl);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.currentPlatform && typeof data.progress === 'number') {
            this.platformProgress[data.currentPlatform] = data.progress;
          }
          if (data.status === 'published' || data.status === 'success' || data.status === 'completed') {
            if (this.activePublishJob) {
              this.activePublishJob.status = 'success';
              if (data.publishedUrls) {
                this.activePublishJob.publishedUrls = data.publishedUrls;
              }
            }
            const count = Object.keys(data.publishedUrls || {}).length || 1;
            ElMessage.success(i18n.global.t('toast.publishSuccess', { count }));
            es.close();
            this.eventSource = null;
          }
        } catch (e) {
          console.error('Error parsing SSE data', e);
        }
      };

      es.onerror = () => {
        es.close();
        this.eventSource = null;
      };

      this.eventSource = es;
    },

    async generateViralCover(episodeId: string) {
      this.generatingCover = true;
      try {
        const res = await http.post('/ai/viral-cover/generate', { episodeId });
        if (res.data && res.data.data) {
          this.coverVariants = res.data.data.variants || [];
          return this.coverVariants;
        }
        return [];
      } catch (err) {
        console.error('Failed to generate viral cover', err);
        return [];
      } finally {
        this.generatingCover = false;
      }
    },
  },
});
