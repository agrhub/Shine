<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useScriptStore } from '@/stores/useScriptStore';
import { toast } from 'vue-sonner';
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

function getActiveWardrobeDesc(char: any) {
  const selectedId = selectedWardrobeVariant.value[char.id];
  if (selectedId && char.wardrobeVariants) {
    const v = char.wardrobeVariants.find((wv: any) => wv.variantId === selectedId);
    if (v?.clothingAndAccessories) return v.clothingAndAccessories;
  }
  return char.clothingAndAccessories || '';
}

function getActiveCharacterImage(char: any) {
  const selectedId = selectedWardrobeVariant.value[char.id];
  if (selectedId && char.wardrobeVariants) {
    const v = char.wardrobeVariants.find((wv: any) => wv.variantId === selectedId);
    if (v?.imageUrl) return v.imageUrl;
  }
  return char.imageUrl || '';
}

function selectWardrobeVariant(charId: string, variantId: string) {
  selectedWardrobeVariant.value[charId] = variantId;
}

// ─── Video Preview Modal State ──────────────────────────────────────────────
const isPreviewModalOpen = ref(false);
const previewScene = ref<any>(null);

function openVideoPreview(scene: any) {
  const vUrl = scene.videoUrl || getSceneStatus(scene.index).videoUrl;
  if (!vUrl) return;
  previewScene.value = scene;
  isPreviewModalOpen.value = true;
}

function closeVideoPreview() {
  isPreviewModalOpen.value = false;
  previewScene.value = null;
}

