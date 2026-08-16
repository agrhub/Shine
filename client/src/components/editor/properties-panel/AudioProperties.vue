<script setup lang="ts">
import { ref, watch } from 'vue';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2, Gauge, Sparkles } from 'lucide-vue-next';

const props = defineProps<{
  clip: any;
}>();

const volume = ref(1);
const playbackRate = ref(1);
const noiseReduction = ref(false);
const enhanceVoice = ref(false);

watch(
  () => props.clip,
  (newClip) => {
    if (newClip) {
      volume.value = newClip.volume ?? 1;
      playbackRate.value = newClip.timing?.playbackRate ?? 1;
      noiseReduction.value = !!newClip.metadata?.noiseReduction;
      enhanceVoice.value = !!newClip.metadata?.enhanceVoice;
    }
  },
  { immediate: true, deep: true }
);

const handleVolumeChange = (vals: number[] | undefined) => {
  if (vals && vals.length > 0 && props.clip) {
    volume.value = vals[0] as number;
    props.clip.volume = volume.value;
  }
};

const handleSpeedChange = (vals: number[] | undefined) => {
  if (vals && vals.length > 0 && props.clip) {
    playbackRate.value = vals[0] as number;
    if (props.clip.timing) {
      props.clip.timing.playbackRate = playbackRate.value;
    }
  }
};

const handleNoiseReductionToggle = (val: boolean) => {
  noiseReduction.value = val;
  if (props.clip) {
    props.clip.metadata = { ...props.clip.metadata, noiseReduction: val };
  }
};

const handleEnhanceVoiceToggle = (val: boolean) => {
  enhanceVoice.value = val;
  if (props.clip) {
    props.clip.metadata = { ...props.clip.metadata, enhanceVoice: val };
  }
};
</script>

<template>
  <div class="space-y-6 text-xs">
    <div class="font-semibold text-sm">Audio Properties</div>

    <!-- Volume Control -->
    <div class="space-y-2 border-b border-border/40 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-medium">
          <Volume2 class="size-3.5 text-muted-foreground" />
          <span>Volume</span>
        </div>
        <span class="font-mono text-muted-foreground">{{ Math.round(volume * 100) }}%</span>
      </div>
      <Slider
        :model-value="[volume]"
        :min="0"
        :max="2"
        :step="0.05"
        @update:model-value="handleVolumeChange"
      />
    </div>

    <!-- Speed Multiplier -->
    <div class="space-y-2 border-b border-border/40 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-medium">
          <Gauge class="size-3.5 text-muted-foreground" />
          <span>Speed Multiplier</span>
        </div>
        <span class="font-mono text-muted-foreground">{{ playbackRate.toFixed(2) }}x</span>
      </div>
      <Slider
        :model-value="[playbackRate]"
        :min="0.25"
        :max="4"
        :step="0.05"
        @update:model-value="handleSpeedChange"
      />
    </div>

    <!-- AI Audio Tools -->
    <div class="space-y-3">
      <div class="flex items-center gap-1.5 font-medium text-muted-foreground uppercase text-[10px] tracking-wider">
        <Sparkles class="size-3 text-primary" />
        <span>AI Audio Enhancements</span>
      </div>

      <div class="flex items-center justify-between">
        <span>Noise Reduction</span>
        <Switch :checked="noiseReduction" @update:checked="handleNoiseReductionToggle" />
      </div>

      <div class="flex items-center justify-between">
        <span>Enhance Voice Clarity</span>
        <Switch :checked="enhanceVoice" @update:checked="handleEnhanceVoiceToggle" />
      </div>
    </div>
  </div>
</template>
