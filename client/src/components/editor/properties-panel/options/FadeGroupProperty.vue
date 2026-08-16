<script setup lang="ts">
import { ref, watch } from 'vue';
import { Slider } from '@/components/ui/slider';

const props = defineProps<{
  fadeInDuration: number;
  fadeOutDuration: number;
  max?: number;
}>();

const emit = defineEmits<{
  (e: 'fadeInChange', val: number): void;
  (e: 'fadeOutChange', val: number): void;
}>();

const maxMs = props.max ?? 5000;

const localFadeIn = ref(props.fadeInDuration || 0);
const localFadeOut = ref(props.fadeOutDuration || 0);

watch(() => props.fadeInDuration, (v) => { localFadeIn.value = v || 0; });
watch(() => props.fadeOutDuration, (v) => { localFadeOut.value = v || 0; });

const handleFadeInChange = (vals: number[] | undefined) => {
  if (!vals) return;
  localFadeIn.value = vals[0] as number;
  emit('fadeInChange', localFadeIn.value);
};

const handleFadeOutChange = (vals: number[] | undefined) => {
  if (!vals) return;
  localFadeOut.value = vals[0] as number;
  emit('fadeOutChange', localFadeOut.value);
};
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold">Fade</span>
    </div>
    <div class="py-1 flex flex-col gap-2">
      <!-- Fade In -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground w-20">Fade-in</span>
        <div class="flex items-center gap-2 flex-1">
          <Slider
            :model-value="[localFadeIn]"
            :min="0"
            :max="maxMs"
            :step="100"
            class="flex-1"
            @update:model-value="handleFadeInChange"
          />
          <span class="text-xs font-mono w-12 text-right">{{ localFadeIn }}ms</span>
        </div>
      </div>
      <!-- Fade Out -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground w-20">Fade-out</span>
        <div class="flex items-center gap-2 flex-1">
          <Slider
            :model-value="[localFadeOut]"
            :min="0"
            :max="maxMs"
            :step="100"
            class="flex-1"
            @update:model-value="handleFadeOutChange"
          />
          <span class="text-xs font-mono w-12 text-right">{{ localFadeOut }}ms</span>
        </div>
      </div>
    </div>
  </div>
</template>
