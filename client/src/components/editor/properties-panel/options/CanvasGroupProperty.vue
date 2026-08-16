<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);
const maxDuration = computed(() => (studio.value as any)?.getMaxDuration?.() || 0);
const durationSec = computed(() => (maxDuration.value / 1e6));

const trimContent = ref(false);
const aspectRatio = ref('16:9');

const aspectRatioOptions = [
  { value: '16:9', label: '16:9 (Landscape)', width: 1920, height: 1080 },
  { value: '9:16', label: '9:16 (Vertical)', width: 1080, height: 1920 },
  { value: '1:1', label: '1:1 (Square)', width: 1080, height: 1080 },
  { value: '4:5', label: '4:5 (Social)', width: 1080, height: 1350 },
];

const canvasWidth = ref(1920);
const canvasHeight = ref(1080);

const handleAspectRatioChange = (value: string) => {
  const option = aspectRatioOptions.find((o) => o.value === value);
  if (option) {
    aspectRatio.value = value;
    canvasWidth.value = option.width;
    canvasHeight.value = option.height;
    // Apply to studio if supported
    if (studio.value && (studio.value as any).resize) {
      (studio.value as any).resize(option.width, option.height);
    }
  }
};

const handleWidthChange = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value);
  if (val > 0) {
    canvasWidth.value = val;
    aspectRatio.value = 'custom';
  }
};

const handleHeightChange = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value);
  if (val > 0) {
    canvasHeight.value = val;
    aspectRatio.value = 'custom';
  }
};

const backgroundColor = ref('#111111');

const handleBackgroundColorChange = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  backgroundColor.value = color;
  // Apply to studio settings
  if ((studio.value as any)?.core?.execute) {
    (studio.value as any).core.execute({
      id: `bg-color-${Date.now()}`,
      type: 'project.updateSettings',
      payload: { backgroundColor: color },
    });
  }
};
</script>

<template>
  <div class="flex flex-col text-xs">
    <div class="flex items-center justify-between py-2 border-b border-border/40 mb-2">
      <span class="font-semibold text-sm">Template</span>
      <button class="size-5 text-muted-foreground hover:text-foreground flex items-center justify-center">
        <span class="text-base leading-none">+</span>
      </button>
    </div>

    <div class="py-1 flex flex-col gap-2">
      <!-- Width -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-muted-foreground">Width</span>
        <div class="flex items-center gap-1.5 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="number"
            :value="canvasWidth"
            min="1"
            class="bg-transparent text-xs w-full"
            @input="handleWidthChange"
          />
          <span class="text-[10px] text-muted-foreground shrink-0">px</span>
        </div>
      </div>

      <!-- Height -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-muted-foreground">Height</span>
        <div class="flex items-center gap-1.5 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="number"
            :value="canvasHeight"
            min="1"
            class="bg-transparent text-xs w-full"
            @input="handleHeightChange"
          />
          <span class="text-[10px] text-muted-foreground shrink-0">px</span>
        </div>
      </div>

      <!-- Aspect Ratio -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-muted-foreground truncate">Aspect Ratio</span>
        <Select :model-value="aspectRatio" @update:model-value="(val) => val && handleAspectRatioChange(String(val))">
          <SelectTrigger class="w-40 h-7 text-xs bg-muted border-border">
            <SelectValue placeholder="Aspect ratio" />
          </SelectTrigger>
          <SelectContent class="text-xs">
            <SelectItem v-for="opt in aspectRatioOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
            <SelectItem v-if="aspectRatio === 'custom'" value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Background Color -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-muted-foreground">Background</span>
        <div class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <input
            type="color"
            :value="backgroundColor"
            class="h-5 w-5 rounded border border-border p-0 bg-transparent cursor-pointer"
            @input="handleBackgroundColorChange"
          />
          <span class="text-xs font-mono uppercase flex-1 truncate">{{ backgroundColor.toUpperCase() }}</span>
        </div>
      </div>

      <!-- Duration -->
      <div class="flex items-center justify-between gap-4 pt-2 border-t border-border/40">
        <span class="text-muted-foreground">Length</span>
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium h-7 px-2.5 flex items-center justify-center bg-muted border border-border rounded min-w-[60px] select-none">
            {{ durationSec.toFixed(1) }}s
          </span>
        </div>
      </div>

      <!-- Trim Content -->
      <div class="flex items-center gap-2">
        <input
          id="trim-content"
          v-model="trimContent"
          type="checkbox"
          class="rounded border-border bg-muted size-3.5 cursor-pointer"
        />
        <label for="trim-content" class="text-muted-foreground select-none cursor-pointer">Trim content</label>
      </div>
    </div>
  </div>
</template>
