<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue';
import Assistant from './Assistant.vue';
import PropertiesPanel from './properties-panel/PropertiesPanel.vue';
import { usePanelStore } from '@/stores/usePanelStore';
import { useStudioStore } from '~/composables/useStudioStore';
import { useTimelineStore } from '~/composables/useTimelineStore';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { core } from '@/lib/project';
import { generateUUID } from '@/utils/id';

const panelStore = usePanelStore();
const { state: studioState } = useStudioStore();
const { state: timelineState } = useTimelineStore();

const coreSelectedIds = ref<string[]>([]);
const coreClipsMap = ref<Record<string, any>>({});

const unsubStore = core.store.subscribe((state: any) => {
  coreSelectedIds.value = state.selectedIds || state.selectedClipIds || [];
  coreClipsMap.value = state.clips || {};
});
onUnmounted(() => unsubStore());

const selectedClips = computed(() => {
  // 1. Studio Pixi canvas selected clips
  if (studioState.value.selectedClips && studioState.value.selectedClips.length > 0) {
    return studioState.value.selectedClips;
  }

  // 2. Core Store / Timeline Store selectedClipIds
  const ids = coreSelectedIds.value.length > 0 ? coreSelectedIds.value : (timelineState.value.selectedClipIds || []);
  if (ids.length > 0) {
    const clips = ids
      .map((id) => {
        const studioClip = studioState.value.studio?.timeline?.getClipById?.(id);
        return studioClip || (core.clip as any).get?.(id) || timelineState.value.clips[id] || coreClipsMap.value[id];
      })
      .filter(Boolean);
    if (clips.length > 0) return clips;
  }

  return [];
});

const hasActiveClip = computed(() => selectedClips.value.length > 0);

// Automatically hide Chatbot (isCopilotVisible = false) whenever an object clip is selected
watch(
  selectedClips,
  (clips) => {
    if (clips && clips.length > 0) {
      panelStore.isCopilotVisible = false;
    }
  },
  { immediate: true, deep: true }
);

// Read initial state from core store
const coreSettings = core.store.getState().settings;
const width = ref(coreSettings.width ?? 1920);
const height = ref(coreSettings.height ?? 1080);
const backgroundColor = ref((coreSettings as any).bgColor ?? '#111111');
const aspectRatio = ref(
  width.value === height.value ? '1:1' :
  width.value > height.value ? '16:9' : '9:16'
);

const handleDimensionChange = (newW?: number, newH?: number) => {
  const w = newW ?? width.value;
  const h = newH ?? height.value;
  width.value = w;
  height.value = h;
  core.execute({
    id: generateUUID(),
    type: 'project.updateSettings',
    payload: { width: w, height: h },
  });
};

const handleAspectChange = (val: any) => {
  aspectRatio.value = String(val || '9:16');
  if (aspectRatio.value === '9:16') handleDimensionChange(1080, 1920);
  else if (aspectRatio.value === '16:9') handleDimensionChange(1920, 1080);
  else if (aspectRatio.value === '1:1') handleDimensionChange(1080, 1080);
};

const handleBgChange = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  backgroundColor.value = color;
  core.execute({
    id: generateUUID(),
    type: 'project.updateSettings',
    payload: { artboardColor: color, bgColor: color },
  });
  if (studioState.value.studio) {
    const studio = studioState.value.studio as any;
    studio.setArtboardColor?.(color);
    studio.requestRender?.();
  }
};
</script>

<template>
  <div class="w-full h-full overflow-hidden flex flex-col bg-card border-l">
    <!-- Mode 1: AI Assistant -->
    <Assistant v-if="panelStore.isCopilotVisible" />

    <!-- Mode 2: Object Clip Properties or Canvas Settings -->
    <template v-else>
      <PropertiesPanel v-if="hasActiveClip" :selected-clips="selectedClips" />

      <!-- Default Canvas Properties Panel -->
      <div v-else class="p-4 space-y-6 text-xs overflow-y-auto h-full">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-sm">Canvas Properties</h3>
        </div>

        <div class="space-y-4">
          <!-- Width -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Width</span>
            <div class="flex items-center gap-1 w-32">
              <Input
                type="number"
                v-model.number="width"
                @change="() => handleDimensionChange()"
                class="h-8 text-xs text-right"
              />
              <span class="text-muted-foreground text-[10px]">px</span>
            </div>
          </div>

          <!-- Height -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Height</span>
            <div class="flex items-center gap-1 w-32">
              <Input
                type="number"
                v-model.number="height"
                @change="() => handleDimensionChange()"
                class="h-8 text-xs text-right"
              />
              <span class="text-muted-foreground text-[10px]">px</span>
            </div>
          </div>

          <!-- Aspect Ratio -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Aspect Ratio</span>
            <Select :model-value="aspectRatio" @update:model-value="handleAspectChange">
              <SelectTrigger class="w-32 h-8 text-xs">
                <SelectValue placeholder="Aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Background Color -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Background</span>
            <div class="flex items-center gap-2 w-32 justify-end">
              <input
                type="color"
                :value="backgroundColor"
                @input="handleBgChange"
                class="w-6 h-6 rounded cursor-pointer border border-border bg-transparent p-0"
              />
              <span class="font-mono text-[11px] uppercase">{{ backgroundColor }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
