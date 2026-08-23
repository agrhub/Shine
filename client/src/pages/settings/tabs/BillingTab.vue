<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const { t } = useI18n();
const authStore = useAuthStore();

const billingData = ref({
  tier: 'creator',
  creditBalance: 0,
  creditQuota: 99990,
  monthlyPriceUsd: 29,
});
const usageHistory = ref<any[]>([]);
const isUpgrading = ref(false);

const tiersList = computed(() => [
  { id: 'free', name: t('settings.freeTier'), price: 0, credits: 100, desc: 'Casual testing & learning' },
  { id: 'creator', name: t('settings.creatorPro'), price: 29, credits: 1000, desc: 'High-frequency 9:16 drama generation', popular: true },
  { id: 'studio', name: t('settings.studioTeam'), price: 99, credits: 5000, desc: 'High-throughput cluster & S3 dedicated' },
  { id: 'enterprise', name: t('settings.enterpriseVip'), price: 299, credits: 20000, desc: 'Dedicated GPU clusters & custom models' },
]);

async function loadBilling() {
  try {
    const [tierRes, historyRes]: any = await Promise.all([
      http.get('/billing/tier'),
      http.get('/billing/usage-history'),
    ]);
    if (tierRes?.data) {
      billingData.value = tierRes.data;
      if (authStore.user) {
        authStore.user.credits = tierRes.data.creditBalance;
        localStorage.setItem('shine_user', JSON.stringify(authStore.user));
      }
    }
    if (historyRes?.data) usageHistory.value = historyRes.data;
  } catch (err) {
    console.error('Failed to fetch billing info', err);
  }
}

async function handleUpgradePlan(tierId: string) {
  isUpgrading.value = true;
  try {
    const res: any = await http.post('/billing/checkout', { tier: tierId });
    if (res?.data?.url) {
      toast.info(t('toast.redirectingCheckout'));
      window.location.href = res.data.url;
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Upgrade failed');
  } finally {
    isUpgrading.value = false;
  }
}

onMounted(() => {
  loadBilling();
});
</script>

<template>
  <div class="space-y-10">
    <div class="flex items-center justify-between pb-6 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
          {{ t('settings.billingPlan') }}
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          Manage your active AI processing tier, quota usage and invoices.
        </p>
      </div>
      <el-tag type="success" size="small" round effect="dark" class="uppercase">
        Current: {{ billingData.tier }}
      </el-tag>
    </div>

    <!-- Active Tier Card & Usage -->
    <div class="p-6 bg-gradient-to-br from-primary/10 via-[var(--el-card-bg-color)] to-[var(--el-card-bg-color)] border border-primary/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <span class="text-[10px] font-bold tracking-wider text-primary uppercase">{{ t('settings.activeSubscription') }}</span>
        <h3 class="text-2xl font-bold text-[var(--el-text-color-primary)] mt-1">{{ billingData.tier.toUpperCase() }} PLAN</h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          Renews next billing cycle. Includes high-priority queue.
        </p>
      </div>
      <div class="w-full md:w-64 space-y-2">
        <div class="flex justify-between text-xs font-semibold">
          <span class="text-[var(--el-text-color-secondary)]">{{ t('settings.creditsUsed') }}</span>
          <span class="text-[var(--el-text-color-primary)]">{{ billingData.creditBalance }} / {{ billingData.creditQuota }}</span>
        </div>
        <el-progress
          :percentage="Math.min(100, Math.round((billingData.creditBalance / (billingData.creditQuota || 1)) * 100))"
          color="var(--el-color-primary)"
          :stroke-width="8"
        />
      </div>
    </div>

    <!-- Available Plans Grid -->
    <div>
      <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] mb-4">{{ t('settings.availablePlans') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="plan in tiersList"
          :key="plan.id"
          :class="[
            'p-6 bg-[var(--el-card-bg-color)] border rounded-2xl flex flex-col justify-between space-y-6 transition relative shadow-soft',
            billingData.tier === plan.id ? 'border-primary ring-1 ring-primary' : 'border-[var(--el-border-color)] hover:border-primary/40'
          ]"
        >
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <h4 class="font-bold text-sm text-[var(--el-text-color-primary)]">{{ plan.name }}</h4>
              <el-tag v-if="plan.popular" size="small" type="warning" effect="dark" round>{{ t('settings.popular') }}</el-tag>
            </div>
            <div>
              <span class="text-2xl font-black text-[var(--el-text-color-primary)]">${{ plan.price }}</span>
              <span class="text-xs text-[var(--el-text-color-secondary)]"> / {{ t('settings.mo') }}</span>
            </div>
            <p class="text-xs text-[var(--el-text-color-secondary)]">{{ plan.desc }}</p>
            <div class="pt-2 text-xs font-semibold text-primary">
              <i class="fa-solid fa-coins mr-1.5"></i> {{ plan.credits.toLocaleString() }} {{ t('settings.credits') }}
            </div>
          </div>
          <el-button
            :type="billingData.tier === plan.id ? 'default' : 'primary'"
            round
            size="small"
            :disabled="billingData.tier === plan.id"
            :loading="isUpgrading"
            @click="handleUpgradePlan(plan.id)"
          >
            {{ billingData.tier === plan.id ? t('settings.currentPlan') : t('settings.upgrade') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Usage & Invoices History -->
    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.invoicesHistory') }}</h3>
      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl overflow-hidden shadow-soft">
        <el-table :data="usageHistory.length ? usageHistory : [
          { date: '2026-08-01', description: 'Creator Pro Plan - Monthly', amount: '$29.00', status: 'Paid' },
          { date: '2026-07-01', description: 'Creator Pro Plan - Monthly', amount: '$29.00', status: 'Paid' },
        ]" style="width: 100%">
          <el-table-column prop="date" :label="t('common.date')" width="140" />
          <el-table-column prop="description" :label="t('common.description')" />
          <el-table-column prop="amount" :label="t('common.amount')" width="130" />
          <el-table-column prop="status" label="Status" width="110">
            <template #default="{ row }">
              <el-tag size="small" type="success" round effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>
