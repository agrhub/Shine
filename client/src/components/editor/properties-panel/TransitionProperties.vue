<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  clip: any;
}>();

const { t } = useI18n();
const duration = ref(2);

watch(
  () => props.clip,
  (newClip) => {
    if (newClip && newClip.duration) {
      duration.value = newClip.duration / 1_000_000;
    }
  },
  { immediate: true, deep: true }
);

const handleDurationChange = (vals: number[] | undefined) => {
  if (vals && vals.length > 0 && props.clip) {
    duration.value = vals[0] as number;
    props.clip.duration = duration.value * 1_000_000;
  }
};
</script>

<template>
  <div class="space-y-4 text-xs">
    <div class="font-semibold text-sm">{{ t('editor.transitionProperties') }}</div>
    <div class="space-y-2">
      <Label class="text-xs">{{ t('editor.transitionDuration') }}</Label>
      <div class="flex items-center gap-3">
        <Slider
          :model-value="[duration]"
          :min="0.2"
          :max="5"
          :step="0.1"
          @update:model-value="handleDurationChange"
          class="flex-1"
        />
        <span class="w-10 text-right font-mono">{{ duration.toFixed(1) }}s</span>
      </div>
    </div>
  </div>
</template>
