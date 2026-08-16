<script setup lang="ts">
import { useSliderThrottle } from '@/composables/useSliderThrottle';
import Slider from '@/components/ui/slider/Slider.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';
import { ChevronsUpDown } from 'lucide-vue-next';

interface SpacingPropertyProps {
  lineHeight: number;
  letterSpacing?: number;
  onLetterSpacingChange?: (val: number) => void;
}

const props = defineProps<SpacingPropertyProps>();

const emit = defineEmits<{
  (e: 'lineHeightChange', val: number): void;
  (e: 'letterSpacingChange', val: number): void;
}>();

const lh = useSliderThrottle(
  () => props.lineHeight || 1.2,
  (val) => emit('lineHeightChange', val)
);

const ls = useSliderThrottle(
  () => props.letterSpacing || 0,
  (val) => emit('letterSpacingChange', val)
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Spacing
    </label>

    <!-- Line Height -->
    <div class="flex items-center gap-4">
      <ChevronsUpDown class="size-4 text-muted-foreground shrink-0" />
      <Slider
        :model-value="[lh.localValue.value]"
        @update:model-value="v => v && lh.handleChange(v[0])"
        @value-commit="v => v && lh.handleCommit(v[0])"
        :min="0.5"
        :max="3"
        :step="0.1"
        class="flex-1"
      />
      <InputGroup class="w-20 h-7">
        <NumberInput
          :model-value="lh.localValue.value"
          @update:model-value="lh.handleDirectSet($event)"
          :step="0.1"
          class="p-0 text-center"
        />
      </InputGroup>
    </div>

    <!-- Letter Spacing -->
    <div v-if="letterSpacing !== undefined" class="flex items-center gap-4">
      <span class="text-[10px] text-muted-foreground w-4 text-center">A</span>
      <Slider
        :model-value="[ls.localValue.value]"
        @update:model-value="v => v && ls.handleChange(v[0])"
        @value-commit="v => v && ls.handleCommit(v[0])"
        :min="-5"
        :max="20"
        :step="0.5"
        class="flex-1"
      />
      <InputGroup class="w-20 h-7">
        <NumberInput
          :model-value="ls.localValue.value"
          @update:model-value="ls.handleDirectSet($event)"
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
