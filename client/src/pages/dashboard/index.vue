<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { type Series } from '@/types/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAssetsStore } from '@/stores/useAssetsStore';
import { useBillingStore } from '@/stores/billingStore';
import SeriesWizardModal from '@/components/modals/SeriesWizardModal.vue';
import CountryFlag from '@/components/common/CountryFlag.vue';
import { WORLD_COUNTRIES, findCountry } from '@/constants/countries';
import ApexCharts from 'apexcharts';
import http from '@/utils/http';
import { toast } from 'vue-sonner';

const { t, locale } = useI18n();
const router = useRouter();
const seriesStore = useSeriesStore();
const authStore = useAuthStore();
const assetsStore = useAssetsStore();
const billingStore = useBillingStore();

const isWizardOpen = ref(false);
const selectedTrendForWizard = ref<any>(null);

// Hot Trend Widget state
const selectedTrendCountry = ref<string>('United States');
const selectedCountryObj = computed(() => findCountry(selectedTrendCountry.value));
const viralTopics = ref<any[]>([]);
const isFetchingTrends = ref<boolean>(false);
const trendsError = ref<string>('');

const popularCountries = computed(() => WORLD_COUNTRIES.filter((c) => c.isPopular));
const allCountries = WORLD_COUNTRIES;

const userName = computed(() => authStore.user?.name || 'Creator');
const userCredits = computed(() => authStore.user?.credits ?? billingStore.currentTier?.credit_balance ?? 0);

