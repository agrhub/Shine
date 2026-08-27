<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useSeriesStore } from '@/stores/useSeriesStore';
import http from '@/utils/http';
import { toast } from 'vue-sonner';
import { getVisualStyleById } from '@/constants/visualStyles';
import { MagicStick, Lock, Check, Refresh, Picture, Edit, Plus } from '@element-plus/icons-vue';

const props = defineProps<{
  open: boolean;
  character: any | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const { t } = useI18n();
const pipelineStore = usePipelineStore();
const seriesStore = useSeriesStore();

const renderPromptOverride = ref('');
const renderStyle = ref<'photorealistic' | 'anime' | 'cinematic'>('photorealistic');

const selectedGender = ref<'male' | 'female' | 'neutral'>('male');
const selectedAge = ref<number>(25);
const selectedNationality = ref('Vietnam');
const selectedVoiceId = ref('Fenrir');

// Editable Identity & Traits
const editableIdentity = ref('');
const editableTraits = ref('');
const editableVisualTraits = ref('');

// Episode Wardrobe Controls
const activeOutfitName = ref('');
const activeOutfitCategory = ref('Main Outfit');
const activeOutfitTags = ref('');
const isLockingOutfit = ref(false);
const isGeneratingEpisodeOutfit = ref(false);

const isSavingCharacter = ref(false);
const isExtractingAnchors = ref(false);
const regeneratingAnchorId = ref<string | null>(null);
const isPlayingVoice = ref(false);
let voiceAudioPlayer: HTMLAudioElement | null = null;

onMounted(() => {
  pipelineStore.fetchVoicePresets();
});

const filteredVoicePresets = computed(() => {
  if (pipelineStore.voicePresets.length === 0) return [];
  return pipelineStore.voicePresets.filter(v => v.gender === selectedGender.value || v.gender === 'neutral');
});

const charStatus = computed(() => {
  if (!props.character) return 'idle';
  return pipelineStore.characterRenderStatuses.get(props.character.id) || 'idle';
});

const characterAnchors = computed(() => {
  if (props.character?.anchors && Array.isArray(props.character.anchors) && props.character.anchors.length > 0) {
    return props.character.anchors;
  }
  return [];
});

const characterWardrobe = computed(() => {
  if (props.character?.wardrobe && Array.isArray(props.character.wardrobe)) {
    return props.character.wardrobe;
  }
  return [];
});

const activeEpisodeTitle = computed(() => {
  return seriesStore.activeEpisode?.title || `Episode ${seriesStore.activeEpisodeId || 1}`;
});

const selectedPreviewUrl = ref<string>('');
const selectedPreviewLabel = ref<string>('');

watch(() => props.character, (char) => {
  if (char) {
    renderPromptOverride.value = char.identity || char.visual_traits || char.physical_characteristics || char.appearance || '';
    editableIdentity.value = char.identity || '';
    editableTraits.value = char.traits || '';
    editableVisualTraits.value = char.visual_traits || char.physical_characteristics || char.appearance || char.description || '';
    selectedGender.value = (char.gender as any) || 'male';
    selectedAge.value = Number(char.age) || 25;
    selectedNationality.value = char.nationality || 'Vietnam';
    selectedVoiceId.value = char.voice_id || (selectedGender.value === 'female' ? 'Kore' : 'Fenrir');
    selectedPreviewUrl.value = char.avatar || '';
    selectedPreviewLabel.value = 'Primary Frontal';

    const activeW = Array.isArray((char as any).wardrobe) && (char as any).wardrobe.length > 0 ? (char as any).wardrobe[0] : null;
    activeOutfitName.value = activeW?.name || `${char.name} Default Costume`;
    activeOutfitCategory.value = activeW?.category || 'Main Outfit';
    activeOutfitTags.value = Array.isArray(activeW?.tags) ? activeW.tags.join(', ') : (activeW?.tags || 'signature character costume, continuity locked');
  }
}, { immediate: true });

function selectAnchorPreview(anc: any) {
  selectedPreviewUrl.value = anc.image_url || props.character?.avatar || '';
  selectedPreviewLabel.value = anc.name || 'Facial Anchor';
}

function close() {
  if (voiceAudioPlayer) {
    voiceAudioPlayer.pause();
    isPlayingVoice.value = false;
  }
  emit('update:open', false);
}

function playVoiceSample(voiceId: string) {
  if (voiceAudioPlayer) {
    voiceAudioPlayer.pause();
  }
  const matched = pipelineStore.voicePresets.find(v => v.id === voiceId);
  const sampleUrl = matched?.audio_sample_url || `https://gstatic.com/aistudio/voices/samples/${voiceId}.wav`;
  voiceAudioPlayer = new Audio(sampleUrl);
  isPlayingVoice.value = true;
  voiceAudioPlayer.play().catch(() => {
    toast.info(t('toast.voicePreview', { voice: voiceId }));
    isPlayingVoice.value = false;
  });
  voiceAudioPlayer.onended = () => {
    isPlayingVoice.value = false;
  };
}

async function saveCharacterSettings() {
  if (!props.character) return;
  isSavingCharacter.value = true;
  try {
    const sId = seriesStore.currentSeries?.id;
    const resolvedVisual = editableVisualTraits.value || editableIdentity.value;
    await seriesStore.updateCharacter(props.character.id, {
      identity: editableIdentity.value,
      traits: editableTraits.value,
      visual_traits: resolvedVisual,
      physical_characteristics: resolvedVisual,
      appearance: resolvedVisual,
      description: resolvedVisual || editableTraits.value || '',
      age: selectedAge.value,
      gender: selectedGender.value,
      nationality: selectedNationality.value,
      voice_id: selectedVoiceId.value,
      avatar: props.character.avatar,
    });
    if (sId) await seriesStore.saveCharacterAvatars(sId);
    toast.success(t('workspace.characterSaved'));
  } catch {
    toast.error(t('toast.failedToSaveCharacter'));
  } finally {
    isSavingCharacter.value = false;
  }
}

// async function handleExtractFacialAnchors() {
//   if (!props.character) return;
//   isExtractingAnchors.value = true;
//   try {
//     toast.info(t('workspace.extractingAnchorsToast'));
//     const sId = seriesStore.currentSeries?.id;
//     const currentStyle = seriesStore.currentSeries?.visual_style || 'realistic';
//     const styleObj = getVisualStyleById(currentStyle);

//     const res: any = await http.post(`/characters/${props.character.id}/anchors`, {
//       seriesId: sId,
//       name: props.character.name,
//       age: selectedAge.value,
//       gender: selectedGender.value,
//       visual_traits: editableVisualTraits.value || editableIdentity.value || renderPromptOverride.value,
//       wardrobe_desc: activeOutfitTags.value || activeOutfitName.value,
//       visual_style: currentStyle,
//       visual_style_prompt: styleObj.promptModifier,
//     });

//     const updatedChar = res?.data?.data || res?.data;
//     if (updatedChar) {
//       if (updatedChar.avatarUrl) {
//         seriesStore.updateCharacterAvatar(props.character.id, updatedChar.avatarUrl);
//       }
//       await seriesStore.updateCharacter(props.character.id, {
//         lora_model: updatedChar.lora_model || props.character.lora_model,
//       });
//       if (sId) await seriesStore.saveCharacterAvatars(sId);
//       toast.success(t('workspace.anchorsLockedToast'));
//     }
//   } catch (err: any) {
//     toast.error(t('workspace.failedToExtractAnchors', { error: err.message || 'Error' }));
//   } finally {
//     isExtractingAnchors.value = false;
//   }
// }

// Regenerate a single anchor without touching the others
// async function handleRegenerateSingleAnchor(anc: any) {
//   if (!props.character || !anc.id) return;
//   regeneratingAnchorId.value = anc.id;
//   try {
//     toast.info(t('workspace.regeneratingAngleToast', { name: anc.name }));
//     const sId = seriesStore.currentSeries?.id;
//     const currentStyle = seriesStore.currentSeries?.visual_style || 'realistic';
//     const styleObj = getVisualStyleById(currentStyle);

//     const res: any = await http.post(`/characters/${props.character.id}/anchors/${anc.id}`, {
//       seriesId: sId,
//       name: props.character.name,
//       age: selectedAge.value,
//       gender: selectedGender.value,
//       visualTraits: editableVisualTraits.value || editableIdentity.value,
//       wardrobeDesc: activeOutfitTags.value || activeOutfitName.value,
//       visualStyle: currentStyle,
//       visualStylePrompt: styleObj.promptModifier,
//     });

//     const data = res?.data?.data || res?.data;
//     if (data?.anchors) {
//       await seriesStore.updateCharacter(props.character.id, {
//         anchors: data.anchors,
//       });
//       if (data.anchor?.imageUrl) {
//         selectedPreviewUrl.value = data.anchor.imageUrl;
//         selectedPreviewLabel.value = data.anchor.name;
//       }
//       if (sId) await seriesStore.saveCharacterAvatars(sId);
//       toast.success(t('workspace.angleRegeneratedToast', { name: anc.name }));
//     }
//   } catch (err: any) {
//     toast.error(t('workspace.failedToRegenerateAngle', { error: err.message || 'Error' }));
//   } finally {
//     regeneratingAnchorId.value = null;
//   }
// }

// AI Generate Outfit suitable for active Episode
// async function handleGenerateEpisodeOutfit() {
//   if (!props.character) return;
//   isGeneratingEpisodeOutfit.value = true;
//   try {
//     toast.info(t('workspace.designingCostumeToast', { episode: activeEpisodeTitle.value }));
//     const sId = seriesStore.currentSeries?.id;
//     const epId = seriesStore.activeEpisodeId;
//     const res: any = await http.post(`/characters/${props.character.id}/wardrobe`, {
//       series_id: sId,
//       episode_id: epId,
//       category: activeOutfitCategory.value || 'Main Outfit',
//       prompt: `Episode outfit for ${activeEpisodeTitle.value}`,
//     });

//     const newOutfit = res?.data?.data || res?.data;
//     if (newOutfit) {
//       activeOutfitName.value = newOutfit.name;
//       activeOutfitTags.value = Array.isArray(newOutfit.tags) ? newOutfit.tags.join(', ') : newOutfit.tags;
//       const currentWardrobe = Array.isArray(props.character.wardrobe) ? [...props.character.wardrobe] : [];
//       currentWardrobe.unshift(newOutfit);
//       await seriesStore.updateCharacter(props.character.id, { wardrobe: currentWardrobe });
//       if (sId) await seriesStore.saveCharacterAvatars(sId);
//       toast.success(t('workspace.outfitLockedForEpisodeToast', { name: newOutfit.name, episode: activeEpisodeTitle.value }));
//     }
//   } catch (err: any) {
//     toast.error(t('workspace.failedToGenerateWardrobe', { error: err.message || 'Error' }));
//   } finally {
//     isGeneratingEpisodeOutfit.value = false;
//   }
// }

// async function handleLockWardrobe() {
//   if (!props.character) return;
//   isLockingOutfit.value = true;
//   try {
//     const sId = seriesStore.currentSeries?.id;
//     const tagsArray = activeOutfitTags.value.split(',').map(s => s.trim()).filter(Boolean);
//     const res: any = await http.post(`/characters/${props.character.id}/wardrobe`, {
//       seriesId: sId,
//       name: activeOutfitName.value || `${props.character.name} Default Costume`,
//       category: activeOutfitCategory.value || 'Main Outfit',
//       tags: tagsArray.length > 0 ? tagsArray : ['tailored outfit', 'continuity-locked'],
//       status: 'locked',
//     });

//     const newOutfit = res?.data?.data || res?.data;
//     if (newOutfit) {
//       const currentWardrobe = Array.isArray(props.character.wardrobe) ? [...props.character.wardrobe] : [];
//       currentWardrobe.unshift(newOutfit);
//       await seriesStore.updateCharacter(props.character.id, { wardrobe: currentWardrobe });
//       if (sId) await seriesStore.saveCharacterAvatars(sId);
//       toast.success(t('workspace.outfitContinuityLockedToast'));
//     }
//   } catch (err: any) {
//     toast.error(t('workspace.failedToLockWardrobe', { error: err.message || 'Error' }));
//   } finally {
//     isLockingOutfit.value = false;
//   }
// }

async function handleRender() {
  if (!props.character) return;
  try {
    toast.info(t('workspace.renderingCharacter'));
    const charWithOverride = renderPromptOverride.value
      ? { ...props.character, identity: renderPromptOverride.value, visual_traits: editableVisualTraits.value }
      : { ...props.character, visual_traits: editableVisualTraits.value };
    await pipelineStore.renderCharacter({
      ...charWithOverride,
      age: selectedAge.value,
      gender: selectedGender.value,
      nationality: selectedNationality.value,
      voice_id: selectedVoiceId.value,
      style: renderStyle.value,
    } as any);
    toast.success(t('toast.characterRendered'));
  } catch {
    toast.error(t('toast.failedToRenderChar'));
  }
}

// const styleOptions = computed(() => [
//   { value: 'photorealistic', label: t('workspace.photorealistic') },
//   { value: 'anime', label: t('workspace.anime') },
//   { value: 'cinematic', label: t('workspace.cinematic') },
// ]);
</script>

<template>
  <el-dialog
    :model-value="open"
    @update:model-value="emit('update:open', $event)"
    :title="character?.name || t('workspace.characterConsistency')"
    width="720px"
    align-center
    destroy-on-close
  >
    <div v-if="!character" class="text-center py-8" style="color: var(--el-text-color-secondary);">
      <p>{{ t('workspace.noCharacterSelected') }}</p>
    </div>

    <div v-else class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <!-- Top Section: Large Portrait & Attributes + Voice Preset -->
      <div class="flex flex-col sm:flex-row gap-4 items-stretch">
        <!-- Left: Large Character Portrait -->
        <div class="w-full sm:w-52 shrink-0 flex flex-col gap-2">
          <div v-loading="charStatus === 'running'"
            class="w-full aspect-[3/4] rounded-2xl overflow-hidden relative border shadow-md flex items-center justify-center group"
            style="border-color: var(--el-border-color); background-color: var(--el-fill-color-darker);"
          >
            <el-image
              v-if="character.avatar"
              :src="character.avatar"
              :alt="character.name"
              :preview-src-list="[character.avatar]"
              fit="cover"
              class="w-full h-full object-cover cursor-pointer"
            />
            <div v-else class="flex flex-col items-center justify-center p-3 text-center space-y-1.5" style="color: var(--el-text-color-placeholder);">
              <el-icon :size="40"><User /></el-icon>
              <p class="text-xs">{{ t('workspace.noAvatarYet') }}</p>
            </div>

            <!-- Current Angle Badge -->
            <!-- <div v-if="selectedPreviewLabel" class="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md text-center truncate">
              {{ selectedPreviewLabel }}
            </div> -->
          </div>

          <!-- Quick Re-render trigger -->
          <el-button
            size="small"
            round
            type="primary"
            plain
            class="w-full"
            icon="Picture"
            :loading="charStatus === 'running'"
            :disabled="!!regeneratingAnchorId"
            @click="handleRender"
          >
            {{ character.avatar ? t('workspace.rerenderAvatar') : t('workspace.renderCharacter') }}
          </el-button>
        </div>

        <!-- Right: Character Header, Age/Gender & Voice Preset -->
        <div class="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <!-- Header & Badges -->
          <div class="space-y-2 p-3 rounded-2xl border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-base truncate" style="color: var(--el-text-color-primary);">{{ character.name }}</h3>
              <el-tag :type="character.role === 'protagonist' ? 'danger' : character.role === 'antagonist' ? 'warning' : 'info'" size="small" effect="light" round class="capitalize">
                {{ character.role }}
              </el-tag>
            </div>

            <!-- Badges for Age, Gender, Nationality, Voice -->
            <div class="flex gap-1.5 flex-wrap">
              <el-tag size="small" type="warning" effect="plain" round class="!text-[10px]">
                🎂 {{ selectedAge }} {{ t('common.yearsOld', 'y/o') }}
              </el-tag>
              <el-tag size="small" effect="plain" round class="!text-[10px]">
                {{ selectedGender === 'female' ? `♀ ${t('workspace.female')}` : selectedGender === 'male' ? `♂ ${t('workspace.male')}` : t('workspace.neutral') }}
              </el-tag>
              <el-tag size="small" type="info" effect="plain" round class="!text-[10px]">
                🌐 {{ selectedNationality }}
              </el-tag>
              <el-tag size="small" type="success" effect="plain" round class="!text-[10px]">
                🎙 {{ selectedVoiceId }}
              </el-tag>
            </div>
          </div>

          <!-- Character Voice, Gender & Nationality Global Sync -->
          <div class="p-3 rounded-2xl border space-y-2.5 flex-1 flex flex-col justify-between" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style="color: var(--el-color-primary);">
                <el-icon><Microphone /></el-icon>
                <span>{{ t('workspace.voicePreset') }} {{ t('workspace.attributes') }}</span>
              </div>
              <el-button
                size="small"
                type="primary"
                round
                :loading="isSavingCharacter"
                @click="saveCharacterSettings"
              >
                {{ t('workspace.saveAll') }}
              </el-button>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <!-- Age Input -->
              <div>
                <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">{{ t('workspace.age', 'Age') }}</label>
                <el-input-number v-model="selectedAge" :min="1" :max="120" size="small" class="!w-full" :controls="false" />
              </div>

              <!-- Gender Selector -->
              <div>
                <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">{{ t('workspace.gender') }}</label>
                <el-select v-model="selectedGender" size="small" class="w-full">
                  <el-option value="male" :label="t('workspace.male')" />
                  <el-option value="female" :label="t('workspace.female')" />
                  <el-option value="neutral" :label="t('workspace.neutral')" />
                </el-select>
              </div>

              <!-- Nationality Input -->
              <div>
                <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">{{ t('workspace.nationality') }}</label>
                <el-input v-model="selectedNationality" size="small" placeholder="Vietnam, US..." />
              </div>
            </div>

            <!-- Voice Preset Selector with Play Preview -->
            <div>
              <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">
                {{ t('workspace.selectVoice') }}
              </label>
              <div class="flex gap-2">
                <el-select v-model="selectedVoiceId" size="small" class="flex-1" filterable>
                  <el-option
                    v-for="voice in filteredVoicePresets"
                    :key="voice.id"
                    :value="voice.id"
                    :label="`${voice.name} (${voice.description || ''})`"
                  >
                    <div class="flex justify-between items-center w-full">
                      <span>{{ voice.name }}</span>
                      <span class="text-[10px]" style="color: var(--el-text-color-placeholder);">{{ voice.description || '' }}</span>
                    </div>
                  </el-option>
                </el-select>
                <el-button
                  size="small"
                  circle
                  :type="isPlayingVoice ? 'warning' : 'primary'"
                  :plain="!isPlayingVoice"
                  icon="VideoPlay"
                  @click="playVoiceSample(selectedVoiceId)"
                  :title="t('workspace.previewVoice')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Editable Identity & Traits Card -->
      <div class="p-3.5 rounded-2xl border space-y-2.5" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--el-color-primary);">
            <el-icon><Edit /></el-icon>
            {{ t('workspace.customIdentityAndTraits') }}
          </span>
          <span class="text-[11px]" style="color: var(--el-text-color-secondary);">{{ t('workspace.clickSaveToPersist') }}</span>
        </div>

        <div class="space-y-2">
          <div>
            <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.identityRole') }}
            </label>
            <el-input v-model="editableIdentity" size="small" :placeholder="t('workspace.identityPlaceholder')" />
          </div>

          <div>
            <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.personalityAndTraits') }}
            </label>
            <el-input v-model="editableTraits" type="textarea" :rows="2" size="small" :placeholder="t('workspace.personalityPlaceholder')" />
          </div>

          <div>
            <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.visualPhysicalTraits') }}
            </label>
            <el-input v-model="editableVisualTraits" type="textarea" :rows="2" size="small" :placeholder="t('workspace.visualPhysicalPlaceholder')" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold mb-1" style="color: var(--el-text-color-secondary);">{{ t('workspace.promptOverride') }}</label>
            <el-input
              v-model="renderPromptOverride"
              type="textarea"
              :rows="2"
              :placeholder="`${character.name}, ${character.role}...`"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- LoRA Model & 8 Facial Anchors Section -->
      <div class="p-3.5 rounded-2xl border space-y-3" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <el-icon style="color: var(--el-color-primary);"><Cpu /></el-icon>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('workspace.loraConsistencyModel') }}</p>
              <p class="text-xs font-mono font-bold" style="color: var(--el-text-color-primary);">{{ character.loraModel || `lora-${(character.name || 'char').toLowerCase().replace(/\s+/g, '-')}-sdxl` }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button round @click="close">{{ t('common.close', 'Close') }}</el-button>
    </template>
  </el-dialog>
</template>