// ─── Flow Actions: Auto-Extract & Autofill Assets ───────────────────────────
async function saveEpisodeAssets() {
  const epId = activeEpisode.value?.id;
  const sId = seriesStore.currentSeries?.id;
  if (!epId || !sId) return;
  try {
    await http.patch(`/series/${sId}/episodes/${epId}`, {
      characters: extractedCharacters.value,
      locations: extractedLocations.value,
      props: extractedProps.value,
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

    const result = await scriptStore.analyzeScreenplay({
      screenplay: screenplayText.value,
      seriesId: sId,
      episodeId: epId,
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

async function handleRenderCharacters(){
  for (const char of extractedCharacters.value) {
    if(char.wardrobeVariants && char.wardrobeVariants.length > 0){
      for(const variant of char.wardrobeVariants){
        if(variant.imageUrl) continue;
        await handleGenerateCharacterSheet(char, variant.variantId || variant.id)
      }
    }
    if(!char.imageUrl){
      await handleGenerateCharacterSheet(char)
    }
  }
}

async function handleRenderLocations(){
  for (const loc of extractedLocations.value) {
    if (loc.imageUrl) continue;
    await handleGenerateLocationSheet(loc)
  }
}

async function handleRenderProps(){
  for (const prop of extractedProps.value) {
    if (prop.imageUrl) continue;
    await handleGeneratePropSheet(prop)
  }
}

async function handleGenerateCharacterSheet(char: any, variantId?: string) {
  isGeneratingAssetImage.value[char.id] = true;
  try {
    const selectedVariantId = variantId || selectedWardrobeVariant.value[char.id];
    const matchedVariant = char.wardrobeVariants?.find((wv: any) => wv.variantId === selectedVariantId);
    const wardrobeToUse = matchedVariant?.clothingAndAccessories || char.clothingAndAccessories || '';
    const variantLabel = matchedVariant ? ` (${matchedVariant.name})` : '';

    toast.info(`${t('workspace.generatingSheet', 'Generating Character Sheet')} (${char.name}${variantLabel})...`);

    // Retrieve existing facial portrait from Series Cast or character avatar
    const matchedCast = (seriesStore.charactersList || []).find(
      (c: any) => c.name?.toLowerCase().trim() === char.name?.toLowerCase().trim() || c.id === char.id
    );
    const referenceAvatar = char.avatar || char.avatarUrl || matchedCast?.avatar || matchedCast?.avatarUrl || '';

    const resolvedPhysical = char.physicalCharacteristics || matchedCast?.visualTraits || matchedCast?.physicalCharacteristics || matchedCast?.appearance || matchedCast?.traits || '';

    const res = await scriptStore.generateCharacterSheet({
      characterName: char.name,
      physicalCharacteristics: resolvedPhysical,
      clothingAndAccessories: wardrobeToUse,
      visualStyle: seriesStore.currentSeries?.visual_style || 'realistic',
      referenceImageUrl: referenceAvatar || undefined,
    });

    if (matchedVariant) {
      matchedVariant.imageUrl = res.imageUrl;
    }
    char.imageUrl = res.imageUrl;

    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Character sheet ready')} (${char.name}${variantLabel})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[char.id] = false;
  }
}

async function handleGenerateLocationSheet(loc: any) {
  isGeneratingAssetImage.value[loc.id] = true;
  try {
    toast.info(`${t('workspace.generatingSheet', 'Generating Location Sheet')} (${loc.name})...`);
    const res = await scriptStore.generateLocationSheet({
      locationName: loc.name,
      physicalCharacteristics: loc.physicalCharacteristics,
      timeOfDay: loc.timeOfDay,
      visualStyle: seriesStore.currentSeries?.visual_style || 'realistic',
    });
    loc.imageUrl = res.imageUrl;
    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Location sheet ready')} (${loc.name})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[loc.id] = false;
  }
}

async function handleGeneratePropSheet(prop: any) {
  isGeneratingAssetImage.value[prop.id] = true;
  try {
    toast.info(`${t('workspace.generatingSheet', 'Generating Prop Shot')} (${prop.name})...`);
    const res = await scriptStore.generatePropSheet({
      propName: prop.name,
      physicalCharacteristics: prop.physicalCharacteristics,
      visualStyle: seriesStore.currentSeries?.visual_style || 'realistic',
    });
    prop.imageUrl = res.imageUrl;
    await saveEpisodeAssets();
    toast.success(`${t('workspace.sheetReady', 'Prop shot ready')} (${prop.name})`);
  } catch (err: any) {
    toast.error(`${t('common.error', 'Error')}: ${err.message}`);
  } finally {
    isGeneratingAssetImage.value[prop.id] = false;
  }
}

async function renderScene(scene: any) {
  try {
    toast.info(t('toast.renderingSceneIndex'));
    await pipelineStore.renderScene(scene.index, scene);
    toast.success(t('workspace.renderScene') + ' ' + t('common.done', 'Done'));
  } catch {
    toast.error(t('toast.sceneRenderFailed'));
  }
}

async function renderSceneVideo(scene: any) {
  try {
    toast.info(t('toast.renderingVideo', 'Rendering scene video...'));
    await pipelineStore.renderSceneVideo(scene.index, scene);
    toast.success((t('workspace.renderVideo') || 'Render Video') + ' ' + (t('common.done') || 'Done'));
  } catch {
    toast.error(t('toast.videoRenderFailed', 'Failed to render scene video'));
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

const isSyncingAudio = ref<Record<number, boolean>>({});

async function handleSyncAudio(scene: any) {
  const vUrl = scene.videoUrl || getSceneStatus(scene.index).videoUrl;
  if (!vUrl) {
    toast.warning(t('workspace.videoRequiredFirst', 'Please render video first before syncing audio & captions.'));
    return;
  }

  isSyncingAudio.value[scene.index] = true;
  try {
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
</script>

<template>
  <div class="space-y-4">
    <!-- Google Flow Navigation Sub-Tabs -->
    <div class="flex items-center justify-between p-1.5 rounded-2xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
      <div class="flex items-center gap-1">
        <el-button
          round
          size="small"
          :type="activeFlowTab === 'script' ? 'primary' : 'default'"
          class="!font-bold !text-xs !px-3"
          @click="activeFlowTab = 'script'"
        >
          <el-icon class="mr-1"><Document /></el-icon> 1. {{ t('workspace.tabScript', 'Script') }}
        </el-button>
        <el-button
          round
          size="small"
          :type="activeFlowTab === 'assets' ? 'primary' : 'default'"
          class="!font-bold !text-xs !px-3"
          @click="activeFlowTab = 'assets'"
        >
          <el-icon class="mr-1"><Box /></el-icon> 2. {{ t('workspace.tabAssets', 'Assets') }} ({{ extractedCharacters.length + extractedLocations.length + extractedProps.length }})
        </el-button>
        <el-button
          round
          size="small"
          :type="activeFlowTab === 'storyboard' ? 'primary' : 'default'"
          class="!font-bold !text-xs !px-3"
          @click="activeFlowTab = 'storyboard'"
        >
          <el-icon class="mr-1"><Picture /></el-icon> 3. {{ t('workspace.tabStoryboard', 'Storyboard') }}
        </el-button>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- SUB-TAB 1: SCREENPLAY SCRIPT                                             -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeFlowTab === 'script'" class="space-y-4">
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

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- SUB-TAB 2: PRE-PRODUCTION ASSETS (Characters, Locations, Props)          -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeFlowTab === 'assets'" class="space-y-6">
      <!-- 1. Characters Section (2-in-1 Sheet: Portrait + Full Body) -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
            <el-icon :size="14"><User /></el-icon> {{ t('workspace.characters', 'Characters') }} ({{ extractedCharacters.length }})
          </h3>
          <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderCharacters">
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
            <div class="w-full aspect-[16/9] relative rounded-lg border overflow-hidden relative flex items-center justify-center" style="border-color: var(--el-border-color);">
              <el-image :src="getActiveCharacterImage(char)" :preview-src-list="[getActiveCharacterImage(char)]" :alt="char.name" class="w-full h-full object-cover">
                <template #error>
                  <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                    <el-icon :size="24"><User /></el-icon>
                    <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                  </div>
                </template>
              </el-image>
              <!-- <el-tag v-if="char.role" size="small" effect="plain" round class="text-[9px] absolute top-2 right-2">{{ char.role }}</el-tag>   -->
            </div>

            <div class="flex items-center justify-between">
              <span class="font-bold text-xs" style="color: var(--el-text-color-primary);">{{ char.name }}</span>
            </div>
            <p v-if="char.physicalCharacteristics" :title="char.physicalCharacteristics" class="text-[10px] line-clamp-2 leading-tight" style="color: var(--el-text-color-secondary);">
              <strong style="color: var(--el-text-color-primary);">Face/Body:</strong> {{ char.physicalCharacteristics }}
            </p>
            <p class="text-[10px] line-clamp-2 leading-tight" :title="getActiveWardrobeDesc(char)" style="color: var(--el-text-color-secondary);">
              <strong style="color: var(--el-text-color-primary);">Wardrobe:</strong> {{ getActiveWardrobeDesc(char) }}
            </p>
            <div v-if="char.wardrobeVariants && char.wardrobeVariants.length > 0" :title="getActiveWardrobeDesc(char)" class="flex gap-1 flex-wrap items-center">
              <span class="text-[9px] font-semibold opacity-70">Trang phục:</span>
              <el-tag
                size="small"
                :type="!selectedWardrobeVariant[char.id] ? 'primary' : undefined"
                :effect="!selectedWardrobeVariant[char.id] ? 'dark' : 'plain'"
                round
                class="text-[8px] cursor-pointer"
                @click="selectWardrobeVariant(char.id, '')"
              >
                Mặc định
              </el-tag>
              <el-tag
                v-for="wv in char.wardrobeVariants"
                :key="wv.variantId"
                size="small"
                :type="selectedWardrobeVariant[char.id] === wv.variantId ? 'primary' : 'warning'"
                :effect="selectedWardrobeVariant[char.id] === wv.variantId ? 'dark' : 'plain'"
                round
                class="text-[8px] cursor-pointer"
                @click="selectWardrobeVariant(char.id, wv.variantId)"
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
              :loading="isGeneratingAssetImage[char.id]"
              class="!w-full !text-[10px] mt-auto"
              @click="handleGenerateCharacterSheet(char)"
            >
              {{ getActiveCharacterImage(char) ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render') }}
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
          <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderLocations">
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
              <el-image :src="loc.imageUrl" :preview-src-list="[loc.imageUrl]" :alt="loc.name" class="w-full h-full object-cover">
                <template #error>
                  <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                    <el-icon :size="24"><Location /></el-icon>
                    <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                  </div>
                </template>
              </el-image>
              <el-tag size="small" effect="plain" round class="text-[9px] absolute top-2 right-2">{{ loc.timeOfDay || 'Daytime' }}</el-tag>
            </div>

            <div class="flex justify-between items-center">
              <span class="font-bold text-xs" style="color: var(--el-text-color-primary);">{{ loc.name }}</span>
            </div>
            <p class="text-[10px] line-clamp-2 leading-tight" :title="loc.physicalCharacteristics" style="color: var(--el-text-color-secondary);">
              {{ loc.physicalCharacteristics }}
            </p>

            <el-button
              size="small"
              round
              type="primary"
              :plain="!!loc.imageUrl"
              :icon="loc.imageUrl ? 'RefreshLeft' : 'Picture'"
              :loading="isGeneratingAssetImage[loc.id]"
              class="!w-full !text-[10px] mt-auto"
              @click="handleGenerateLocationSheet(loc)"
            >
              {{ loc.imageUrl ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render') }}
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
          <el-button link type="primary" size="small" icon="MagicStick" @click="handleRenderProps">
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
              <el-image :src="prop.imageUrl" :preview-src-list="[prop.imageUrl]" :alt="prop.name" class="w-full h-full object-cover">
                <template #error>
                  <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                    <el-icon :size="24"><Box /></el-icon>
                    <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                  </div>
                </template>
              </el-image>
            </div>

            <div class="flex items-center justify-between">
              <span class="font-bold text-xs" style="color: var(--el-text-color-primary);">{{ prop.name }}</span>
            </div>
            <p class="text-[10px] line-clamp-2 leading-tight" :title="prop.physicalCharacteristics" style="color: var(--el-text-color-secondary);">
              {{ prop.physicalCharacteristics }}
            </p>

            <el-button
              size="small"
              round
              type="primary"
              :plain="!!prop.imageUrl"
              :icon="prop.imageUrl ? 'RefreshLeft' : 'Picture'"
              :loading="isGeneratingAssetImage[prop.id]"
              class="!w-full !text-[10px] mt-auto"
              @click="handleGeneratePropSheet(prop)"
            >
              {{ prop.imageUrl ? t('workspace.reRender', 'Re-render') : t('workspace.render', 'Render') }}
            </el-button>
          </div>
        </div>
        <div v-else class="p-4 rounded-xl border border-dashed text-center text-xs" style="border-color: var(--el-border-color); color: var(--el-text-color-placeholder);">
          {{ t('workspace.noPropsYet', 'No props extracted yet. Click "Analysis" in the Script tab.') }}
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- SUB-TAB 3: STORYBOARD SHOTS BREAKDOWN & VIDEO INTERPOLATION             -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeFlowTab === 'storyboard'" class="space-y-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
            <el-icon :size="14"><VideoCamera /></el-icon> {{ t('workspace.storyboard', 'Storyboard') }} ({{ scenes.length }} {{ t('workspace.scenes', 'Scenes') }})
          </h3>
          <el-button link type="primary" size="small" icon="MagicStick" @click="renderAllScenes">
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
                :src="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl"
                :alt="`Scene ${scene.index}`"
                :preview-teleported="true"
                :preview-src-list="[scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl || '']"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
                <template #error>
                  <div class="flex flex-col items-center justify-center p-2 text-center h-full">
                    <el-icon :size="24"><Picture /></el-icon>
                    <span class="text-[9px] font-medium" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noRenderYet') }}</span>
                  </div>
                </template>
              </el-image>
              
              <div v-if="scene.videoUrl || getSceneStatus(scene.index).videoUrl" @click.stop="openVideoPreview(scene)" class="absolute bottom-2 right-2 z-10">
                <el-button type="primary" icon="VideoPlay" size="small" circle></el-button>
              </div>

              <el-tag size="small" effect="plain" round class="text-[9px] absolute top-2 right-2">
                #{{ sIdx + 1 }} | {{ scene.durationSeconds || 6 }}s
              </el-tag>

              <!-- <div class="absolute  top-1.5 left-1.5 shadow z-10"> -->
                <!-- #{{ String(scene.index || (sIdx + 1)).padStart(2, '0') }} -->
                <!-- <el-tag v-if="scene.sceneNumber && scene.shotNumber" size="small" type="warning" effect="dark" round class="text-[9px] font-mono">
                  #{{ sIdx + 1 }} | {{ scene.durationSeconds || 6 }}s
                </el-tag> -->
              <!-- </div> -->
            </div>

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

            <el-button
              v-if="scene.storyboardFrameUrl || getSceneStatus(scene.index).storyboardUrl"
              size="small"
              round
              :type="scene.videoUrl || getSceneStatus(scene.index).videoUrl ? '' : 'success'"
              :plain="!!(scene.videoUrl || getSceneStatus(scene.index).videoUrl)"
              :icon="scene.videoUrl || getSceneStatus(scene.index).videoUrl ? 'RefreshLeft' : 'Film'"
              :loading="getSceneStatus(scene.index).videoStatus === 'running'"
              class="!w-full !text-[10px] !px-1.5 !ml-0"
              @click="renderSceneVideo(scene)"
            >
              {{ scene.videoUrl || getSceneStatus(scene.index).videoUrl ? t('workspace.reRenderVideo') : t('workspace.renderVideo') }}
            </el-button>

            <el-button
              v-if="scene.videoUrl || getSceneStatus(scene.index).videoUrl"
              size="small"
              round
              type="warning"
              plain
              icon="Microphone"
              :loading="isSyncingAudio[scene.index]"
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
                <el-tag v-if="scene.sceneNumber && scene.shotNumber" size="small" type="warning" effect="dark" round class="text-[9px] font-mono">
                  S{{ scene.sceneNumber }} · SHOT {{ scene.shotNumber }}
                </el-tag>
                <span class="text-[10px] font-mono" style="color: var(--el-text-color-secondary);">{{ scene.durationSeconds || 6 }}s</span>
              </div> -->
            </div>

            <div class="flex gap-1.5 flex-wrap mb-2">
              <el-tag v-if="scene.location" size="small" type="info" effect="plain" round class="text-[10px]">{{ scene.location }}</el-tag>
              <el-tag v-if="scene.timeOfDay" size="small" effect="plain" round class="text-[10px]">{{ scene.timeOfDay }}</el-tag>
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
            :src="previewScene.videoUrl || getSceneStatus(previewScene.index).videoUrl"
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
