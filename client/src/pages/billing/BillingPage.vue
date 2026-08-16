<template>
  <div class="billing-page bg-surface text-on-surface min-h-screen p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold text-on-surface flex items-center gap-2">
          <el-icon class="text-primary"><CreditCard /></el-icon>
          {{ $t('billing.title') || 'Subscription & Billing' }}
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          Manage your AI processing quota, credit balance, and plan upgrades
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-tag type="success" size="large" effect="dark">
          Current Tier: {{ billingStore.currentTier.tier.toUpperCase() }}
        </el-tag>
      </div>
    </div>

    <!-- Credit Balance Meter Card -->
    <el-card shadow="never" class="bg-surface-container border-outline-variant mb-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">AI Credit Balance</span>
          <h2 class="text-3xl font-extrabold text-primary mt-1">
            {{ billingStore.currentTier.creditBalance }} / {{ billingStore.currentTier.creditQuota }} Credits
          </h2>
          <p class="text-xs text-on-surface-variant mt-1">
            Credits auto-renew on the 1st of each month.
          </p>
        </div>
        <div class="w-full sm:w-72 space-y-2">
          <div class="flex justify-between text-xs text-on-surface-variant font-medium">
            <span>Usage</span>
            <span>{{ Math.round((billingStore.currentTier.creditBalance / billingStore.currentTier.creditQuota) * 100) }}% remaining</span>
          </div>
          <el-progress
            :percentage="Math.round((billingStore.currentTier.creditBalance / billingStore.currentTier.creditQuota) * 100)"
            :color="progressColor"
            :stroke-width="10"
            :show-text="false"
          />
        </div>
      </div>
    </el-card>

    <!-- Subscription Tier Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <el-card
        v-for="tierItem in tiers"
        :key="tierItem.id"
        shadow="never"
        class="bg-surface-container border-outline-variant relative flex flex-col justify-between"
        :class="billingStore.currentTier.tier === tierItem.id ? 'border-2 border-[var(--el-color-primary)]' : ''"
      >
        <div>
          <!-- Header Badge -->
          <div class="flex justify-between items-center mb-4">
            <el-tag :type="tierItem.tagType" effect="dark" size="default">
              {{ tierItem.name }}
            </el-tag>
            <el-tag v-if="tierItem.popular" type="warning" effect="dark" size="small">
              Most Popular
            </el-tag>
          </div>

          <!-- Price -->
          <div class="mb-4">
            <span class="text-3xl font-black text-on-surface">${{ tierItem.price }}</span>
            <span class="text-xs text-on-surface-variant ml-1">/ month</span>
          </div>
          <p class="text-xs text-on-surface-variant mb-6">{{ tierItem.description }}</p>

          <el-divider class="!border-outline-variant" />

          <!-- Feature List -->
          <ul class="space-y-3 mb-6">
            <li
              v-for="(feature, idx) in tierItem.features"
              :key="idx"
              class="flex items-center gap-2 text-xs text-gray-300"
            >
              <el-icon class="text-primary"><Check /></el-icon>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </div>

        <!-- Upgrade Button -->
        <div class="mt-4">
          <el-button
            v-if="billingStore.currentTier.tier === tierItem.id"
            disabled
            type="info"
            class="w-full"
          >
            Current Plan
          </el-button>
          <el-button
            v-else
            type="primary"
            class="w-full"
            :loading="billingStore.checkoutLoading"
            @click="handleUpgrade(tierItem.id)"
          >
            {{ $t('billing.upgradeBtn') || 'Upgrade Plan' }}
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBillingStore } from '@/stores/billingStore';
import { CreditCard, Check } from '@element-plus/icons-vue';

const billingStore = useBillingStore();

const progressColor = computed(() => {
  if (billingStore.isCreditsLow) return '#f56c6c';
  return 'var(--el-color-primary)';
});

const tiers = ref([
  {
    id: 'free' as const,
    name: 'Free',
    tagType: 'info' as const,
    popular: false,
    price: 0,
    description: 'Perfect for exploring micro-drama AI generation',
    features: ['100 AI Credits / month', 'Watermarked export', 'Standard TTS voices', 'Single-platform publish'],
  },
  {
    id: 'creator' as const,
    name: 'Creator',
    tagType: 'success' as const,
    popular: true,
    price: 29,
    description: 'For active creators producing multi-episode series',
    features: ['1,000 AI Credits / month', 'Full HD 1080p export', 'Premium TTS voices', 'Multi-platform social publish', 'AI Viral cover generator'],
  },
  {
    id: 'studio' as const,
    name: 'Studio',
    tagType: 'warning' as const,
    popular: false,
    price: 99,
    description: 'For professional production teams & agencies',
    features: ['5,000 AI Credits / month', '4K Ultra HD export', 'Voice cloning & spatial audio', 'Real-time WebSocket collab', 'C2PA Watermark provenance'],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    tagType: 'danger' as const,
    popular: false,
    price: 299,
    description: 'Custom API limits & dedicated render node cluster',
    features: ['Unlimited AI Credits', 'Dedicated Cloud Run GPUs', 'Custom Lora character training', 'SLA 99.99% uptime', 'Dedicated account manager'],
  },
]);

function handleUpgrade(tierId: 'free' | 'creator' | 'studio' | 'enterprise') {
  billingStore.startCheckout(tierId);
}

onMounted(() => {
  billingStore.fetchTierInfo();
});
</script>

<style scoped>
.billing-page :deep(.el-card) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}
</style>
