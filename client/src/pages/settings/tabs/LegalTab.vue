<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  type: 'compliance' | 'privacy';
}>();

const { t } = useI18n();
</script>

<template>
  <div class="space-y-6">
    <div class="pb-5 border-b border-[var(--el-border-color)]">
      <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
        {{ type === 'compliance' ? t('settings.complianceTerms') : t('settings.privacyPolicy') }}
      </h2>
      <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
        {{ t('legal.lastUpdated') }}
      </p>
    </div>

    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-4 text-[var(--el-text-color-regular)]">
      <template v-if="type === 'compliance'">
        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">{{ t('legal.compliance1Title') }}</h4>
        <p>{{ t('legal.compliance1Text') }}</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">{{ t('legal.compliance2Title') }}</h4>
        <p>{{ t('legal.compliance2Text') }}</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">{{ t('legal.compliance3Title') }}</h4>
        <p>{{ t('legal.compliance3Text') }}</p>
      </template>

      <template v-else>
        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">{{ t('legal.privacy1Title') }}</h4>
        <p>{{ t('legal.privacy1Text') }}</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">{{ t('legal.privacy2Title') }}</h4>
        <p>{{ t('legal.privacy2Text') }}</p>
      </template>
    </div>
  </div>
</template>
