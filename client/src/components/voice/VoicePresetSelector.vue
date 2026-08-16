<template>
  <div class="voice-preset-selector">
    <div class="header flex items-center justify-between mb-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {{ $t('voice.presetsTitle') }}
      </h3>
      <el-tag size="small" type="success" effect="dark">30 {{ $t('voice.selectVoice') }}</el-tag>
    </div>

    <div class="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
      <el-card
        v-for="voice in presets"
        :key="voice.id"
        class="voice-card cursor-pointer transition-all border border-slate-700 bg-surface"
        :class="{ 'is-selected': selectedVoiceId === voice.id }"
        shadow="hover"
        @click="selectVoice(voice)"
      >
        <div class="flex items-center gap-3">
          <el-avatar
            :size="36"
            :src="voice.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMDSugNRjleK0oz_tHQHQNFLJxuvflo_MfdWrtUI_eipJJGlQG_FumeARmoUCG9497lyq8nlor4IpEiTPfXidaiWS4MLpjNEFkwKdmG0o72OCeT5IISkIc38Scg-bC5tXXcms6XhU7cD9pDK5nHWAEGjdpK6dj80KqZSvHs8yssMyceH1JQnNqy0saIff1iN7CXZ8jUwuXuz-wtIlO99WvkXIQSG_Rhbn5r_5C69g4TXuXJORv1KSf-w'"
          />
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm text-on-surface truncate">{{ voice.name }}</div>
            <div v-if="voice.description" class="text-[10px] text-on-surface-variant truncate">{{ voice.description }}</div>
            <div class="flex items-center gap-1.5 mt-1">
              <el-tag size="small" :type="voice.gender === 'female' ? 'warning' : voice.gender === 'male' ? 'info' : 'primary'" effect="plain">
                {{ voice.gender }}
              </el-tag>
              <el-tag size="small" type="success" effect="plain">{{ voice.provider || 'gemini' }}</el-tag>
            </div>
          </div>
          <el-button
            circle
            size="small"
            type="primary"
            :icon="Microphone"
            @click.stop="playSample(voice)"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Microphone } from '@element-plus/icons-vue';
import { useVoiceStore } from '@/stores/voiceStore';
import type { VoicePreset } from '@/types/api';

const voiceStore = useVoiceStore();

const presets = computed(() => voiceStore.voicePresets);
const selectedVoiceId = computed(() => voiceStore.selectedVoice?.id);

function selectVoice(voice: VoicePreset) {
  voiceStore.selectVoice(voice);
}

function playSample(voice: VoicePreset) {
  const url = voice.audioSampleUrl || voice.sampleAudioUrl || voice.sampleUrl;
  if (url) {
    const audio = new Audio(url);
    audio.play().catch(() => {
      console.log('Sample audio preview playback');
    });
  }
}
</script>

<style scoped>
.voice-card {
  border-radius: 12px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
}

.voice-card.is-selected {
  border: 2px solid var(--el-color-primary) !important;
  background-color: #222431 !important;
}
</style>
