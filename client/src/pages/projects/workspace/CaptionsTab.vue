<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { toast } from 'vue-sonner';

const emit = defineEmits<{
  (e: 'apply-captions'): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();

const selectedCaptionStyle = ref<'pop' | 'minimal' | 'comic'>('pop');
const captionTextColor = ref('#FFFFFF');
const captionFontSize = ref(42);
const captionVerticalPos = ref(80);
const captionOutlineWeight = ref(3);
const aiHighlightAnimate = ref(true);
const targetLanguage = ref('English (US)');

// Language track state
const LANG_OPTIONS = [
  { code: 'vi-VN', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
];
const activeCapLang = ref('en-US');
const translateSourceLang = ref('vi-VN'); // source lang for "Translate from X" flow

const scenes = computed(() => seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || []);
const b6Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b6'));

// Caption state per-scene — tracks whether captions are synced
const captionSyncStatus = ref<Map<number, 'idle' | 'synced'>>(new Map());

function getCaptionStatus(sceneIndex: number) {
  return captionSyncStatus.value.get(sceneIndex) || 'idle';
}

const styleOptions = [
  { value: 'pop', label: t('workspace.captionStylePop') },
  { value: 'minimal', label: t('workspace.captionStyleMinimal') },
  { value: 'comic', label: t('workspace.captionStyleComic') },
];

function applyAllCaptions() {
  pipelineStore.setStepStatus('b6', 'running');
  // Mark all scenes as synced
  scenes.value.forEach(scene => {
    captionSyncStatus.value.set(scene.index, 'synced');
  });
  setTimeout(() => {
    pipelineStore.setStepStatus('b6', 'done');
  }, 500);
}

// Get cues for active language + scene
function getSceneCues(sceneIndex: number) {
  const epId = seriesStore.activeEpisodeId;
  if (!epId) return [];
  const tracks = seriesStore.getLanguageTracks(epId);
  return tracks.find(t => t.languageCode === activeCapLang.value)?.sceneCaptions[sceneIndex] || [];
}

function hasCaptions(sceneIndex: number) {
  return getSceneCues(sceneIndex).length > 0;
}

async function generateCaptions() {
  try {
    toast.info(`Generating captions · ${activeCapLang.value}`);
    await pipelineStore.generateCaptionsForLanguage(activeCapLang.value);
    emit('apply-captions');
    toast.success(t('toast.b6CaptionsSynced'));
  } catch {
    toast.error('Caption generation failed');
  }
}

async function translateCaptions() {
  try {
    toast.info(`Translating from ${translateSourceLang.value} → ${activeCapLang.value}`);
    await pipelineStore.generateCaptionsForLanguage(activeCapLang.value, translateSourceLang.value);
    emit('apply-captions');
    toast.success(`Captions translated to ${activeCapLang.value}`);
  } catch {
    toast.error('Caption translation failed');
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- Language Track Selector + Actions -->
    <div class="border rounded-2xl p-3 shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">🌐 Caption Language</h3>
        <el-tag v-if="b6Step" :type="b6Step.status === 'done' ? 'success' : b6Step.status === 'running' ? 'warning' : 'info'" size="small" effect="plain" round>
          B6: {{ b6Step.status }}
        </el-tag>
      </div>
      <!-- Language tabs -->
      <div class="flex flex-wrap gap-1.5 mb-3">
        <el-tag
          v-for="lang in LANG_OPTIONS"
          :key="lang.code"
          size="small"
          :effect="activeCapLang === lang.code ? 'dark' : 'plain'"
          :type="activeCapLang === lang.code ? 'primary' : 'info'"
          class="cursor-pointer select-none"
          @click="activeCapLang = lang.code"
        >
          {{ lang.flag }} {{ lang.label }}
        </el-tag>
      </div>
      <!-- Actions row -->
      <div class="flex gap-2">
        <el-button size="small" type="primary" icon="ChatSquare" class="flex-1" @click="generateCaptions">
          Generate · {{ LANG_OPTIONS.find(l => l.code === activeCapLang)?.label }}
        </el-button>
        <el-popover trigger="hover" placement="top" width="200">
          <template #reference>
            <el-button size="small" type="info" plain icon="Sort" @click="translateCaptions">
              Translate from…
            </el-button>
          </template>
          <div class="flex flex-col gap-1.5 p-1">
            <p class="text-[10px] font-bold uppercase mb-1" style="color: var(--el-text-color-secondary);">Source language</p>
            <el-tag
              v-for="lang in LANG_OPTIONS.filter(l => l.code !== activeCapLang)"
              :key="lang.code"
              size="small"
              :effect="translateSourceLang === lang.code ? 'dark' : 'plain'"
              :type="translateSourceLang === lang.code ? 'success' : 'info'"
              class="cursor-pointer"
              @click="translateSourceLang = lang.code"
            >
              {{ lang.flag }} {{ lang.label }}
            </el-tag>
          </div>
        </el-popover>
      </div>
    </div>

    <!-- Caption Tracks Per Scene -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.captionPerVoiceover') }}
        </h3>
      </div>

      <div class="space-y-3">
        <div
          v-for="scene in scenes"
          :key="`cap_${scene.index}`"
          class="rounded-xl border overflow-hidden"
          style="border-color: var(--el-border-color-light); background-color: var(--el-fill-color-light);"
        >
          <!-- Scene Header -->
          <div class="p-2.5 flex justify-between items-center border-b" style="border-color: var(--el-border-color-lighter);">
            <span class="text-[10px] font-bold uppercase" style="color: var(--el-color-primary);">
              {{ t('workspace.sceneAbbr') }} {{ String(scene.index).padStart(2, '0') }} — {{ scene.heading || scene.location }}
            </span>
            <el-tag
              :type="hasCaptions(scene.index) ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ hasCaptions(scene.index) ? `✓ ${getSceneCues(scene.index).length} cues` : t('workspace.captionPending') }}
            </el-tag>
          </div>

          <!-- Caption cues (if generated) -->
          <div v-if="hasCaptions(scene.index)" class="p-3 space-y-1">
            <div
              v-for="(cue, cIdx) in getSceneCues(scene.index).slice(0, 4)"
              :key="cIdx"
              class="p-1.5 rounded-lg border flex items-center gap-2 text-[10px]"
              style="background-color: var(--el-fill-color); border-color: var(--el-border-color-lighter);"
            >
              <span class="shrink-0 font-mono" style="color: var(--el-text-color-secondary);">{{ cue.startMs }}ms</span>
              <span class="flex-1 truncate" style="color: var(--el-text-color-primary);">{{ cue.text }}</span>
            </div>
            <div v-if="getSceneCues(scene.index).length > 4" class="text-[9px] text-center" style="color: var(--el-text-color-placeholder);">
              + {{ getSceneCues(scene.index).length - 4 }} more cues…
            </div>
          </div>

          <!-- Fallback: show dialogue when no cues yet -->
          <div v-else-if="scene.dialogue && scene.dialogue.length" class="p-3 space-y-2">
            <div
              v-for="(dlg, dIdx) in scene.dialogue"
              :key="dIdx"
              class="p-2 rounded-lg border flex items-start gap-2"
              style="background-color: var(--el-fill-color); border-color: var(--el-border-color-lighter);"
            >
              <div class="flex-1 min-w-0">
                <span class="text-[9px] font-bold block" style="color: var(--el-color-primary);">{{ dlg.character }}</span>
                <p class="text-[11px] leading-snug mt-0.5" style="color: var(--el-text-color-primary);">{{ dlg.line }}</p>
              </div>
              <el-tag size="small" effect="plain" type="info" class="!text-[9px] shrink-0">
                {{ dIdx + 1 }}/{{ scene.dialogue.length }}
              </el-tag>
            </div>
          </div>
          <div v-else class="p-3 text-xs text-center" style="color: var(--el-text-color-placeholder);">
            No dialogue in this scene
          </div>
        </div>

        <div v-if="scenes.length === 0" class="p-4 text-center text-xs rounded-xl border border-dashed" style="color: var(--el-text-color-placeholder); border-color: var(--el-border-color);">
          Load a script to manage caption tracks.
        </div>
      </div>
    </div>

    <!-- Style Presets -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--el-text-color-secondary);">
        {{ t('workspace.captionStylePresets') }}
      </h3>
      <el-segmented
        v-model="selectedCaptionStyle"
        :options="styleOptions"
        block
      />
    </div>

    <!-- Design Customization -->
    <div class="p-4 rounded-2xl border shadow-soft space-y-4" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
        {{ t('workspace.designCustomization') }}
      </h3>

      <!-- Font Size -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
          <span>{{ t('workspace.captionFontSize') }}</span>
          <span style="color: var(--el-color-primary);">{{ captionFontSize }}px</span>
        </div>
        <el-slider v-model="captionFontSize" :min="24" :max="80" size="small" />
      </div>

      <!-- Vertical Position -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
          <span>{{ t('workspace.captionVerticalPos') }}</span>
          <span style="color: var(--el-color-primary);">{{ captionVerticalPos }}%</span>
        </div>
        <el-slider v-model="captionVerticalPos" :min="20" :max="95" size="small" />
      </div>

      <!-- Outline Weight -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
          <span>{{ t('workspace.captionOutlineWeight') }}</span>
          <span style="color: var(--el-color-primary);">{{ captionOutlineWeight }}px</span>
        </div>
        <el-slider v-model="captionOutlineWeight" :min="0" :max="8" size="small" />
      </div>

      <!-- Text Color -->
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">{{ t('workspace.captionTextColor') }}</span>
        <el-color-picker v-model="captionTextColor" size="small" />
      </div>
    </div>

    <!-- Smart Features -->
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
        {{ t('workspace.smartFeatures') }}
      </h3>

      <div class="p-3.5 rounded-xl border flex items-center justify-between" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <div>
          <p class="text-xs font-semibold" style="color: var(--el-text-color-primary);">{{ t('workspace.aiHighlightAnimate') }}</p>
          <p class="text-[10px]" style="color: var(--el-text-color-secondary);">{{ t('workspace.autoHighlightKeywords') }}</p>
        </div>
        <el-switch v-model="aiHighlightAnimate" size="small" />
      </div>

      <div class="space-y-2">
        <label class="text-[11px] font-semibold" style="color: var(--el-text-color-secondary);">{{ t('workspace.targetLanguage') }}</label>
        <el-select v-model="targetLanguage" size="small" class="w-full">
          <el-option label="English (US)" value="English (US)" />
          <el-option label="Vietnamese" value="Vietnamese" />
          <el-option label="Chinese (Simplified)" value="Chinese (Simplified)" />
          <el-option label="Japanese" value="Japanese" />
          <el-option label="Spanish" value="Spanish" />
          <el-option label="French" value="French" />
        </el-select>
      </div>
    </div>

    <!-- Apply to Timeline Button -->
    <el-button
      type="primary"
      round
      class="!w-full !font-bold !py-3.5"
      icon="ChatSquare"
      :loading="b6Step?.status === 'running'"
      @click="applyAllCaptions"
    >
      {{ t('workspace.applyToTimeline') }}
    </el-button>
  </div>
</template>
