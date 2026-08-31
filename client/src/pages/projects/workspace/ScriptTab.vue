<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useScriptStore } from '@/stores/useScriptStore';
import { toast } from 'vue-sonner';
import { ElMessageBox } from 'element-plus';
import { Character, CharacterWardrobeVariant } from '@/types/api';
import http from '@/utils/http';

const emit = defineEmits<{
  (e: 'open-master-script'): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();
const scriptStore = useScriptStore();

// ─── Flow Navigation Mode (1. Script | 2. Assets | 3. Storyboard) ─────────────
const activeFlowTab = ref<'script' | 'assets' | 'storyboard'>('script');

const activeEpisode = computed(() => seriesStore.activeEpisode);
const activeScript = computed(() => seriesStore.activeScript);
const scenes = computed(() => activeScript.value?.scenes || activeEpisode.value?.scenes || []);
const isLoading = computed(() => seriesStore.isScriptLoading);

// ─── Screenplay Dynamic State ────────────────────────────────────────────────
const screenplayText = ref('');

watch(
  () => [activeEpisode.value, activeScript.value],
  () => {
    const ep = activeEpisode.value as any;
    const sc = activeScript.value as any;
    if (ep || sc) {
      screenplayText.value = ep?.screenplay || sc?.screenplay || ep?.script || '';
    } else {
      screenplayText.value = '';
    }
  },
  { immediate: true, deep: true }
);

// ─── Assets State (Characters, Locations, Props) ─────────────────────────────
const extractedCharacters = ref<any[]>([]);
const extractedLocations = ref<any[]>([]);
const extractedProps = ref<any[]>([]);

watch(
  () => [seriesStore.currentSeries, activeEpisode.value, activeScript.value],
  () => {
    const s = seriesStore.currentSeries;
    const ep = activeEpisode.value as any;
    const sc = activeScript.value as any;
    extractedCharacters.value = (sc?.characters && sc.characters.length > 0)
      ? sc.characters
      : (ep?.characters && ep.characters.length > 0 ? ep.characters : (s?.characters || seriesStore.charactersList || []));

    extractedLocations.value = (sc?.locations && sc.locations.length > 0)
      ? sc.locations
      : (ep?.locations && ep.locations.length > 0 ? ep.locations : (s?.locations || []));

    extractedProps.value = (sc?.props && sc.props.length > 0)
      ? sc.props
      : (ep?.props && ep.props.length > 0 ? ep.props : (s?.props || []));
  },
  { immediate: true, deep: true }
);

const isExtracting = ref(false);
const isGeneratingAssetImage = ref<Record<string, boolean>>({});
const selectedWardrobeVariant = ref<Record<string, string>>({});

function getActiveWardrobeDesc(char: Character) {
  const selectedId = selectedWardrobeVariant.value[char.id];
  const variants = char.wardrobe_variants;
  if (selectedId && Array.isArray(variants)) {
    const v = variants.find((wv: any) => wv.variant_id === selectedId);
    if (v) return v.clothing_and_accessories || '';
  }
  return char.clothing_and_accessories || '';
}

function getCharacterAvatar(char: Character | {id: string, name: string, avatar: string}): string {
  if (!char) return '';
  const master = seriesStore.getCharacterById(char.id || char.name);
  return master?.avatar || char.avatar || '';
}

function getActiveCharacterImage(char: Character): string {
  if (!char) return '';
  const selectedId = selectedWardrobeVariant.value[char.id];
  const variants = char.wardrobe_variants;
  if (selectedId && Array.isArray(variants)) {
    const v = variants.find((wv: CharacterWardrobeVariant) => (wv.variant_id) === selectedId);
    const img = v?.image_url;
    if (img) return img;
  }
  // Check if any wardrobe variant has a rendered image
  if (Array.isArray(variants) && variants.length > 0) {
    const activeV = variants.find((wv: CharacterWardrobeVariant) => wv.image_url);
    const img = activeV?.image_url;
    if (img) return img;
  }
  return getCharacterAvatar({
    id: char.id,
    name: char.name,
    avatar: ''
  });
}

function selectWardrobeVariant(charId: string, variantId: string) {
  selectedWardrobeVariant.value[charId] = variantId;
}

// ─── Video Preview Modal State ──────────────────────────────────────────────
const isPreviewModalOpen = ref(false);
const previewScene = ref<any>(null);

function getSceneStatus(sceneIndex: number) {
  return pipelineStore.getSceneStatus(sceneIndex);
}

function openVideoPreview(scene: any) {
  const vUrl = scene.video_url || getSceneStatus(scene.index).video_url;
  if (!vUrl) return;
  previewScene.value = scene;
  isPreviewModalOpen.value = true;
}

function closeVideoPreview() {
  isPreviewModalOpen.value = false;
  previewScene.value = null;
}

// ─── Active AI Agent Lock State Helpers ─────────────────────────────────────
function isCharacterLocked(char: any): boolean {
  return !!(isGeneratingAssetImage.value[char.id] || pipelineStore.isItemRendering(char.name));
}

function isLocationLocked(loc: any): boolean {
  return !!(isGeneratingAssetImage.value[loc.id] || pipelineStore.isItemRendering(loc.name));
}

function isPropLocked(prop: any): boolean {
  return !!(isGeneratingAssetImage.value[prop.id] || pipelineStore.isItemRendering(prop.name));
}

function isSceneLocked(scene: any): boolean {
  const idx = scene.index || scene.scene_number || scene.sceneNumber;
  return !!(
    getSceneStatus(idx).bg_status === 'running' ||
    getSceneStatus(idx).video_status === 'running' ||
    isSyncingAudio.value[idx] ||
    pipelineStore.isItemRendering(`Scene #${idx}`) ||
    pipelineStore.isItemRendering(`Scene ${idx}`) ||
    pipelineStore.isItemRendering(idx)
  );
}

// ─── Flow Actions: Auto-Extract & Autofill Assets ───────────────────────────
async function saveEpisodeAssets() {
  const epId = activeEpisode.value?.id;
  const sId = seriesStore.currentSeries?.id;
  if (!epId || !sId) return;
  try {
    if (extractedCharacters.value.length > 0 || extractedLocations.value.length > 0 || extractedProps.value.length > 0) {
      await http.patch(`/series/${sId}`, {
        characters: extractedCharacters.value,
        locations: extractedLocations.value,
        props: extractedProps.value,
      });
    }
    await http.patch(`/series/${sId}/episodes/${epId}`, {
      reference_assets: {
        character_ids: extractedCharacters.value.map((c: any) => c.id || c.name),
        location_ids: extractedLocations.value.map((l: any) => l.id || l.name),
        prop_ids: extractedProps.value.map((p: any) => p.id || p.name),
      },
    });
  } catch (e) {
    console.warn('[saveEpisodeAssets] Failed to save assets to database:', e);
  }
}

async function handleExtractAssets() {
  if (!screenplayText.value.trim()) {
    toast.warning(t('workspace.screenplayRequired', 'Please enter screenplay content first.'));
    return;
  }
  isExtracting.value = true;
  try {
    const sId = seriesStore.currentSeries?.id;
    const ep = activeEpisode.value as any;
    const epId = ep?.id;

    toast.info(t('workspace.analyzingScreenplay', 'Analyzing screenplay, extracting assets & generating scenes...'));

    const curSeries = seriesStore.currentSeries as any;
    const sPlan = curSeries?.master_plan;
    const targetDuration = Number(sPlan?.totalDurationSeconds) || Number(sPlan?.episodeDurationSeconds) || Number(curSeries?.episode_duration) || 90;

    const result = await scriptStore.analyzeScreenplay({
      screenplay: screenplayText.value,
      series_id: sId,
      episode_id: epId,
      target_duration_seconds: targetDuration,
    });

    if (result.characters?.length > 0) {
      extractedCharacters.value = result.characters;
    }
    if (result.locations?.length > 0) {
      extractedLocations.value = result.locations;
    }
    if (result.props?.length > 0) {
      extractedProps.value = result.props;
    }

    // Sync scenes and script in store
    if (result.scenes && result.scenes.length > 0) {
      if (ep) {
        ep.scenes = result.scenes;
        ep.scenesCount = `${result.scenes.length} scenes`;
        ep.screenplay = screenplayText.value;
        ep.duration = result.totalDurationSeconds || ep.duration;
      }
      seriesStore.activeScript = {
        ...(seriesStore.activeScript || {}),
        episode: ep?.title || '',
        episodeNumber: ep?.episode_number || 1,
        title: ep?.title || '',
        screenplay: screenplayText.value,
        scenes: result.scenes,
        characters: extractedCharacters.value,
        locations: extractedLocations.value,
        props: extractedProps.value,
        totalDurationSeconds: result.totalDurationSeconds,
      } as any;
    }

    // Persist full episode state to database
    if (sId && epId) {
      try {
        await http.patch(`/series/${sId}/episodes/${epId}`, {
          screenplay: screenplayText.value,
          characters: extractedCharacters.value,
          locations: extractedLocations.value,
          props: extractedProps.value,
          scenes: result.scenes || [],
          duration: result.totalDurationSeconds,
        });
      } catch (dbErr) {
        console.warn('[handleExtractAssets] Failed to patch episode:', dbErr);
      }
    }

    activeFlowTab.value = 'assets';
    const sceneCount = result.scenes?.length || 0;
    const charCount = result.characters?.length || 0;
    toast.success(t('workspace.screenplayAnalysisDone', `Analyzed successfully: ${sceneCount} scenes & ${charCount} characters created!`));
  } catch (err: any) {
    toast.error(t('workspace.assetExtractionFailed', 'Screenplay analysis failed') + `: ${err.message}`);
  } finally {
    isExtracting.value = false;
  }
}

function sendToChatbot(prompt: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trigger-chatbot-action', { detail: { prompt } }));
  }
}