// Search, Filter & Pagination states for Projects section
const projectSearchQuery = ref('');
const projectStatusFilter = ref('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
const currentPage = ref(1);
const pageSize = ref(8);

// Active series items (loaded from real backend API, with clean fallback images)
const fallbackImages = [
  '/images/dashboard/poster-1.jpg',
  '/images/dashboard/poster-2.jpg',
  '/images/dashboard/poster-3.jpg',
  '/images/dashboard/poster-4.jpg',
  '/images/dashboard/poster-5.jpg',
];

const allSeriesList = computed(() => {
  if (Array.isArray(seriesStore.seriesList) && seriesStore.seriesList.length > 0) {
    return seriesStore.seriesList.map((s: Series, idx: number) => ({
      id: s.id,
      title: s.title,
      genre: s.genre || 'Drama',
      episode_count: s.episode_count || 1,
      status: s.status || 'DRAFT',
      subtitle: `${t('dashboard.statEpisodes')}: ${s.episode_count || 1} · ${s.genre || 'Drama'}`,
      tag: s.status === 'PUBLISHED' ? t('series.published') : s.status === 'ACTIVE' ? t('series.active') : s.status === 'ARCHIVED' ? 'Archived' : t('series.draft'),
      tagClass: s.status === 'ACTIVE'
        ? 'bg-[var(--el-color-primary)] text-[var(--el-color-primary-foreground,#002112)]'
        : s.status === 'ARCHIVED'
        ? 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
        : 'bg-[var(--el-bg-color)] text-[var(--el-text-color-primary)]',
      image: fallbackImages[idx % fallbackImages.length],
    }));
  }
  return [];
});

const filteredSeriesList = computed(() => {
  return allSeriesList.value.filter(s => {
    const matchesSearch = !projectSearchQuery.value ||
      s.title.toLowerCase().includes(projectSearchQuery.value.toLowerCase()) ||
      s.genre.toLowerCase().includes(projectSearchQuery.value.toLowerCase());
    const matchesStatus = projectStatusFilter.value === 'ALL' || s.status === projectStatusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const paginatedSeries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredSeriesList.value.slice(start, start + pageSize.value);
});

const totalFilteredCount = computed(() => filteredSeriesList.value.length);

function handleFilterChange(filter: string) {
  projectStatusFilter.value = filter;
  currentPage.value = 1;
}

function handleSearchInput() {
  currentPage.value = 1;
}

// ─── Series Actions (Rename, Archive, S3-Purge Delete) ────────────────────────
async function handleRenameSeries(series: any) {
  try {
    const { value } = await ElMessageBox.prompt(
      'Enter new title for this micro-drama series:',
      'Rename Series',
      {
        inputValue: series.title,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        inputValidator: (val) => (!val || !val.trim() ? 'Title cannot be empty' : true),
      }
    );
    if (value && value.trim()) {
      await seriesStore.renameSeries(series.id, value.trim());
      await seriesStore.fetchSeriesList({ userId: authStore.user?.id });
      toast.success(t('toast.seriesRenamed'));
    }
  } catch {
    // cancelled
  }
}

async function handleArchiveSeries(series: any) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to archive "${series.title}"? It can be restored at any time.`,
      'Archive Series',
      {
        confirmButtonText: 'Archive',
        cancelButtonText: 'Cancel',
        type: 'info',
      }
    );
    await seriesStore.archiveSeries(series.id);
    await seriesStore.fetchSeriesList({ userId: authStore.user?.id });
    toast.success(t('toast.seriesArchived'));
  } catch {
    // cancelled
  }
}

async function handleUnarchiveSeries(series: any) {
  try {
    await seriesStore.unarchiveSeries(series.id);
    await seriesStore.fetchSeriesList({ userId: authStore.user?.id });
    toast.success(t('toast.seriesUnarchived'));
  } catch {
    // cancelled
  }
}

async function handleDeleteSeries(series: any) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to permanently delete "${series.title}"? All associated media files and generated assets on cloud S3 storage will be completely purged. This action cannot be undone.`,
      'Delete Series Permanently',
      {
        confirmButtonText: 'Delete Permanently',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    );
    await seriesStore.deleteSeries(series.id);
    await seriesStore.fetchSeriesList({ userId: authStore.user?.id });
    toast.success(t('toast.seriesDeleted'));
  } catch {
    // cancelled
  }
}

function handleSeriesAction(command: string, series: any) {
  if (command === 'rename') {
    handleRenameSeries(series);
  } else if (command === 'archive') {
    handleArchiveSeries(series);
  } else if (command === 'unarchive') {
    handleUnarchiveSeries(series);
  } else if (command === 'delete') {
    handleDeleteSeries(series);
  }
}

function handleWithdraw() {
  if ((analyticsData.value.stats.projectedYield || 0) <= 0) {
    toast.info(t('toast.noBalanceToWithdraw'));
  } else {
    toast.success(t('toast.payoutRequested'));
  }
}

async function fetchViralTrends(countryName?: string) {
  if (countryName && typeof countryName === 'string') {
    selectedTrendCountry.value = countryName;
  }
  isFetchingTrends.value = true;
  trendsError.value = '';
  const currentLang = locale.value || localStorage.getItem('shine_language') || localStorage.getItem('shine_locale') || 'en';
  try {
    const targetCountry = selectedTrendCountry.value || 'United States';
    const res: any = await http.get(`/ai/trends/viral-topics?region=${encodeURIComponent(targetCountry)}&lang=${currentLang}`);
    viralTopics.value = res?.data || [];
    if (viralTopics.value.length === 0) trendsError.value = t('wizard.noTrendsMsg');
  } catch {
    trendsError.value = t('wizard.trendsErrorMsg');
    viralTopics.value = [];
  } finally {
    isFetchingTrends.value = false;
  }
}

function handleCreateFromTrend(topic: any) {
  const topicCopy = { ...topic, country: selectedTrendCountry.value };
  selectedTrendForWizard.value = topicCopy;
  isWizardOpen.value = true;
}

function handleOpenWizardDefault() {
  selectedTrendForWizard.value = null;
  isWizardOpen.value = true;
}

// Dynamic assets computed from real assetsStore or contextual items
const displayAssets = computed(() => {
  if (assetsStore.assets && assetsStore.assets.length > 0) {
    return assetsStore.assets.slice(0, 4).map(file => ({
      name: file.name,
      type: file.type.toUpperCase(),
      size: file.size || '12 MB',
      status: 'Rendered',
      icon: file.type === 'video' ? 'VideoPlay' : file.type === 'audio' ? 'Headset' : 'Document',
      statusClass: 'text-[var(--el-color-primary-dark-2)] bg-[var(--el-color-primary-light-9)]',
    }));
  }
  return [];
});

// Dynamic Dashboard Analytics from live backend API
const analyticsData = ref<any>({
  stats: {
    totalSeries: 0,
    activeSeries: 0,
    renderHours: 0.0,
    assetLibrarySizeGb: 0.0,
    creatorEarnings: 0.0,
    projectedYield: 0.0,
    viewerEngagementPct: 0.0,
    modelEfficiencyPct: 0.0,
    tokenVelocityPerHr: 0,
  },
  sparklines: {
    viewerEngagement: [0, 0, 0, 0, 0, 0, 0, 0],
    modelEfficiency: [0, 0, 0, 0, 0, 0, 0, 0],
    tokenVelocity: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  cashflow: {
    categories: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    income: [0, 0, 0, 0, 0, 0],
    expense: [0, 0, 0, 0, 0, 0],
  },
});

async function fetchDashboardAnalytics() {
  try {
    const res: any = await http.get('/analytics/dashboard', {
      params: { userId: authStore.user?.id || '' },
    });
    if (res && res.data && res.data.stats) {
      analyticsData.value = res.data;
    } else if (res && res.stats) {
      analyticsData.value = res;
    }
  } catch (err) {
    console.error('Failed to fetch dashboard analytics', err);
  }
}

function initCharts() {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const computedStyle = getComputedStyle(document.documentElement);
  
  const mint = computedStyle.getPropertyValue('--el-color-primary').trim() || '#3ecf8e';
  const axis = computedStyle.getPropertyValue('--el-border-color').trim() || (isDarkMode ? '#282a29' : '#e6e8e7');
  const muted = computedStyle.getPropertyValue('--el-text-color-secondary').trim() || (isDarkMode ? '#868c88' : '#707572');
  const expenseBar = computedStyle.getPropertyValue('--el-border-color-light').trim() || (isDarkMode ? '#3d4a41' : '#cbd5e1');
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

  renderSpark('#spark1', analyticsData.value.sparklines?.viewerEngagement || [0, 0, 0, 0]);
  renderSpark('#spark2', analyticsData.value.sparklines?.modelEfficiency || [0, 0, 0, 0]);
  renderSpark('#spark3', analyticsData.value.sparklines?.tokenVelocity || [0, 0, 0, 0]);

  const cashflowEl = document.querySelector('#cashflow') as HTMLElement | null;
  if (cashflowEl) {
    cashflowEl.innerHTML = '';
    new ApexCharts(cashflowEl, {
      chart: { type: 'bar', height: 200, toolbar: { show: false }, fontFamily: 'Outfit' },
      series: [
        { name: t('dashboard.income'), data: analyticsData.value.cashflow?.income || [0, 0, 0, 0, 0, 0] },
        { name: t('dashboard.expense'), data: analyticsData.value.cashflow?.expense || [0, 0, 0, 0, 0, 0] },
      ],
      colors: [mint, expenseBar],
      plotOptions: { bar: { columnWidth: '52%', borderRadius: 5 } },
      legend: { show: false },
      grid: { borderColor: axis, strokeDashArray: 4, xaxis: { lines: { show: false } } },
      xaxis: {
        categories: analyticsData.value.cashflow?.categories || ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: muted, fontSize: '10px' } },
      },
      yaxis: {
        labels: {
          style: { colors: muted, fontSize: '10px' },
          formatter: (v: number) => (Math.abs(v) > 999 ? `${v / 1000}k` : `${v}`),
        },
      },
      tooltip: { theme: tooltipTheme, y: { formatter: (v: number) => (v < 0 ? '−$' : '$') + Math.abs(v) } },
    }).render();
  }
}

