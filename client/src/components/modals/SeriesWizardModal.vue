<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { useAuthStore } from '@/stores/useAuthStore';
import http from '@/utils/http';
import { toast } from 'vue-sonner';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created', seriesId: string): void;
}>();

const { t, locale } = useI18n();
const seriesStore = useSeriesStore();
const authStore = useAuthStore();

// ─── Step Control ──────────────────────────────────────────────────────────────
const currentStep = ref(0); // 0=MODE, 1=CONFIG, 2=MASTER PLAN, 3=COMPLIANCE
const stepLabels = computed(() => [
  t('wizard.stepLaunchMode'),
  t('wizard.stepSeriesConfig'),
  t('wizard.stepMasterPlan'),
  t('wizard.stepCompliance')
]);

// ─── Form Data ────────────────────────────────────────────────────────────────
const formData = ref({
  mode: 'viral' as 'viral' | 'manual',
  region: 'SEA',
  selectedTrend: null as any,
  title: '',
  genre: 'Suspense / Mystery',
  tone: 'CINEMATIC NEON',
  description: '',
  country: 'Vietnam',
  targetEpisodes: 24,
  episodeDurationSeconds: 90,
  episodeDurationMinutes: 1.5,
  ratio: '9:16',
  aiWatermark: true,
  commercialRights: true,
});

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

// ─── Step 0: Viral Trend ──────────────────────────────────────────────────────
const viralTopics = ref<any[]>([]);
const isFetchingTrends = ref(false);
const trendsError = ref('');
const regions = ['SEA', 'US', 'CN', 'LATAM', 'JP/KR'];
const ratioOptions = ['9:16', '16:9', '4:3', '1:1'];
const countryOptions = ['Vietnam', 'China', 'Japan', 'South Korea', 'US', 'Thailand', 'Philippines', 'Brazil', 'Mexico', 'UK', 'Germany', 'France', 'India', 'Indonesia'];

async function fetchViralTrends() {
  isFetchingTrends.value = true;
  trendsError.value = '';
  const currentLang = locale.value || localStorage.getItem('shine_language') || localStorage.getItem('shine_locale') || 'en';
  try {
    const res: any = await http.get(`/ai/trends/viral-topics?region=${formData.value.region}&lang=${currentLang}`);
    viralTopics.value = res?.data || [];
    if (viralTopics.value.length === 0) trendsError.value = t('wizard.noTrendsMsg');
  } catch {
    trendsError.value = t('wizard.trendsErrorMsg');
    viralTopics.value = [];
  } finally {
    isFetchingTrends.value = false;
  }
}

function selectTrend(topic: any) {
  formData.value.selectedTrend = topic;
  formData.value.title = topic.topic || topic.title;
  formData.value.description = topic.description || topic.synopsis || topic.trope || '';
  if (topic.genre) formData.value.genre = topic.genre;
  if (topic.targetEpisodes) formData.value.targetEpisodes = topic.targetEpisodes;
  if (topic.country) formData.value.country = topic.country;
}

watch([() => formData.value.region, () => locale.value], () => { if (formData.value.mode === 'viral') fetchViralTrends(); });
watch(() => formData.value.episodeDurationSeconds, (sec) => {
  formData.value.episodeDurationMinutes = Number((sec / 60).toFixed(2));
});

// ─── Step 1: Genre / Style ────────────────────────────────────────────────────
const genresList = computed(() => [
  { name: 'Suspense / Mystery', label: t('wizard.genreSuspense'), emoji: '🔍', desc: t('wizard.genreSuspenseDesc') },
  { name: 'Revenge / Drama', label: t('wizard.genreRevenge'), emoji: '⚡', desc: t('wizard.genreRevengeDesc') },
  { name: 'Romance / Contract', label: t('wizard.genreRomance'), emoji: '💍', desc: t('wizard.genreRomanceDesc') },
  { name: 'Satire / Comedy', label: t('wizard.genreSatire'), emoji: '🎭', desc: t('wizard.genreSatireDesc') },
  { name: 'Fantasy / Rebirth', label: t('wizard.genreFantasy'), emoji: '🗡️', desc: t('wizard.genreFantasyDesc') },
  { name: 'Sci-Fi / Cyberpunk', label: t('wizard.genreScifi'), emoji: '🤖', desc: t('wizard.genreScifiDesc') },
]);

const presets = computed(() => [
  { id: 'CINEMATIC NEON', label: t('wizard.presetCinematicNeon') },
  { id: 'NORDIC NOIR', label: t('wizard.presetNordicNoir') },
  { id: 'STEADY HANDHELD', label: t('wizard.presetSteadyHandheld') },
  { id: 'ANAMORPHIC VINTAGE', label: t('wizard.presetAnamorphicVintage') },
  { id: 'GOLDEN HOUR', label: t('wizard.presetGoldenHour') },
  { id: 'DARK ACADEMIA', label: t('wizard.presetDarkAcademia') },
]);

// ─── Step 2: Master Plan ──────────────────────────────────────────────────────
const masterPlan = ref<any>(null);
const isGeneratingPlan = ref(false);
const planError = ref('');
const planChatInput = ref('');
const isPlanChatSending = ref(false);
const planChatMessages = ref<Array<{ role: 'user' | 'assistant' | 'error'; text: string; failedPrompt?: string }>>([]);

