<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { toast } from 'vue-sonner';

const emit = defineEmits<{
  (e: 'open-master-script'): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();

const activeEpisode = computed(() => seriesStore.activeEpisode);
const activeScript = computed(() => seriesStore.activeScript);
const scenes = computed(() => activeScript.value?.scenes || activeEpisode.value?.scenes || []);
const isLoading = computed(() => seriesStore.isScriptLoading);

async function renderScene(scene: any) {
  try {
    toast.info(t('toast.renderingSceneIndex'));
    await pipelineStore.renderScene(scene.index, scene);
    toast.success(t('workspace.renderScene') + ' ' + t('common.done', 'Done'));
  } catch {
    toast.error(t('toast.sceneRenderFailed'));
  }
}

async function renderAllScenes() {
  try {
    toast.info(t('workspace.renderAllScenes'));
    await pipelineStore.renderAllScenes();
    toast.success(t('toast.allScenesQueued'));
  } catch {
    toast.error(t('toast.failedToRenderScenes'));
  }
}

function getSceneStatus(sceneIndex: number) {
  return pipelineStore.getSceneStatus(sceneIndex);
}

const b1Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b1'));
</script>

<template>
  <div class="space-y-6">
    <!-- AI Script Director Header -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--el-color-primary);">
          <el-icon :size="16"><Cpu /></el-icon>
          {{ t('workspace.aiScriptDirector') }}
        </h2>
        <el-tag type="primary" size="small" round class="px-2 py-0.5 font-bold">
          {{ activeEpisode ? `EP ${activeEpisode.number}` : 'ACTIVE' }}
        </el-tag>
      </div>

      <!-- Viral Hook & Episode Focus Card -->
      <div class="border rounded-2xl p-4 shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
        <div class="flex items-center gap-2 mb-2" style="color: var(--el-color-primary);">
          <el-icon :size="14"><TrendCharts /></el-icon>
          <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('workspace.viralHookOptimization') }}</span>
        </div>
        <p class="text-xs font-bold mb-2" style="color: var(--el-text-color-primary);">
          "{{ activeEpisode?.cliffhangerHook || seriesStore.currentSeries?.viral_hook || 'High-stakes micro-drama conflict' }}"
        </p>
        <p class="text-[10px] leading-relaxed" style="color: var(--el-text-color-secondary);">
          {{ activeEpisode?.synopsis || seriesStore.currentSeries?.synopsis || 'Plot beat aligned with viral audience engagement' }}
        </p>
      </div>
    </div>

    <!-- Scene Dialogue Breakdown -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.sceneDialogue') }} ({{ scenes.length }} {{ t('workspace.scenes', 'Scenes') }})
        </h3>
        <div class="flex items-center gap-2">
          <!-- Pipeline B1 sync indicator -->
          <el-tag
            v-if="b1Step"
            :type="b1Step.status === 'done' ? 'success' : b1Step.status === 'running' ? 'warning' : b1Step.status === 'error' ? 'danger' : 'info'"
            size="small"
            effect="plain"
            round
          >
            B1: {{ b1Step.status }}
          </el-tag>
          <el-button link type="primary" size="small" icon="Document" @click="emit('open-master-script')">
            {{ t('workspace.tabScript') }}
          </el-button>
        </div>
      </div>

      <!-- Render All Scenes Button -->
      <el-button
        v-if="scenes.length > 0"
        type="primary"
        round
        class="!w-full !mb-4 !font-semibold"
        icon="Picture"
        :loading="b1Step?.status === 'running'"
        @click="renderAllScenes"
      >
        {{ t('workspace.renderAllScenes') }} ({{ scenes.length }})
      </el-button>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-6 text-center text-xs space-y-2" style="color: var(--el-text-color-secondary);">
        <el-icon class="is-loading" :size="20" style="color: var(--el-color-primary);"><Loading /></el-icon>
        <p>{{ t('workspace.generatingScript', 'Generating production scene screenplay...') }}</p>
      </div>

      <!-- Dynamic Scenes List -->
      <div v-else-if="scenes.length > 0" class="space-y-4">
        <div
          v-for="(scene, sIdx) in scenes"
          :key="scene.index || sIdx"
          class="p-3.5 rounded-2xl border flex gap-3.5 transition-all shadow-soft"
          style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
        >
          <!-- Left: Storyboard Thumbnail & Render Action -->
          <div class="w-28 sm:w-32 shrink-0 flex flex-col gap-2">
            <!-- Thumbnail Box -->
            <div
              class="w-full aspect-[9/14] rounded-xl overflow-hidden relative border flex items-center justify-center"
              style="background-color: var(--el-fill-color); border-color: var(--el-border-color);"
            >
              <img
                v-if="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl"
                :src="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl"
                :alt="`Scene ${scene.index}`"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center justify-center p-2 text-center">
                <el-icon :size="24" style="color: var(--el-text-color-placeholder);" class="mb-1"><Picture /></el-icon>
                <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
              </div>
              
              <!-- Scene Index Number Overlay -->
              <div class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/75 text-white shadow">
                #{{ String(scene.index || (sIdx + 1)).padStart(2, '0') }}
              </div>
            </div>

            <!-- Render / Re-render Action Button -->
            <el-button
              size="small"
              round
              :type="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl ? '' : 'primary'"
              :plain="!!(scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl)"
              :icon="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl ? 'RefreshLeft' : 'Picture'"
              :loading="getSceneStatus(scene.index).bgStatus === 'running'"
              class="!w-full !text-[10px] !px-1.5"
              @click="renderScene(scene)"
            >
              {{ scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl ? t('workspace.reRender') : t('workspace.renderScene') }}
            </el-button>
          </div>

          <!-- Right: Scene Details, Mood, Action, Dialogue -->
          <div class="flex-1 min-w-0 flex flex-col space-y-2 py-0.5">
            <div>
              <!-- Header: Scene Heading & Duration/Status -->
              <div class="flex justify-between items-start gap-2 mb-1.5">
                <span class="text-xs font-bold uppercase tracking-wide leading-snug line-clamp-1" style="color: var(--el-color-primary);">
                  {{ scene.heading || `SCENE ${String(scene.index || (sIdx + 1)).padStart(2, '0')}` }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-[10px]" style="color: var(--el-text-color-secondary);">{{ scene.durationSeconds || 12 }}s</span>
                  <el-tag
                    :type="getSceneStatus(scene.index).bgStatus === 'done' ? 'success' : getSceneStatus(scene.index).bgStatus === 'running' ? 'warning' : getSceneStatus(scene.index).bgStatus === 'error' ? 'danger' : 'info'"
                    size="small"
                    effect="plain"
                    round class="whitespace-normal h-auto"
                  >
                    <el-icon v-if="getSceneStatus(scene.index).bgStatus === 'running'" class="is-loading"><Loading /></el-icon>
                    {{ getSceneStatus(scene.index).bgStatus }}
                  </el-tag>
                </div>
              </div>

              <!-- Location & Mood Badges -->
              <div class="flex gap-1.5 flex-wrap mb-2">
                <el-tag v-if="scene.location" size="small" type="info" effect="plain" round class="text-[10px] whitespace-normal h-auto">{{ scene.location }}</el-tag>
                <el-tag v-if="scene.timeOfDay" size="small" effect="plain" round class="text-[10px] whitespace-normal h-auto">{{ scene.timeOfDay }}</el-tag>
                <el-tag v-if="scene.bgmMood" size="small" type="warning" effect="plain" round class="text-[10px] whitespace-normal h-auto">
                  <el-icon :size="10" class="mr-0.5"><Headset /></el-icon> {{ scene.bgmMood }}
                </el-tag>
              </div>

              <!-- Action Prompt / Description -->
              <p v-if="scene.action" class="text-[11px] leading-relaxed line-clamp-2" style="color: var(--el-text-color-secondary);">
                {{ scene.action }}
              </p>
            </div>

            <!-- Dialogue Section -->
            <div v-if="scene.dialogue && scene.dialogue.length > 0" class="space-y-1.5 pt-1.5 border-t" style="border-color: var(--el-border-color-lighter);">
              <div
                v-for="(dlg, dIdx) in scene.dialogue.slice(0, 2)"
                :key="dIdx"
                class="pl-2 border-l-2"
                style="border-color: var(--el-color-primary);"
              >
                <div class="flex items-center gap-1.5 text-[10px] font-bold" style="color: var(--el-text-color-primary);">
                  <span>{{ dlg.character }}</span>
                  <span v-if="dlg.emotion" class="text-[9px] font-normal" style="color: var(--el-text-color-placeholder);">({{ dlg.emotion }})</span>
                </div>
                <p class="text-[11px] italic leading-snug line-clamp-2 mt-0.5" style="color: var(--el-text-color-primary);">
                  "{{ dlg.line }}"
                </p>
              </div>
              <div v-if="scene.dialogue.length > 2" class="text-[9px]" style="color: var(--el-text-color-placeholder);">
                +{{ scene.dialogue.length - 2 }} more lines...
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty Fallback State -->
      <div v-else class="p-6 rounded-xl border border-dashed text-center space-y-3" style="border-color: var(--el-border-color);">
        <el-icon :size="32" style="color: var(--el-text-color-placeholder);"><Document /></el-icon>
        <p class="text-xs" style="color: var(--el-text-color-secondary);">
          {{ t('workspace.noScenesYet', 'No detailed scenes generated yet for this episode.') }}
        </p>
        <el-button
          size="small"
          type="primary"
          plain
          icon="MagicStick"
          @click="seriesStore.generateScriptForEpisode(seriesStore.activeEpisodeId)"
        >
          {{ t('workspace.generateScenes', 'Generate Scenes') }}
        </el-button>
      </div>
    </div>

    <!-- Script Optimization -->
    <div class="p-4 rounded-2xl border shadow-soft" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <h3 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: var(--el-text-color-secondary);">
        {{ t('workspace.scriptOptimization') }}
      </h3>
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">{{ t('workspace.contextAwareContinuity') }}</span>
        <el-switch :model-value="true" size="small" />
      </div>
      <el-button
        type="primary"
        round
        :loading="seriesStore.isScriptLoading"
        class="w-full !font-bold !py-2.5"
        icon="MagicStick"
        @click="seriesStore.generateScriptForEpisode(seriesStore.activeEpisodeId)"
      >
        {{ t('workspace.refineDialogue') }}
      </el-button>
    </div>
  </div>
</template>
