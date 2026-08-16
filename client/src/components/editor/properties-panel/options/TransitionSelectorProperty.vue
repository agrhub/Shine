<script setup lang="ts">
import { computed, ref } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TransitionOption {
  key: string;
  label: string;
  previewStatic?: string;
  previewDynamic?: string;
}

const props = defineProps<{
  currentKey: string;
}>();

const emit = defineEmits<{
  (e: 'select', key: string): void;
  (e: 'dragStart', key: string): void;
}>();

// Try to get available transitions from engine
let allTransitions: TransitionOption[] = [];
try {
  const { getTransitionOptions } = await import('@openvideo/engine-pixi');
  allTransitions = getTransitionOptions?.() || [];
} catch {
  // Fallback to basic transitions list
  allTransitions = [
    { key: 'fade', label: 'Fade' },
    { key: 'slide-left', label: 'Slide Left' },
    { key: 'slide-right', label: 'Slide Right' },
    { key: 'slide-up', label: 'Slide Up' },
    { key: 'slide-down', label: 'Slide Down' },
    { key: 'zoom-in', label: 'Zoom In' },
    { key: 'zoom-out', label: 'Zoom Out' },
    { key: 'wipe-left', label: 'Wipe Left' },
    { key: 'wipe-right', label: 'Wipe Right' },
    { key: 'dissolve', label: 'Dissolve' },
    { key: 'blur', label: 'Blur' },
  ];
}

const loadedStatic = ref<Record<string, boolean>>({});
const loadedDynamic = ref<Record<string, boolean>>({});
const hoveredKey = ref<string | null>(null);

const handleDragStart = (e: DragEvent, key: string) => {
  e.dataTransfer!.setData('text/plain', key);
  e.dataTransfer!.setData('type', 'transition');
  // Invisible drag image
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  e.dataTransfer!.setDragImage(img, 0, 0);
  emit('dragStart', key);
};
</script>

<template>
  <Tabs default-value="default" class="flex flex-col flex-1 min-h-0">
    <TabsList class="w-full shrink-0">
      <TabsTrigger value="default" class="flex-1 text-xs">Default</TabsTrigger>
      <TabsTrigger value="custom" class="flex-1 text-xs">Custom</TabsTrigger>
    </TabsList>

    <TabsContent value="default" class="flex-1 min-h-0 mt-2">
      <ScrollArea class="h-full">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 p-2">
          <div
            v-for="effect in allTransitions"
            :key="effect.key"
            draggable="true"
            class="flex flex-col items-center gap-1 cursor-pointer select-none group"
            @click="emit('select', effect.key)"
            @dragstart="(e) => handleDragStart(e, effect.key)"
            @mouseenter="hoveredKey = effect.key"
            @mouseleave="hoveredKey = null"
          >
            <div
              :class="[
                'relative w-full aspect-video bg-muted/30 border overflow-hidden rounded',
                currentKey === effect.key && 'ring-2 ring-primary border-primary',
              ]"
            >
              <!-- Static preview -->
              <img
                v-if="effect.previewStatic"
                :src="effect.previewStatic"
                loading="lazy"
                :class="['absolute inset-0 w-full h-full object-cover transition-opacity duration-150', hoveredKey === effect.key ? 'opacity-0' : 'opacity-100']"
                @load="loadedStatic[effect.key] = true"
              />
              <!-- Animated preview on hover -->
              <img
                v-if="effect.previewDynamic"
                :src="effect.previewDynamic"
                loading="lazy"
                :class="['absolute inset-0 w-full h-full object-cover transition-opacity duration-150', hoveredKey === effect.key ? 'opacity-100' : 'opacity-0']"
                @load="loadedDynamic[effect.key] = true"
              />
              <!-- Fallback label if no preview -->
              <div v-if="!effect.previewStatic" class="absolute inset-0 flex items-center justify-center bg-primary/10">
                <span class="text-[10px] font-medium text-primary">{{ effect.label.slice(0, 2) }}</span>
              </div>
              <!-- Label overlay -->
              <div
                v-if="effect.previewStatic"
                :class="['absolute bottom-0 left-0 w-full p-1.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] font-medium truncate text-center transition-opacity duration-150', hoveredKey === effect.key ? 'opacity-0' : 'opacity-100']"
              >
                {{ effect.label }}
              </div>
            </div>
            <span class="text-[10px] text-muted-foreground truncate w-full text-center">{{ effect.label }}</span>
          </div>
        </div>
      </ScrollArea>
    </TabsContent>

    <TabsContent value="custom" class="flex-1 min-h-0 mt-2">
      <div class="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <span class="text-xs">No custom transitions yet.</span>
        <span class="text-[10px]">Create one from the Gallery to see it here.</span>
      </div>
    </TabsContent>
  </Tabs>
</template>
