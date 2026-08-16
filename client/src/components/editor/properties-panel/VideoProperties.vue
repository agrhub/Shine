<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, Gauge, Wand2 } from 'lucide-vue-next';
import TransformProperty from './options/TransformProperty.vue';
import FlipProperty from './options/FlipProperty.vue';
import ShadowProperty from './options/ShadowProperty.vue';
import StrokeProperty from './options/StrokeProperty.vue';
import FadeGroupProperty from './options/FadeGroupProperty.vue';

const props = defineProps<{
  clip: any;
}>();

const x = ref(0);
const y = ref(0);
const width = ref(1080);
const height = ref(1920);
const rotation = ref(0);
const flip = ref({ x: false, y: false });

const volume = ref(1);
const playbackRate = ref(1);
const opacity = ref(1);
const chromaKeyEnabled = ref(false);
const chromaKeyColor = ref('#00FF00');

const hasShadow = computed(() => !!props.clip?.style?.shadow);
const hasStroke = computed(() => !!props.clip?.style?.stroke);
const fadeIn = computed(() => props.clip?.timing?.fadeIn?.duration || 0);
const fadeOut = computed(() => props.clip?.timing?.fadeOut?.duration || 0);

watch(
  () => props.clip,
  (c) => {
    if (!c) return;
    x.value = c.left ?? c.transform?.x ?? 0;
    y.value = c.top ?? c.transform?.y ?? 0;
    width.value = c.width ?? c.transform?.width ?? 1080;
    height.value = c.height ?? c.transform?.height ?? 1920;
    rotation.value = c.angle ?? c.transform?.angle ?? 0;
    flip.value = c.transform?.flip ?? { x: false, y: false };

    volume.value = c.volume ?? 1;
    playbackRate.value = c.timing?.playbackRate ?? 1;
    opacity.value = c.opacity ?? c.transform?.opacity ?? 1;
    chromaKeyEnabled.value = c.chromaKey?.enabled ?? false;
    chromaKeyColor.value = c.chromaKey?.color || '#00FF00';
  },
  { immediate: true, deep: true }
);

const handleTransformChange = (key: string, val: any) => {
  if (!props.clip) return;
  if (!props.clip.transform) props.clip.transform = {};
  props.clip.transform[key] = val;

  if (key === 'x') {
    x.value = val;
    props.clip.left = val;
  } else if (key === 'y') {
    y.value = val;
    props.clip.top = val;
  } else if (key === 'width') {
    width.value = val;
    props.clip.width = val;
  } else if (key === 'height') {
    height.value = val;
    props.clip.height = val;
  } else if (key === 'angle') {
    rotation.value = val;
    props.clip.angle = val;
  } else if (key === 'flip') {
    flip.value = val;
  }
};

const updateClip = (path: string[], val: any) => {
  if (!props.clip) return;
  let obj: any = props.clip;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!obj[key]) obj[key] = {};
    obj = obj[key];
  }
  const lastKey = path[path.length - 1]!;
  obj[lastKey] = val;
};

const handleVolumeChange = (vals: number[] | undefined) => {
  if (!vals) return;
  volume.value = vals[0] as number;
  if (props.clip) props.clip.volume = volume.value;
};

const handleSpeedChange = (vals: number[] | undefined) => {
  if (!vals) return;
  playbackRate.value = vals[0] as number;
  if (props.clip?.timing) props.clip.timing.playbackRate = playbackRate.value;
};

const handleOpacityChange = (vals: number[] | undefined) => {
  if (!vals) return;
  opacity.value = vals[0] as number;
  if (props.clip) {
    props.clip.opacity = opacity.value;
    if (!props.clip.transform) props.clip.transform = {};
    props.clip.transform.opacity = opacity.value;
  }
};

const handleChromaKeyToggle = (val: boolean) => {
  chromaKeyEnabled.value = val;
  if (props.clip) {
    props.clip.chromaKey = { ...props.clip.chromaKey, enabled: val, color: chromaKeyColor.value };
  }
};

const handleChromaColorChange = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  chromaKeyColor.value = color;
  if (props.clip) props.clip.chromaKey = { ...props.clip.chromaKey, color };
};

const handleFadeIn = (val: number) => {
  if (!props.clip) return;
  if (!props.clip.timing) props.clip.timing = {};
  props.clip.timing.fadeIn = val > 0 ? { duration: val, curve: 'linear' } : undefined;
};

const handleFadeOut = (val: number) => {
  if (!props.clip) return;
  if (!props.clip.timing) props.clip.timing = {};
  props.clip.timing.fadeOut = val > 0 ? { duration: val, curve: 'linear' } : undefined;
};

const handleShadowAdd = () => {
  if (!props.clip) return;
  if (!props.clip.style) props.clip.style = {};
  props.clip.style.shadow = { offsetX: 4, offsetY: 4, blur: 8, color: '#000000' };
};
const handleShadowRemove = () => {
  if (props.clip?.style) props.clip.style.shadow = null;
};
const handleStrokeAdd = () => {
  if (!props.clip) return;
  if (!props.clip.style) props.clip.style = {};
  props.clip.style.stroke = { color: '#000000', width: 2 };
};
const handleStrokeRemove = () => {
  if (props.clip?.style) props.clip.style.stroke = null;
};
</script>

