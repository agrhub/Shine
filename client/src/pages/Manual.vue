<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const activeSection = ref('gettingStarted');

const sections = computed(() => [
  {
    id: 'gettingStarted',
    title: t('manual.gettingStarted'),
    steps: [
      { titleKey: 'manual.stepAccountTitle', descKey: 'manual.stepAccountDesc' },
      { titleKey: 'manual.stepSeriesTitle', descKey: 'manual.stepSeriesDesc' },
      { titleKey: 'manual.stepSettingsTitle', descKey: 'manual.stepSettingsDesc' },
    ],
  },
  {
    id: 'scriptStudio',
    title: t('manual.scriptStudio'),
    steps: [
      { titleKey: 'manual.stepScriptTitle', descKey: 'manual.stepScriptDesc' },
      { titleKey: 'manual.stepPersonaTitle', descKey: 'manual.stepPersonaDesc' },
      { titleKey: 'manual.stepFinetuneTitle', descKey: 'manual.stepFinetuneDesc' },
    ],
  },
  {
    id: 'timelineEditor',
    title: t('manual.timelineEditor'),
    steps: [
      { titleKey: 'manual.stepTimelineTitle', descKey: 'manual.stepTimelineDesc' },
      { titleKey: 'manual.stepTrimTitle', descKey: 'manual.stepTrimDesc' },
      { titleKey: 'manual.stepSyncTitle', descKey: 'manual.stepSyncDesc' },
    ],
  },
  {
    id: 'publishing',
    title: t('manual.publishing'),
    steps: [
      { titleKey: 'manual.stepBatchTitle', descKey: 'manual.stepBatchDesc' },
      { titleKey: 'manual.stepPublishTitle', descKey: 'manual.stepPublishDesc' },
      { titleKey: 'manual.stepAnalyticsTitle', descKey: 'manual.stepAnalyticsDesc' },
    ],
  },
]);
</script>

<template>
  <div id="manual-page" class="min-h-screen bg-background text-foreground py-12 px-4 max-w-6xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold tracking-tight text-foreground">{{ t('manual.title') }}</h1>
      <p class="text-sm text-muted-foreground mt-1">{{ t('manual.subtitle') }}</p>
    </div>

    <!-- Element Plus Tabs -->
    <el-tabs v-model="activeSection" class="demo-tabs">
      <el-tab-pane
        v-for="sec in sections"
        :key="sec.id"
        :label="sec.title"
        :name="sec.id"
      >
        <div class="space-y-4 pt-4">
          <el-card
            v-for="(step, idx) in sec.steps"
            :key="step.titleKey"
            shadow="hover"
            class="border border-border bg-card"
          >
            <div class="flex items-start gap-4">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                {{ idx + 1 }}
              </div>
              <div>
                <h3 class="font-semibold text-base text-foreground mb-1">{{ t(step.titleKey) }}</h3>
                <p class="text-xs text-muted-foreground leading-relaxed">{{ t(step.descKey) }}</p>
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
