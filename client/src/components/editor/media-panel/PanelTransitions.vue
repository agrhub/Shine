<script setup lang="ts">
import { ref } from 'vue';
import { getTransitionOptions } from '@openvideo/engine-pixi';
import { core } from '@/utils/project';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'vue-sonner';

const TRANSITION_DURATION_DEFAULT = 2_000_000;
const hovered = ref<Record<string, boolean>>({});

const setHovered = (key: string, value: boolean) => {
  hovered.value[key] = value;
};

const getAdjacentClips = () => {
  const state = core.store.getState();
  const clipsMap = state.clips || {};
  const tracks = state.tracks || [];
  const selectedIds = state.selectedIds || (state as any).selectedClipIds || [];

  // Search tracks for 2 adjacent clips
  for (const track of tracks) {
    const clipIds = track.clipIds || [];
    if (clipIds.length >= 2) {
      if (selectedIds.length > 0) {
        const idx = clipIds.indexOf(selectedIds[0]);
        if (idx >= 0 && idx < clipIds.length - 1) {
          return { fromClipId: clipIds[idx], toClipId: clipIds[idx + 1] };
        } else if (idx > 0) {
          return { fromClipId: clipIds[idx - 1], toClipId: clipIds[idx] };
        }
      }
      return { fromClipId: clipIds[0], toClipId: clipIds[1] };
    }
  }

  // Fallback: check all clips in clipsMap sorted by display.from
  const sortedClips = Object.values(clipsMap).sort((a: any, b: any) => (a.display?.from || 0) - (b.display?.from || 0));
  if (sortedClips.length >= 2) {
    return { fromClipId: (sortedClips[0] as any).id, toClipId: (sortedClips[1] as any).id };
  }

  return { fromClipId: undefined, toClipId: undefined };
};

const applyTransition = async (effect: any) => {
  try {
    const { fromClipId, toClipId } = getAdjacentClips();

    if (!fromClipId || !toClipId) {
      toast.warning('Need at least 2 clips on the timeline to add a transition.');
      return;
    }

    await core.clip.add({
      type: "Transition",
      name: effect.label,
      transitionKey: effect.key,
      duration: TRANSITION_DURATION_DEFAULT,
      fromClipId,
      toClipId,
    });
    toast.success(`Transition "${effect.label}" added successfully!`);
  } catch (error) {
    console.error('Failed to add transition:', error);
    toast.error('Failed to add transition');
  }
};

const allDefaults = getTransitionOptions();
</script>

<template>
  <div class="p-4 h-full flex flex-col">
    <ScrollArea class="flex-1">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 justify-items-center">
        <div
          v-for="effect in allDefaults"
          :key="effect.key"
          class="flex w-full items-center gap-2 flex-col group cursor-pointer"
          @mouseenter="setHovered(effect.key, true)"
          @mouseleave="setHovered(effect.key, false)"
          @click="applyTransition(effect)"
        >
          <div class="relative w-full aspect-video bg-input/30 border overflow-hidden">
            <div
              v-if="effect.previewStatic || effect.previewDynamic"
              class="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-150"
              :style="{
                backgroundImage: `url(${hovered[effect.key] && effect.previewDynamic ? effect.previewDynamic : effect.previewStatic})`
              }"
            />
            <div v-else class="text-xs text-muted-foreground text-center px-2 bg-primary/40 h-full w-full" />

            <div class="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium truncate text-center transition-opacity duration-150 group-hover:opacity-0">
              {{ effect.label }}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
