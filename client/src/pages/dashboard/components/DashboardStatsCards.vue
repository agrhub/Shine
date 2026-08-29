<script setup lang="ts">
import { onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ApexCharts from 'apexcharts';
import { useSeriesStore } from '@/stores/useSeriesStore';

const { t } = useI18n();
const seriesStore = useSeriesStore();

const props = defineProps<{
  analyticsData: any;
}>();

function initSparklines() {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const computedStyle = getComputedStyle(document.documentElement);
  const mint = computedStyle.getPropertyValue('--el-color-primary').trim() || '#3ecf8e';
  const tooltipTheme = isDarkMode ? 'dark' : 'light';

  const renderSpark = (selector: string, data: number[]) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.innerHTML = '';
    new ApexCharts(el, {
      chart: { type: 'area', height: 56, sparkline: { enabled: true }, animations: { speed: 900 } },
      stroke: { curve: 'smooth', width: 2 },
      colors: [mint],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] } },
      series: [{ data: data && data.length > 0 ? data : [0, 0, 0, 0] }],
      tooltip: { theme: tooltipTheme, x: { show: false }, marker: { show: false } },
    }).render();
  };

  renderSpark('#spark1', props.analyticsData?.sparklines?.viewerEngagement || [0, 0, 0, 0]);
  renderSpark('#spark2', props.analyticsData?.sparklines?.modelEfficiency || [0, 0, 0, 0]);
  renderSpark('#spark3', props.analyticsData?.sparklines?.tokenVelocity || [0, 0, 0, 0]);
}

onMounted(() => {
  nextTick(() => {
    initSparklines();
  });

  const observer = new MutationObserver(() => {
    initSparklines();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
</script>

<template>
  <div class="space-y-5">
    <!-- Row 1: Key Metric Cards -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium mb-4">
          <el-icon class="text-sm"><FolderOpened /></el-icon> {{ t('dashboard.statActiveSeries') }}
        </div>
        <div class="text-3xl font-semibold tracking-tight">{{ analyticsData.stats.activeSeries ?? seriesStore.seriesList?.filter(s => s.status !== 'ARCHIVED').length ?? 0 }}</div>
        <span class="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[var(--el-color-primary-dark-2)] bg-[var(--el-color-primary-light-9)] px-2 py-0.5 rounded-md">
          {{ (analyticsData.stats.activeSeries || 0) > 0 ? t('dashboard.tagTop5') : t('series.active') }}
        </span>
      </div>

      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium mb-4">
          <el-icon class="text-sm"><Timer /></el-icon> {{ t('home.renderingStatus') }} {{ t('analytics.hrs') }}
        </div>
        <div class="text-3xl font-semibold tracking-tight">{{ analyticsData.stats.renderHours }} <span class="text-base text-[var(--el-text-color-secondary)] font-normal">{{ t('dashboard.hrsUnit') }}</span></div>
        <div class="mt-4 h-1 rounded-full bg-[var(--el-bg-color)] overflow-hidden">
          <div class="h-full bg-[var(--el-color-primary)] rounded-full transition-all duration-500" :style="{ width: `${Math.min(100, Math.round(((analyticsData.stats.renderHours || 0) / 20) * 100))}%` }"></div>
        </div>
      </div>

      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium mb-4">
          <el-icon class="text-sm"><Folder /></el-icon> {{ t('editor.assetLibrary') }}
        </div>
        <div class="text-3xl font-semibold tracking-tight">{{ analyticsData.stats.assetLibrarySizeGb }} <span class="text-base text-[var(--el-text-color-secondary)] font-normal">{{ t('dashboard.gbUnit') }}</span></div>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-3">{{ Math.min(100, Math.round(((analyticsData.stats.assetLibrarySizeGb || 0) / 10) * 100)) }}% {{ t('dashboard.ofLimit') }}</p>
      </div>

      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium mb-4">
          <el-icon class="text-sm"><Coin /></el-icon> {{ t('dashboard.statTotalRevenue') }}
        </div>
        <div class="text-3xl font-semibold tracking-tight">${{ (analyticsData.stats.creatorEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
        <span class="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[var(--el-color-primary-dark-2)] bg-[var(--el-color-primary-light-9)] px-2 py-0.5 rounded-md">
          <el-icon class="text-[9px]"><Top /></el-icon> {{ (analyticsData.stats.creatorEarnings || 0) > 0 ? '+12.4%' : '0.0%' }}
        </span>
      </div>
    </section>

    <!-- Row 2: Sparkline Trend Cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium">
            <el-icon class="text-sm"><View /></el-icon> {{ t('dashboard.statAvgRetention') }}
          </div>
          <span class="w-2 h-2 rounded-full bg-[var(--el-color-primary)] animate-pulse"></span>
        </div>
        <div class="text-2xl font-semibold tracking-tight mb-1">{{ analyticsData.stats.viewerEngagementPct }}%</div>
        <div id="spark1" class="-mx-2"></div>
      </div>

      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium">
            <el-icon class="text-sm"><Platform /></el-icon> {{ t('dashboard.modelRenderEfficiency') }}
          </div>
          <span class="w-2 h-2 rounded-full bg-[var(--el-color-primary)] animate-pulse"></span>
        </div>
        <div class="text-2xl font-semibold tracking-tight mb-1">{{ analyticsData.stats.modelEfficiencyPct }}%</div>
        <div id="spark2" class="-mx-2"></div>
      </div>

      <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-[var(--el-text-color-secondary)] text-xs font-medium">
            <el-icon class="text-sm"><Coin /></el-icon> {{ t('dashboard.tokenVelocity') }}
          </div>
          <span class="w-2 h-2 rounded-full bg-[var(--el-color-primary)] animate-pulse"></span>
        </div>
        <div class="text-2xl font-semibold tracking-tight mb-1">{{ (analyticsData.stats.tokenVelocityPerHr || 1284).toLocaleString() }} <span class="text-base text-[var(--el-text-color-secondary)] font-normal">{{ t('dashboard.perHour') }}</span></div>
        <div id="spark3" class="-mx-2"></div>
      </div>
    </section>
  </div>
</template>
