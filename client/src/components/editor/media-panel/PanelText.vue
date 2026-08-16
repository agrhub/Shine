<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { core } from '@/lib/project';
import { Log } from '@openvideo/engine-pixi';
import { TEXT_PRESETS } from '@/constants/text-presets';

const handleAddText = async (preset?: (typeof TEXT_PRESETS)[number]) => {
  try {
    const activePreset = preset || TEXT_PRESETS[0];
    await core.clip.add({
      type: activePreset.type,
      name: activePreset.name,
      text: preset ? activePreset.text : "This is a text clip",
      style: activePreset.style,
      timing: activePreset.timing,
      transform: activePreset.transform,
    });
  } catch (error) {
    Log.error("Failed to add text:", error);
  }
};
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-background gap-4 py-4">
    <div class="px-4 border-b border-border/40 pb-4">
      <div
        class="w-full h-9 bg-secondary hover:bg-secondary/85 text-secondary-foreground flex items-center justify-center text-sm font-medium cursor-pointer transition-colors border border-border/20 shadow-sm"
        @click="() => handleAddText()"
      >
        Add Text
      </div>
    </div>

    <ScrollArea class="flex-1 px-4">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4 pb-6">
        <button
          v-for="(preset, index) in TEXT_PRESETS"
          :key="index"
          @click="handleAddText(preset)"
          class="aspect-[3/2] w-full bg-secondary/15 hover:bg-secondary/25 border hover:border-border/60 transition-all duration-300 flex items-center justify-center p-3 active:scale-[0.98] shadow-sm hover:shadow-md overflow-hidden relative group"
        >
          <!-- Subtle hover gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div
            v-if="preset.metadata?.previewUrl"
            class="flex-1 w-full flex items-center justify-center min-h-0 transition-transform duration-300 group-hover:scale-105"
          >
            <img
              :src="preset.metadata.previewUrl"
              :alt="preset.name"
              class="max-h-full max-w-full object-contain pointer-events-none"
            />
          </div>
          <span
            v-else
            :style="{
              fontFamily: preset.style.fontFamily,
              fontSize: '20px',
              fontWeight: preset.style.fontWeight,
              color: preset.style.color,
              textAlign: 'center',
            }"
            class="line-clamp-2 break-words transition-transform duration-300 group-hover:scale-105"
          >
            {{ preset.text }}
          </span>
        </button>
      </div>
    </ScrollArea>
  </div>
</template>