onMounted(async () => {
  await Promise.allSettled([
    seriesStore.fetchSeriesList({ userId: authStore.user?.id }),
    billingStore.fetchTierInfo(),
    fetchDashboardAnalytics(),
    fetchViralTrends(),
  ]);
  nextTick(() => {
    initCharts();
  });

  // Re-render charts when theme changes
  const observer = new MutationObserver(() => {
    initCharts();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
</script>

<template>
  <div id="dashboard-page" class="w-full space-y-9 p-4 font-sans text-[var(--el-text-color-primary)] pb-12">
    <!-- Top Welcome Banner -->
    <section class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] text-[var(--el-text-color-primary)] rounded-[28px] p-8 relative overflow-hidden shadow-soft">
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-[var(--el-color-primary)]/10 blur-[60px] rounded-full pointer-events-none"></div>
      <div class="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p class="text-[var(--el-text-color-secondary)] text-sm font-medium mb-2">{{ t('auth.loginHeader') }}, {{ userName }}</p>
          <h2 class="text-2xl lg:text-3xl font-light tracking-tight">{{ t('home.lovedByCreators') }} — {{ t('common.brandStudio') }}</h2>
        </div>
        <div class="text-left md:text-right">
          <div class="text-3xl font-semibold tracking-tight">
            {{ userCredits.toLocaleString() }}
            <span class="text-[var(--el-color-primary)] text-base font-medium">{{ t('dashboard.shineCredits') }}</span>
          </div>
          <p class="text-[var(--el-text-color-secondary)] text-xs mt-1">
            {{ t('billing.creditsRemaining', { count: userCredits }) }}
          </p>
        </div>
      </div>
    </section>

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

    <!-- Row 3: Projects Roster (Search, Filter, Paging) -->
    <section class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">{{ t('nav.series') }}</h3>
          <p class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">{{ t('dashboard.subtitle') }}</p>
        </div>

        <!-- Filter tabs & Search Bar -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Status Filter Tabs -->
          <div class="inline-flex p-1 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft text-xs font-medium">
            <button
              v-for="tab in [
                { key: 'ALL', label: t('dashboard.filterAll') },
                { key: 'ACTIVE', label: t('dashboard.filterActive') },
                { key: 'DRAFT', label: t('dashboard.filterDraft') },
                { key: 'PUBLISHED', label: t('dashboard.filterPublished') },
                { key: 'ARCHIVED', label: 'Archived' }
              ]"
              :key="tab.key"
              @click="handleFilterChange(tab.key)"
              :class="[
                'px-3.5 py-1.5 rounded-xl transition-all cursor-pointer',
                projectStatusFilter === tab.key
                  ? 'bg-[var(--el-color-primary)] text-[var(--el-color-primary-foreground,#002112)] font-semibold shadow-xs'
                  : 'text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)]'
              ]"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-48 sm:w-60">
            <el-input
              v-model="projectSearchQuery"
              @input="handleSearchInput"
              type="text"
              :placeholder="t('dashboard.searchPlaceholder')"
              class="w-full bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl p-1 placeholder:text-[var(--el-text-color-secondary)] outline-none focus:border-[var(--el-color-primary)] transition-colors shadow-soft"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </div>

      <!-- Projects Grid -->
      <div v-if="paginatedSeries.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- Add New Series Quick Card -->
        <div
          class="rounded-[24px] border-2 border-dashed border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] bg-[var(--el-card-bg-color)]/50 hover:bg-[var(--el-card-bg-color)] transition-all cursor-pointer p-6 flex flex-col items-center justify-center text-center group min-h-[300px] shadow-soft"
          @click="handleOpenWizardDefault"
        >
          <div class="w-14 h-14 rounded-2xl bg-[var(--el-color-primary)]/15 text-[var(--el-text-color-primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <el-icon class="text-xl"><Plus /></el-icon>
          </div>
          <h4 class="font-semibold text-base text-[var(--el-text-color-primary)] mb-1">{{ t('dashboard.startNewDrama') }}</h4>
          <p class="text-xs text-[var(--el-text-color-secondary)]">{{ t('dashboard.startNewDramaDesc') }}</p>
        </div>

        <!-- Project Cards -->
        <div
          v-for="series in paginatedSeries"
          :key="series.id"
          class="group rounded-[24px] overflow-hidden border border-[var(--el-border-color)] shadow-soft bg-[var(--el-card-bg-color)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative"
          @click="router.push(`/project/${series.id}`)"
        >
          <div>
            <div class="aspect-[1/1] overflow-hidden relative bg-[var(--el-bg-color)]">
              <el-image :src="series.image" 
                :alt="series.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                :preview-src-list="[series.image]">
                <template #error>
                  <img src="/images/dashboard/poster-1.jpg" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </template>
              </el-image>
              <el-tag class="absolute top-3.5 left-3.5" type="primary" size="small" round>{{ series.tag }}</el-tag>
              <!-- 3-Dots Action Menu -->
              <div class="absolute top-3.5 right-3.5 z-20" @click.stop>
                <el-dropdown trigger="click" @command="(cmd: string) => handleSeriesAction(cmd, series)">
                  <el-button type="primary" size="small" text bg circle icon="More"></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename">
                        <el-icon class="mr-2 text-xs"><Edit /></el-icon> {{ t('common.edit') }}
                      </el-dropdown-item>
                      <el-dropdown-item :command="series.status === 'ARCHIVED' ? 'unarchive' : 'archive'">
                        <el-icon class="mr-2 text-xs"><Folder /></el-icon> {{ series.status === 'ARCHIVED' ? 'Unarchive' : t('series.archived') }}
                      </el-dropdown-item>
                      <el-dropdown-item divided command="delete" class="!text-red-500 font-semibold">
                        <el-icon class="mr-2 text-xs"><Delete /></el-icon> {{ t('common.delete') }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div class="p-5">
              <h4 class="font-semibold text-base text-[var(--el-text-color-primary)] group-hover:text-[var(--el-color-primary)] transition-colors line-clamp-1">{{ series.title }}</h4>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">{{ series.subtitle }}</p>
            </div>
          </div>
          <div class="px-5 pb-5 pt-0 flex items-center justify-between text-xs text-[var(--el-text-color-secondary)] border-t border-[var(--el-border-color)]/40 mt-auto pt-3">
            <span>{{ series.status === 'PUBLISHED' ? '100% ' + t('dashboard.completeLabel') : '75% ' + t('dashboard.completeLabel') }}</span>
            <span class="font-semibold text-[var(--el-color-primary)] group-hover:underline flex items-center gap-1">
              {{ t('dashboard.openStudioBtn') }} <el-icon class="text-[10px]"><Right /></el-icon>
            </span>
          </div>
        </div>
      </div>

      <!-- Empty Filter/Search State -->
      <div
        v-else
        class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-12 text-center shadow-soft"
      >
        <div class="w-14 h-14 rounded-full bg-[var(--el-bg-color)] flex items-center justify-center text-[var(--el-text-color-secondary)] mx-auto mb-4 text-xl">
          <el-icon :size="24"><FolderOpened /></el-icon>
        </div>
        <h4 class="font-semibold text-lg text-[var(--el-text-color-primary)] mb-1">{{ t('dashboard.noSeries') }}</h4>
        <p class="text-xs text-[var(--el-text-color-secondary)] mb-5">{{ t('dashboard.noSeriesDesc') }}</p>
        <el-button
          type="primary"
          round size="large"
          @click="handleOpenWizardDefault"
          icon="Plus"
        >
          {{ t('dashboard.newSeriesBtn') }}
        </el-button>
      </div>

      <!-- Pagination -->
      <div v-if="totalFilteredCount > pageSize" class="flex justify-center pt-2">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalFilteredCount"
          layout="prev, pager, next"
          background
          class="!text-[var(--el-text-color-primary)]"
        />
      </div>
    </section>

    <!-- Row 3.5: Viral Hot Trends & Topics Widget -->
    <section class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 sm:p-8 shadow-soft">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-orange-500/10 text-orange-500">
              <el-icon :size="16"><TrendCharts /></el-icon>
            </span>
            <h3 class="font-semibold text-lg tracking-tight text-[var(--el-text-color-primary)]">
              {{ t('trends.hotTrendsTitle') }}
            </h3>
            <el-tag size="small" type="danger" effect="plain" round class="text-[10px] font-bold tracking-wider uppercase">
              {{ t('trends.trendingNow') }}
            </el-tag>
          </div>
          <p class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('trends.hotTrendsSubtitle') }}
          </p>
        </div>

        <!-- Country Filter & Actions -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Popular country chips -->
          <div class="hidden sm:flex items-center gap-1.5">
            <el-button
              v-for="c in popularCountries.slice(0, 4)"
              :key="c.code"
              :type="selectedTrendCountry === c.name ? 'primary' : ''"
              round plain size="small" class="!ml-0"
              @click="fetchViralTrends(c.name)"
            >
              <CountryFlag :code="c.code" :flag="c.flag" size="small" />
              <span class="!ml-1">{{ c.nativeName || c.name }}</span>
            </el-button>
          </div>

          <!-- All Countries Select with CountryFlag -->
          <el-select
            v-model="selectedTrendCountry"
            @change="fetchViralTrends"
            filterable round
            class="!w-[200px]"
          >
            <template #prefix>
              <CountryFlag :code="selectedCountryObj?.code" size="small" class="mr-1 shrink-0" />
            </template>
            <el-option
              v-for="c in allCountries"
              :key="c.code"
              :label="c.name"
              :value="c.name"
            >
              <div class="flex items-center gap-2 py-0.5">
                <CountryFlag :code="c.code" size="small" />
                <span class="font-medium text-xs">{{ c.name }}</span>
                <span v-if="c.nativeName && c.nativeName !== c.name" class="text-[11px] text-[var(--el-text-color-secondary)]">({{ c.nativeName }})</span>
              </div>
            </el-option>
          </el-select>

          <!-- Refresh Button -->
          <el-button
            :loading="isFetchingTrends"
            @click="fetchViralTrends()"
            circle
            icon="Refresh"
          />
        </div>
      </div>

      <!-- Loading State Skeleton -->
      <div v-if="isFetchingTrends" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        <div
          v-for="n in 3"
          :key="n"
          class="rounded-2xl border border-[var(--el-border-color)] bg-[var(--el-bg-color)]/50 p-5 animate-pulse flex flex-col justify-between min-h-[200px]"
        >
          <div class="space-y-2.5">
            <div class="h-4 bg-[var(--el-fill-color)] rounded w-1/3"></div>
            <div class="h-5 bg-[var(--el-fill-color-dark)] rounded w-3/4"></div>
            <div class="h-3 bg-[var(--el-fill-color)] rounded w-full"></div>
            <div class="h-3 bg-[var(--el-fill-color)] rounded w-2/3"></div>
          </div>
          <div class="h-9 bg-[var(--el-fill-color)] rounded-xl mt-4"></div>
        </div>
      </div>

      <!-- Loaded Viral Topics Grid -->
      <div v-else-if="viralTopics.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        <div
          v-for="topic in viralTopics"
          :key="topic.topic || topic.title"
          class="group rounded-2xl border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] bg-[var(--el-bg-color)]/40 hover:bg-[var(--el-card-bg-color)] p-5 shadow-soft hover:shadow-md transition-all flex flex-col justify-between relative"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <el-tag size="small" type="primary" effect="plain" round class="text-[10px] font-bold">
                  {{ topic.genre || topic.category || 'Drama' }}
                </el-tag>
                <el-tag v-if="topic.hookType" size="small" type="warning" effect="plain" round class="text-[10px] font-bold">
                  {{ topic.hookType }}
                </el-tag>
              </div>
              <el-tag round type="danger" effect="plain" size="small">
                <el-icon><TrendCharts /></el-icon>
                <span>{{ topic.engagementScore || 88 }}%</span>
              </el-tag>
            </div>

            <h4 class="font-semibold text-sm text-[var(--el-text-color-primary)] group-hover:text-[var(--el-color-primary)] transition-colors mb-1.5 line-clamp-1">
              {{ topic.topic || topic.title }}
            </h4>
            <p class="text-xs leading-relaxed text-[var(--el-text-color-secondary)] line-clamp-3 mb-4">
              {{ topic.description || topic.competitorHook || topic.trope }}
            </p>
          </div>

          <div class="pt-3.5 border-t border-[var(--el-border-color)]/60 flex items-center justify-between gap-3">
            <div class="text-[11px] text-[var(--el-text-color-secondary)] flex items-center gap-1">
              <span>{{ topic.targetEpisodes || 24 }} {{ t('dashboard.statEpisodes') }}</span>
              <span>·</span>
              <span>60s</span>
            </div>
            <el-button
              type="primary"
              size="small"
              round
              @click="handleCreateFromTrend(topic)"
              class="!font-bold shadow-xs hover:scale-105 transition-transform"
            >
              <el-icon class="mr-1"><MagicStick /></el-icon>
              <span>{{ t('wizard.createSeries') }}</span>
            </el-button>
          </div>
        </div>
      </div>

      <!-- Empty / Error state -->
      <div
        v-else
        class="py-8 text-center text-xs text-[var(--el-text-color-secondary)]"
      >
        <p class="mb-3">{{ trendsError || t('wizard.noTrendsMsg') }}</p>
        <el-button type="primary" round size="small" @click="fetchViralTrends()">
          {{ t('common.refresh') }}
        </el-button>
      </div>
    </section>

    <!-- Row 4: Recent Assets & Cash Flow Chart -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- Recent Assets Table -->
      <div class="lg:col-span-7 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-sm font-medium tracking-wide">{{ t('editor.assetLibrary') }}</h3>
          <router-link to="/assets" class="text-xs font-medium text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)] transition-colors">
            {{ t('common.edit') }}
          </router-link>
        </div>

        <div class="grid grid-cols-12 text-[10px] font-medium text-[var(--el-text-color-secondary)] tracking-widest uppercase px-2 pb-3 border-b border-[var(--el-border-color)]/70">
          <div class="col-span-5">{{ t('editor.assetName') }}</div>
          <div class="col-span-3">Type</div>
          <div class="col-span-2">Size</div>
          <div class="col-span-2 text-right">{{ t('dashboard.tableStatus') }}</div>
        </div>

        <div class="divide-y divide-[var(--el-border-color)]/60">
          <div
            v-for="asset in displayAssets"
            :key="asset.name"
            class="grid grid-cols-12 items-center px-2 py-3.5 hover:bg-[var(--el-bg-color)]/50 rounded-xl transition-colors"
          >
            <div class="col-span-5 flex items-center gap-3 min-w-0 pr-2">
              <div class="w-9 h-9 rounded-xl bg-[var(--el-bg-color)] flex items-center justify-center text-[var(--el-text-color-regular)] shrink-0">
                <i :class="[asset.icon, 'text-sm']"></i>
              </div>
              <span class="text-sm font-medium truncate">{{ asset.name }}</span>
            </div>
            <div class="col-span-3 text-sm text-[var(--el-text-color-regular)]">{{ asset.type }}</div>
            <div class="col-span-2 text-sm text-[var(--el-text-color-regular)]">{{ asset.size }}</div>
            <div class="col-span-2 text-right">
              <span :class="['text-xs font-medium px-2 py-0.5 rounded-md inline-block', asset.statusClass]">
                {{ asset.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cash Flow Chart & Projected Yield -->
      <div class="lg:col-span-5 flex flex-col gap-5">
        <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-3xl p-6 shadow-soft">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm font-medium tracking-wide text-[var(--el-text-color-primary)]">{{ t('dashboard.cashFlow') }}</h3>
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t('dashboard.last6Mo') }}</span>
          </div>
          <div id="cashflow" class="-ml-2 mt-2 min-h-[200px]"></div>
        </div>

        <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] text-[var(--el-text-color-primary)] rounded-3xl p-6 relative overflow-hidden shadow-soft">
          <div class="absolute -right-6 -bottom-6 w-40 h-40 bg-[var(--el-color-primary)]/10 blur-[50px] rounded-full pointer-events-none"></div>
          <div class="relative">
            <p class="text-[var(--el-text-color-secondary)] text-xs font-medium mb-1">{{ t('dashboard.projectedYield') }}</p>
            <div class="text-3xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">${{ (analyticsData.stats.projectedYield || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
            <p class="text-xs text-[var(--el-text-color-secondary)] mt-2">{{ t('dashboard.estPayout') }}</p>
            <el-button type="primary"
              round size="large"
              icon="Money"
              @click="handleWithdraw"
            >
              {{ t('dashboard.withdraw') }}
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- Series Wizard Modal -->
    <SeriesWizardModal 
      v-model="isWizardOpen" 
      :initial-trend="selectedTrendForWizard"
      @created="id => router.push(`/project/${id}`)" 
    />
  </div>
</template>
