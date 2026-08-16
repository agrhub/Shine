<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import Slider from '@/components/ui/slider/Slider.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import InputGroupInput from '@/components/ui/input-group/InputGroupInput.vue';

interface TransitionDurationPropertyProps {
  value: number; // in microseconds
  min: number; // in microseconds
  max: number; // in microseconds
}

const props = defineProps<TransitionDurationPropertyProps>();

const emit = defineEmits<{
  (e: 'change', val: number): void;
}>();

const minSeconds = computed(() => props.min / 1_000_000);
const maxSeconds = computed(() => props.max / 1_000_000);

const localValue = ref(props.value / 1_000_000);
const inputStr = ref((props.value / 1_000_000).toFixed(1));
let isEditing = false;

watch(() => props.value, (newVal) => {
  if (!isEditing) {
    const secs = newVal / 1_000_000;
    localValue.value = secs;
    inputStr.value = secs.toFixed(1);
  }
});

import { computed } from 'vue';

function handleCommit(seconds: number) {
  const fps = 30;
  let frameCount = Math.round(seconds * fps);
  if (frameCount % 2 !== 0) frameCount += 1;
  const snapped = (frameCount / fps) * 1_000_000;
  emit('change', snapped);
}

function handleInputFocus() {
  isEditing = true;
}

function handleInputChange(e: Event) {
  const valStr = (e.target as HTMLInputElement).value;
  inputStr.value = valStr;
  const val = parseFloat(valStr);
  if (!isNaN(val)) {
    localValue.value = val;
  }
}

function handleInputBlur() {
  isEditing = false;
  const val = parseFloat(inputStr.value);
  if (!isNaN(val)) {
    const clamped = Math.min(maxSeconds.value, Math.max(minSeconds.value, val));
    handleCommit(clamped);
    localValue.value = clamped;
    inputStr.value = clamped.toFixed(1);
  } else {
    inputStr.value = localValue.value.toFixed(1);
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Transition</span>
      <Button
        variant="ghost"
        size="icon"
        class="size-5 text-muted-foreground hover:text-foreground"
      >
        <span class="text-base leading-none">+</span>
      </Button>
    </div>

    <div class="py-1 flex flex-col">
      <!-- Duration row -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Duration</span>
        <div class="flex items-center gap-2 w-[160px]">
          <Slider
            :model-value="[localValue]"
            @update:model-value="v => { if (v && v[0] !== undefined) { localValue = v[0]; inputStr = v[0].toFixed(1); } }"
            @value-commit="v => v && handleCommit(v[0])"
            :max="maxSeconds"
            :min="minSeconds"
            :step="0.1"
            class="flex-1"
          />
          <InputGroup class="w-16 h-7">
            <InputGroupInput
              type="number"
              :model-value="inputStr"
              @focus="handleInputFocus"
              @input="handleInputChange"
              @blur="handleInputBlur"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
              class="text-xs! p-0 text-center"
            />
            <InputGroupAddon align="inline-end" class="p-0 pr-2">
              <span class="text-[10px] text-muted-foreground">s</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>
  </div>
</template>
