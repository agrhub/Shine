<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import Slider from '@/components/ui/slider/Slider.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';
import { useSliderThrottle } from '@/composables/useSliderThrottle';
import { RotateCcw } from 'lucide-vue-next';

interface SpeedPropertyProps {
  timing: any;
}

const props = defineProps<SpeedPropertyProps>();

const emit = defineEmits<{
  (e: 'change', timingUpdates: any): void;
}>();

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const displayFrom = computed(() => props.timing?.display?.from ?? 0);
const displayTo = computed(() => props.timing?.display?.to ?? 0);
const currentDisplayDurationUs = computed(() => Math.max(0, displayTo.value - displayFrom.value));
const currentSpeed = computed(() => props.timing?.playbackRate || 1);

const trimFrom = computed(() => props.timing?.trim?.from ?? 0);
const trimTo = computed(() => props.timing?.trim?.to ?? 0);
const rawTrimDuration = computed(() => {
  return trimTo.value > trimFrom.value ? trimTo.value - trimFrom.value : (props.timing?.duration ?? currentDisplayDurationUs.value);
});
const trimDurationUs = computed(() => {
  return rawTrimDuration.value > 0 ? rawTrimDuration.value : currentDisplayDurationUs.value * currentSpeed.value;
});

const displayDurationSec = computed(() => {
  return Math.round((currentDisplayDurationUs.value / 1_000_000) * 100) / 100;
});

function applySpeed(newSpeed: number) {
  const clampedSpeed = Math.round(Math.max(0.1, Math.min(10, newSpeed)) * 100) / 100;
  const newDisplayDurationUs = Math.round(trimDurationUs.value / clampedSpeed);
  const newDisplayTo = displayFrom.value + newDisplayDurationUs;

  emit('change', {
    timing: {
      ...props.timing,
      playbackRate: clampedSpeed,
      display: {
        from: displayFrom.value,
        to: newDisplayTo,
      },
      duration: newDisplayDurationUs,
    },
  });
}

function applyDurationSec(durationSec: number) {
  const targetSec = Math.max(0.1, durationSec);
  const targetDurationUs = Math.round(targetSec * 1_000_000);
  const calculatedSpeed = Math.round((trimDurationUs.value / targetDurationUs) * 100) / 100;
  const clampedSpeed = Math.max(0.1, Math.min(10, calculatedSpeed));
  const newDisplayTo = displayFrom.value + targetDurationUs;

  emit('change', {
    timing: {
      ...props.timing,
      playbackRate: clampedSpeed,
      display: {
        from: displayFrom.value,
        to: targetDurationUs === 0 ? displayTo.value : newDisplayTo,
      },
      duration: targetDurationUs,
    },
  });
}

const speedSlider = useSliderThrottle(() => currentSpeed.value, applySpeed);
const durationSlider = useSliderThrottle(() => displayDurationSec.value, applyDurationSec);
</script>

<template>
  <div class="flex flex-col border-b border-border/40 pb-3 mb-1">
    <!-- Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Speed & Duration</span>
      <Button
        v-if="currentSpeed !== 1"
        variant="ghost"
        size="icon"
        @click="applySpeed(1)"
        class="size-6 text-muted-foreground hover:text-foreground"
        title="Reset to 1.0x"
      >
        <RotateCcw class="size-3.5" />
      </Button>
    </div>

    <div class="py-1 flex flex-col gap-3">
      <!-- Speed Multiplier Controls -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Speed</span>
          <InputGroup class="w-20 h-7">
            <NumberInput
              :model-value="speedSlider.localValue.value"
              @update:model-value="speedSlider.handleDirectSet($event || 1)"
              class="pl-1.5 bg-transparent text-xs font-medium"
              :step="0.1"
              :min="0.1"
              :max="10"
            />
            <InputGroupAddon align="inline-end">
              <span class="text-[10px] text-muted-foreground pr-1">x</span>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <Slider
          :model-value="[speedSlider.localValue.value]"
          @update:model-value="v => v && speedSlider.handleChange(v[0])"
          @value-commit="v => v && speedSlider.handleCommit(v[0])"
          :min="0.25"
          :max="4"
          :step="0.05"
          class="w-full"
        />

        <!-- Preset Buttons -->
        <div class="grid grid-cols-6 gap-1 pt-1">
          <Button
            v-for="preset in SPEED_PRESETS"
            :key="preset"
            :variant="currentSpeed === preset ? 'secondary' : 'outline'"
            size="sm"
            class="h-6 text-[11px] px-0"
            :class="currentSpeed === preset ? 'font-bold border-primary/50' : 'text-muted-foreground'"
            @click="applySpeed(preset)"
          >
            {{ preset }}x
          </Button>
        </div>
      </div>

      <!-- Duration Control -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs text-muted-foreground">Duration</span>
        <InputGroup class="w-24 h-7">
          <NumberInput
            :model-value="durationSlider.localValue.value"
            @update:model-value="durationSlider.handleDirectSet($event || 0.1)"
            class="pl-1.5 bg-transparent text-xs font-medium"
            :step="0.5"
            :min="0.1"
          />
          <InputGroupAddon align="inline-end">
            <span class="text-[10px] text-muted-foreground pr-1">sec</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  </div>
</template>
