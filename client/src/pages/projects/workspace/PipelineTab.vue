<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { toast } from 'vue-sonner';

const emit = defineEmits<{
  (e: 'open-cast'): void;
  (e: 'run-pipeline', stepId?: string): void;
  (e: 'view-character', char: any): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();

const series = computed(() => seriesStore.currentSeries);
const castMembers = computed(() => seriesStore.charactersList);

async function runStep(stepId: string) {
  // const step = pipelineStore.pipelineSteps.find(s => s.id === stepId);
  // if (!step) {
  //   toast.error(t('toast.unknownPipelineStepError'));
  //   return;
  // };
  // Generic step run for other steps — emit up to parent
  emit('run-pipeline', stepId);
  return;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Viral Trend Analysis Box -->
    <div class="p-4 rounded-2xl border shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2" style="color: var(--el-color-primary);">
          <el-icon :size="16"><TrendCharts /></el-icon>
          <h3 class="text-xs font-bold uppercase tracking-wider">{{ t('workspace.viralTrendAnalysis') }}</h3>
        </div>
        <el-tag type="primary" size="small" effect="plain" round class="font-bold tracking-widest uppercase">
          {{ t('workspace.live') }}
        </el-tag>
      </div>
      <div class="w-full rounded-xl p-3 flex items-center justify-between border mb-3" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <div>
          <div class="font-bold text-xs" style="color: var(--el-text-color-primary);">#{{ (series?.title || 'Series').replace(/\s+/g, '') }}</div>
          <div class="text-[10px] mt-0.5" style="color: var(--el-text-color-secondary);">{{ t('workspace.socialTrending') }}</div>
        </div>
        <el-icon :size="12" style="color: var(--el-text-color-secondary);"><ArrowRight /></el-icon>
      </div>
      <p class="text-[11px] leading-relaxed" style="color: var(--el-text-color-secondary);">
        AI retention engine active for <span class="font-semibold" style="color: var(--el-text-color-primary);">{{ series?.title }}</span>.
        Dynamic pacing &amp; cliffhanger hooks calibrated for micro-drama audience.
      </p>
    </div>

    <!-- Character Consistency Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.characterConsistency') }}
        </h3>
        <el-button link type="primary" size="small" @click="emit('open-cast')">
          {{ t('workspace.manageCastAll') }}
        </el-button>
      </div>

      <!-- Cast Avatars -->
      <div class="flex flex-wrap gap-2 mb-4">
        <div
          v-for="char in castMembers"
          :key="char.id"
          class="relative cursor-pointer"
          :title="char.name"
          @click="emit('view-character', char)"
        >
          <el-avatar
            v-if="char.avatarUrl"
            :src="char.avatarUrl"
            :size="40"
            class="border-2 hover:scale-105 transition-transform"
            style="border-color: var(--el-bg-color-overlay);"
          />
          <el-avatar
            v-else
            :size="40"
            class="border-2 hover:scale-105 transition-transform"
            style="border-color: var(--el-border-color); background-color: var(--el-fill-color-dark);"
          >
            <el-icon :size="16"><User /></el-icon>
          </el-avatar>
          <!-- No-render indicator -->
          <div
            v-if="!char.avatarUrl"
            class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white"
            style="background-color: var(--el-color-warning);"
            title="Not rendered yet"
          />
        </div>

        <div v-if="castMembers.length === 0" class="text-xs italic" style="color: var(--el-text-color-placeholder);">
          No characters loaded
        </div>
      </div>

      <!-- <div class="p-3 rounded-xl border flex items-center justify-between text-xs" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <span class="font-semibold" style="color: var(--el-text-color-secondary);">{{ t('workspace.visualModelSync') }}</span>
        <el-tag type="success" size="small" effect="plain" round class="font-bold uppercase">{{ t('workspace.stable') }}</el-tag>
      </div> -->
    </div>

    <!-- 10-Step Pipeline Steps -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.autoGenSequence') }}
        </h3>
        <span class="text-[10px]" style="color: var(--el-text-color-secondary);">
          {{ pipelineStore.doneStepsCount }}/10 {{ t('workspace.stepsDone') }}
        </span>
      </div>
      <div class="space-y-1.5 grid grid-cols-2 gap-2">
        <template v-for="step in pipelineStore.pipelineSteps"
          :key="step.id">
          <el-button :type="step.status === 'done'
            ? 'success'
            : step.status === 'running'
            ? 'warning'
            : step.status === 'error'
            ? 'danger'
            : 'primary'"
            :loading="step.status === 'running'"
            plain round bg @click="runStep(step.id)" size="small"
            class="w-full !ml-0 !mt-0">
            <div class="flex items-center gap-2">
              <el-icon><component :is="step.icon" /></el-icon>
              <span>{{ step.label }}</span>
            </div>
          </el-button>
        </template>
        <!-- <div v-loading="step.status === 'running'"
          v-for="step in pipelineStore.pipelineSteps"
          :key="step.id"
          class="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer hover:opacity-90 transition-all"
          :style="step.status === 'done'
            ? 'background-color: var(--el-color-primary); border-color: var(--el-color-primary);'
            : step.status === 'running'
            ? 'background-color: var(--el-color-warning); border-color: var(--el-color-warning);'
            : step.status === 'error'
            ? 'background-color: var(--el-color-danger); border-color: var(--el-color-danger);'
            : 'background-color: var(--el-color-info-dark-2); border-color: var(--el-color-info-dark-2);'"
          @click="runStep(step.id)"
        >
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded flex items-center justify-center text-xs" style="color: var(--el-color-primary); background-color: var(--el-color-primary-dark-8);">
              <el-icon v-if="step.status === 'running'" style="color: var(--el-color-warning);"><Loading /></el-icon>
              <el-icon v-else-if="step.status === 'done'" style="color: var(--el-color-primary);"><Check /></el-icon>
              <el-icon v-else-if="step.status === 'error'" style="color: var(--el-color-danger);"><Close /></el-icon>
              <el-icon v-else><component :is="step.icon" /></el-icon>
            </div>
            <span class="text-[11px] font-semibold" style="color: var(--el-text-color-primary);">{{ step.label }}</span>
          </div>
          <el-icon :size="12" style="color: var(--el-text-color-secondary);"><VideoPlay /></el-icon>
        </div> -->
      </div>
    </div>

    <!-- Process Next Batch Button -->
    <el-button
      type="primary"
      round
      class="!w-full !py-3.5 !font-bold"
      icon="Cpu" size="small"
      @click="emit('run-pipeline')"
    >
      {{ t('workspace.autoPipelineFlow') }}
    </el-button>
  </div>
</template>