async function confirmGenerationScope(customMessage?: string): Promise<'missing' | 'all' | 'cancel'> {
  try {
    const action = await ElMessageBox.confirm(
      customMessage || t('workspace.generationConfirmMessage', 'Do you want to render only missing items or re-render all items completely?'),
      t('workspace.generationConfirmTitle', 'Generation Scope'),
      {
        distinguishCancelAndClose: true,
        confirmButtonText: t('workspace.generateMissingOnly', 'Generate Missing Only (Fast)'),
        cancelButtonText: t('workspace.regenerateAll', 'Re-render All (Force)'),
        type: 'info',
        roundButton: true,
      }
    );
    return action === 'confirm' ? 'missing' : 'all';
  } catch (action) {
    if (action === 'cancel') {
      return 'all';
    }
    return 'cancel';
  }
}

async function handleRenderCharacters(agentMode = false){
  if(agentMode){
    const mode = await confirmGenerationScope();
    if (mode === 'cancel') return;
    if (mode === 'all') {
      sendToChatbot('Force re-render all character wardrobe variants for this episode');
    } else {
      sendToChatbot('Generate all character wardrobe variants missing images for this episode');
    }
    return;
  }
  for (const char of extractedCharacters.value) {
    const hasCharImage = !!char.avatar;
    const variants = char.wardrobe_variants || [];
    if (variants.length > 0) {
      for (const variant of variants) {
        if (variant.image_url) continue;
        if (variants.length === 1 && hasCharImage) {
          variant.image_url = char.avatar;
          continue;
        }
        await handleGenerateCharacterSheet(char, variant.variant_id);
      }
    }
    if (!char.avatar) {
      await handleGenerateCharacterSheet(char);
    }
  }
}

