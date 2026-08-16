<script setup lang="ts">
import { ref, watch } from 'vue';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundBorderRadius?: number;
  backgroundPaddingX?: number;
  backgroundPaddingY?: number;
}>();

const emit = defineEmits<{
  (e: 'backgroundColorChange', val: string): void;
  (e: 'backgroundOpacityChange', val: number): void;
  (e: 'backgroundBorderRadiusChange', val: number): void;
  (e: 'backgroundPaddingXChange', val: number): void;
  (e: 'backgroundPaddingYChange', val: number): void;
}>();

const bgEnabled = ref(
  !!props.backgroundColor && props.backgroundColor !== '' && props.backgroundColor !== 'transparent'
);
const localBgColor = ref(props.backgroundColor || '#000000');

watch(() => props.backgroundColor, (v) => {
  localBgColor.value = v || '#000000';
  bgEnabled.value = !!v && v !== '' && v !== 'transparent';
});

const handleColorInput = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  localBgColor.value = color;
  emit('backgroundColorChange', color);
};
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold">Text Background</span>
      <div class="flex gap-1">
        <Button
          v-if="!bgEnabled"
          variant="ghost" size="icon" class="size-5 text-muted-foreground"
          @click="emit('backgroundColorChange', '#000000')"
        >
          <Plus class="size-3" />
        </Button>
        <Button
          v-else
          variant="ghost" size="icon" class="size-5 text-destructive"
          @click="emit('backgroundColorChange', '')"
        >
          <Trash2 class="size-3" />
        </Button>
      </div>
    </div>

    <div v-if="bgEnabled" class="py-1 flex flex-col gap-2">
      <!-- Color -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Color</span>
        <div class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input type="color" :value="localBgColor" class="h-5 w-5 rounded border border-border p-0 bg-transparent cursor-pointer" @input="handleColorInput" />
          <span class="text-xs font-mono uppercase flex-1 truncate">{{ localBgColor.toUpperCase() }}</span>
        </div>
      </div>

      <!-- Opacity -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Opacity</span>
        <div class="flex items-center gap-2 w-40">
          <Slider
            :model-value="[backgroundOpacity ?? 1]"
            :min="0" :max="1" :step="0.05"
            class="flex-1"
            @update:model-value="(v) => emit('backgroundOpacityChange', v![0])"
          />
          <span class="text-xs font-mono w-8 text-right">{{ Math.round((backgroundOpacity ?? 1) * 100) }}%</span>
        </div>
      </div>

      <!-- Border Radius -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Radius</span>
        <div class="flex items-center gap-1.5 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="number"
            :value="backgroundBorderRadius ?? 4"
            min="0"
            class="bg-transparent text-xs w-full"
            @input="emit('backgroundBorderRadiusChange', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-[10px] text-muted-foreground shrink-0">px</span>
        </div>
      </div>

      <!-- Padding X -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Pad X</span>
        <div class="flex items-center gap-1.5 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="number"
            :value="backgroundPaddingX ?? 8"
            min="0"
            class="bg-transparent text-xs w-full"
            @input="emit('backgroundPaddingXChange', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-[10px] text-muted-foreground shrink-0">px</span>
        </div>
      </div>

      <!-- Padding Y -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Pad Y</span>
        <div class="flex items-center gap-1.5 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="number"
            :value="backgroundPaddingY ?? 4"
            min="0"
            class="bg-transparent text-xs w-full"
            @input="emit('backgroundPaddingYChange', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-[10px] text-muted-foreground shrink-0">px</span>
        </div>
      </div>
    </div>
  </div>
</template>
