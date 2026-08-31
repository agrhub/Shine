<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { WizardFormData, ComplianceResult } from './types';
import {
  RefreshRight,
  CircleCheckFilled,
  InfoFilled,
  MagicStick,
  Film,
} from '@element-plus/icons-vue';

const props = defineProps<{
  formData: WizardFormData;
  complianceResult: ComplianceResult;
  isVerifyingCompliance: boolean;
  isRefiningFromSuggestions: boolean;
}>();

const emit = defineEmits<{
  (e: 'rescan-compliance'): void;
  (e: 'refine-suggestions', rec?: string): void;
}>();

const { t } = useI18n();

function formatDuration(totalSeconds: number): string {
  const sec = Number(totalSeconds) || 90;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) {
    return t('wizard.durationMinSec', { m, s });
  } else if (m > 0) {
    return t('wizard.durationMinOnly', { m });
  } else {
    return t('wizard.durationSecOnly', { s });
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.finalComplianceCheck') }}</h1>
        <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.complianceSubtitle') }}</p>
      </div>
      <el-button size="default" round icon="RefreshRight" :loading="isVerifyingCompliance" @click="emit('rescan-compliance')">
        {{ t('wizard.rescanCompliance') }}
      </el-button>
    </div>

    <!-- Loading State when scanning -->
    <div
      v-if="isVerifyingCompliance"
      class="rounded-2xl border p-12 flex flex-col items-center justify-center space-y-4 text-center"
      style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);"
    >
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style="background-color: var(--el-color-primary-light-9); border: 1px solid var(--el-color-primary-light-5); color: var(--el-color-primary);">
        <el-icon :size="28" class="is-loading"><CircleCheckFilled /></el-icon>
      </div>
      <div class="space-y-1">
        <h3 class="font-black text-base" style="color: var(--el-text-color-primary);">{{ t('wizard.auditingPlan') }}</h3>
        <p class="text-xs max-w-md" style="color: var(--el-text-color-secondary);">{{ t('wizard.auditingPlanDesc', { country: formData.country || 'target market' }) }}</p>
      </div>
    </div>

    <!-- Audit Result Content -->
    <template v-else>
      <div class="rounded-2xl border p-6 flex flex-col md:flex-row items-center gap-8" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
        <div class="w-32 h-32 relative shrink-0">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path style="color: var(--el-border-color);" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3"></path>
            <path
              style="color: var(--el-color-primary);"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              :stroke-dasharray="`${complianceResult.overall_score || 0}, 100`"
              stroke-linecap="round"
              stroke-width="3"
            ></path>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-black" style="color: var(--el-text-color-primary);">{{ complianceResult.overall_score || 0 }}%</span>
            <span class="text-[10px] font-bold uppercase" style="color: var(--el-color-primary);">{{ complianceResult.is_compliant !== false ? t('wizard.safe') : t('wizard.attention') }}</span>
          </div>
        </div>
        <div class="flex-1 space-y-4 w-full">
          <h3 class="font-black" style="color: var(--el-text-color-primary);">{{ t('wizard.contentSafetyBreakdown') }}</h3>
          <div v-for="(item, key) in (complianceResult.categories || {})" :key="key" class="space-y-1.5">
            <div class="flex justify-between text-xs font-semibold">
              <span style="color: var(--el-text-color-regular);">{{ item.label }}</span>
              <span :style="item.safe ? 'color: var(--el-color-primary);' : 'color: var(--el-color-warning);'">{{ item.status }} ({{ item.score }}%)</span>
            </div>
            <div class="h-1.5 w-full rounded-full overflow-hidden" style="background-color: var(--el-fill-color-light);">
              <div class="h-full rounded-full transition-all duration-500" :style="{ width: `${item.score || 95}%`, backgroundColor: item.safe ? 'var(--el-color-primary)' : 'var(--el-color-warning)' }"></div>
            </div>
            <div v-if="item.notes" class="text-[10px]" style="color: var(--el-text-color-placeholder);">{{ item.notes }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="rounded-2xl border p-5 space-y-4" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold" style="background-color: var(--el-fill-color-light); color: var(--el-text-color-primary);">©</div>
            <h3 class="font-black text-sm" style="color: var(--el-text-color-primary);">{{ t('wizard.copyrightIpVerification') }}</h3>
          </div>
          <ul class="space-y-3 text-xs">
            <li
              v-for="item in (complianceResult.copyright_checks || [])"
              :key="item.label"
              class="flex items-center justify-between pb-2 border-b last:border-0 last:pb-0"
              style="border-color: var(--el-border-color-light);"
            >
              <span style="color: var(--el-text-color-regular);">{{ item.label }}</span>
              <span class="font-black" :style="item.safe ? 'color: var(--el-color-primary);' : 'color: var(--el-color-warning);'">✓ {{ item.status }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-2xl border p-5 space-y-4" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: var(--el-fill-color-light);">🛡️</div>
            <h3 class="font-black text-sm" style="color: var(--el-text-color-primary);">{{ t('wizard.privacyEthics') }}</h3>
          </div>
          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold" style="color: var(--el-text-color-primary);">{{ t('wizard.aiTransparencyWatermark') }}</p>
                <p class="mt-0.5" style="color: var(--el-text-color-placeholder);">{{ t('wizard.aiTransparencyDesc') }}</p>
              </div>
              <el-switch v-model="formData.aiWatermark" />
            </div>
            <div class="flex items-center justify-between pt-3 border-t" style="border-color: var(--el-border-color-light);">
              <div>
                <p class="font-bold" style="color: var(--el-text-color-primary);">{{ t('wizard.commercialUsageRights') }}</p>
                <p class="mt-0.5" style="color: var(--el-text-color-placeholder);">{{ t('wizard.commercialUsageDesc') }}</p>
              </div>
              <el-switch v-model="formData.commercialRights" />
            </div>
          </div>
        </div>
      </div>

      <!-- AI Recommendations & Quality Gating (if any) -->
      <div v-if="complianceResult.recommendations && complianceResult.recommendations.length > 0" class="p-5 rounded-2xl border space-y-4" style="background-color: rgba(230, 162, 60, 0.08); border-color: rgba(230, 162, 60, 0.25);">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style="border-color: rgba(230, 162, 60, 0.2);">
          <div class="text-xs font-black flex items-center gap-2" style="color: var(--el-color-warning);">
            <el-icon><InfoFilled /></el-icon> {{ t('wizard.supervisionRecommendations') }}
          </div>
          <el-button
            type="primary"
            round icon="MagicStick"
            :loading="isRefiningFromSuggestions"
            @click="emit('refine-suggestions')"
          >
            {{ t('wizard.applyAllSuggestions') }}
          </el-button>
        </div>

        <ul class="space-y-2.5 text-xs" style="color: var(--el-text-color-primary);">
          <li
            v-for="(rec, idx) in complianceResult.recommendations"
            :key="idx"
            class="flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all"
            style="background-color: var(--el-bg-color-overlay); border-color: rgba(230, 162, 60, 0.2);"
          >
            <div class="flex items-start gap-2.5 flex-1">
              <el-tag type="warning" effect="dark" size="small" round class="shrink-0 font-bold mt-0.5">{{ Number(idx) + 1 }}</el-tag>
              <span class="leading-relaxed">{{ rec }}</span>
            </div>
            <el-button
              type="warning"
              plain
              round
              icon="MagicStick"
              :loading="isRefiningFromSuggestions"
              @click="emit('refine-suggestions', rec)"
            >
              {{ t('wizard.applySuggestion') }}
            </el-button>
          </li>
        </ul>
      </div>
    </template>

    <!-- Final Summary -->
    <div class="rounded-2xl p-6 space-y-4 border" style="background: linear-gradient(135deg, var(--el-color-primary-light-9), rgba(14, 165, 233, 0.08)); border-color: var(--el-color-primary-light-5);">
      <h3 class="font-black flex items-center gap-2" style="color: var(--el-text-color-primary);">
        <el-icon style="color: var(--el-color-primary);"><Film /></el-icon> {{ t('wizard.seriesSummary') }}
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div>
          <div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryTitle') }}</div>
          <div class="font-black truncate" style="color: var(--el-text-color-primary);">{{ formData.title || t('wizard.untitled') }}</div>
        </div>
        <div>
          <div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryGenre') }}</div>
          <div class="font-black" style="color: var(--el-text-color-primary);">{{ (formData.genre || '').split(' / ')[0] }}</div>
        </div>
        <div>
          <div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryEpisodes') }}</div>
          <div class="font-black" style="color: var(--el-color-primary);">{{ formData.targetEpisodes }} eps</div>
        </div>
        <div>
          <div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryDuration') }}</div>
          <div class="font-black" style="color: var(--el-color-primary);">{{ formatDuration(formData.episodeDurationSeconds) }}/ep</div>
        </div>
        <div>
          <div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryRatio') }}</div>
          <div class="font-black" style="color: var(--el-color-primary);">{{ formData.ratio }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
