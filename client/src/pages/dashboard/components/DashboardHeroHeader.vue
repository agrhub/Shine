<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBillingStore } from '@/stores/billingStore';

const { t } = useI18n();
const authStore = useAuthStore();
const billingStore = useBillingStore();

const userName = computed(() => authStore.user?.name || 'Creator');
const userCredits = computed(() => authStore.user?.credits ?? billingStore.currentTier?.credit_balance ?? 0);
</script>

<template>
  <!-- Top Welcome Banner -->
  <section class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] text-[var(--el-text-color-primary)] rounded-[28px] p-8 relative overflow-hidden shadow-soft">
    <div class="absolute -right-12 -top-12 w-64 h-64 bg-[var(--el-color-primary)]/10 blur-[60px] rounded-full pointer-events-none"></div>
    <div class="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="text-[var(--el-text-color-secondary)] text-sm font-medium mb-2">{{ t('auth.loginHeader') }}, {{ userName }}</p>
        <h2 class="text-2xl lg:text-3xl font-light tracking-tight">{{ t('home.lovedByCreators') }} — {{ t('common.brandStudio') }}</h2>
      </div>
      <div class="text-left md:text-right">
        <div class="text-3xl font-semibold tracking-tight">
          {{ userCredits.toLocaleString() }}
          <span class="text-[var(--el-color-primary)] text-base font-medium">{{ t('dashboard.shineCredits') }}</span>
        </div>
        <p class="text-[var(--el-text-color-secondary)] text-xs mt-1">
          {{ t('billing.creditsRemaining', { count: userCredits }) }}
        </p>
      </div>
    </div>
  </section>
</template>
