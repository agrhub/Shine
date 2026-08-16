<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { toast } from 'vue-sonner';

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();

onMounted(() => {
  pipelineStore.fetchVoicePresets();
});

// Voice global settings
const selectedVoicePreset = ref('Puck');
const voiceIntensity = ref(85);
const voicePacing = ref(1.1);
const autoDucking = ref(true);
const sceneScorePrompt = ref('');

const characters = computed(() => seriesStore.charactersList);
const scenes = computed(() => seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || []);

const b4Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b4'));
const b5Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b5'));

// Language track state
const LANG_OPTIONS = [
  { code: 'vi-VN', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
];
const activeVoiceLang = ref('en-US');

function getRenderedLangs(sceneIndex: number): string[] {
  const epId = seriesStore.activeEpisodeId;
  if (!epId) return [];
  const tracks = seriesStore.getLanguageTracks(epId);
  return tracks
    .filter(t => !!t.sceneVoiceovers[sceneIndex])
    .map(t => LANG_OPTIONS.find(l => l.code === t.languageCode)?.flag || t.languageCode);
}

function getSceneStatus(sceneIndex: number) {
  return pipelineStore.getSceneStatus(sceneIndex);
}

async function renderSceneVoiceover(scene: any) {
  if (!scene.dialogue || scene.dialogue.length === 0) {
    toast.warning(t('toast.noDialogueInScene'));
    return;
  }
  try {
    toast.info(t('toast.renderingVoiceoverScene'));
    const firstSpeakerName = scene.dialogue[0]?.character;
    const matchedChar = characters.value.find(c => c.name.toLowerCase() === (firstSpeakerName || '').toLowerCase());
    const voiceToUse = matchedChar?.voiceId || selectedVoicePreset.value;

    await pipelineStore.renderSceneVoiceover(
      scene.index,
      scene.dialogue,
      voiceToUse,
      voiceIntensity.value,
      voicePacing.value,
      activeVoiceLang.value,  // pass selected language track
    );
    toast.success(t('toast.voiceoverQueued'));
  } catch {
    toast.error(t('toast.voiceoverRenderFailed'));
  }
}

async function renderAllVoiceovers() {
  try {
    toast.info('Rendering all voiceovers for ' + activeVoiceLang.value);
    await pipelineStore.renderAllVoiceovers(
      selectedVoicePreset.value,
      voiceIntensity.value,
      voicePacing.value,
      activeVoiceLang.value,
    );
    toast.success(t('toast.b4TtsSynced'));
  } catch {
    toast.error('Batch voiceover render failed');
  }
}

async function renderSceneBgm(scene: any) {
  try {
    toast.info(t('toast.renderingBgmScene'));
    await pipelineStore.renderSceneBgm(
      scene.index,
      scene.bgmMood || 'dramatic cinematic suspense',
      scene.durationSeconds || 15
    );
    toast.success(t('toast.bgmQueued'));
  } catch {
    toast.error(t('toast.bgmRenderFailed'));
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Vocal Performance Section -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold tracking-wider uppercase" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.vocalPerformance') }}
        </h2>
      </div>

      <!-- Dynamic Character Voice Cards from Store -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="char in characters"
          :key="char.id"
          class="p-3 rounded-xl border flex flex-col gap-2"
          style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
        >
          <div class="flex items-center gap-2">
            <el-avatar
              v-if="char.avatarUrl"
              :src="char.avatarUrl"
              :size="24"
              class="rounded-full object-cover"
            />
            <el-avatar
              v-else
              :size="24"
              style="background-color: var(--el-fill-color-dark);"
            >
              <el-icon :size="12"><User /></el-icon>
            </el-avatar>
            <span class="text-xs font-bold truncate" style="color: var(--el-text-color-primary);">{{ char.name }}</span>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <el-tag size="small" type="success" effect="plain" class="!text-[9px] !font-bold !rounded-md w-fit">
              🎙 {{ char.voiceId || 'Puck' }}
            </el-tag>
            <el-tag v-if="char.gender" size="small" effect="plain" class="!text-[9px] !rounded-md w-fit">
              {{ char.gender === 'female' ? `♀ ${t('workspace.female')}` : char.gender === 'male' ? `♂ ${t('workspace.male')}` : t('workspace.neutral') }}
            </el-tag>
          </div>
        </div>

        <div v-if="characters.length === 0" class="col-span-2 p-4 text-center text-xs rounded-xl border border-dashed" style="color: var(--el-text-color-placeholder); border-color: var(--el-border-color);">
          No characters loaded for this series.
        </div>
      </div>
    </div>

    <!-- Dubbing Engine Card -->
    <div class="border rounded-2xl p-4 shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <div class="flex items-center gap-2 mb-4" style="color: var(--el-color-primary);">
        <el-icon :size="14"><Microphone /></el-icon>
        <h3 class="text-xs font-bold uppercase tracking-wider">{{ t('workspace.dubbingEngine') }}</h3>
      </div>
      <div class="space-y-4">
        <!-- Default Voice Preset from Store -->
        <div class="space-y-1.5">
          <label class="block text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
            {{ t('workspace.selectVoice') }}
          </label>
          <div class="flex gap-2">
            <el-select v-model="selectedVoicePreset" size="small" class="flex-1" filterable>
              <el-option
                v-for="voice in pipelineStore.voicePresets"
                :key="voice.id"
                :value="voice.id"
                :label="`${voice.name} (${voice.gender})`"
              >
                <div class="flex justify-between items-center w-full">
                  <span>{{ voice.name }}</span>
                  <span class="text-[10px]" style="color: var(--el-text-color-placeholder);">{{ voice.description || voice.gender }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
        </div>

        <!-- Intensity -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
            <span>{{ t('workspace.intensity') }}</span>
            <span style="color: var(--el-color-primary);">{{ voiceIntensity }}%</span>
          </div>
          <el-slider v-model="voiceIntensity" :min="0" :max="100" size="small" />
        </div>
        <!-- Pacing -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-[10px] font-bold uppercase" style="color: var(--el-text-color-secondary);">
            <span>{{ t('workspace.pitch') }}</span>
            <span style="color: var(--el-color-primary);">{{ voicePacing }}x</span>
          </div>
          <el-slider v-model="voicePacing" :min="0.5" :max="2" :step="0.1" size="small" />
        </div>
      </div>
    </div>

    <!-- Language Track Selector -->
    <div class="border rounded-2xl p-3 shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">🌐 Language Track</h3>
        <el-tag size="small" effect="plain" type="info" round>{{ LANG_OPTIONS.find(l => l.code === activeVoiceLang)?.flag }} {{ activeVoiceLang }}</el-tag>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <el-tag
          v-for="lang in LANG_OPTIONS"
          :key="lang.code"
          size="small"
          :effect="activeVoiceLang === lang.code ? 'dark' : 'plain'"
          :type="activeVoiceLang === lang.code ? 'primary' : 'info'"
          class="cursor-pointer select-none"
          @click="activeVoiceLang = lang.code"
        >
          {{ lang.flag }} {{ lang.label }}
        </el-tag>
      </div>
      <el-button
        size="small" type="primary" plain class="w-full mt-2" icon="Microphone"
        @click="renderAllVoiceovers"
      >
        Render All Voiceovers · {{ LANG_OPTIONS.find(l => l.code === activeVoiceLang)?.label }}
      </el-button>
    </div>

    <!-- Scene Voiceovers Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.voiceoverPerScene') }}
        </h3>
        <!-- Pipeline B4 sync -->
        <el-tag
          v-if="b4Step"
          :type="b4Step.status === 'done' ? 'success' : b4Step.status === 'running' ? 'warning' : b4Step.status === 'error' ? 'danger' : 'info'"
          size="small"
          effect="plain"
          round
        >
          B4: {{ b4Step.status }}
        </el-tag>
      </div>

      <div class="space-y-3">
        <div
          v-for="scene in scenes"
          :key="`vo_${scene.index}`"
          class="rounded-xl border overflow-hidden"
          style="border-color: var(--el-border-color-light); background-color: var(--el-fill-color-light);"
        >
          <!-- Scene Header -->
          <div class="p-2.5 flex justify-between items-center border-b" style="border-color: var(--el-border-color-lighter);">
            <span class="text-[10px] font-bold uppercase" style="color: var(--el-color-primary);">
              {{ t('workspace.sceneAbbr') }} {{ String(scene.index).padStart(2, '0') }} — {{ scene.heading || scene.location }}
            </span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Language badges: flags for each lang already rendered -->
              <span
                v-for="flag in getRenderedLangs(scene.index)"
                :key="flag"
                class="text-sm" title="Voiceover rendered"
              >{{ flag }}</span>
              <el-tag
                :type="getSceneStatus(scene.index).voiceoverStatus === 'done' ? 'success' : getSceneStatus(scene.index).voiceoverStatus === 'running' ? 'warning' : 'info'"
                size="small"
                effect="plain"
              >
                <el-icon v-if="getSceneStatus(scene.index).voiceoverStatus === 'running'" class="is-loading"><Loading /></el-icon>
                {{ getSceneStatus(scene.index).voiceoverStatus }}
              </el-tag>
              <el-button
                size="small"
                round
                icon="Microphone"
                type="primary"
                plain
                :loading="getSceneStatus(scene.index).voiceoverStatus === 'running'"
                @click="renderSceneVoiceover(scene)"
              >
                {{ LANG_OPTIONS.find(l => l.code === activeVoiceLang)?.flag }} Render
              </el-button>
            </div>
          </div>

          <!-- Dialogue Preview -->
          <div v-if="scene.dialogue && scene.dialogue.length" class="p-2.5 space-y-1">
            <div
              v-for="(dlg, dIdx) in scene.dialogue.slice(0, 3)"
              :key="dIdx"
              class="flex items-start gap-2 text-[10px]"
            >
              <span class="font-bold shrink-0" style="color: var(--el-color-primary);">{{ dlg.character }}:</span>
              <span class="truncate" style="color: var(--el-text-color-secondary);">{{ dlg.line }}</span>
            </div>
            <div v-if="scene.dialogue.length > 3" class="text-[9px]" style="color: var(--el-text-color-placeholder);">
              + {{ scene.dialogue.length - 3 }} more lines...
            </div>
          </div>

          <!-- Voiceover audio player (if rendered) -->
          <div v-if="getSceneStatus(scene.index).voiceoverUrl" class="px-3 pb-3">
            <audio
              controls
              :src="getSceneStatus(scene.index).voiceoverUrl"
              class="w-full"
              style="height: 28px;"
            />
          </div>
        </div>

        <div v-if="scenes.length === 0" class="p-4 text-center text-xs rounded-xl border border-dashed" style="color: var(--el-text-color-placeholder); border-color: var(--el-border-color);">
          Load a script to see scene voiceovers.
        </div>
      </div>
    </div>

    <!-- Scene BGM Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.bgmPerScene') }}
        </h3>
        <!-- Pipeline B5 sync -->
        <el-tag
          v-if="b5Step"
          :type="b5Step.status === 'done' ? 'success' : b5Step.status === 'running' ? 'warning' : b5Step.status === 'error' ? 'danger' : 'info'"
          size="small"
          effect="plain"
          round
        >
          B5: {{ b5Step.status }}
        </el-tag>
      </div>

      <div class="space-y-2">
        <div
          v-for="scene in scenes"
          :key="`bgm_${scene.index}`"
          class="p-3 rounded-xl border flex items-center gap-3"
          style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
        >
          <el-icon style="color: var(--el-text-color-secondary);"><Headset /></el-icon>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold" style="color: var(--el-text-color-primary);">{{ t('workspace.sceneAbbr') }} {{ String(scene.index).padStart(2, '0') }}</p>
            <p class="text-[9px] truncate" style="color: var(--el-text-color-secondary);">{{ scene.bgmMood || 'No BGM mood set' }}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <el-tag
              :type="getSceneStatus(scene.index).bgmStatus === 'done' ? 'success' : getSceneStatus(scene.index).bgmStatus === 'running' ? 'warning' : 'info'"
              size="small"
              effect="plain"
            >
              <el-icon v-if="getSceneStatus(scene.index).bgmStatus === 'running'" class="is-loading"><Loading /></el-icon>
              {{ getSceneStatus(scene.index).bgmStatus }}
            </el-tag>
            <el-button
              size="small"
              round
              icon="Headset"
              :loading="getSceneStatus(scene.index).bgmStatus === 'running'"
              @click="renderSceneBgm(scene)"
            >
              {{ t('workspace.renderBgm') }}
            </el-button>
          </div>
        </div>

        <div v-if="scenes.length === 0" class="p-4 text-center text-xs rounded-xl border border-dashed" style="color: var(--el-text-color-placeholder); border-color: var(--el-border-color);">
          Load a script to configure scene BGM.
        </div>
      </div>
    </div>

    <!-- AI Music & Ambience Generator -->
    <div class="flex flex-col gap-4">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
        {{ t('workspace.aiMusicAmbience') }}
      </h3>
      <el-input v-model="sceneScorePrompt" :placeholder="t('workspace.sceneScorePlaceholder')" size="large" class="!rounded-xl">
        <template #suffix>
          <el-button link type="primary" icon="MagicStick" @click="toast.info(t('toast.generatingAiScore'))" />
        </template>
      </el-input>

      <!-- Auto-Ducking -->
      <div class="p-3.5 rounded-xl border flex items-center justify-between" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <div class="flex items-center gap-3">
          <el-icon style="color: var(--el-text-color-secondary);"><Headset /></el-icon>
          <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">{{ t('workspace.autoDucking') }}</span>
        </div>
        <el-switch v-model="autoDucking" size="small" />
      </div>
    </div>
  </div>
</template>