async function handleRenderLocations(agentMode = false){
  if(agentMode){
    const mode = await confirmGenerationScope();
    if (mode === 'cancel') return;
    if (mode === 'all') {
      sendToChatbot('Force re-render all location environment sheets for this episode');
    } else {
      sendToChatbot('Generate all location environment sheets missing images for this episode');
    }
    return;
  }
  for (const loc of extractedLocations.value) {
    if (loc.image_url) continue;
    await handleGenerateLocationSheet(loc)
  }
}

async function handleRenderProps(agentMode = false){
  if(agentMode){
    const mode = await confirmGenerationScope();
    if (mode === 'cancel') return;
    if (mode === 'all') {
      sendToChatbot('Force re-render all prop product shots for this episode');
    } else {
      sendToChatbot('Generate all prop product shots missing images for this episode');
    }
    return;
  }
  for (const prop of extractedProps.value) {
    if (prop.image_url) continue;
    await handleGeneratePropSheet(prop)
  }
}

async function handleGenerateCharacterSheet(char: Character, variantId?: string, agentMode = false) {
  isGeneratingAssetImage.value[char.id] = true;
  try {
    const selectedVariantId = variantId || selectedWardrobeVariant.value[char.id];
    const matchedVariant = char.wardrobe_variants?.find((wv: any) => wv.variant_id === selectedVariantId);
    const wardrobeToUse = matchedVariant?.clothing_and_accessories || char.clothing_and_accessories || '';
    const variantLabel = matchedVariant ? ` (${matchedVariant.name})` : '';
    if(agentMode){
      sendToChatbot(`Generate character sheet for "${char.name}"${variantLabel}`);
      return;
    }
    toast.info(`${t('workspace.generatingSheet', 'Generating Character Sheet')} (${char.name}${variantLabel})...`);

    // Retrieve existing facial portrait from Series Cast or character avatar
    const matchedCast = (seriesStore.charactersList || []).find(
      (c: any) => c.name?.toLowerCase().trim() === char.name?.toLowerCase().trim() || c.id === char.id
    );

    const referenceAvatar = matchedCast?.avatar || '';
    const resolvedPhysical = char.physical_characteristics || matchedCast?.visual_traits || matchedCast?.physical_characteristics || matchedCast?.appearance || matchedCast?.traits || '';

    const res = await scriptStore.generateCharacterSheet({
      character_name: char.name,
      physical_characteristics: resolvedPhysical,
      clothing_and_accessories: wardrobeToUse,
      visual_style: seriesStore.currentSeries?.visual_style || 'realistic',
      reference_image_url: referenceAvatar || undefined,
    });

    if (matchedVariant) {
      matchedVariant.image_url = res.image_url;
    }

    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Character sheet ready')} (${char.name}${variantLabel})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[char.id] = false;
  }
}

