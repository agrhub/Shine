<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { timeUsToUnits, unitsToTimeUs, type ITimelineScaleState } from '@openvideo/timeline';
import { usePlaybackStore } from '@/composables/usePlaybackStore';

const props = defineProps<{
  scrollLeft: number;
  scale: ITimelineScaleState;
  timelineOffsetX?: number;
}>();

const { state: playbackState, seek } = usePlaybackStore();

const isDragging = ref(false);
const localTimeUs = ref<number | null>(null);

const startX = ref(0);
const startTimeUs = ref(0);

const currentTimeUs = computed(() => (playbackState.value.currentTime || 0) * 1_000_000);
const displayTimeUs = computed(() => (localTimeUs.value !== null ? localTimeUs.value : currentTimeUs.value));

const position = computed(() => {
  return timeUsToUnits(displayTimeUs.value, props.scale.zoom) - props.scrollLeft;
});

const handleMouseMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const deltaX = clientX - startX.value;

  const deltaTimeUs = unitsToTimeUs(deltaX, props.scale.zoom);
  const newTimeUs = Math.max(0, startTimeUs.value + deltaTimeUs);

  localTimeUs.value = newTimeUs;
  seek(newTimeUs / 1_000_000);
};

const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    localTimeUs.value = null;

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleMouseMove);
    window.removeEventListener('touchend', handleMouseUp);
  }
};

const handleMouseDown = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

  startX.value = clientX;
  startTimeUs.value = currentTimeUs.value;
  isDragging.value = true;
  localTimeUs.value = currentTimeUs.value;

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('touchmove', handleMouseMove, { passive: false });
  window.addEventListener('touchend', handleMouseUp);
};

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('touchmove', handleMouseMove);
  window.removeEventListener('touchend', handleMouseUp);
});
</script>

<template>
  <div
    id="playhead"
    :style="{
      position: 'absolute',
      left: `${(props.timelineOffsetX || 0) + 16 + position}px`,
      top: '50px',
      width: '12px',
      marginLeft: '-6px',
      height: 'calc(100% - 50px)',
      zIndex: 40,
      cursor: isDragging ? 'grabbing' : 'grab',
      touchAction: 'none',
    }"
    @mousedown="handleMouseDown"
    @touchstart="handleMouseDown"
  >
    <!-- Playhead Handle -->
    <div
      :class="[
        'absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 rounded-b border shadow-md flex items-center justify-center z-50 transition-colors bg-primary border-primary',
        isDragging ? 'bg-primary border-primary ring-2 ring-primary/40' : ''
      ]"
    >
      <div class="w-0.5 h-2.5 bg-primary-foreground/80 rounded-full" />
    </div>

    <!-- Vertical Line -->
    <div class="relative h-full pointer-events-none">
      <div class="absolute top-0 left-1/2 h-full w-[1.5px] -translate-x-1/2 transform bg-primary shadow-sm" />
    </div>
  </div>
</template>
