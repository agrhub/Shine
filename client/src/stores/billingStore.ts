import { defineStore } from 'pinia';
import http from '@/utils/http';
import i18n from '@/i18n';
import { ElMessage } from 'element-plus';
import type { SubscriptionTier } from '@/types/api';

export const useBillingStore = defineStore('billing', {
  state: () => ({
    currentTier: {
      tier: 'creator',
      creditBalance: 250,
      creditQuota: 1000,
      features: ['series.create', 'script.generate', 'voice.tts', 'publish.multi'],
      monthlyPriceUsd: 29,
    } as SubscriptionTier,
    loading: false,
    checkoutLoading: false,
  }),

  getters: {
    isCreditsLow(): boolean {
      if (!this.currentTier || !this.currentTier.creditQuota) return false;
      return (this.currentTier.creditBalance / this.currentTier.creditQuota) < 0.1;
    },
  },

  actions: {
    async fetchTierInfo(): Promise<SubscriptionTier | null> {
      this.loading = true;
      try {
        const res = await http.get('/billing/tier');
        if (res.data && res.data.data) {
          this.currentTier = res.data.data;
          if (this.isCreditsLow) {
            ElMessage.warning(
              i18n.global.t('toast.creditsLow', { count: this.currentTier.creditBalance })
            );
          }
          return this.currentTier;
        }
        return null;
      } catch (err) {
        console.error('Failed to fetch tier info', err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async startCheckout(tier: 'free' | 'creator' | 'studio' | 'enterprise') {
      if (tier === 'free') return;
      this.checkoutLoading = true;
      try {
        const res = await http.post('/billing/checkout', { tier });
        if (res.data && res.data.data && res.data.data.url) {
          window.location.href = res.data.data.url;
        } else {
          ElMessage.success(i18n.global.t('toast.subscriptionUpgraded', { tier }));
          this.currentTier.tier = tier;
        }
      } catch (err) {
        console.error('Checkout failed', err);
        ElMessage.error('Failed to initiate checkout process');
      } finally {
        this.checkoutLoading = false;
      }
    },

    async fetchCreditBalance(): Promise<number> {
      try {
        const res = await http.get('/billing/tier');
        if (res.data && res.data.data) {
          this.currentTier = res.data.data;
          return this.currentTier.creditBalance;
        }
        return this.currentTier.creditBalance;
      } catch (err) {
        console.error('Failed to fetch credit balance', err);
        return this.currentTier.creditBalance;
      }
    },
  },
});
