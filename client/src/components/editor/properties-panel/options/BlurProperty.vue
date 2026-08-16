<script setup lang="ts">
import { useSliderThrottle } from '@/composables/useSliderThrottle';
import Slider from '@/components/ui/slider/Slider.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';

interface BlurPropertyProps {
  value: number;
  max?: number;
}

const props = withDefaults(defineProps<BlurPropertyProps>(), {
  max: 20,
});

const emit = defineEmits<{
  (e: 'change', val: number): void;
}>();

const { localValue, handleChange, handleCommit, handleDirectSet } = useSliderThrottle(
  () => props.value || 0,
  (val) => emit('change', val)
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Blur
    </label>
    <div class="flex items-center gap-4">
      <Slider
        :model-value="[localValue]"
        @update:model-value="v => v && handleChange(v[0])"
        @value-commit="v => v && handleCommit(v[0])"
        :max="max"
        :step="0.5"
        class="flex-1"
      />
      <InputGroup class="w-20 h-7">
        <NumberInput
          :model-value="localValue"
          @update:model-value="handleDirectSet($event || 0)"
          :step="0.5"
          class="p-0 text-center"
        />
        <InputGroupAddon align="inline-end" class="p-0 pr-2">
          <span class="text-[10px] text-muted-foreground">px</span>
        </InputGroupAddon>
      </InputGroup>
    </div>
  </div>
</template>
