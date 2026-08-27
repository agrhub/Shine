<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { WizardFormData, PlanChatMessage } from './types';
import {
  MagicStick,
  Lightning,
  Aim,
  UserFilled,
  Files,
  Key,
  List,
  TrendCharts,
  Service,
  Loading,
  Promotion,
  RefreshRight,
  Picture,
  Film,
} from '@element-plus/icons-vue';
import ChatContentRenderer from '@/pages/projects/workspace/ChatContentRenderer.vue';

const props = defineProps<{
  formData: WizardFormData;
  masterPlan: any;
  isGeneratingPlan: boolean;
  planError: string;
  planChatMessages: PlanChatMessage[];
  isPlanChatSending: boolean;
  dynamicSuggestions?: Array<{ label: string; prompt: string }>;
}>();

const emit = defineEmits<{
  (e: 'generate-plan'): void;
  (e: 'send-chat', msg?: string): void;
  (e: 'retry-chat', failedPrompt: string, idx: number): void;
}>();

const { t } = useI18n();
const chatInput = ref('');
const chatContainerRef = ref<HTMLElement | null>(null);
const activeStudioTab = ref<'storyCore' | 'characters' | 'structure' | 'episodes'>('storyCore');

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
}

watch(
  () => props.planChatMessages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);

function handleSendChat(textToSend?: string) {
  const msg = (typeof textToSend === 'string' ? textToSend : chatInput.value).trim();
  if (!msg || props.isPlanChatSending) return;
  if (!textToSend) chatInput.value = '';
  emit('send-chat', msg);
  scrollToBottom();
}

const fallbackQuickSuggestions = [
  { label: 'wizard.suggestCreateSeries', prompt: 'Create series project from the approved master plan and open workspace.' },
  { label: 'wizard.suggestVerifyCompliance', prompt: 'Verify compliance, platform safety, and copyright for the master plan.' },
  { label: 'wizard.suggestCliffhanger', prompt: 'Add an unpredictable, high-suspense cliffhanger at the end of Episode 1.' },
  { label: 'wizard.suggestVillain', prompt: 'Deepen the psychological motivation and ruthless conflict of the main antagonist.' },
];

const displayedSuggestions = computed(() => {
  if (props.dynamicSuggestions && props.dynamicSuggestions.length > 0) {
    return props.dynamicSuggestions;
  }
  return fallbackQuickSuggestions;
});
</script>