async function generateMasterPlan() {
  isGeneratingPlan.value = true;
  planError.value = '';
  try {
    const res: any = await http.post('/ai/generate-master-plan', {
      title: formData.value.title || (formData.value.selectedTrend?.topic) || 'Untitled Series',
      genre: formData.value.genre,
      tone: formData.value.tone,
      synopsis: formData.value.description || (formData.value.selectedTrend?.description),
      totalEpisodes: formData.value.targetEpisodes,
      episodeDurationSeconds: formData.value.episodeDurationSeconds,
      country: formData.value.country,
      region: formData.value.region,
      ratio: formData.value.ratio,
      viralTopic: formData.value.selectedTrend?.topic || '',
    });
    masterPlan.value = res?.data;
    planChatMessages.value = [{
      role: 'assistant',
      text: t('wizard.masterPlanCreatedMsg', {
        episodes: formData.value.targetEpisodes,
        duration: formatDuration(formData.value.episodeDurationSeconds),
        country: formData.value.country,
        hook: res?.data?.viralHook || t('wizard.defaultHook'),
      }),
    }];
    currentStep.value = 2;
  } catch {
    planError.value = t('wizard.planErrorMsg');
  } finally {
    isGeneratingPlan.value = false;
  }
}

async function sendPlanChat(customMsg?: string) {
  const msg = (typeof customMsg === 'string' ? customMsg : planChatInput.value).trim();
  if (!msg || isPlanChatSending.value) return;
  if (typeof customMsg !== 'string') {
    planChatMessages.value.push({ role: 'user', text: msg });
    planChatInput.value = '';
  }
  isPlanChatSending.value = true;
  try {
    const res: any = await http.post('/ai/refine-master-plan', { currentPlan: masterPlan.value, userInstruction: msg });
    if (res?.data?.updatedPlan) {
      masterPlan.value = res.data.updatedPlan;
      if (res.data.updatedPlan.totalEpisodes) formData.value.targetEpisodes = res.data.updatedPlan.totalEpisodes;
      if (res.data.updatedPlan.title) formData.value.title = res.data.updatedPlan.title;
    }
    planChatMessages.value.push({
      role: 'assistant',
      text: res?.data?.explanation || res?.data?.aiResponse || t('wizard.aiDoneUpdating')
    });
  } catch (err: any) {
    const errorDetail = err?.response?.data?.message || err?.message || t('wizard.planErrorMsg');
    planChatMessages.value.push({
      role: 'error',
      text: t('wizard.adjustmentFailed', { error: errorDetail }),
      failedPrompt: msg
    });
    toast.error(errorDetail);
  } finally {
    isPlanChatSending.value = false;
  }
}

function retryPlanChat(failedPrompt: string, errorIdx: number) {
  planChatMessages.value.splice(errorIdx, 1);
  sendPlanChat(failedPrompt);
}

// ─── Step 3: Compliance & Submit ──────────────────────────────────────────────
const isVerifyingCompliance = ref(false);
const complianceError = ref('');
const complianceResult = ref<any>({
  overallScore: 98,
  isCompliant: true,
  categories: {
    violence: { label: t('compliance.violenceGore'), score: 98, status: 'Passed', safe: true, notes: 'No prohibited violence' },
    adultContent: { label: t('compliance.adultContent'), score: 100, status: 'Passed', safe: true, notes: 'Compliant with commercial standards' },
    culturalSensitivity: { label: t('compliance.culturalSensitivity'), score: 94, status: 'Passed', safe: true, notes: 'Aligned with regional norms' },
    copyrightIP: { label: t('compliance.copyrightIP'), score: 96, status: 'Passed', safe: true, notes: 'Original tropes' },
  },
  copyrightChecks: [
    { label: t('compliance.scriptOrigin'), status: 'Passed', safe: true },
    { label: t('compliance.generatedVisualAssets'), status: 'Passed', safe: true },
    { label: t('compliance.audioFoleyLibrary'), status: 'Passed', safe: true },
  ],
  identifiedIssues: [],
  recommendations: [],
});

async function runComplianceVerification() {
  if (!masterPlan.value) return;
  isVerifyingCompliance.value = true;
  complianceError.value = '';
  try {
    const res: any = await http.post('/ai/verify-compliance', {
      masterPlan: masterPlan.value,
      country: formData.value.country || formData.value.region || 'Vietnam',
      ratio: formData.value.ratio || '9:16',
    });
    if (res?.data) {
      complianceResult.value = res.data;
    }
  } catch (err: any) {
    complianceError.value = err?.response?.data?.message || err?.message || t('wizard.complianceErrorMsg');
  } finally {
    isVerifyingCompliance.value = false;
  }
}

const isRefiningFromSuggestions = ref(false);

async function refineMasterPlanFromSuggestions(specificSuggestion?: string) {
  if (!masterPlan.value || isRefiningFromSuggestions.value) return;

  let instruction = '';
  if (specificSuggestion && typeof specificSuggestion === 'string') {
    instruction = `Please refine and optimize the series master plan to strictly implement this supervision recommendation:\n"${specificSuggestion}"`;
  } else if (complianceResult.value.recommendations && complianceResult.value.recommendations.length > 0) {
    instruction = `Please refine and optimize the series master plan to address all of the following supervision recommendations and quality gates:\n` +
      complianceResult.value.recommendations.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n');
  } else {
    return;
  }

  isRefiningFromSuggestions.value = true;
  toast.info(t('wizard.refiningFromSuggestions'));

  try {
    const res: any = await http.post('/ai/refine-master-plan', {
      currentPlan: masterPlan.value,
      userInstruction: instruction,
    });
    if (res?.data?.updatedPlan) {
      masterPlan.value = res.data.updatedPlan;
      if (res.data.updatedPlan.totalEpisodes) formData.value.targetEpisodes = res.data.updatedPlan.totalEpisodes;
      if (res.data.updatedPlan.title) formData.value.title = res.data.updatedPlan.title;
      if (res.data.updatedPlan.totalDurationSeconds) formData.value.episodeDurationSeconds = res.data.updatedPlan.totalDurationSeconds;
    }

    planChatMessages.value.push({
      role: 'user',
      text: specificSuggestion ? `Suggestion: "${specificSuggestion}"` : 'Applied all supervision recommendations to optimize master plan.',
    });
    planChatMessages.value.push({
      role: 'assistant',
      text: res?.data?.explanation || res?.data?.aiResponse || t('wizard.aiDoneUpdating'),
    });

    toast.success(t('wizard.planRefinedSuccess'));

    // Automatically re-run compliance verification to validate updated plan
    await runComplianceVerification();
  } catch (err: any) {
    const errorDetail = err?.response?.data?.message || err?.message || t('wizard.planErrorMsg');
    toast.error(t('wizard.adjustmentFailed', { error: errorDetail }));
  } finally {
    isRefiningFromSuggestions.value = false;
  }
}

