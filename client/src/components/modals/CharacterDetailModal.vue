<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useSeriesStore } from '@/stores/useSeriesStore';
import http from '@/utils/http';
import { toast } from 'vue-sonner';

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
const selectedNationality = ref('Vietnam');
const selectedVoiceId = ref('Fenrir');
const isSavingCharacter = ref(false);
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

watch(() => props.character, (char) => {
  if (char) {
    renderPromptOverride.value = char.identity || '';
    selectedGender.value = (char.gender as any) || 'male';
    selectedNationality.value = char.nationality || 'Vietnam';
    selectedVoiceId.value = char.voiceId || (selectedGender.value === 'female' ? 'Kore' : 'Fenrir');
  }
}, { immediate: true });

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
  const sampleUrl = matched?.audioSampleUrl || `https://gstatic.com/aistudio/voices/samples/${voiceId}.wav`;
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
    await seriesStore.updateCharacter(props.character.id, {
      gender: selectedGender.value,
      nationality: selectedNationality.value,
      voiceId: selectedVoiceId.value,
    });
    toast.success(t('workspace.characterSaved'));
  } catch {
    toast.error(t('toast.failedToSaveCharacter'));
  } finally {
    isSavingCharacter.value = false;
  }
}

async function handleRender() {
  if (!props.character) return;
  try {
    toast.info(t('workspace.renderingCharacter'));
    const charWithOverride = renderPromptOverride.value
      ? { ...props.character, identity: renderPromptOverride.value }
      : props.character;
    await pipelineStore.renderCharacter({
      ...charWithOverride,
      gender: selectedGender.value,
      nationality: selectedNationality.value,
      voiceId: selectedVoiceId.value,
      style: renderStyle.value,
    });
    toast.success(t('toast.characterRendered'));
  } catch {
    toast.error(t('toast.failedToRenderChar'));
  }
}

const styleOptions = computed(() => [
  { value: 'photorealistic', label: t('workspace.photorealistic') },
  { value: 'anime', label: t('workspace.anime') },
  { value: 'cinematic', label: t('workspace.cinematic') },
]);
</script>

