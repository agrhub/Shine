<script setup lang="ts">
import { useSliderThrottle } from '@/composables/useSliderThrottle';
import Slider from '@/components/ui/slider/Slider.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';

const props = defineProps<{
  value: number;
}>();

const emit = defineEmits<{
  (e: 'change', val: number): void;
}>();

const toPercent = (v: number) => Math.round(v * 100);
const fromPercent = (v: number) => v / 100;

const { localValue, handleChange, handleCommit, handleDirectSet } = useSliderThrottle(
  () => toPercent(props.value),
  (pct) => emit('change', fromPercent(pct))
);
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Opacity</span>
    </div>

    <div class="py-1 flex flex-col">
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Opacity</span>
        <div class="flex items-center gap-2 w-[160px]">
          <Slider
            :model-value="[localValue]"
            @update:model-value="v => v && handleChange(v[0])"
            @value-commit="v => v && handleCommit(v[0])"
            :max="100"
            :step="1"
            class="flex-1"
          />
          <InputGroup class="w-14 h-7">
            <NumberInput
              :model-value="localValue"
              @update:model-value="handleDirectSet($event)"
              class="pl-1 bg-transparent text-xs!"
            />
            <InputGroupAddon align="inline-end">
              <span class="text-[10px] text-muted-foreground">%</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>
  </div>
</template>