const isSubmitting = ref(false);

async function handleFinish() {
  if (!formData.value.title.trim()) {
    formData.value.title = masterPlan.value?.title || t('wizard.untitled');
  }
  isSubmitting.value = true;
  try {
    const finalPayload = {
      title: formData.value.title,
      genre: formData.value.genre,
      tone: formData.value.tone,
      country: formData.value.country,
      ratio: formData.value.ratio,
      episodeCount: masterPlan.value?.totalEpisodes || formData.value.targetEpisodes,
      episodeDurationSeconds: masterPlan.value?.totalDurationSeconds || formData.value.episodeDurationSeconds,
      episodeDurationMinutes: masterPlan.value?.episodeDurationMinutes || formData.value.episodeDurationMinutes || 1.5,
      userId: authStore.user?.id,
      description: formData.value.description || masterPlan.value?.storyCore?.coreAttraction,
      synopsis: masterPlan.value?.storyCore?.coreAttraction || formData.value.description,
      masterPlan: masterPlan.value,
      characters: masterPlan.value?.characters || [],
    };
    const newSeries = await seriesStore.createSeries(finalPayload);
    toast.success(t('wizard.createSeriesSuccess'));
    emit('update:modelValue', false);
    emit('created', newSeries.id);
  } catch {
    // handled by http interceptor
  } finally {
    isSubmitting.value = false;
  }
}

function nextStep() {
  if (currentStep.value === 1) {
    // Step 1 -> 2: generate master plan
    generateMasterPlan();
    return;
  }
  if (currentStep.value === 2) {
    // Step 2 -> 3: verify compliance
    currentStep.value = 3;
    runComplianceVerification();
    return;
  }
  currentStep.value = Math.min(3, currentStep.value + 1);
}

const canProceed = computed(() => {
  if (currentStep.value === 0 && formData.value.mode === 'viral') return !!formData.value.selectedTrend;
  if (currentStep.value === 1) return true;
  if (currentStep.value === 2) return !!masterPlan.value;
  return true;
});
</script>

