<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Opportunity } from '@element-plus/icons-vue';

const props = defineProps<{
  currentStep: number;
}>();

const { t } = useI18n();

const stepTitles = computed(() => [
  t('wizard.stepLaunchModeTitle'),
  t('wizard.stepSeriesConfigTitle'),
  t('wizard.stepMasterPlanTitle'),
  t('wizard.stepComplianceTitle'),
]);

const stepDescriptions = computed(() => [
  t('wizard.stepLaunchModeDesc'),
  t('wizard.stepSeriesConfigDesc'),
  t('wizard.stepMasterPlanDesc'),
  t('wizard.stepComplianceDesc'),
]);

const stepTips = computed(() => [
  t('wizard.stepLaunchModeTip'),
  t('wizard.stepSeriesConfigTip'),
  t('wizard.stepMasterPlanTip'),
  t('wizard.stepComplianceTip'),
]);
</script>

<template>
  <aside class="w-[260px] shrink-0 border-r p-7 flex flex-col justify-between" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
    <div class="space-y-6">
      <div>
        <div class="text-[10px] font-black tracking-widest uppercase mb-1" style="color: var(--el-color-primary);">
          {{ t('wizard.stepOf', { current: currentStep + 1, total: 4 }) }}
        </div>
        <h2 class="text-lg font-black leading-tight" style="color: var(--el-text-color-primary);">
          {{ stepTitles[currentStep] }}
        </h2>
        <p class="text-xs mt-2 leading-relaxed" style="color: var(--el-text-color-secondary);">
          {{ stepDescriptions[currentStep] }}
        </p>
      </div>

      <div class="rounded-xl border p-4 relative overflow-hidden" style="border-color: var(--el-color-primary-light-7); background-color: var(--el-color-primary-light-9);">
        <div class="absolute top-0 left-0 w-1 h-full rounded-l-xl" style="background-color: var(--el-color-primary);"></div>
        <div class="text-xs font-black mb-1 flex items-center gap-1.5" style="color: var(--el-text-color-primary);">
          <el-icon style="color: var(--el-color-warning);"><Opportunity /></el-icon>
          {{ t('wizard.aiTip') }}
        </div>
        <p class="text-[11px] italic leading-relaxed" style="color: var(--el-text-color-regular);">
          {{ stepTips[currentStep] }}
        </p>
      </div>

      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider mb-2" style="color: var(--el-text-color-placeholder);">{{ t('wizard.progress') }}</div>
        <el-progress :percentage="((currentStep + 1) / 4) * 100" :show-text="false" color="var(--el-color-primary)" :stroke-width="6" />
      </div>
    </div>
  </aside>
</template>