<template>
  <div class="space-y-4 text-xs">
    <div class="font-semibold text-sm">Video Properties</div>

    <!-- Transform (Position X/Y, Size W/H, Rotation) -->
    <div class="border-b border-border/40 pb-4">
      <TransformProperty
        :x="x"
        :y="y"
        :width="width"
        :height="height"
        :rotation="rotation"
        @x-change="(v) => handleTransformChange('x', v)"
        @y-change="(v) => handleTransformChange('y', v)"
        @width-change="(v) => handleTransformChange('width', v)"
        @height-change="(v) => handleTransformChange('height', v)"
        @rotation-change="(v) => handleTransformChange('angle', v)"
      />
    </div>

    <!-- Flip (X/Y) -->
    <div class="border-b border-border/40 pb-4">
      <FlipProperty
        :value="flip"
        @change="(v) => handleTransformChange('flip', v)"
      />
    </div>

    <!-- Speed Multiplier -->
    <div class="space-y-2 border-b border-border/40 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-medium">
          <Gauge class="size-3.5 text-muted-foreground" />
          <span>Speed</span>
        </div>
        <span class="font-mono text-muted-foreground">{{ playbackRate.toFixed(2) }}x</span>
      </div>
      <Slider :model-value="[playbackRate]" :min="0.25" :max="4" :step="0.05" @update:model-value="handleSpeedChange" />
    </div>

    <!-- Volume Control -->
    <div class="space-y-2 border-b border-border/40 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-medium">
          <Volume2 class="size-3.5 text-muted-foreground" />
          <span>Volume</span>
        </div>
        <span class="font-mono text-muted-foreground">{{ Math.round(volume * 100) }}%</span>
      </div>
      <Slider :model-value="[volume]" :min="0" :max="1.5" :step="0.05" @update:model-value="handleVolumeChange" />
    </div>

    <!-- Opacity -->
    <div class="space-y-2 border-b border-border/40 pb-4">
      <div class="flex items-center justify-between">
        <span class="font-medium">Opacity</span>
        <span class="font-mono text-muted-foreground">{{ Math.round(opacity * 100) }}%</span>
      </div>
      <Slider :model-value="[opacity]" :min="0" :max="1" :step="0.01" @update:model-value="handleOpacityChange" />
    </div>

    <!-- Fade In/Out -->
    <div class="border-b border-border/40 pb-4">
      <FadeGroupProperty
        :fade-in-duration="fadeIn"
        :fade-out-duration="fadeOut"
        @fade-in-change="handleFadeIn"
        @fade-out-change="handleFadeOut"
      />
    </div>

    <!-- Drop Shadow -->
    <div class="border-b border-border/40 pb-4">
      <ShadowProperty
        :open="hasShadow"
        :offset-x="clip?.style?.shadow?.offsetX ?? 0"
        :offset-y="clip?.style?.shadow?.offsetY ?? 0"
        :blur="clip?.style?.shadow?.blur ?? 0"
        :color="clip?.style?.shadow?.color ?? '#000000'"
        @add="handleShadowAdd"
        @remove="handleShadowRemove"
        @offset-x-change="(v) => updateClip(['style', 'shadow', 'offsetX'], v)"
        @offset-y-change="(v) => updateClip(['style', 'shadow', 'offsetY'], v)"
        @blur-change="(v) => updateClip(['style', 'shadow', 'blur'], v)"
        @color-change="(v) => updateClip(['style', 'shadow', 'color'], v)"
      />
    </div>

    <!-- Stroke -->
    <div class="border-b border-border/40 pb-4">
      <StrokeProperty
        :open="hasStroke"
        :color="clip?.style?.stroke?.color ?? '#000000'"
        :width="clip?.style?.stroke?.width ?? 0"
        @add="handleStrokeAdd"
        @remove="handleStrokeRemove"
        @color-change="(v) => updateClip(['style', 'stroke', 'color'], v)"
        @width-change="(v) => updateClip(['style', 'stroke', 'width'], v)"
      />
    </div>

    <!-- Chroma Key -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-medium">
          <Wand2 class="size-3.5 text-primary" />
          <span>Chroma Key (Green Screen)</span>
        </div>
        <Switch :checked="chromaKeyEnabled" @update:checked="handleChromaKeyToggle" />
      </div>
      <div v-if="chromaKeyEnabled" class="flex items-center justify-between">
        <span class="text-muted-foreground">Key Color</span>
        <input
          type="color"
          :value="chromaKeyColor"
          @input="handleChromaColorChange"
          class="w-6 h-6 rounded cursor-pointer border border-border bg-transparent p-0"
        />
      </div>
    </div>
  </div>
</template>