async function handleGenerateLocationSheet(loc: any, agentMode = false) {
  isGeneratingAssetImage.value[loc.id] = true;
  try {
    if(agentMode){
      sendToChatbot(`Generate location visual sheet for "${loc.name}"`);
      return;
    }
    toast.info(`${t('workspace.generatingSheet', 'Generating Location Sheet')} (${loc.name})...`);
    const res = await scriptStore.generateLocationSheet({
      location_name: loc.name,
      physical_characteristics: loc.physical_characteristics,
      time_of_day: loc.time_of_day,
      visual_style: seriesStore.currentSeries?.visual_style || 'realistic',
    });
    loc.image_url = res.image_url;
    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Location sheet ready')} (${loc.name})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[loc.id] = false;
  }
}

async function handleGeneratePropSheet(prop: any, agentMode = false) {
  isGeneratingAssetImage.value[prop.id] = true;
  try {
    if(agentMode){
      sendToChatbot(`Generate prop product shot for "${prop.name}"`);
      return;
    }
    toast.info(`${t('workspace.generatingSheet', 'Generating Prop Shot')} (${prop.name})...`);
    const res = await scriptStore.generatePropSheet({
      prop_name: prop.name,
      physical_characteristics: prop.physical_characteristics,
      visual_style: seriesStore.currentSeries?.visual_style || 'realistic',
    });
    prop.image_url = res.image_url;
    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Prop shot ready')} (${prop.name})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[prop.id] = false;
  }
}

async function renderScene(scene: any, agentMode = false) {
  try {
    if(agentMode){
      sendToChatbot(`Generate storyboard frame image for Scene #${scene.index}`);
      return;
    }
    toast.info(t('toast.renderingSceneIndex'));
    await pipelineStore.renderScene(scene.index, scene);
    toast.success(t('workspace.renderScene') + ' ' + t('common.done', 'Done'));
  } catch {
    toast.error(t('toast.sceneRenderFailed'));
  }
}

async function renderSceneVideo(scene: any, agentMode = false) {
  if(agentMode){
    sendToChatbot(`Generate Image-to-Video clip for Scene #${scene.index}`);
    return;
  }
  try {
    toast.info(t('toast.renderingVideo', 'Rendering scene video...'));
    await pipelineStore.renderSceneVideo(scene.index, scene);
    toast.success((t('workspace.renderVideo') || 'Render Video') + ' ' + (t('common.done') || 'Done'));
  } catch {
    toast.error(t('toast.videoRenderFailed', 'Failed to render scene video'));
  }
}

async function renderAllScenes(agentMode = false) {
  if(agentMode){
    const mode = await confirmGenerationScope();
    if (mode === 'cancel') return;
    if (mode === 'all') {
      sendToChatbot('Force re-render storyboard image frames for all scenes');
    } else {
      sendToChatbot('Generate storyboard image frames for all scenes missing storyboard');
    }
    return;
  }
  try {
    toast.info(t('workspace.renderAllScenes'));
    await pipelineStore.renderAllScenes();
    toast.success(t('toast.allScenesQueued'));
  } catch {
    toast.error(t('toast.failedToRenderScenes'));
  }
}

const isSyncingAudio = ref<Record<number, boolean>>({});

async function handleSyncAudio(scene: any, agentMode = false) {
  const vUrl = scene.video_url || getSceneStatus(scene.index).video_url;
  if (!vUrl) {
    toast.warning(t('workspace.videoRequiredFirst', 'Please render video first before syncing audio & captions.'));
    return;
  }

  isSyncingAudio.value[scene.index] = true;
  try {
    if(agentMode){
      sendToChatbot(`Generate TTS voiceover and captions sync for Scene #${scene.index}`);
      return;
    }
    toast.info(t('workspace.syncingAudioCues', `Separating audio & extracting captions for Scene ${scene.index}...`));
    const result = await pipelineStore.separateSceneAudio(scene.index, vUrl, scene.dialogue);
    if (result) {
      toast.success(t('workspace.syncAudioSuccess', `Scene ${scene.index}: Voiceover, BGM & Captions synced to timeline!`));
    } else {
      toast.error(t('workspace.syncAudioFailed', 'Failed to sync voiceover & captions.'));
    }
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isSyncingAudio.value[scene.index] = false;
  }
}

const b1Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b1'));
const b2Step = computed(() => pipelineStore.pipelineSteps.find(s => s.id === 'b2'));

