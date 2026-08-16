<template>
  <div class="emotion-intensity-slider p-4 rounded-xl bg-surface border border-outline-variant">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {{ $t('voice.vocalPerformance') }}
      </h3>
      <el-tag size="small" type="primary" effect="dark">
        {{ $t('voice.dubbingEngine') }}
      </el-tag>
    </div>

    <el-form label-position="top" size="small">
      <!-- Emotion Selector -->
      <el-form-item :label="$t('voice.emotion')">
        <el-select
          v-model="selectedEmotion"
          class="w-full"
          placeholder="Select emotion"
          @change="handleEmotionChange"
        >
          <el-option
            v-for="opt in emotionOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- Intensity Slider -->
      <el-form-item :label="`${$t('voice.intensity')}: ${intensityLevel}%`">
        <el-slider
          v-model="intensityLevel"
          :min="0"
          :max="100"
          :step="1"
          :format-tooltip="formatTooltip"
          @change="(val: any) => handleIntensityChange(Number(val))"
        />
      </el-form-item>

      <!-- Pitch Slider -->
      <el-form-item :label="`${$t('voice.pitch')}: ${pitchLevel}`">
        <el-slider
          v-model="pitchLevel"
          :min="-10"
          :max="10"
          :step="1"
        />
      </el-form-item>

      <!-- Pacing Slider -->
      <el-form-item :label="`${$t('voice.pacing')}: ${pacingLevel}x`">
        <el-slider
          v-model="pacingLevel"
          :min="0.5"
          :max="2.0"
          :step="0.1"
        />
      </el-form-item>
    </el-form>

    <div class="mt-4 flex gap-2">
      <el-button type="primary" class="w-full" :loading="loading" @click="applySteering">
        {{ $t('voice.previewMix') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useVoiceStore } from '@/stores/voiceStore';

const { t } = useI18n();
const voiceStore = useVoiceStore();

const selectedEmotion = ref('neutral');
const intensityLevel = ref(85);
const pitchLevel = ref(0);
const pacingLevel = ref(1.1);
const loading = ref(false);

const emotionOptions = computed(() => [
  { label: t('voice.emotionNeutral'), value: 'neutral' },
  { label: t('voice.emotionJoyful'), value: 'joyful' },
  { label: t('voice.emotionSad'), value: 'sad' },
  { label: t('voice.emotionTense'), value: 'tense' },
  { label: t('voice.emotionAngry'), value: 'angry' },
]);

function formatTooltip(val: number) {
  return `${val}%`;
}

function handleEmotionChange(val: string) {
  if (voiceStore.selectedVoice) {
    voiceStore.steerEmotion(voiceStore.selectedVoice.id, val, intensityLevel.value);
  }
}

function handleIntensityChange(val: number) {
  if (voiceStore.selectedVoice) {
    voiceStore.steerEmotion(voiceStore.selectedVoice.id, selectedEmotion.value, val);
  }
}

async function applySteering() {
  if (!voiceStore.selectedVoice) return;
  loading.value = true;
  try {
    await voiceStore.steerEmotion(
      voiceStore.selectedVoice.id,
      selectedEmotion.value,
      intensityLevel.value
    );
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.emotion-intensity-slider {
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
}
</style>
