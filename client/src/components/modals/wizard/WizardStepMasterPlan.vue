<script setup lang="ts">
import { ref } from 'vue';
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
} from '@element-plus/icons-vue';

const props = defineProps<{
  formData: WizardFormData;
  masterPlan: any;
  isGeneratingPlan: boolean;
  planError: string;
  planChatMessages: PlanChatMessage[];
  isPlanChatSending: boolean;
}>();

const emit = defineEmits<{
  (e: 'generate-plan'): void;
  (e: 'send-chat', msg?: string): void;
  (e: 'retry-chat', failedPrompt: string, idx: number): void;
}>();

const { t } = useI18n();
const chatInput = ref('');

function handleSendChat() {
  const msg = chatInput.value.trim();
  if (!msg || props.isPlanChatSending) return;
  chatInput.value = '';
  emit('send-chat', msg);
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div>
      <h1 class="text-4xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.aiMasterPlan') }}</h1>
      <p class="text-sm" style="color: var(--el-text-color-secondary);">{{ t('wizard.masterPlanReviewDesc', { episodes: formData.targetEpisodes }) }}</p>
    </div>

    <!-- Ready To Generate State -->
    <div
      v-if="!masterPlan && !isGeneratingPlan"
      class="text-center py-16 border-2 border-dashed rounded-2xl"
      style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);"
    >
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
        <el-icon :size="28"><MagicStick /></el-icon>
      </div>
      <h3 class="text-xl font-black mb-2" style="color: var(--el-text-color-primary);">{{ t('wizard.readyToGenerate') }}</h3>
      <p class="text-sm mb-6" style="color: var(--el-text-color-secondary);">{{ t('wizard.readyToGenerateDesc', { episodes: formData.targetEpisodes }) }}</p>
      <el-button type="primary" size="large" round icon="Lightning" @click="emit('generate-plan')">
        {{ t('wizard.generateMasterPlan') }}
      </el-button>
    </div>

    <!-- Generating Plan State -->
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

    <!-- Error State -->
    <div
      v-else-if="planError"
      class="p-5 rounded-xl text-center space-y-3"
      style="background-color: var(--el-color-danger-light-9); border: 1px solid var(--el-color-danger-light-5);"
    >
      <p class="text-sm" style="color: var(--el-color-danger);">{{ planError }}</p>
      <el-button type="danger" plain round @click="emit('generate-plan')">{{ t('wizard.retryGeneration') }}</el-button>
    </div>

    <!-- Master Plan Loaded View -->
    <div v-else-if="masterPlan" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- Plan Overview Left Column -->
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
            <el-tag type="danger" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start">
              <span class="font-bold">⚡ {{ t('wizard.keyLeverageRule') }}</span> {{ masterPlan.storyCore.goldFingerRule }}
            </el-tag>
          </div>
          <div v-if="masterPlan.storyCore?.psychologicalPleasure">
            <el-tag type="success" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start">
              <span class="font-bold">⚡ </span> {{ masterPlan.storyCore.psychologicalPleasure }}
            </el-tag>
          </div>
          <div v-if="masterPlan.hiddenLine">
            <el-tag type="warning" size="small" effect="plain" class="p-2.5 rounded-xl h-auto whitespace-normal w-full justify-start">
              <span class="font-bold">🌱 {{ t('wizard.hiddenArcGrowth') }}</span> {{ masterPlan.hiddenLine }}
            </el-tag>
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
            <div
              v-for="char in (masterPlan.characters || [])"
              :key="char.name"
              class="p-3.5 rounded-xl border space-y-2.5"
              style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
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

              <!-- Circumstance -->
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
            <div
              v-for="act in masterPlan.threeActs"
              :key="act.actNumber"
              class="p-3 rounded-xl border space-y-1"
              style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
            >
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
            <div
              v-for="hook in masterPlan.paywallHooks"
              :key="hook.percentage"
              class="p-2.5 rounded-xl border text-[11px]"
              style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
            >
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
            <div
              v-for="ep in (masterPlan.episodes || [])"
              :key="ep.episodeNumber"
              class="p-2.5 rounded-xl border space-y-1"
              style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
            >
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

      <!-- Chatbot Right Column -->
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
            <div
              class="max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed"
              :style="msg.role === 'user'
                ? 'background-color: var(--el-color-primary); color: #ffffff;'
                : msg.role === 'error'
                  ? 'background-color: var(--el-color-danger-light-9); border: 1px solid var(--el-color-danger-light-5); color: var(--el-color-danger);'
                  : 'background-color: var(--el-fill-color-light); color: var(--el-text-color-primary);'"
            >
              <div>{{ msg.text }}</div>
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
          <div v-if="isPlanChatSending" class="flex justify-start">
            <div class="px-4 py-3 rounded-2xl flex items-center gap-2 text-xs" style="background-color: var(--el-fill-color-light); color: var(--el-text-color-secondary);">
              <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
              <span>{{ t('wizard.aiUpdatingPlan') }}</span>
            </div>
          </div>
        </div>
        <div class="p-4 border-t flex gap-2" style="border-color: var(--el-border-color-light);">
          <el-input v-model="chatInput" :placeholder="t('wizard.chatPlaceholder')" size="large" @keyup.enter="handleSendChat" />
          <el-button type="primary" size="large" icon="Promotion" :loading="isPlanChatSending" @click="handleSendChat" />
        </div>
      </div>
    </div>
  </div>
</template>