<template>
  <el-dialog
    :model-value="open"
    @update:model-value="emit('update:open', $event)"
    :title="character?.name || t('workspace.characterConsistency')"
    width="540px"
    align-center
    destroy-on-close
  >
    <div v-if="!character" class="text-center py-8" style="color: var(--el-text-color-secondary);">
      <p>{{ t('workspace.noCharacterSelected') }}</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Avatar + Basic Info -->
      <div class="flex gap-4 items-start">
        <div class="relative shrink-0">
          <el-avatar
            v-if="character.avatarUrl"
            :src="character.avatarUrl"
            :size="84"
            class="border-2 rounded-2xl"
            style="border-color: var(--el-color-primary-light-5);"
            shape="square"
          />
          <div
            v-else
            class="w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed"
            style="background-color: var(--el-fill-color-dark); border-color: var(--el-border-color);"
          >
            <div class="text-center">
              <el-icon :size="24" style="color: var(--el-text-color-placeholder);"><User /></el-icon>
              <p class="text-[9px] mt-1" style="color: var(--el-text-color-placeholder);">{{ t('workspace.noAvatarYet') }}</p>
            </div>
          </div>

          <!-- Status overlay -->
          <div
            v-if="charStatus === 'running'"
            class="absolute inset-0 rounded-2xl flex items-center justify-center"
            style="background-color: rgba(0,0,0,0.5);"
          >
            <el-icon class="is-loading" :size="24" style="color: white;"><Loading /></el-icon>
          </div>
        </div>

        <div class="flex-1 min-w-0 space-y-1.5">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base line-clamp-1" style="color: var(--el-text-color-primary);">{{ character.name }}</h3>
            <el-tag type="primary" size="small" effect="plain" round>{{ character.role }}</el-tag>
          </div>

          <!-- Badges for Gender, Nationality, Voice -->
          <div class="flex gap-1.5 flex-wrap">
            <el-tag size="small" effect="plain" round class="text-[10px]">
              {{ selectedGender === 'female' ? `♀ ${t('workspace.female')}` : selectedGender === 'male' ? `♂ ${t('workspace.male')}` : t('workspace.neutral') }}
            </el-tag>
            <el-tag size="small" type="info" effect="plain" round class="text-[10px]">
              🌐 {{ selectedNationality }}
            </el-tag>
            <el-tag size="small" type="success" effect="plain" round class="text-[10px]">
              🎙 {{ selectedVoiceId }}
            </el-tag>
          </div>

          <p v-if="character.speechStyle" class="text-xs mt-1" style="color: var(--el-text-color-secondary);">
            <span class="font-semibold">{{ t('workspace.speech') }}:</span> {{ character.speechStyle }}
          </p>
        </div>
      </div>

      <!-- Character Voice, Gender & Nationality Global Sync -->
      <div class="p-3.5 rounded-2xl border space-y-3" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style="color: var(--el-color-primary);">
            <el-icon><Microphone /></el-icon>
            <span>{{ t('workspace.voicePreset') }}</span>
          </div>
          <el-button
            size="small"
            type="primary"
            round
            :loading="isSavingCharacter"
            @click="saveCharacterSettings"
          >
            {{ t('common.save', 'Save') }}
          </el-button>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
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
            <el-input v-model="selectedNationality" size="small" placeholder="Vietnam, US, Japan..." />
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

      <!-- Identity & Traits -->
      <el-descriptions :column="1" border size="small" v-if="character.identity || character.traits">
        <el-descriptions-item v-if="character.identity" :label="t('workspace.identity')">
          {{ character.identity }}
        </el-descriptions-item>
        <el-descriptions-item v-if="character.traits && character.traits !== character.identity" :label="t('workspace.traits')">
          {{ character.traits }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- LoRA Model -->
      <div class="p-3 rounded-xl border flex items-center gap-3" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <el-icon style="color: var(--el-color-primary);"><Cpu /></el-icon>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--el-text-color-secondary);">{{ t('workspace.loraConsistencyModel') }}</p>
          <p class="text-xs font-mono mt-0.5" style="color: var(--el-text-color-primary);">{{ character.loraModel || 'Not assigned' }}</p>
        </div>
      </div>

      <!-- Render Section -->
      <div class="border rounded-2xl p-4 space-y-3" style="border-color: var(--el-border-color); background-color: var(--el-card-bg-color);">
        <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--el-color-primary);">
          <el-icon :size="14"><Picture /></el-icon>
          {{ t('workspace.renderCharacter') }}
        </h4>

        <div class="space-y-2">
          <label class="text-[11px] font-semibold" style="color: var(--el-text-color-secondary);">{{ t('workspace.promptOverride') }}</label>
          <el-input
            v-model="renderPromptOverride"
            type="textarea"
            :rows="2"
            :placeholder="`${character.name}, ${character.role}...`"
            size="small"
          />
        </div>

        <div class="space-y-2">
          <label class="text-[11px] font-semibold" style="color: var(--el-text-color-secondary);">{{ t('workspace.stylePresets', 'Style') }}</label>
          <el-segmented
            v-model="renderStyle"
            :options="styleOptions"
            block
            size="small"
          />
        </div>

        <el-button
          type="primary"
          round
          class="w-full !font-bold"
          icon="Picture"
          :loading="charStatus === 'running'"
          @click="handleRender"
        >
          {{ charStatus === 'running' ? t('workspace.renderingCharacter') : t('workspace.renderCharacter') }}
        </el-button>

        <!-- Rendered result -->
        <div v-if="character.avatarUrl" class="mt-2">
          <img
            :src="character.avatarUrl"
            :alt="character.name"
            class="w-full rounded-xl object-cover"
            style="max-height: 200px;"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button round @click="close">{{ t('common.close', 'Close') }}</el-button>
    </template>
  </el-dialog>
</template>