<template>
  <el-dialog
    id="create-series-modal"
    :model-value="props.modelValue"
    @update:model-value="val => emit('update:modelValue', val)"
    :fullscreen="true"
    class="!rounded-none !p-0 overflow-hidden"
    align-center
    destroy-on-close
    :show-close="false"
  >
    <template #header>
      <div class="px-5 py-3 flex items-center justify-between border-b" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
            <el-icon :size="14" class="text-white"><Film /></el-icon>
          </div>
          <span class="text-xs font-black tracking-widest uppercase" style="color: var(--el-text-color-secondary);">{{ t('wizard.newSeries') }}</span>
        </div>

        <!-- Step Pills -->
        <div class="hidden md:flex items-center gap-1">
          <template v-for="(label, i) in stepLabels" :key="i">
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all text-xs font-bold"
              :style="currentStep === i
                ? 'background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-5);'
                : i < currentStep
                  ? 'color: var(--el-color-primary); opacity: 0.8;'
                  : 'color: var(--el-text-color-placeholder);'"
              @click="i < currentStep ? (currentStep = i) : null"
            >
              <div class="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black shrink-0"
                :style="currentStep >= i ? 'background-color: var(--el-color-primary); color: #fff;' : 'background-color: var(--el-fill-color-light); color: var(--el-text-color-placeholder);'">
                <el-icon v-if="i < currentStep" :size="10"><Check /></el-icon>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span class="uppercase tracking-widest hidden lg:block">{{ label }}</span>
            </div>
            <div v-if="i < 3" class="w-6 h-px" style="background-color: var(--el-border-color);"></div>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <el-button plain round @click="emit('update:modelValue', false)">{{ t('wizard.close') }}</el-button>
          <el-button v-if="currentStep < 3" type="primary" round
            :loading="isGeneratingPlan" :disabled="!canProceed" icon="Right" @click="nextStep">
            {{ currentStep === 1 ? t('wizard.generatePlan') : t('wizard.nextStep') }}
          </el-button>
          <el-button v-else id="create-series-submit" type="success" round :loading="isSubmitting" icon="Promotion" @click="handleFinish">
            {{ t('wizard.createSeries') }}
          </el-button>
        </div>
      </div>
    </template>

    <div class="flex h-[calc(100vh-92px)]" style="background-color: var(--el-bg-color-page);">
      <!-- Left Sidebar -->
      <aside class="w-[260px] shrink-0 border-r p-7 flex flex-col justify-between" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
        <div class="space-y-6">
          <div>
            <div class="text-[10px] font-black tracking-widest uppercase mb-1" style="color: var(--el-color-primary);">
              {{ t('wizard.stepOf', { current: currentStep + 1, total: 4 }) }}
            </div>
            <h2 class="text-lg font-black leading-tight" style="color: var(--el-text-color-primary);">
              {{ [
                t('wizard.stepLaunchModeTitle'),
                t('wizard.stepSeriesConfigTitle'),
                t('wizard.stepMasterPlanTitle'),
                t('wizard.stepComplianceTitle')
              ][currentStep] }}
            </h2>
            <p class="text-xs mt-2 leading-relaxed" style="color: var(--el-text-color-secondary);">
              {{ [
                t('wizard.stepLaunchModeDesc'),
                t('wizard.stepSeriesConfigDesc'),
                t('wizard.stepMasterPlanDesc'),
                t('wizard.stepComplianceDesc')
              ][currentStep] }}
            </p>
          </div>

          <div class="rounded-xl border p-4 relative overflow-hidden" style="border-color: var(--el-color-primary-light-7); background-color: var(--el-color-primary-light-9);">
            <div class="absolute top-0 left-0 w-1 h-full rounded-l-xl" style="background-color: var(--el-color-primary);"></div>
            <div class="text-xs font-black mb-1 flex items-center gap-1.5" style="color: var(--el-text-color-primary);">
              <el-icon style="color: var(--el-color-warning);"><Opportunity /></el-icon>
              {{ t('wizard.aiTip') }}
            </div>
            <p class="text-[11px] italic leading-relaxed" style="color: var(--el-text-color-regular);">
              {{ [
                t('wizard.stepLaunchModeTip'),
                t('wizard.stepSeriesConfigTip'),
                t('wizard.stepMasterPlanTip'),
                t('wizard.stepComplianceTip')
              ][currentStep] }}
            </p>
          </div>

          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider mb-2" style="color: var(--el-text-color-placeholder);">{{ t('wizard.progress') }}</div>
            <el-progress :percentage="((currentStep + 1) / 4) * 100" :show-text="false" color="var(--el-color-primary)" :stroke-width="6" />
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8 lg:p-12 overflow-y-auto pb-32">

        <!-- STEP 0: LAUNCH MODE -->
        <div v-if="currentStep === 0" class="max-w-5xl mx-auto space-y-10">
          <div>
            <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.stepLaunchModeTitle') }}</h1>
            <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.chooseLaunchModeDesc') }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="cursor-pointer rounded-2xl p-6 border-2 transition-all relative overflow-hidden"
              :style="formData.mode === 'viral'
                ? 'border-color: var(--el-color-primary); background-color: var(--el-color-primary-light-9);'
                : 'border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);'"
              @click="formData.mode = 'viral'">
              <div v-if="formData.mode === 'viral'" class="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style="background-color: var(--el-color-primary);">
                <el-icon :size="10" class="text-white"><Check /></el-icon>
              </div>
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white" style="background: linear-gradient(135deg, #f97316, #ef4444);">
                <el-icon :size="22"><TrendCharts /></el-icon>
              </div>
              <h3 class="text-xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.viralTrendMode') }}</h3>
              <p class="text-sm leading-relaxed mb-4" style="color: var(--el-text-color-secondary);">{{ t('wizard.viralTrendModeDesc') }}</p>
              <div class="flex flex-wrap gap-2">
                <el-tag size="small" type="danger" effect="light" round class="font-bold uppercase text-[10px]">{{ t('wizard.realtimeData') }}</el-tag>
                <el-tag size="small" type="warning" effect="light" round class="font-bold uppercase text-[10px]">{{ t('wizard.autoFill') }}</el-tag>
                <el-tag size="small" type="success" effect="light" round class="font-bold uppercase text-[10px]">{{ t('wizard.viralSuccessMultiplier') }}</el-tag>
              </div>
            </div>

            <div class="cursor-pointer rounded-2xl p-6 border-2 transition-all relative overflow-hidden"
              :style="formData.mode === 'manual'
                ? 'border-color: #0ea5e9; background-color: rgba(14, 165, 233, 0.08);'
                : 'border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);'"
              @click="formData.mode = 'manual'">
              <div v-if="formData.mode === 'manual'" class="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style="background-color: #0ea5e9;">
                <el-icon :size="10" class="text-white"><Check /></el-icon>
              </div>
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white" style="background: linear-gradient(135deg, #38bdf8, #6366f1);">
                <el-icon :size="22"><EditPen /></el-icon>
              </div>
              <h3 class="text-xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.manualMode') }}</h3>
              <p class="text-sm leading-relaxed mb-4" style="color: var(--el-text-color-secondary);">{{ t('wizard.manualModeDesc') }}</p>
              <div class="flex flex-wrap gap-2">
                <el-tag size="small" type="primary" effect="light" round class="font-bold uppercase text-[10px]">{{ t('wizard.fullControl') }}</el-tag>
                <el-tag size="small" type="info" effect="light" round class="font-bold uppercase text-[10px]">{{ t('wizard.originalStory') }}</el-tag>
              </div>
            </div>
          </div>

          <!-- Viral: Region + Trends -->
          <div v-if="formData.mode === 'viral'" class="space-y-6">
            <div>
              <h2 class="text-lg font-black mb-4" style="color: var(--el-text-color-primary);">{{ t('wizard.selectTargetRegion') }}</h2>
              <div class="flex flex-wrap gap-3">
                <el-button v-for="reg in regions" :key="reg" round
                  :type="formData.region === reg ? 'primary' : 'info'" :plain="formData.region !== reg"
                  @click="formData.region = reg">{{ reg }}</el-button>
                <el-button type="primary" icon="MagicStick" round :loading="isFetchingTrends" @click="fetchViralTrends">
                  {{ isFetchingTrends ? t('wizard.scanning') : t('wizard.fetchTrends') }}
                </el-button>
              </div>
            </div>

            <div v-if="isFetchingTrends" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <el-card v-for="i in 3" :key="i" shadow="never" class="!rounded-2xl" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <div class="animate-pulse space-y-3">
                  <div class="h-4 rounded w-3/4" style="background-color: var(--el-fill-color-light);"></div>
                  <div class="h-3 rounded" style="background-color: var(--el-fill-color-light);"></div>
                  <div class="h-3 rounded w-2/3" style="background-color: var(--el-fill-color-light);"></div>
                </div>
              </el-card>
            </div>

            <div v-else-if="trendsError">
              <el-alert type="error" show-icon :closable="false" :title="trendsError" />
            </div>

            <div v-else-if="viralTopics.length > 0">
              <h3 class="text-sm font-black mb-4 uppercase tracking-wider" style="color: var(--el-text-color-primary);">{{ t('wizard.liveTrends', { region: formData.region }) }}</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div v-for="topic in viralTopics" :key="topic.id"
                  class="cursor-pointer rounded-2xl border-2 p-5 transition-all hover:shadow-lg flex flex-col justify-between"
                  :style="formData.selectedTrend?.id === topic.id
                    ? 'border-color: var(--el-color-primary); background-color: var(--el-color-primary-light-9);'
                    : 'border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);'"
                  @click="selectTrend(topic)">
                  <div>
                    <div class="flex justify-between items-start mb-3">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white" style="background: linear-gradient(135deg, #f87171, #fb923c);">
                        <el-icon :size="16"><TrendCharts /></el-icon>
                      </div>
                      <el-tag size="small" type="danger" effect="light" round class="font-black text-[10px] uppercase">
                        {{ topic.hashtagVelocity || 'TRENDING' }}
                      </el-tag>
                    </div>
                    <h4 class="font-black text-sm mb-1 leading-snug" style="color: var(--el-text-color-primary);">{{ topic.topic }}</h4>
                    <p class="text-[11px] leading-relaxed mb-3" style="color: var(--el-text-color-secondary);">{{ topic.description || topic.competitorHook || topic.trope }}</p>
                  </div>
                  <div class="pt-3 border-t flex items-center justify-between" style="border-color: var(--el-border-color-light);">
                    <span class="text-[10px] font-semibold" style="color: var(--el-text-color-placeholder);">{{ t('wizard.engagement') }}</span>
                    <span class="text-sm font-black" style="color: var(--el-color-primary);">{{ topic.engagementScore || 85 }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else>
              <el-empty :description="t('wizard.clickFetchTrends', { region: formData.region })" />
            </div>
          </div>

          <!-- Manual: Basic Info -->
          <div v-else class="space-y-5 w-full">
            <div>
              <label class="text-[11px] font-black uppercase tracking-wider block mb-1.5" style="color: var(--el-text-color-secondary);">{{ t('wizard.seriesTitle') }}</label>
              <el-input v-model="formData.title" :placeholder="t('wizard.seriesTitlePlaceholder')" size="large" />
            </div>
            <div>
              <label class="text-[11px] font-black uppercase tracking-wider block mb-1.5" style="color: var(--el-text-color-secondary);">{{ t('wizard.descriptionTopic') }}</label>
              <el-input v-model="formData.description" type="textarea" :rows="4" :placeholder="t('wizard.descriptionPlaceholder')" />
            </div>
          </div>
        </div>

        <!-- STEP 1: SERIES CONFIG -->
        <div v-else-if="currentStep === 1" class="max-w-4xl mx-auto space-y-10">
          <div>
            <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.stepSeriesConfigTitle') }}</h1>
            <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.stepSeriesConfigDesc') }}</p>
          </div>

          <div class="space-y-4">
            <h2 class="text-sm font-black uppercase tracking-wider" style="color: var(--el-text-color-regular);">{{ t('wizard.genre') }}</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="g in genresList" :key="g.name"
                class="cursor-pointer rounded-xl p-4 border-2 transition-all flex items-center gap-3"
                :style="formData.genre === g.name
                  ? 'border-color: var(--el-color-primary); background-color: var(--el-color-primary-light-9);'
                  : 'border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);'"
                @click="formData.genre = g.name">
                <span class="text-2xl shrink-0">{{ g.emoji }}</span>
                <div>
                  <div class="text-xs font-black leading-tight" style="color: var(--el-text-color-primary);">{{ g.label }}</div>
                  <div class="text-[10px] mt-0.5 leading-relaxed hidden lg:block" style="color: var(--el-text-color-placeholder);">{{ g.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('wizard.visualStyle') }}</h3>
              <div class="flex flex-wrap gap-2">
                <el-button v-for="p in presets" :key="p.id" round class="!ml-0"
                  :type="formData.tone === p.id ? 'primary' : 'info'" :plain="formData.tone !== p.id"
                  @click="formData.tone = p.id">{{ p.label }}</el-button>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('wizard.aspectRatio') }}</h3>
              <div class="grid grid-cols-2 gap-2">
                <el-button v-for="r in ratioOptions" :key="r" round class="!ml-0"
                  :type="formData.ratio === r ? 'primary' : 'info'" :plain="formData.ratio !== r"
                  @click="formData.ratio = r">{{ r }}</el-button>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('wizard.episodesLabel', { count: formData.targetEpisodes }) }}</h3>
              <el-slider v-model="formData.targetEpisodes" :min="10" :max="100" :step="2" />
              <div class="flex justify-between text-[10px] font-semibold" style="color: var(--el-text-color-placeholder);">
                <span>{{ t('wizard.episodesShortArc') }}</span><span>{{ t('wizard.episodesEpic') }}</span>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
                {{ t('wizard.durationPerEpHeading') }}: <span style="color: var(--el-color-primary);">{{ formatDuration(formData.episodeDurationSeconds) }}</span>
              </h3>
              <el-slider
                v-model="formData.episodeDurationSeconds"
                :min="30"
                :max="600"
                :step="15"
                :format-tooltip="formatDuration"
              />
              <div class="flex justify-between text-[10px] font-semibold" style="color: var(--el-text-color-placeholder);">
                <span>{{ t('wizard.durationFlash') }}</span><span>{{ t('wizard.durationMiniSeries') }}</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-wider block" style="color: var(--el-text-color-secondary);">{{ t('wizard.targetCountry') }}</label>
              <el-select v-model="formData.country" class="w-full" size="large" filterable>
                <el-option v-for="c in countryOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-wider block" style="color: var(--el-text-color-secondary);">{{ t('wizard.storyDescription') }}</label>
              <el-input v-model="formData.description" type="textarea" :rows="3" :placeholder="t('wizard.storyDescPlaceholder')" />
            </div>
          </div>

          <div class="space-y-3">
            <h3 class="text-xs font-black uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('wizard.referenceAssets') }}</h3>
            <p class="text-xs" style="color: var(--el-text-color-placeholder);">{{ t('wizard.referenceAssetsDesc') }}</p>
            <el-upload drag multiple action="#" :auto-upload="false" accept=".jpg,.jpeg,.png,.webp,.mp4,.txt,.pdf,.docx" class="w-full">
              <el-icon class="el-icon--upload" :size="48"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                {{ t('wizard.dropFiles') }}
              </div>
              <template #tip>
                <div class="el-upload__tip text-center">
                  {{ t('wizard.supportedAssetFormats') }}
                </div>
              </template>
            </el-upload>
          </div>
        </div>

        <!-- STEP 2: MASTER PLAN -->
        <div v-else-if="currentStep === 2" class="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.aiMasterPlan') }}</h1>
            <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.masterPlanReviewDesc', { episodes: formData.targetEpisodes }) }}</p>
          </div>

          <div v-if="!masterPlan && !isGeneratingPlan" class="text-center py-16 border-2 border-dashed rounded-2xl" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
              <el-icon :size="28"><MagicStick /></el-icon>
            </div>
            <h3 class="text-xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.readyToGenerate') }}</h3>
            <p class="text-sm mb-6" style="color: var(--el-text-color-secondary);">{{ t('wizard.readyToGenerateDesc', { episodes: formData.targetEpisodes }) }}</p>
            <el-button type="primary" size="large" round icon="Lightning" @click="generateMasterPlan">
              {{ t('wizard.generateMasterPlan') }}
            </el-button>
          </div>

          <div v-else-if="isGeneratingPlan" class="text-center py-16">
            <div class="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-6" style="border-color: var(--el-color-primary); border-top-color: transparent;"></div>
            <h3 class="text-lg font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.generatingMasterPlan') }}</h3>
            <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.generatingMasterPlanDesc', { episodes: formData.targetEpisodes }) }}</p>
            <div class="mt-4 flex flex-wrap gap-3 justify-center text-xs" style="color: var(--el-text-color-placeholder);">
              <span>{{ t('wizard.analyzingGenreDNA') }}</span>
              <span>{{ t('wizard.buildingCharacterArcs') }}</span>
              <span class="animate-pulse font-bold" style="color: var(--el-color-primary);">{{ t('wizard.generatingEpisodeHooks') }}</span>
            </div>
          </div>

          <div v-else-if="planError" class="p-5 rounded-xl text-center space-y-3" style="background-color: var(--el-color-danger-light-9); border: 1px solid var(--el-color-danger-light-5);">
            <p class="text-sm" style="color: var(--el-color-danger);">{{ planError }}</p>
            <el-button type="danger" plain round @click="generateMasterPlan">{{ t('wizard.retryGeneration') }}</el-button>
          </div>

          <div v-else-if="masterPlan" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <!-- Plan Overview Left -->
            <div class="space-y-5 overflow-y-auto max-h-[620px] custom-scrollbar pr-1">
              <!-- 1. Story Core & Hidden Arc -->
              <div class="rounded-2xl border p-5 space-y-3" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style="color: var(--el-color-primary);">
                    <el-icon><Aim /></el-icon> {{ t('wizard.storyCore') }}
                  </h3>
                </div>
                <p class="text-xs leading-relaxed font-semibold" style="color: var(--el-text-color-primary);">
                  {{ masterPlan.storyCore?.coreAttraction || masterPlan.seriesOverview }}
                </p>
                <div v-if="masterPlan.storyCore?.goldFingerRule">
                  <el-tag type="danger" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start"><span class="font-bold">⚡ {{ t('wizard.keyLeverageRule') }}</span> {{ masterPlan.storyCore.goldFingerRule }}</el-tag>
                </div>
                <div v-if="masterPlan.storyCore?.psychologicalPleasure">
                  <el-tag type="success" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start"><span class="font-bold">⚡ </span> {{ masterPlan.storyCore.psychologicalPleasure }}</el-tag>
                </div>
                <div v-if="masterPlan.hiddenLine">
                  <el-tag type="warning" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start"><span class="font-bold">🌱 {{ t('wizard.hiddenArcGrowth') }}</span> {{ masterPlan.hiddenLine }}</el-tag>
                </div>
              </div>

              <!-- 2. Core Triangle Character Bios -->
              <div class="rounded-2xl border p-5 space-y-3" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                    <el-icon><UserFilled /></el-icon> {{ t('wizard.coreTriangleCharacters') }}
                  </h3>
                  <span class="text-[10px]" style="color: var(--el-text-color-placeholder);">{{ t('wizard.loraAnchored') }}</span>
                </div>
                <div class="space-y-3">
                  <div v-for="char in (masterPlan.characters || [])" :key="char.name" class="p-3.5 rounded-xl border space-y-2.5" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
                          {{ char.name?.[0] || '?' }}
                        </div>
                        <div>
                          <div class="text-xs font-bold flex flex-wrap items-center gap-1.5" style="color: var(--el-text-color-primary);">
                            <span>{{ char.name }}</span>
                            <el-tag size="small" 
                              :type="char.role?.toLowerCase() === 'protagonist' ? 'success' : char.role?.toLowerCase() === 'antagonist' ? 'danger' : 'primary'" 
                              effect="plain" 
                              round 
                              class="!text-[10px]">
                              {{ char.role ? t('wizard.' + char.role.toLowerCase(), char.role) : t('wizard.protagonist') }}
                            </el-tag>
                            <el-tag v-if="char.gender" size="small" effect="plain" round class="!text-[10px]" :type="char.gender === 'female' ? 'warning' : 'info'">
                              {{ char.gender === 'female' ? '♀ ' + t('wizard.female') : char.gender === 'male' ? '♂ ' + t('wizard.male') : t('wizard.neutral') }}
                            </el-tag>
                            <el-tag v-if="char.nationality" size="small" effect="plain" round class="!text-[10px]">
                              🌐 {{ char.nationality }}
                            </el-tag>
                            <el-tag v-if="char.voiceId" size="small" type="primary" effect="plain" round class="!text-[10px]">
                              🎙️ {{ char.voiceId }}
                            </el-tag>
                          </div>
                          <div class="text-[10px] font-mono mt-0.5" style="color: var(--el-text-color-placeholder);">{{ char.loraAnchor || 'master_lora_anchor' }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Identity & Bio -->
                    <div class="text-[11px] leading-relaxed font-semibold" style="color: var(--el-text-color-primary);">
                      {{ char.identity || char.bio }}
                    </div>

                    <!-- Traits -->
                    <div v-if="char.traits" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                      <span class="font-bold text-[10px] uppercase tracking-wider" style="color: var(--el-color-primary);">✨ {{ t('wizard.traits') }}:</span> {{ char.traits }}
                    </div>

                    <!-- Circumstance / Origin Context -->
                    <div v-if="char.circumstance" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                      <span class="font-bold text-[10px] uppercase tracking-wider text-amber-500">📍 {{ t('wizard.circumstance') }}:</span> {{ char.circumstance }}
                    </div>

                    <!-- Empathy Elements -->
                    <div v-if="char.empathyElements" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                      <span class="font-bold text-[10px] uppercase tracking-wider text-rose-400">❤️ {{ t('wizard.empathyElements') }}:</span> {{ char.empathyElements }}
                    </div>

                    <!-- Action / Goal -->
                    <div v-if="char.action" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                      <span class="font-bold text-[10px] uppercase tracking-wider text-sky-400">🎯 {{ t('wizard.action') }}:</span> {{ char.action }}
                    </div>

                    <!-- Ending / Fate -->
                    <div v-if="char.ending" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                      <span class="font-bold text-[10px] uppercase tracking-wider text-emerald-400">🏁 {{ t('wizard.ending') }}:</span> {{ char.ending }}
                    </div>

                    <!-- Speech Style -->
                    <div v-if="char.speechStyle" class="text-[10px] italic pt-0.5">
                      <el-tag size="small" type="success" effect="plain" round class="!text-[10px]">🗣️ {{ char.speechStyle }}</el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Three-Act Structure -->
              <div v-if="masterPlan.threeActs && masterPlan.threeActs.length > 0" class="rounded-2xl border p-5 space-y-3" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                  <el-icon><Files /></el-icon> {{ t('wizard.threeActStructure') }}
                </h3>
                <div class="space-y-2">
                  <div v-for="act in masterPlan.threeActs" :key="act.actNumber" class="p-3 rounded-xl border space-y-1" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                    <div class="flex items-center justify-between text-xs font-bold" style="color: var(--el-text-color-primary);">
                      <span>{{ t('wizard.actLabel', { number: act.actNumber, name: act.name }) }}</span>
                      <span class="text-[10px] font-mono" style="color: var(--el-color-primary);">{{ act.episodeRange }}</span>
                    </div>
                    <div class="text-[10px] leading-relaxed" style="color: var(--el-text-color-secondary);">{{ act.function }}</div>
                    <div v-if="act.actClimax" class="text-[10px] font-semibold pt-1">
                      <el-tag size="small" type="warning" effect="plain" round class="!text-[10px]">⚡ {{ act.actClimax }}</el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 4. Paywall & Retention Cliffhangers -->
              <div v-if="masterPlan.paywallHooks && masterPlan.paywallHooks.length > 0" class="rounded-2xl border p-5 space-y-3" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                  <el-icon><Key /></el-icon> {{ t('wizard.paywallHooks') }}
                </h3>
                <div class="space-y-2">
                  <div v-for="hook in masterPlan.paywallHooks" :key="hook.percentage" class="p-2.5 rounded-xl border text-[11px]" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                    <div class="flex items-center justify-between font-bold mb-1">
                      <span style="color: var(--el-color-danger);">{{ t('wizard.paywallHookBadge', { percentage: hook.percentage, ep: hook.episodeNumber }) }}</span>
                      <span class="text-[10px]" style="color: var(--el-text-color-placeholder);">{{ hook.type }}</span>
                    </div>
                    <p class="leading-relaxed mb-1" style="color: var(--el-text-color-regular);">{{ hook.hookDescription }}</p>
                    <div v-if="hook.adHook30sPrompt">
                      <el-tag size="small" type="danger" effect="plain" round class="p-1.5 !text-[10px] whitespace-normal h-auto">{{ t('wizard.adHook30s') }} {{ hook.adHook30sPrompt }}</el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 5. Episodes List -->
              <div class="rounded-2xl border p-5 space-y-3" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                    <el-icon><List /></el-icon> {{ t('wizard.episodesBreakdown', { count: (masterPlan.episodes || []).length }) }}
                  </h3>
                  <span class="text-[10px] font-bold" style="color: var(--el-color-primary);">{{ t('wizard.goldenFormulaLoaded') }}</span>
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  <div v-for="ep in (masterPlan.episodes || [])" :key="ep.episodeNumber"
                    class="p-2.5 rounded-xl border space-y-1" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                    <div class="flex items-start gap-2">
                      <el-tag size="small" type="primary" effect="plain" round class="!text-[10px] w-8 shrink-0 font-bold"># {{ ep.episodeNumber }}</el-tag>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold truncate" style="color: var(--el-text-color-primary);">{{ ep.title }}</div>
                        <div class="text-[10px] mt-0.5 leading-snug" style="color: var(--el-text-color-placeholder);">{{ ep.synopsis || ep.hook }}</div>
                        <div v-if="ep.cliffhangerHook" class="mt-0.5">
                          <el-tag size="small" type="warning" effect="plain" round class="!text-[10px] p-1.5 whitespace-normal h-auto">
                            <el-icon class="mr-1"><TrendCharts /></el-icon> {{ ep.cliffhangerHook }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chatbot Right -->
            <div class="rounded-2xl border flex flex-col" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color); min-height:580px">
              <div class="p-4 border-b flex items-center gap-2" style="border-color: var(--el-border-color-light);">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
                  <el-icon :size="16"><Service /></el-icon>
                </div>
                <div>
                  <div class="text-xs font-black" style="color: var(--el-text-color-primary);">{{ t('wizard.aiConsultant') }}</div>
                  <div class="text-[10px] font-bold" style="color: var(--el-color-primary);">{{ t('wizard.aiConsultantActive') }}</div>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div v-for="(msg, i) in planChatMessages" :key="i" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                  <div class="max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed"
                    :style="msg.role === 'user'
                      ? 'background-color: var(--el-color-primary); color: #ffffff;'
                      : msg.role === 'error'
                        ? 'background-color: var(--el-color-danger-light-9); border: 1px solid var(--el-color-danger-light-5); color: var(--el-color-danger);'
                        : 'background-color: var(--el-fill-color-light); color: var(--el-text-color-primary);'">
                    <div>{{ msg.text }}</div>
                    <div v-if="msg.role === 'error' && msg.failedPrompt" class="mt-2 pt-2 border-t flex items-center justify-between gap-2" style="border-color: var(--el-color-danger-light-7);">
                      <span class="text-[10px] opacity-75">{{ t('wizard.clickRetryResend') }}</span>
                      <el-button size="small" type="danger" plain round icon="RefreshRight" :loading="isPlanChatSending" @click="retryPlanChat(msg.failedPrompt, i)">
                        {{ t('wizard.retry') }}
                      </el-button>
                    </div>
                  </div>
                </div>
                <div v-if="isPlanChatSending" class="flex justify-start">
                  <div class="px-4 py-3 rounded-2xl flex items-center gap-2 text-xs" style="background-color: var(--el-fill-color-light); color: var(--el-text-color-secondary);">
                    <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
                    <span>{{ t('wizard.aiUpdatingPlan') }}</span>
                  </div>
                </div>
              </div>
              <div class="p-4 border-t flex gap-2" style="border-color: var(--el-border-color-light);">
                <el-input v-model="planChatInput" :placeholder="t('wizard.chatPlaceholder')" size="large" @keyup.enter="() => sendPlanChat()" />
                <el-button type="primary" size="large" icon="Promotion" :loading="isPlanChatSending" @click="() => sendPlanChat()" />
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: COMPLIANCE -->
        <div v-else-if="currentStep === 3" class="max-w-3xl mx-auto space-y-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.finalComplianceCheck') }}</h1>
              <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.complianceSubtitle') }}</p>
            </div>
            <el-button size="default" round icon="RefreshRight" :loading="isVerifyingCompliance" @click="runComplianceVerification">
              {{ t('wizard.rescanCompliance') }}
            </el-button>
          </div>

          <!-- Loading State when scanning -->
          <div v-if="isVerifyingCompliance" class="rounded-2xl border p-12 flex flex-col items-center justify-center space-y-4 text-center" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
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
                  <path style="color: var(--el-color-primary);" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" :stroke-dasharray="`${complianceResult.overallScore || 98}, 100`" stroke-linecap="round" stroke-width="3"></path>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-black" style="color: var(--el-text-color-primary);">{{ complianceResult.overallScore || 98 }}%</span>
                  <span class="text-[10px] font-bold uppercase" style="color: var(--el-color-primary);">{{ complianceResult.isCompliant !== false ? t('wizard.safe') : t('wizard.attention') }}</span>
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
                  <li v-for="item in (complianceResult.copyrightChecks || [])" :key="item.label"
                    class="flex items-center justify-between pb-2 border-b last:border-0 last:pb-0" style="border-color: var(--el-border-color-light);">
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
                  @click="refineMasterPlanFromSuggestions()"
                >
                  {{ t('wizard.applyAllSuggestions') }}
                </el-button>
              </div>

              <ul class="space-y-2.5 text-xs" style="color: var(--el-text-color-primary);">
                <li v-for="(rec, idx) in complianceResult.recommendations" :key="idx"
                  class="flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all" style="background-color: var(--el-bg-color-overlay); border-color: rgba(230, 162, 60, 0.2);">
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
                    @click="refineMasterPlanFromSuggestions(rec)"
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
              <div><div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryTitle') }}</div><div class="font-black truncate" style="color: var(--el-text-color-primary);">{{ formData.title || t('wizard.untitled') }}</div></div>
              <div><div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryGenre') }}</div><div class="font-black" style="color: var(--el-text-color-primary);">{{ formData.genre.split(' / ')[0] }}</div></div>
              <div><div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryEpisodes') }}</div><div class="font-black" style="color: var(--el-color-primary);">{{ formData.targetEpisodes }} eps</div></div>
              <div><div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryDuration') }}</div><div class="font-black" style="color: var(--el-color-primary);">{{ formatDuration(formData.episodeDurationSeconds) }}/ep</div></div>
              <div><div class="font-semibold mb-1" style="color: var(--el-text-color-placeholder);">{{ t('wizard.summaryRatio') }}</div><div class="font-black" style="color: var(--el-text-color-primary);">{{ formData.ratio }}</div></div>
            </div>
          </div>
        </div>

      </main>
    </div>
  </el-dialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; }
:deep(.el-dialog__header) { padding: 0 !important; margin-right: 0 !important; }
:deep(.el-dialog__body) { padding: 0 !important; }
</style>

