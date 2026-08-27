import { defineStore } from 'pinia';
import http from '@/utils/http';
import i18n from '@/i18n';
import { ElMessage } from 'element-plus';
import { useAuthStore } from './useAuthStore';
import type { SubscriptionTier } from '@/types/api';

export const useBillingStore = defineStore('billing', {
  state: () => {
    const authStore = useAuthStore();
    const isEnterprise = (authStore.user?.role || '').toLowerCase() === 'admin';
    return {
      currentTier: {
        tier: isEnterprise ? 'enterprise' : (authStore.user?.tier?.toLowerCase() || 'free'),
        credit_balance: authStore.user?.credits ?? 100,
        credit_quota: isEnterprise ? 10000 : 1000,
        features: ['series.create', 'script.generate', 'voice.tts', 'publish.multi'],
        monthly_price_usd: isEnterprise ? 299 : 0,
      } as SubscriptionTier,
      loading: false,
      checkoutLoading: false,
    };
  },

  getters: {
    isCreditsLow(): boolean {
      if (!this.currentTier || !this.currentTier.credit_quota) return false;
      return (this.currentTier.credit_balance / this.currentTier.credit_quota) < 0.1;
    },
  },

  actions: {
    async fetchTierInfo(): Promise<SubscriptionTier | null> {
      this.loading = true;
      const authStore = useAuthStore();
      try {
        const res = await http.get('/billing/tier');
        if (res.data && res.data.data) {
          this.currentTier = res.data.data;
          if (authStore.user) {
            authStore.user.credits = this.currentTier.credit_balance;
            localStorage.setItem('shine_user', JSON.stringify(authStore.user));
          }
          if (this.isCreditsLow) {
            ElMessage.warning(
              i18n.global.t('toast.creditsLow', { count: this.currentTier.credit_balance })
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
          return this.currentTier.credit_balance;
        }
        return this.currentTier.credit_balance;
      } catch (err) {
        console.error('Failed to fetch credit balance', err);
        return this.currentTier.credit_balance;
      }
    },
  },
});
