<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const sections = [
  { titleKey: 'privacy.sec1Title', bodyKey: 'privacy.sec1Body' },
  { titleKey: 'privacy.sec2Title', bodyKey: 'privacy.sec2Body' },
  { titleKey: 'privacy.sec3Title', bodyKey: 'privacy.sec3Body' },
  { titleKey: 'privacy.sec4Title', bodyKey: 'privacy.sec4Body' },
];
</script>

<template>
  <div id="privacy-page" class="min-h-screen bg-background text-foreground py-16 px-4 max-w-4xl mx-auto space-y-8">
    <div>
      <h1 class="text-3xl font-extrabold tracking-tight text-foreground">{{ t('privacy.title') }}</h1>
      <p class="text-xs text-muted-foreground mt-1">{{ t('privacy.lastUpdated') }}</p>
    </div>

    <div class="space-y-6">
      <el-card
        v-for="sec in sections"
        :key="sec.titleKey"
        shadow="never"
        class="border border-border bg-card p-2"
      >
        <h3 class="font-bold text-base text-foreground mb-2">{{ t(sec.titleKey) }}</h3>
        <p class="text-xs text-muted-foreground leading-relaxed">{{ t(sec.bodyKey) }}</p>
      </el-card>
    </div>
  </div>
</template>
