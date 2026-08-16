<script setup lang="ts">
import { computed } from 'vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';

interface TransformPropertyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
}

const props = withDefaults(defineProps<TransformPropertyProps>(), {
  rotation: 0,
  locked: false,
});

const emit = defineEmits<{
  (e: 'xChange', val: number): void;
  (e: 'yChange', val: number): void;
  (e: 'widthChange', val: number): void;
  (e: 'heightChange', val: number): void;
  (e: 'rotationChange', val: number): void;
  (e: 'lockChange', locked: boolean): void;
}>();

const aspectRatio = computed(() => props.width / props.height || 1);

function handleWidthChange(val: number) {
  emit('widthChange', val);
  if (props.locked) {
    emit('heightChange', Math.round(val / aspectRatio.value));
  }
}

function handleHeightChange(val: number) {
  emit('heightChange', val);
  if (props.locked) {
    emit('widthChange', Math.round(val * aspectRatio.value));
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Transform</span>
    </div>

    <div class="py-1 flex flex-col">
      <!-- X & Y Row -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Position</span>
        <div class="flex gap-1.5 w-[160px]">
          <InputGroup class="flex-1 h-7 bg-secondary border">
            <InputGroupAddon align="inline-start">
              <span class="text-xs text-muted-foreground px-2">X</span>
            </InputGroupAddon>
            <NumberInput
              :model-value="Math.round(x)"
              @update:model-value="emit('xChange', $event)"
              class="pl-0 bg-transparent text-xs!"
            />
          </InputGroup>
          <InputGroup class="flex-1 h-7 bg-secondary border">
            <InputGroupAddon align="inline-start">
              <span class="text-xs text-muted-foreground px-2">Y</span>
            </InputGroupAddon>
            <NumberInput
              :model-value="Math.round(y)"
              @update:model-value="emit('yChange', $event)"
              class="pl-0 bg-transparent text-xs!"
            />
          </InputGroup>
        </div>
      </div>

      <!-- W & H Row -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Size</span>
        <div class="flex gap-1.5 w-[160px]">
          <InputGroup class="flex-1 h-7 bg-secondary border">
            <InputGroupAddon align="inline-start">
              <span class="text-xs text-muted-foreground px-2">W</span>
            </InputGroupAddon>
            <NumberInput
              :model-value="Math.round(width)"
              @update:model-value="handleWidthChange"
              class="pl-0 bg-transparent text-xs!"
            />
          </InputGroup>
          <InputGroup class="flex-1 h-7 bg-secondary border">
            <InputGroupAddon align="inline-start">
              <span class="text-xs text-muted-foreground px-2">H</span>
            </InputGroupAddon>
            <NumberInput
              :model-value="Math.round(height)"
              @update:model-value="handleHeightChange"
              class="pl-0 bg-transparent text-xs!"
            />
          </InputGroup>
        </div>
      </div>

      <!-- Rotation Row -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Rotation</span>
        <InputGroup class="w-[160px] h-7 bg-secondary border">
          <InputGroupAddon align="inline-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              fill="currentColor"
              viewBox="0 0 256 256"
              class="ml-2"
            >
              <path d="M96,72a8,8,0,0,1,8-8A104.11,104.11,0,0,1,208,168a8,8,0,0,1-16,0,88.1,88.1,0,0,0-88-88A8,8,0,0,1,96,72ZM240,192H80V32a8,8,0,0,0-16,0V64H32a8,8,0,0,0,0,16H64V200a8,8,0,0,0,8,8H240a8,8,0,0,0,0-16Z"></path>
            </svg>
          </InputGroupAddon>
          <NumberInput
            :model-value="Math.round(rotation)"
            @update:model-value="emit('rotationChange', $event)"
            class="pl-2 bg-transparent text-xs!"
          />
        </InputGroup>
      </div>
    </div>
  </div>
</template>
