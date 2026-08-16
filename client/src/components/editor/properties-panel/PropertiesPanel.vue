<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import TextProperties from './TextProperties.vue'
import ImageProperties from './ImageProperties.vue'
import VideoProperties from './VideoProperties.vue'
import AudioProperties from './AudioProperties.vue'
import CaptionProperties from './CaptionProperties.vue'
import EffectProperties from './EffectProperties.vue'
import TransitionProperties from './TransitionProperties.vue'
import CanvasGroupProperty from './options/CanvasGroupProperty.vue'
import FillProperty from './options/FillProperty.vue'
import ShadowProperty from './options/ShadowProperty.vue'
import StrokeProperty from './options/StrokeProperty.vue'
import type { IClip } from '@openvideo/engine-pixi'

interface PropertiesPanelProps {
  selectedClips: any[]
}

const props = defineProps<PropertiesPanelProps>()

const tick = ref(0)

onMounted(() => {
  if (props.selectedClips.length !== 1) return
  const clip = props.selectedClips[0]
  const onPropsChange = () => tick.value++
  clip.on('propsChange', onPropsChange)
  onUnmounted(() => {
    clip.off('propsChange', onPropsChange)
  })
})

const clip = computed(() => props.selectedClips[0])

const isType = (clip: any, type: string) => {
  if (!clip) return false;
  const clipType = clip.type || clip.assetType || clip.category;
  return String(clipType || '').toLowerCase() === type.toLowerCase();
};

// Shape property helpers
const hasFill = computed(() => {
  const c = clip.value as any
  return !!c?.style?.fill && c.style.fill !== 'transparent'
})
const hasShadow = computed(() => !!(clip.value as any)?.style?.shadow)
const hasStroke = computed(() => !!(clip.value as any)?.style?.stroke)

const updateShape = (path: string[], val: any) => {
  if (!clip.value) return;
  let obj: any = clip.value;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!obj[key]) obj[key] = {};
    obj = obj[key];
  }
  const lastKey = path[path.length - 1]!;
  obj[lastKey] = val;
}
</script>

<template>
  <!-- Multi-selection -->
  <div v-if="selectedClips.length > 1" class="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
    <div class="text-lg font-medium">Group</div>
    <p class="text-xs text-muted-foreground">{{ selectedClips.length }} clips selected</p>
  </div>

  <!-- Single clip selected -->
  <ScrollArea v-else-if="selectedClips.length === 1" class="h-full">
    <div class="flex flex-col gap-4 p-4">
      <TextProperties v-if="isType(clip, 'text')" :clip="clip!" />
      <ImageProperties v-else-if="isType(clip, 'image')" :clip="clip!" />
      <VideoProperties v-else-if="isType(clip, 'video')" :clip="clip!" />
      <AudioProperties v-else-if="isType(clip, 'audio')" :clip="clip!" />
      <CaptionProperties v-else-if="isType(clip, 'caption')" :clip="clip!" />
      <EffectProperties v-else-if="isType(clip, 'effect')" :clip="clip!" />
      <TransitionProperties v-else-if="isType(clip, 'transition')" :clip="clip!" />

      <!-- Shape clip -->
      <div v-else-if="isType(clip, 'shape')" class="space-y-4 text-xs">
        <div class="font-semibold text-sm">Shape Properties</div>

        <!-- Fill -->
        <div class="border-b border-border/40 pb-4">
          <FillProperty
            :color="(clip as any)?.style?.fill || ''"
            @color-change="(v) => updateShape(['style', 'fill'], v)"
          />
        </div>

        <!-- Shadow -->
        <div class="border-b border-border/40 pb-4">
          <ShadowProperty
            :open="hasShadow"
            :offset-x="(clip as any)?.style?.shadow?.offsetX ?? 0"
            :offset-y="(clip as any)?.style?.shadow?.offsetY ?? 0"
            :blur="(clip as any)?.style?.shadow?.blur ?? 0"
            :color="(clip as any)?.style?.shadow?.color ?? '#000000'"
            @add="updateShape(['style', 'shadow'], { offsetX: 4, offsetY: 4, blur: 8, color: '#000000' })"
            @remove="updateShape(['style', 'shadow'], null)"
            @offset-x-change="(v) => updateShape(['style', 'shadow', 'offsetX'], v)"
            @offset-y-change="(v) => updateShape(['style', 'shadow', 'offsetY'], v)"
            @blur-change="(v) => updateShape(['style', 'shadow', 'blur'], v)"
            @color-change="(v) => updateShape(['style', 'shadow', 'color'], v)"
          />
        </div>

        <!-- Stroke -->
        <div>
          <StrokeProperty
            :open="hasStroke"
            :color="(clip as any)?.style?.stroke?.color ?? '#000000'"
            :width="(clip as any)?.style?.stroke?.width ?? 0"
            @add="updateShape(['style', 'stroke'], { color: '#000000', width: 2 })"
            @remove="updateShape(['style', 'stroke'], null)"
            @color-change="(v) => updateShape(['style', 'stroke', 'color'], v)"
            @width-change="(v) => updateShape(['style', 'stroke', 'width'], v)"
          />
        </div>
      </div>

      <div v-else-if="clip" class="text-muted-foreground text-sm">
        {{ clip.type }} Properties
      </div>
    </div>
  </ScrollArea>

  <!-- Nothing selected — show canvas settings -->
  <ScrollArea v-else class="h-full">
    <div class="p-4">
      <CanvasGroupProperty />
    </div>
  </ScrollArea>
</template>
