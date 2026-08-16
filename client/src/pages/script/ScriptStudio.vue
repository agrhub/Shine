<template>
  <div class="script-studio p-6 max-w-[1600px] mx-auto text-white">
    <!-- Top Header Bar matching Stitch Mockup workspace-scripts.png -->
    <div class="studio-header flex items-center justify-between bg-surface-container p-4 rounded-xl border border-outline-variant mb-6">
      <div class="flex items-center gap-4">
        <span class="text-xl font-bold tracking-wider text-white">{{ t('script.brandName') }}</span>
        <div class="flex items-center gap-2 border-l border-outline-variant pl-4">
          <el-tag size="small" type="info" effect="plain">{{ t('script.editor') }}</el-tag>
          <el-tag size="small" type="success" effect="dark">{{ t('script.scriptAndAssembly') }}</el-tag>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-outline-variant">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span class="text-xs font-bold text-primary">{{ t('script.aiActive') }}</span>
        </div>
        <el-button 
          type="primary" 
          size="default" 
          class="!bg-primary !border-[var(--el-color-primary)] !text-[var(--el-bg-color)] font-bold"
          :loading="scriptStore.isGenerating"
          @click="handleGenerateScript"
        >
          <el-icon class="mr-1"><VideoPlay /></el-icon>
          {{ t('script.generateScenes') }}
        </el-button>
      </div>
    </div>

    <!-- 3-Column Layout: Left Sidebar + Center Script Editor + Right Assembly -->
    <el-row :gutter="20">
      <!-- LEFT SIDEBAR: Characters, Drama Tone, Visual Style (Col 5 / 24) -->
      <el-col :xs="24" :sm="24" :md="5">
        <div class="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-6">
          <!-- Characters Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs uppercase font-bold text-[#a0a5b5] tracking-wider">{{ t('persona.characterRoster') }}</span>
              <el-button link class="!text-primary text-xs">{{ t('script.addBtn') }}</el-button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between bg-surface border border-[var(--el-color-primary)] p-2.5 rounded-lg">
                <div class="flex items-center gap-2">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" class="w-8 h-8 rounded-full object-cover border border-[var(--el-color-primary)]" />
                  <div>
                    <span class="text-xs font-bold block text-white">Mara</span>
                    <span class="text-[9px] text-primary uppercase font-semibold">{{ t('persona.lockedVerified') }}</span>
                  </div>
                </div>
                <el-icon class="text-[#a0a5b5]" :size="14"><Lock /></el-icon>
              </div>

              <div class="flex items-center justify-between bg-surface border border-outline-variant p-2.5 rounded-lg">
                <div class="flex items-center gap-2">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop" class="w-8 h-8 rounded-full object-cover border border-outline-variant" />
                  <div>
                    <span class="text-xs font-bold block text-white">Kael</span>
                    <span class="text-[9px] text-[#a0a5b5] uppercase font-semibold">{{ t('persona.inProgress') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Drama Tone Section -->
          <div>
            <span class="text-xs uppercase font-bold text-[#a0a5b5] tracking-wider block mb-3">DRAMA TONE</span>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="tone in ['Suspense', 'Romance', 'Action', 'Satire']" 
                :key="tone"
                class="p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                :class="selectedTone === tone ? 'bg-surface border-[var(--el-color-primary)] text-primary' : 'bg-surface border-outline-variant text-[#a0a5b5] hover:border-[var(--el-color-primary)]/50'"
                @click="selectedTone = tone"
              >
                <el-icon :size="16"><component :is="tone === 'Suspense' ? 'Film' : tone === 'Romance' ? 'Star' : tone === 'Action' ? 'Aim' : 'ChatDotRound'" /></el-icon>
                <span>{{ tone }}</span>
              </button>
            </div>
          </div>

          <!-- Visual Style Section -->
          <div>
            <span class="text-xs uppercase font-bold text-[#a0a5b5] tracking-wider block mb-3">VISUAL STYLE</span>
            <div class="space-y-3">
              <div>
                <label class="text-[10px] text-[#a0a5b5] uppercase font-bold block mb-1">{{ t('script.lightingLabel') }}</label>
                <el-select v-model="selectedLighting" class="w-full">
                  <el-option label="Cinematic Neon" value="Cinematic Neon" />
                  <el-option label="Warm Golden Hour" value="Warm Golden Hour" />
                  <el-option label="Moody Noir" value="Moody Noir" />
                </el-select>
              </div>

              <div>
                <label class="text-[10px] text-[#a0a5b5] uppercase font-bold block mb-1">{{ t('script.cameraMovementLabel') }}</label>
                <el-select v-model="selectedCamera" class="w-full">
                  <el-option label="Steady Handheld" value="Steady Handheld" />
                  <el-option label="Slow Tracking Shot" value="Slow Tracking Shot" />
                  <el-option label="Dynamic Whip Pan" value="Dynamic Whip Pan" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- CENTER PANEL: Script Editor (Col 12 / 24) -->
      <el-col :xs="24" :sm="24" :md="12">
        <div class="bg-surface-container border border-outline-variant rounded-xl p-5 mb-6">
          <div class="flex items-center justify-between border-b border-outline-variant pb-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-[#a0a5b5]">{{ t('script.scriptEditorIconText') }}</span>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">{{ t('script.scriptEditorTitle') }}</h3>
            </div>
            <div class="flex items-center gap-3">
              <el-button link class="!text-[#a0a5b5] text-xs">{{ t('script.history') }}</el-button>
              <el-button size="small" plain class="!bg-surface !border-[var(--el-color-primary)] !text-primary">
                <el-icon class="mr-1"><MagicStick /></el-icon> {{ t('script.optimize') }}
              </el-button>
            </div>
          </div>

          <!-- Scenes Roster -->
          <div class="space-y-6">
            <!-- Scene 1 Card -->
            <div class="scene-card bg-surface border border-outline-variant rounded-xl p-5">
              <span class="text-xs font-mono font-bold text-primary uppercase tracking-wider block mb-3">SCENE 1 — INT. NEON ALLEY - NIGHT</span>
              <p class="text-sm text-white mb-4 leading-relaxed font-sans">
                MARA stands under a flickering sign. The rain is cold, biting. She checks her watch. 11:59 PM.
              </p>

              <div class="dialogue-block bg-surface-container border-l-2 border-[var(--el-color-primary)] p-3 rounded-r-lg">
                <span class="text-xs font-bold text-primary block mb-1">MARA</span>
                <p class="text-sm italic text-gray-200 font-serif">{{ t('script.sampleMaraDialogue') }}</p>
              </div>
            </div>

            <!-- Scene 2 Card -->
            <div class="scene-card bg-surface border border-outline-variant rounded-xl p-5">
              <span class="text-xs font-mono font-bold text-primary uppercase tracking-wider block mb-3">{{ t('script.sampleScene2Title') }}</span>
              <p class="text-sm text-white mb-4 leading-relaxed font-sans">
                KAEL watches from above. He has a sniper rifle, but he's not aiming at her. He's aiming at the shadows behind her.
              </p>

              <div class="dialogue-block bg-surface-container border-l-2 border-amber-400 p-3 rounded-r-lg">
                <span class="text-xs font-bold text-amber-400 block mb-1">{{ t('script.sampleKaelSpeaker') }}</span>
                <p class="text-sm italic text-gray-200 font-serif">{{ t('script.sampleKaelDialogue') }}</p>
              </div>
            </div>

            <!-- Add Next Scene Hook Dotted Button -->
            <button class="w-full py-4 border-2 border-dashed border-outline-variant hover:border-[var(--el-color-primary)] rounded-xl text-xs font-bold text-[#a0a5b5] hover:text-primary flex items-center justify-center gap-2 transition-all">
              <el-icon><Plus /></el-icon>
              <span>{{ t('script.addNextSceneHook') }}</span>
            </button>
          </div>
        </div>
      </el-col>

      <!-- RIGHT PANEL: Scene Assembly Shots Grid (Col 7 / 24) -->
      <el-col :xs="24" :sm="24" :md="7">
        <div class="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col justify-between min-h-[600px]">
          <div>
            <div class="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
              <span class="text-xs font-bold text-white uppercase tracking-wider">{{ t('script.sceneAssemblyTitle') }}</span>
              <div class="flex items-center gap-2 text-[#a0a5b5]">
                <el-icon class="cursor-pointer hover:text-white"><Grid /></el-icon>
                <el-icon class="cursor-pointer hover:text-white"><List /></el-icon>
              </div>
            </div>

            <!-- Vertical 9:16 Video Frame Cards Grid -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <!-- Frame 1 -->
              <div class="relative rounded-xl overflow-hidden border border-outline-variant bg-surface group">
                <img src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop" class="w-full h-44 object-cover" />
                <span class="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded">00:00 - 00:04</span>
              </div>

              <!-- Frame 2 -->
              <div class="relative rounded-xl overflow-hidden border border-outline-variant bg-surface group">
                <img src="https://images.unsplash.com/photo-1514565131-fce0801e5785?w=300&auto=format&fit=crop" class="w-full h-44 object-cover" />
                <span class="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded">00:04 - 00:08</span>
              </div>

              <!-- Frame 3: Synthesizing Card -->
              <div class="h-44 border-2 border-dashed border-[var(--el-color-primary)]/50 rounded-xl bg-primary/5 flex flex-col items-center justify-center p-3 text-center">
                <el-icon class="text-primary animate-spin mb-2" :size="24"><Loading /></el-icon>
                <span class="text-xs font-bold text-primary block">{{ t('script.synthesizing') }}</span>
                <span class="text-[9px] text-[#a0a5b5] mt-1">{{ t('script.synthesizingDesc') }}</span>
              </div>

              <!-- Frame 4: Insert Shot Dotted Button -->
              <div class="h-44 border-2 border-dashed border-outline-variant hover:border-[var(--el-color-primary)] rounded-xl bg-surface flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all">
                <div class="w-10 h-10 rounded-full bg-[var(--el-border-color)] flex items-center justify-center text-white mb-2">
                  <el-icon :size="20"><Plus /></el-icon>
                </div>
                <span class="text-xs font-bold text-[#a0a5b5] block">{{ t('script.insertShot') }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Button -->
          <el-button type="primary" size="large" class="w-full !bg-surface !border-outline-variant hover:!border-[var(--el-color-primary)] !text-white font-bold">
            <el-icon class="mr-2"><Plus /></el-icon>
            {{ t('script.addAllToTimeline') }}
          </el-button>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { 
  VideoPlay, Lock, Film, Star, Aim, ChatDotRound, MagicStick, 
  Plus, Grid, List, Loading 
} from '@element-plus/icons-vue';
import { useScriptStore } from '../../stores/useScriptStore';

const { t } = useI18n();
const route = useRoute();
const scriptStore = useScriptStore();

const selectedTone = ref('Suspense');
const selectedLighting = ref('Cinematic Neon');
const selectedCamera = ref('Steady Handheld');

onMounted(async () => {
  const sId = (route.params.id as string) || (route.query.seriesId as string);
  if (sId) {
    await scriptStore.fetchEpisodes(sId);
  }
});

async function handleGenerateScript() {
  try {
    const sId = (route.params.id as string) || (route.query.seriesId as string);
    await scriptStore.generateScript(sId);
    ElMessage.success(t('toast.scriptGeneratedSuccess'));
  } catch (err: any) {
    ElMessage.error(err?.message || t('toast.scriptGenerateError'));
  }
}
</script>