async function handleRenderAllAssetsAndStoryboard() {
  await pipelineStore.renderAllAssetsAndStoryboard();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Google Flow Navigation Sub-Tabs -->
    <el-tabs v-model="activeFlowTab" stretch>
      <el-tab-pane name="script">
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Document /></el-icon>
            <span>{{ t('workspace.tabScript', 'Script') }}</span>
          </span>
        </template>
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <!-- SUB-TAB 1: SCREENPLAY SCRIPT                                             -->
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <div class="space-y-4">
          <div class="p-4 rounded-2xl border shadow-soft space-y-3" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2" style="color: var(--el-color-primary);">
                <el-icon :size="16"><Document /></el-icon>
                <span class="text-xs font-bold uppercase tracking-wider">{{ t('workspace.screenplayEditor', 'Screenplay Editor') }}</span>
              </div>
              <el-button
                type="primary"
                round
                size="small"
                icon="MagicStick"
                :loading="isExtracting"
                @click="handleExtractAssets"
              >
                {{ t('workspace.extractAssetsBtn', 'Analysis') }}
              </el-button>
            </div>

            <el-input
              v-model="screenplayText"
              type="textarea"
              :rows="18"
              class="font-mono text-xs leading-relaxed"
              :placeholder="t('workspace.screenplayPlaceholder', 'Paste or write your screenplay here in standard screenplay format (# TITLE, ### EXT./INT., **CHARACTER**, etc.)...')"
            />
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane name="assets">
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Box /></el-icon>
            <span>{{ t('workspace.tabAssets', 'Assets') }} ({{ extractedCharacters.length + extractedLocations.length + extractedProps.length }})</span>
          </span>
        </template>
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <!-- SUB-TAB 2: PRE-PRODUCTION ASSETS (Characters, Locations, Props)          -->
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <div class="space-y-6">
          <!-- 1. Characters Section (2-in-1 Sheet: Portrait + Full Body) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
                <el-icon :size="14"><User /></el-icon> {{ t('workspace.characters', 'Characters') }} ({{ extractedCharacters.length }})
              </h3>
              <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderCharacters(true)">
                {{ t('workspace.autofill', 'Autofill') }}
              </el-button>
            </div>

            <div v-if="extractedCharacters.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="char in extractedCharacters"
                :key="char.id"
                class="p-3 rounded-xl border flex flex-col gap-2 shadow-soft"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <!-- 2-in-1 Preview / Placeholder -->
                <div class="w-full aspect-[4/3] relative rounded-lg border overflow-hidden relative flex items-center justify-center" style="border-color: var(--el-border-color);">
                  <el-image 
                    :src="getActiveCharacterImage(char)" 
                    :preview-src-list="[getActiveCharacterImage(char)]" 
                    :alt="char.name" class="w-full h-full" fit="contain">
                    <template #error>
                      <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                        <el-icon :size="24"><User /></el-icon>
                        <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                      </div>
                    </template>
                  </el-image>
                  
                  <!-- Active Rendering Lock Overlay -->
                  <div v-if="isCharacterLocked(char)" class="absolute inset-0 z-20 backdrop-blur-[2px] bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all animate-pulse">
                    <el-icon class="animate-spin text-lg text-primary"><Loading /></el-icon>
                    <span class="text-[10px] font-bold text-white tracking-wide">AI Generating...</span>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 min-w-0">
                    <el-avatar
                      v-if="getCharacterAvatar(char)"
                      :size="22"
                      :src="getCharacterAvatar(char)"
                      shape="circle"
                      class="border border-white/20 bg-black/40 flex-shrink-0"
                    />
                    <span class="font-bold text-xs truncate" style="color: var(--el-text-color-primary);">{{ char.name }}</span>
                  </div>
                </div>
                <p v-if="char.physical_characteristics" :title="char.physical_characteristics" class="text-[10px] line-clamp-2 leading-tight" style="color: var(--el-text-color-secondary);">
                  <strong style="color: var(--el-text-color-primary);">Face/Body:</strong> {{ char.physical_characteristics }}
                </p>
                <p class="text-[10px] line-clamp-2 leading-tight" :title="getActiveWardrobeDesc(char)" style="color: var(--el-text-color-secondary);">
                  <strong style="color: var(--el-text-color-primary);">Wardrobe:</strong> {{ getActiveWardrobeDesc(char) }}
                </p>
                <div v-if="char.wardrobe_variants && char.wardrobe_variants.length > 0" :title="getActiveWardrobeDesc(char)" class="flex gap-1 flex-wrap items-center">
                  <span class="text-[9px] font-semibold opacity-70">Wardrobe:</span>
                  <el-tag
                    v-for="wv in char.wardrobe_variants"
                    :key="wv.variant_id"
                    size="small"
                    :type="selectedWardrobeVariant[char.id] === wv.variant_id ? 'primary' : 'warning'"
                    :effect="selectedWardrobeVariant[char.id] === wv.variant_id ? 'dark' : 'plain'"
                    round
                    class="text-[8px] cursor-pointer"
                    @click="selectWardrobeVariant(char.id, wv.variant_id)"
                  >
                    👔 {{ wv.name }}
                  </el-tag>
                </div>

                <el-button
                  size="small"
                  round
                  type="primary"
                  :plain="!!getActiveCharacterImage(char)"
                  :icon="getActiveCharacterImage(char) ? 'RefreshLeft' : 'Picture'"
                  :loading="isCharacterLocked(char)"
                  :disabled="isCharacterLocked(char)"
                  class="!w-full !text-[10px] mt-auto"
                  @click="handleGenerateCharacterSheet(char)"
                >
                  {{ isCharacterLocked(char) ? 'Rendering...' : (getActiveCharacterImage(char) ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render')) }}
                </el-button>
              </div>
            </div>
            <div v-else class="p-4 rounded-xl border border-dashed text-center text-xs" style="border-color: var(--el-border-color); color: var(--el-text-color-placeholder);">
              {{ t('workspace.noCharactersYet', 'No characters extracted yet. Click "Analysis" in the Script tab.') }}
            </div>
          </div>

          <!-- 2. Locations Section (4-in-1 Sheet: 1 Wide + 3 Perspectives) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
                <el-icon :size="14"><Location /></el-icon> {{ t('workspace.locations', 'Locations') }} ({{ extractedLocations.length }})
              </h3>
              <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderLocations(true)">
                {{ t('workspace.autofill', 'Autofill') }}
              </el-button>
            </div>

            <div v-if="extractedLocations.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="loc in extractedLocations"
                :key="loc.id"
                class="p-3 rounded-xl border flex flex-col gap-2 shadow-soft"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <!-- 4-in-1 Preview / Placeholder -->
                <div class="w-full aspect-[16/9] relative rounded-lg border overflow-hidden relative flex items-center justify-center" style="border-color: var(--el-border-color);">
                  <el-image :src="loc.image_url" :preview-src-list="loc.image_url ? [loc.image_url] : []" :alt="loc.name" class="w-full h-full object-cover">
                    <template #error>
                      <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                        <el-icon :size="24"><Location /></el-icon>
                        <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                      </div>
                    </template>
                  </el-image>
                  <el-tag size="small" effect="plain" round class="text-[9px] absolute top-2 right-2">{{ loc.time_of_day || 'Daytime' }}</el-tag>

                  <!-- Active Rendering Lock Overlay -->
                  <div v-if="isLocationLocked(loc)" class="absolute inset-0 z-20 backdrop-blur-[2px] bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all animate-pulse">
                    <el-icon class="animate-spin text-lg text-primary"><Loading /></el-icon>
                    <span class="text-[10px] font-bold text-white tracking-wide">AI Generating...</span>
                  </div>
                </div>

                <div class="flex justify-between items-center">
                  <span class="font-bold text-xs" style="color: var(--el-text-color-primary);">{{ loc.name }}</span>
                </div>
                <p class="text-[10px] line-clamp-2 leading-tight" :title="loc.physical_characteristics" style="color: var(--el-text-color-secondary);">
                  {{ loc.physical_characteristics }}
                </p>

                <el-button
                  size="small"
                  round
                  type="primary"
                  :plain="!!loc.image_url"
                  :icon="loc.image_url ? 'RefreshLeft' : 'Picture'"
                  :loading="isLocationLocked(loc)"
                  :disabled="isLocationLocked(loc)"
                  class="!w-full !text-[10px] mt-auto"
                  @click="handleGenerateLocationSheet(loc)"
                >
                  {{ isLocationLocked(loc) ? 'Rendering...' : (loc.image_url ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render')) }}
                </el-button>
              </div>
            </div>
            <div v-else class="p-4 rounded-xl border border-dashed text-center text-xs" style="border-color: var(--el-border-color); color: var(--el-text-color-placeholder);">
              {{ t('workspace.noLocationsYet', 'No locations extracted yet. Click "Analysis" in the Script tab.') }}
            </div>
          </div>

          <!-- 3. Props Section (Isolated Product Shots) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
                <el-icon :size="14"><Box /></el-icon> {{ t('workspace.props', 'Props & Objects') }} ({{ extractedProps.length }})
              </h3>
              <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderProps(true)">
                {{ t('workspace.autofill', 'Autofill') }}
              </el-button>
            </div>

            <div v-if="extractedProps.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="prop in extractedProps"
                :key="prop.id"
                class="p-3 rounded-xl border flex flex-col gap-2 shadow-soft"
                style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
              >
                <!-- Product Shot Preview -->
                <div class="w-full aspect-[16/9] rounded-lg border overflow-hidden relative flex items-center justify-center" style="border-color: var(--el-border-color);">
                  <el-image :src="prop.image_url" :preview-src-list="prop.image_url ? [prop.image_url] : []" :alt="prop.name" class="w-full h-full object-cover">
                    <template #error>
                      <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                        <el-icon :size="24"><Box /></el-icon>
                        <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                      </div>
                    </template>
                  </el-image>

                  <!-- Active Rendering Lock Overlay -->
                  <div v-if="isPropLocked(prop)" class="absolute inset-0 z-20 backdrop-blur-[2px] bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all animate-pulse">
                    <el-icon class="animate-spin text-lg text-primary"><Loading /></el-icon>
                    <span class="text-[10px] font-bold text-white tracking-wide">AI Generating...</span>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs" style="color: var(--el-text-color-primary);">{{ prop.name }}</span>
                </div>
                <p class="text-[10px] line-clamp-2 leading-tight" :title="prop.physical_characteristics" style="color: var(--el-text-color-secondary);">
                  {{ prop.physical_characteristics }}
                </p>

                <el-button
                  size="small"
                  round
                  type="primary"
                  :plain="!!prop.image_url"
                  :icon="prop.image_url ? 'RefreshLeft' : 'Picture'"
                  :loading="isPropLocked(prop)"
                  :disabled="isPropLocked(prop)"
                  class="!w-full !text-[10px] mt-auto"
                  @click="handleGeneratePropSheet(prop)"
                >
                  {{ isPropLocked(prop) ? 'Rendering...' : (prop.image_url ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render')) }}
                </el-button>
              </div>
            </div>
            <div v-else class="p-4 rounded-xl border border-dashed text-center text-xs" style="border-color: var(--el-border-color); color: var(--el-text-color-placeholder);">
              {{ t('workspace.noPropsYet', 'No props extracted yet. Click "Analysis" in the Script tab.') }}
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane name="storyboard">
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Picture /></el-icon>
            <span>{{ t('workspace.tabStoryBoard', 'Storyboard') }}</span>
          </span>
        </template>
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <!-- SUB-TAB 3: STORYBOARD SHOTS BREAKDOWN & VIDEO INTERPOLATION             -->
        <!-- ════════════════════════════════════════════════════════════════════════ -->
        <div class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
                <el-icon :size="14"><VideoCamera /></el-icon> {{ t('workspace.storyboard', 'Storyboard') }} ({{ scenes.length }} {{ t('workspace.scenes', 'Scenes') }})
              </h3>
              <el-button link type="primary" size="small" icon="MagicStick" @click="renderAllScenes(true)">
                {{ t('workspace.autofill', 'Autofill') }}
              </el-button>
            </div>
          </div>

          <!-- Scenes List with Frames -->
          <div v-if="scenes.length > 0" class="space-y-4">
            <div
              v-for="(scene, sIdx) in scenes"
              :key="scene.index || sIdx"
              class="p-3.5 rounded-2xl border flex gap-3.5 transition-all shadow-soft"
              style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
            >
              <!-- Left: Thumbnail Box & Render Buttons -->
              <div class="w-28 sm:w-32 shrink-0 flex flex-col gap-2">
                <div
                  class="w-full aspect-[9/14] rounded-xl overflow-hidden relative border flex items-center justify-center group select-none cursor-pointer"
                  style="border-color: var(--el-border-color);"
                >
                  <el-image
                    :src="scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url"
                    :alt="`Scene ${scene.index}`"
                    :preview-teleported="true"
                    :preview-src-list="[scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url || '']"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  >
                    <template #error>
                      <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                        <el-icon :size="24"><Picture /></el-icon>
                        <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                      </div>
                    </template>
                  </el-image>

                  <!-- Active Rendering Lock Overlay -->
                  <div v-if="isSceneLocked(scene)" class="absolute inset-0 z-20 backdrop-blur-[2px] bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all animate-pulse">
                    <el-icon class="animate-spin text-lg text-primary"><Loading /></el-icon>
                    <span class="text-[10px] font-bold text-white tracking-wide">AI Rendering...</span>
                  </div>
                  
                  <div v-if="scene.video_url || getSceneStatus(scene.index).video_url" @click.stop="openVideoPreview(scene)" class="absolute bottom-2 right-2 z-10">
                    <el-button type="primary" icon="VideoPlay" size="small" circle></el-button>
                  </div>

                  <el-tag size="small" effect="plain" round class="text-[9px] absolute top-2 right-2">
                    #{{ sIdx + 1 }} | {{ scene.duration_seconds || 6 }}s
                  </el-tag>
                </div>

                <el-button
                  size="small"
                  round
                  :type="scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url ? '' : 'primary'"
                  :plain="!!(scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url)"
                  :icon="scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url ? 'RefreshLeft' : 'Picture'"
                  :loading="isSceneLocked(scene)"
                  :disabled="isSceneLocked(scene)"
                  class="!w-full !text-[10px] !px-1.5"
                  @click="renderScene(scene)"
                >
                  {{ scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url ? t('workspace.reRender') : t('workspace.renderScene') }}
                </el-button>

                <el-button
                  v-if="scene.storyboard_frame_url || getSceneStatus(scene.index).storyboard_url"
                  size="small"
                  round
                  :type="scene.video_url || getSceneStatus(scene.index).video_url ? '' : 'success'"
                  :plain="!!(scene.video_url || getSceneStatus(scene.index).video_url)"
                  :icon="scene.video_url || getSceneStatus(scene.index).video_url ? 'RefreshLeft' : 'Film'"
                  :loading="isSceneLocked(scene)"
                  :disabled="isSceneLocked(scene)"
                  class="!w-full !text-[10px] !px-1.5 !ml-0"
                  @click="renderSceneVideo(scene)"
                >
                  {{ scene.video_url || getSceneStatus(scene.index).video_url ? t('workspace.reRenderVideo') : t('workspace.renderVideo') }}
                </el-button>

                <el-button
                  v-if="scene.video_url || getSceneStatus(scene.index).video_url"
                  size="small"
                  round
                  type="warning"
                  plain
                  icon="Microphone"
                  :loading="isSceneLocked(scene)"
                  :disabled="isSceneLocked(scene)"
                  class="!w-full !text-[10px] !px-1.5 !ml-0"
                  @click="handleSyncAudio(scene)"
                >
                  {{ isSyncingAudio[scene.index] ? t('workspace.syncing', 'Syncing...') : t('workspace.syncVoiceoverCaption', 'Sync Voice & Sub') }}
                </el-button>
              </div>

              <!-- Right: Details -->
              <div class="flex-1 min-w-0 flex flex-col space-y-2 py-0.5">
                <div class="flex justify-between items-start gap-2 mb-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-wide leading-snug line-clamp-1" style="color: var(--el-color-primary);">
                    {{ scene.heading || `SCENE ${String(scene.index || (sIdx + 1)).padStart(2, '0')}` }}
                  </span>
                  <!-- <div class="flex items-center gap-1.5 shrink-0">
                    <el-tag v-if="scene.scene_number && scene.shot_number" size="small" type="warning" effect="dark" round class="text-[9px] font-mono">
                      S{{ scene.scene_number }} · SHOT {{ scene.shot_number }}
                    </el-tag>
                    <span class="text-[10px] font-mono" style="color: var(--el-text-color-secondary);">{{ scene.duration_seconds || 6 }}s</span>
                  </div> -->
                </div>

                <div class="flex gap-1.5 flex-wrap mb-2">
                  <el-tag v-if="scene.location" size="small" type="info" effect="plain" round class="text-[10px]">{{ scene.location }}</el-tag>
                  <el-tag v-if="scene.time_of_day" size="small" effect="plain" round class="text-[10px]">{{ scene.time_of_day }}</el-tag>
                  <el-tag v-for="p in (scene.props || [])" :key="p" size="small" type="success" effect="plain" round class="text-[10px]">
                    📦 {{ p }}
                  </el-tag>
                </div>

                <p v-if="scene.action" class="text-[11px] leading-relaxed line-clamp-2" style="color: var(--el-text-color-secondary);">
                  {{ scene.action }}
                </p>

                <div v-if="scene.dialogue && scene.dialogue.length > 0" class="space-y-1.5 pt-1.5 border-t" style="border-color: var(--el-border-color-lighter);">
                  <div v-for="(dlg, dIdx) in scene.dialogue.slice(0, 2)" :key="dIdx" class="pl-2 border-l-2" style="border-color: var(--el-color-primary);">
                    <div class="text-[10px] font-bold" style="color: var(--el-text-color-primary);">{{ dlg.character }}</div>
                    <p class="text-[11px] italic leading-snug line-clamp-2 mt-0.5" style="color: var(--el-text-color-primary);">"{{ dlg.line }}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-6 rounded-xl border border-dashed text-center space-y-3" style="border-color: var(--el-border-color);">
            <el-icon :size="32" style="color: var(--el-text-color-placeholder);"><Document /></el-icon>
            <p class="text-xs" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.noScenesYet', 'No detailed scenes generated yet for this episode.') }}
            </p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ─── Video Preview Modal ──────────────────────────────────────────────── -->
    <el-dialog
      v-model="isPreviewModalOpen"
      :title="previewScene?.heading || (previewScene ? `Scene ${previewScene.index}` : 'Video Preview')"
      width="440px"
      align-center
      destroy-on-close
      class="rounded-2xl overflow-hidden"
    >
      <div v-if="previewScene" class="flex flex-col items-center gap-3">
        <div class="w-full max-w-[300px] rounded-2xl overflow-hidden bg-black shadow-2xl border relative flex items-center justify-center" style="border-color: var(--el-border-color);">
          <video
            :src="previewScene.video_url || getSceneStatus(previewScene.index).video_url"
            controls autoplay loop playsinline class="w-full h-full object-contain"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="closeVideoPreview">{{ t('common.close', 'Close') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
