<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const currentSeriesId = computed(() => (route.params.seriesId as string) || 'srs_01');
const currentEpisodeId = computed(() => (route.params.episodeId as string) || 'ep_01');

const studioTabs = computed(() => [
  { key: 'script', label: t('nav.scripts') || 'Script', href: `/script/${currentSeriesId.value}` },
  { key: 'editor', label: t('nav.timeline') || 'Editor', href: `/editor/${currentSeriesId.value}/${currentEpisodeId.value}` },
  { key: 'persona', label: t('nav.personas') || 'Characters', href: '/persona' },
  { key: 'dubbing', label: t('voice.title') || 'Voice & Music', href: `/dubbing/${currentSeriesId.value}/${currentEpisodeId.value}` },
  { key: 'captions', label: t('caption.title') || 'Caption', href: `/captions/${currentSeriesId.value}/${currentEpisodeId.value}` },
  { key: 'analytics', label: t('dashboard.analytics') || 'Analytics', href: `/analytics/${currentSeriesId.value}` },
  { key: 'publish', label: t('nav.publish') || 'Export & Publish', href: `/publish/${currentSeriesId.value}/${currentEpisodeId.value}` },
]);

function goBack() {
  router.push('/dashboard');
}

</script>

<template>
  <div id="studio-layout" class="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
    <!-- Dedicated Production Studio Header (.g-header) -->
    <header class="g-header flex-shrink-0 flex items-center justify-between px-4 border-b border-border bg-background h-14">
      <div class="flex items-center gap-4">
        <el-button size="small" @click="goBack" class="gap-1">
          <el-icon><ArrowLeft /></el-icon>
          <span>{{ t('common.back') }}</span>
        </el-button>

        <div class="h-4 w-px bg-border" />

        <div class="flex items-center gap-2 font-bold text-sm">
          <el-icon><Film /></el-icon>
          <span>{{ t('common.brandStudio') }}</span>
        </div>
      </div>

      <!-- Studio Module Tabs -->
      <nav class="hidden md:flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
        <router-link
          v-for="tab in studioTabs"
          :key="tab.key"
          :to="tab.href"
          class="px-3 py-1 rounded-md text-xs font-medium transition-all"
          :class="route.path.startsWith(tab.href) ? 'bg-background text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        >
          {{ tab.label }}
        </router-link>
      </nav>

      <!-- Right Controls -->
      <div class="flex items-center gap-3">
        <LanguageSelect />
        <el-button type="primary" size="small">{{ t('nav.export') }}</el-button>
      </div>
    </header>

    <!-- Main Studio Content Area (.g-main-area) -->
    <main class="g-main-area flex-1 overflow-y-auto p-6 bg-muted/30">
      <router-view />
    </main>
  </div>
</template>
