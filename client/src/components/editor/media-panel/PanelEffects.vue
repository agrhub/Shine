<script setup lang="ts">
import { ref } from 'vue';
import { GL_EFFECT_OPTIONS, getEffectOptions, VALUES_FILTER_SPECIAL } from '@openvideo/engine-pixi';
import { core } from '@/lib/project';
import { ScrollArea } from '@/components/ui/scroll-area';

const EFFECT_DURATION_DEFAULT = 5_000_000;
const hovered = ref<Record<string, boolean>>({});

const setHovered = (key: string, value: boolean) => {
  hovered.value[key] = value;
};

const applyEffect = async (effect: any) => {
  try {
    await core.clip.add({
      type: "Effect",
      name: effect.label,
      effectKey: effect.key,
      display: { from: 0, to: EFFECT_DURATION_DEFAULT },
      duration: EFFECT_DURATION_DEFAULT,
    });
  } catch (error) {
    console.error('Failed to add effect:', error);
  }
};

const formatFilterName = (name: string) => {
  return name
    .replace(/Filter$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const effects = getEffectOptions();
const specialEffects = Object.keys(VALUES_FILTER_SPECIAL).map((filterName) => ({
  key: filterName,
  label: formatFilterName(filterName),
  previewStatic: `https://cdn.subgen.co/previews/effects/static/effect_${filterName}_static.webp`,
  previewDynamic: `https://cdn.subgen.co/previews/effects/dynamic/effect_${filterName}_dynamic.webp`,
}));
const allEffects = [...specialEffects, ...effects];
</script>

<template>
  <div class="py-4 h-full flex flex-col">
    <ScrollArea class="flex-1 px-4">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 justify-items-center">
        <div
          v-for="effect in allEffects"
          :key="effect.key"
          class="flex w-full items-center gap-2 flex-col group cursor-pointer"
          @mouseenter="setHovered(effect.key, true)"
          @mouseleave="setHovered(effect.key, false)"
          @click="applyEffect(effect)"
        >
          <div class="relative w-full aspect-video rounded-md bg-input/30 border overflow-hidden">
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