<template>
  <div class="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-4">
    <!-- Top Parameters & Settings Summary Bar -->
    <div
      class="rounded-2xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0"
      style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
          <el-icon :size="18"><Film /></el-icon>
        </div>
        <div class="min-w-0">
          <h2 class="text-sm font-black truncate" style="color: var(--el-text-color-primary);">
            {{ masterPlan?.title || formData.title || formData.selectedTrend?.topic || t('wizard.aiMasterPlan') }}
          </h2>
          <p class="text-[11px] truncate" style="color: var(--el-text-color-secondary);">
            {{ t('wizard.masterPlanReviewDesc', { episodes: masterPlan?.totalEpisodes || formData.targetEpisodes }) }}
          </p>
        </div>
      </div>

      <!-- Live Config Chips -->
      <div class="flex flex-wrap items-center gap-2">
        <el-tag size="small" type="primary" effect="plain" round class="!text-[10px] font-bold">
          🎭 {{ formData.genre || 'Drama' }}
        </el-tag>
        <el-tag size="small" type="success" effect="plain" round class="!text-[10px] font-bold">
          🌐 {{ t('wizard.settingCountry') }} {{ formData.country || 'Global' }}
        </el-tag>
        <el-tag size="small" type="warning" effect="plain" round class="!text-[10px] font-bold">
          🗣️ {{ t('wizard.scriptLanguage') }} {{ formData.language || 'en-US' }}
        </el-tag>
        <el-tag size="small" type="info" effect="plain" round class="!text-[10px] font-bold">
          🎞️ {{ masterPlan?.totalEpisodes || formData.targetEpisodes }} Eps × {{ masterPlan?.totalDurationSeconds || formData.episodeDurationSeconds }}s ({{ formData.ratio || '9:16' }})
        </el-tag>
        <el-tag size="small" effect="plain" round class="!text-[10px] font-bold" style="color: var(--el-color-primary);">
          🎨 {{ formData.visualStyle || 'Realistic' }}
        </el-tag>
      </div>
    </div>

    <!-- Master Plan 2-Column Split Workspace -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">
      <!-- ════════════════ LEFT COLUMN: Master Plan Studio ════════════════ -->
      <div
        class="xl:col-span-7 rounded-2xl border flex flex-col min-h-0 overflow-hidden"
        style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);"
      >
        <!-- Ready To Generate Initial State -->
        <div
          v-if="!masterPlan && !isGeneratingPlan && !planError"
          class="flex-1 flex flex-col items-center justify-center p-8 text-center"
        >
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
            <el-icon :size="28"><MagicStick /></el-icon>
          </div>
          <h3 class="text-xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.readyToGenerate') }}</h3>
          <p class="text-sm mb-6 max-w-md" style="color: var(--el-text-color-secondary);">{{ t('wizard.readyToGenerateDesc', { episodes: formData.targetEpisodes }) }}</p>
          <el-button type="primary" size="large" round icon="Lightning" @click="emit('generate-plan')">
            {{ t('wizard.generateMasterPlan') }}
          </el-button>
        </div>

        <!-- Error State -->
        <div
          v-else-if="!masterPlan && planError"
          class="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3"
        >
          <div class="p-6 rounded-2xl border max-w-md w-full" style="background-color: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-5);">
            <p class="text-sm font-bold mb-4" style="color: var(--el-color-danger);">{{ planError }}</p>
            <el-button type="danger" plain round icon="RefreshRight" @click="emit('generate-plan')">{{ t('wizard.retryGeneration') }}</el-button>
          </div>
        </div>

        <!-- Progressive Skeleton Generating State -->
        <div v-else-if="!masterPlan && isGeneratingPlan" class="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <!-- Skeleton Card 1: Story Core -->
          <div class="rounded-xl border p-4 space-y-3 animate-pulse" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <div class="flex items-center justify-between">
              <div class="h-4 w-28 rounded" style="background-color: var(--el-color-primary-light-8);"></div>
              <span class="text-[10px] font-bold animate-pulse" style="color: var(--el-color-primary);">{{ t('wizard.analyzingGenreDNA') }}</span>
            </div>
            <div class="space-y-2">
              <div class="h-3.5 rounded w-full" style="background-color: var(--el-fill-color);"></div>
              <div class="h-3.5 rounded w-4/5" style="background-color: var(--el-fill-color);"></div>
            </div>
            <div class="h-7 rounded-xl w-full" style="background-color: var(--el-fill-color-darker);"></div>
          </div>

          <!-- Skeleton Card 2: Characters -->
          <div class="rounded-xl border p-4 space-y-3 animate-pulse" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <div class="flex items-center justify-between">
              <div class="h-4 w-36 rounded" style="background-color: var(--el-color-primary-light-8);"></div>
              <span class="text-[10px] font-bold animate-pulse" style="color: var(--el-color-primary);">{{ t('wizard.buildingCharacterArcs') }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="h-16 rounded-xl" style="background-color: var(--el-fill-color);"></div>
              <div class="h-16 rounded-xl" style="background-color: var(--el-fill-color);"></div>
              <div class="h-16 rounded-xl" style="background-color: var(--el-fill-color);"></div>
            </div>
          </div>

          <!-- Skeleton Card 3: Episodes -->
          <div class="rounded-xl border p-4 space-y-3 animate-pulse" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <div class="flex items-center justify-between">
              <div class="h-4 w-32 rounded" style="background-color: var(--el-color-primary-light-8);"></div>
              <span class="text-[10px] font-bold animate-pulse" style="color: var(--el-color-primary);">{{ t('wizard.generatingEpisodeHooks') }}</span>
            </div>
            <div class="space-y-2">
              <div class="h-10 rounded-xl" style="background-color: var(--el-fill-color);"></div>
              <div class="h-10 rounded-xl" style="background-color: var(--el-fill-color);"></div>
              <div class="h-10 rounded-xl" style="background-color: var(--el-fill-color);"></div>
            </div>
          </div>
        </div>

        <!-- Master Plan Loaded View (Clean Studio Sub-Tabs) -->
        <template v-else-if="masterPlan">
          <!-- Studio Tabs Header -->
          <div
            class="px-4 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto shrink-0"
            style="border-color: var(--el-border-color-light); background-color: var(--el-fill-color-blank);"
          >
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                :style="activeStudioTab === 'storyCore'
                  ? 'background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-5);'
                  : 'color: var(--el-text-color-secondary);'"
                @click="activeStudioTab = 'storyCore'"
              >
                <el-icon><Aim /></el-icon>
                <span>{{ t('wizard.tabStoryCore') }}</span>
              </button>

              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                :style="activeStudioTab === 'characters'
                  ? 'background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-5);'
                  : 'color: var(--el-text-color-secondary);'"
                @click="activeStudioTab = 'characters'"
              >
                <el-icon><UserFilled /></el-icon>
                <span>{{ t('wizard.tabCharacters') }} ({{ (masterPlan.characters || []).length }})</span>
              </button>

              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                :style="activeStudioTab === 'structure'
                  ? 'background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-5);'
                  : 'color: var(--el-text-color-secondary);'"
                @click="activeStudioTab = 'structure'"
              >
                <el-icon><Key /></el-icon>
                <span>{{ t('wizard.tabStructure') }}</span>
              </button>

              <button
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                :style="activeStudioTab === 'episodes'
                  ? 'background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-5);'
                  : 'color: var(--el-text-color-secondary);'"
                @click="activeStudioTab = 'episodes'"
              >
                <el-icon><List /></el-icon>
                <span>{{ t('wizard.tabEpisodes') }} ({{ (masterPlan.episodes || []).length }})</span>
              </button>
            </div>
          </div>

          <!-- Studio Tab Body -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            <!-- ─── SUB-TAB 1: Story Core & Psychological Hooks ─── -->
            <div v-if="activeStudioTab === 'storyCore'" class="space-y-4">
              <div class="p-4 rounded-xl border space-y-3" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
                    <el-icon><Aim /></el-icon> {{ t('wizard.storyCore') }}
                  </h4>
                  <el-tag size="small" type="primary" effect="plain" round class="!text-[10px]">
                    {{ masterPlan.genre || formData.genre }}
                  </el-tag>
                </div>
                <p class="text-xs leading-relaxed font-semibold" style="color: var(--el-text-color-primary);">
                  {{ masterPlan.story_core?.core_attraction || masterPlan.storyCore?.coreAttraction || masterPlan.seriesOverview || masterPlan.synopsis }}
                </p>
              </div>

              <!-- Strategic Rule Boundary & Goldfinger -->
              <div v-if="masterPlan.story_core?.gold_finger_rule || masterPlan.storyCore?.goldFingerRule" class="p-3.5 rounded-xl border" style="background-color: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-7);">
                <div class="text-xs font-bold mb-1 flex items-center gap-1" style="color: var(--el-color-danger);">
                  ⚡ {{ t('wizard.keyLeverageRule') }}
                </div>
                <p class="text-xs leading-relaxed" style="color: var(--el-text-color-primary);">
                  {{ masterPlan.story_core?.gold_finger_rule || masterPlan.storyCore?.goldFingerRule }}
                </p>
              </div>

              <!-- Psychological Pleasure Hook -->
              <div v-if="masterPlan.story_core?.psychological_pleasure || masterPlan.storyCore?.psychologicalPleasure" class="p-3.5 rounded-xl border" style="background-color: var(--el-color-success-light-9); border-color: var(--el-color-success-light-7);">
                <div class="text-xs font-bold mb-1 flex items-center gap-1" style="color: var(--el-color-success);">
                  🎯 Catharsis & Psychological Hook:
                </div>
                <p class="text-xs leading-relaxed" style="color: var(--el-text-color-primary);">
                  {{ masterPlan.story_core?.psychological_pleasure || masterPlan.storyCore?.psychologicalPleasure }}
                </p>
              </div>

              <!-- Hidden Character Growth Arc -->
              <div v-if="masterPlan.hidden_line || masterPlan.hiddenLine" class="p-3.5 rounded-xl border" style="background-color: var(--el-color-warning-light-9); border-color: var(--el-color-warning-light-7);">
                <div class="text-xs font-bold mb-1 flex items-center gap-1" style="color: var(--el-color-warning);">
                  🌱 {{ t('wizard.hiddenArcGrowth') }}
                </div>
                <p class="text-xs leading-relaxed" style="color: var(--el-text-color-primary);">
                  {{ masterPlan.hidden_line || masterPlan.hiddenLine }}
                </p>
              </div>

              <!-- Visual Aesthetic Prompt Note -->
              <div v-if="masterPlan.visual_style_prompt || masterPlan.visualStylePrompt || formData.visualStylePrompt" class="p-3.5 rounded-xl border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
                <div class="text-xs font-bold mb-1 flex items-center gap-1" style="color: var(--el-text-color-secondary);">
                  <el-icon><Picture /></el-icon> {{ t('wizard.visualStyleLabel') }}
                </div>
                <p class="text-[11px] font-mono leading-relaxed" style="color: var(--el-text-color-regular);">
                  {{ masterPlan.visual_style_prompt || masterPlan.visualStylePrompt || formData.visualStylePrompt }}
                </p>
              </div>
            </div>

            <!-- ─── SUB-TAB 2: Characters Triangle ─── -->
            <div v-else-if="activeStudioTab === 'characters'" class="space-y-3">
              <div
                v-for="char in (masterPlan.characters || [])"
                :key="char.name"
                class="p-4 rounded-xl border space-y-2.5"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
                      {{ char.name?.[0] || '?' }}
                    </div>
                    <div>
                      <div class="text-xs font-bold flex flex-wrap items-center gap-1.5" style="color: var(--el-text-color-primary);">
                        <span>{{ char.name }}</span>
                        <el-tag
                          size="small"
                          :type="char.role?.toLowerCase() === 'protagonist' ? 'success' : char.role?.toLowerCase() === 'antagonist' ? 'danger' : 'primary'"
                          effect="plain"
                          round
                          class="!text-[10px]"
                        >
                          {{ char.role ? t('wizard.' + char.role.toLowerCase(), char.role) : t('wizard.protagonist') }}
                        </el-tag>
                        <el-tag v-if="char.gender" size="small" effect="plain" round class="!text-[10px]" :type="char.gender === 'female' ? 'warning' : 'info'">
                          {{ char.gender === 'female' ? '♀ ' + t('wizard.female') : char.gender === 'male' ? '♂ ' + t('wizard.male') : t('wizard.neutral') }}
                        </el-tag>
                        <el-tag v-if="char.nationality" size="small" effect="plain" round class="!text-[10px]">
                          🌐 {{ char.nationality }}
                        </el-tag>
                        <el-tag v-if="char.voice_id || char.voiceId" size="small" type="primary" effect="plain" round class="!text-[10px]">
                          🎙️ {{ char.voice_id || char.voiceId }}
                        </el-tag>
                      </div>
                      <div class="text-[10px] font-mono mt-0.5" style="color: var(--el-text-color-placeholder);">
                        {{ char.loraAnchor || 'anchor_lora_' + char.name.toLowerCase().replace(/\s+/g, '_') }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Identity & Bio -->
                <div class="text-xs leading-relaxed font-semibold" style="color: var(--el-text-color-primary);">
                  {{ char.identity || char.bio }}
                </div>

                <!-- Traits -->
                <div v-if="char.traits" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                  <span class="font-bold text-[10px] uppercase tracking-wider" style="color: var(--el-color-primary);">✨ {{ t('wizard.traits') }}:</span> {{ char.traits }}
                </div>

                <!-- Circumstance -->
                <div v-if="char.circumstance" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                  <span class="font-bold text-[10px] uppercase tracking-wider text-amber-500">📍 {{ t('wizard.circumstance') }}:</span> {{ char.circumstance }}
                </div>

                <!-- Action / Goal -->
                <div v-if="char.action" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                  <span class="font-bold text-[10px] uppercase tracking-wider text-sky-400">🎯 {{ t('wizard.action') }}:</span> {{ char.action }}
                </div>

                <!-- Ending / Fate -->
                <div v-if="char.ending" class="text-[11px] leading-relaxed" style="color: var(--el-text-color-regular);">
                  <span class="font-bold text-[10px] uppercase tracking-wider text-emerald-400">🏁 {{ t('wizard.ending') }}:</span> {{ char.ending }}
                </div>
              </div>
            </div>

            <!-- ─── SUB-TAB 3: Three Acts & Paywall Structure ─── -->
            <div v-else-if="activeStudioTab === 'structure'" class="space-y-4">
              <!-- Three Acts Section -->
              <div v-if="(masterPlan.three_acts || masterPlan.threeActs) && (masterPlan.three_acts || masterPlan.threeActs).length > 0" class="space-y-2.5">
                <h4 class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                  <el-icon><Files /></el-icon> {{ t('wizard.threeActStructure') }}
                </h4>
                <div
                  v-for="act in (masterPlan.three_acts || masterPlan.threeActs)"
                  :key="act.act_number || act.actNumber"
                  class="p-3.5 rounded-xl border space-y-1.5"
                  style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
                >
                  <div class="flex items-center justify-between text-xs font-bold" style="color: var(--el-text-color-primary);">
                    <span>{{ t('wizard.actLabel', { number: act.act_number || act.actNumber, name: act.name }) }}</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-md" style="background-color: var(--el-color-primary-light-9); color: var(--el-color-primary);">
                      {{ act.episode_range || act.episodeRange }}
                    </span>
                  </div>
                  <div class="text-[11px] leading-relaxed" style="color: var(--el-text-color-secondary);">{{ act.function }}</div>
                  <div v-if="act.act_climax || act.actClimax" class="text-[11px] font-semibold pt-1">
                    <el-tag size="small" type="warning" effect="plain" round class="!text-[10px]">⚡ {{ act.act_climax || act.actClimax }}</el-tag>
                  </div>
                </div>
              </div>

              <!-- Paywall & Ad Retention Hooks -->
              <div v-if="(masterPlan.paywall_hooks || masterPlan.paywallHooks) && (masterPlan.paywall_hooks || masterPlan.paywallHooks).length > 0" class="space-y-2.5 pt-2">
                <h4 class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-text-color-secondary);">
                  <el-icon><Key /></el-icon> {{ t('wizard.paywallHooks') }}
                </h4>
                <div
                  v-for="hook in (masterPlan.paywall_hooks || masterPlan.paywallHooks)"
                  :key="hook.percentage"
                  class="p-3 rounded-xl border text-[11px] space-y-1.5"
                  style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
                >
                  <div class="flex items-center justify-between font-bold">
                    <span style="color: var(--el-color-danger);">{{ t('wizard.paywallHookBadge', { percentage: hook.percentage, ep: hook.episode_number || hook.episodeNumber }) }}</span>
                    <span class="text-[10px] font-mono" style="color: var(--el-text-color-placeholder);">{{ hook.type }}</span>
                  </div>
                  <p class="leading-relaxed" style="color: var(--el-text-color-regular);">{{ hook.hook_description || hook.hookDescription }}</p>
                  <div v-if="hook.ad_hook_30s_prompt || hook.adHook30sPrompt" class="pt-0.5">
                    <el-tag size="small" type="danger" effect="plain" round class="p-1.5 !text-[10px] whitespace-normal h-auto w-full justify-start">
                      {{ t('wizard.adHook30s') }} {{ hook.ad_hook_30s_prompt || hook.adHook30sPrompt }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── SUB-TAB 4: Episode Blueprint ─── -->
            <div v-else-if="activeStudioTab === 'episodes'" class="space-y-2.5">
              <div
                v-for="ep in (masterPlan.episodes || [])"
                :key="ep.episode_number || ep.episodeNumber"
                class="p-3 rounded-xl border space-y-1.5 transition-all hover:border-[var(--el-color-primary)]"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <div class="flex items-start gap-2.5">
                  <el-tag size="small" type="primary" effect="plain" round class="!text-[10px] w-8 shrink-0 font-bold text-center">
                    # {{ ep.episode_number || ep.episodeNumber }}
                  </el-tag>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold truncate" style="color: var(--el-text-color-primary);">{{ ep.title }}</div>
                    <div class="text-[11px] mt-0.5 leading-snug" style="color: var(--el-text-color-secondary);">{{ ep.synopsis || ep.hook }}</div>
                    <div v-if="ep.cliffhanger_hook || ep.cliffhangerHook" class="mt-1">
                      <el-tag size="small" type="warning" effect="plain" round class="!text-[10px] p-1.5 whitespace-normal h-auto w-full justify-start">
                        <el-icon class="mr-1"><TrendCharts /></el-icon> {{ ep.cliffhanger_hook || ep.cliffhangerHook }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ════════════════ RIGHT COLUMN: AI Script Consultant Copilot ════════════════ -->
      <div
        class="xl:col-span-5 rounded-2xl border flex flex-col min-h-0 overflow-hidden"
        style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);"
      >
        <!-- Copilot Header -->
        <div class="p-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--el-border-color-light);">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
              <el-icon :size="16"><Service /></el-icon>
            </div>
            <div>
              <div class="text-xs font-black" style="color: var(--el-text-color-primary);">{{ t('wizard.aiConsultant') }}</div>
              <div class="text-[10px] font-bold flex items-center gap-1" style="color: var(--el-color-primary);">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{{ isPlanChatSending || isGeneratingPlan ? t('wizard.aiUpdatingPlan') : t('wizard.aiConsultantActive') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Messages Container -->
        <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
          <div v-for="(msg, i) in planChatMessages" :key="i" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <!-- USER MESSAGE -->
            <div
              v-if="msg.role === 'user'"
              class="max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed border shadow-sm"
              style="background-color: var(--el-fill-color-darker); border-color: var(--el-border-color); border-left: 3px solid var(--el-color-primary); color: var(--el-text-color-primary);"
            >
              <ChatContentRenderer :content="msg.text" />
            </div>

            <!-- ASSISTANT MESSAGE -->
            <div
              v-else
              class="max-w-[95%] w-full space-y-2"
            >
              <!-- Thinking / Reasoning Card -->
              <div
                v-if="msg.thinking"
                class="p-3 rounded-xl border flex items-center gap-3 transition-all"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <div class="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
                  <el-icon class="is-loading" :size="13"><Loading /></el-icon>
                </div>
                <div class="min-w-0">
                  <div class="text-[11px] font-black uppercase tracking-wider flex items-center gap-1" style="color: var(--el-color-primary);">
                    <span>🧠 {{ t('wizard.aiThinking') }}</span>
                  </div>
                  <div class="text-[11px] font-medium mt-0.5 animate-pulse truncate" style="color: var(--el-text-color-secondary);">
                    {{ msg.thinking }}
                  </div>
                </div>
              </div>

              <!-- Message Content Body -->
              <div
                v-if="msg.text"
                class="px-4 py-3.5 rounded-2xl text-xs leading-relaxed border shadow-sm"
                :style="msg.role === 'error'
                  ? 'background-color: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-5); color: var(--el-color-danger);'
                  : 'background-color: var(--el-fill-color-blank); border-color: var(--el-border-color-light); color: var(--el-text-color-primary);'"
              >
                <ChatContentRenderer :content="msg.text" />

                <!-- Retry Button for Failed Adjustments -->
                <div v-if="msg.role === 'error' && msg.failedPrompt" class="mt-2 pt-2 border-t flex items-center justify-between gap-2" style="border-color: var(--el-color-danger-light-7);">
                  <span class="text-[10px] opacity-75">{{ t('wizard.clickRetryResend') }}</span>
                  <el-button
                    size="small"
                    type="danger"
                    plain
                    round
                    icon="RefreshRight"
                    :loading="isPlanChatSending"
                    @click="emit('retry-chat', msg.failedPrompt, i)"
                  >
                    {{ t('wizard.retry') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pulsing Live AI Indicator -->
          <div v-if="isPlanChatSending && !planChatMessages.some(m => m.thinking)" class="flex justify-start">
            <div class="px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs" style="background-color: var(--el-fill-color-light); color: var(--el-text-color-secondary);">
              <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
              <span>{{ t('wizard.aiUpdatingPlan') }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Refinement Chips -->
        <div
          v-if="masterPlan && !isPlanChatSending"
          class="px-3 py-2 border-t flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar"
          style="border-color: var(--el-border-color-light); background-color: var(--el-fill-color-blank);"
        >
          <button
            v-for="(sug, idx) in displayedSuggestions"
            :key="idx"
            type="button"
            class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border shrink-0 hover:border-[var(--el-color-primary)] hover:text-[var(--el-color-primary)] shadow-sm flex items-center gap-1"
            style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light); color: var(--el-text-color-regular);"
            @click="handleSendChat(sug.prompt)"
          >
            <span>{{ sug.label.startsWith('wizard.') ? t(sug.label) : sug.label }}</span>
          </button>
        </div>

        <!-- Sticky Chat Input Footer -->
        <div class="p-3 border-t flex gap-2 shrink-0" style="border-color: var(--el-border-color-light);">
          <el-input
            v-model="chatInput"
            :placeholder="t('wizard.chatPlaceholder')"
            size="large"
            @keyup.enter="handleSendChat()"
          />
          <el-button
            type="primary"
            size="large"
            icon="Promotion"
            :loading="isPlanChatSending"
            @click="handleSendChat()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
