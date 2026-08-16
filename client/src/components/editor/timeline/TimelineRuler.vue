<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import {
  MICROSECONDS_PER_SECOND,
  PIXELS_PER_SECOND,
  SECONDARY_FONT,
  type ITimelineScaleState,
} from '@openvideo/timeline';
import { usePlaybackStore } from '@/composables/usePlaybackStore';
import { useTheme } from '@/composables/useTheme';

const props = withDefaults(
  defineProps<{
    scale: ITimelineScaleState;
    scrollLeft?: number;
    height?: number;
    offsetX?: number;
    onClick?: (units: number) => void;
    onScroll?: (scrollLeft: number) => void;
  }>(),
  {
    scrollLeft: 0,
    height: 24,
    offsetX: 16,
  }
);

const { state: playbackState } = usePlaybackStore();
const { theme } = useTheme();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragging = ref(false);
const dragRef = ref({
  startX: 0,
  startScrollPos: 0,
  isDragging: false,
});

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const offsetParent = canvas.offsetParent as HTMLElement;
  const width = offsetParent?.offsetWidth || canvas.offsetWidth || 1000;
  const height = props.height;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  context.save();
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const isDark = theme.value === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const pixelsPerSecond = PIXELS_PER_SECOND * props.scale.zoom;
  const durationUs = (playbackState.value.duration || 10) * 1_000_000;

  context.fillStyle = textColor;
  context.strokeStyle = textColor;
  context.lineWidth = 1;
  context.font = `11px ${SECONDARY_FONT || 'sans-serif'}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const minTextSpacing = 60;
  const intervalOptions = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  let mainInterval = 80;

  for (const opt of intervalOptions) {
    if (opt * pixelsPerSecond >= minTextSpacing) {
      mainInterval = opt;
      break;
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);

    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    if (h > 0) return `${h}:${mStr}:${sStr}`;
    if (mainInterval < 1) return `${mStr}:${sStr}.${ms}`;
    return `${mStr}:${sStr}`;
  };

  let subTickCount = 5;
  if (mainInterval === 0.1) subTickCount = 2;
  if (mainInterval === 1) subTickCount = 5;
  if (mainInterval === 60) subTickCount = 4;

  let subInterval = mainInterval / subTickCount;
  if (subInterval * pixelsPerSecond < 6) {
    subInterval = mainInterval;
  }

  const startTime =
    Math.floor((props.scrollLeft - props.offsetX) / pixelsPerSecond / subInterval) * subInterval;
  const endTime = (props.scrollLeft - props.offsetX + width) / pixelsPerSecond;
  const count = Math.ceil((endTime - startTime) / subInterval) + 1;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * subInterval;
    if (time < 0) continue;

    const x = Math.floor(time * pixelsPerSecond - props.scrollLeft + props.offsetX) + 0.5;

    if (x > width) break;
    if (x < -50) continue;

    const isBeyondDuration = time > durationUs / MICROSECONDS_PER_SECOND + 0.001;
    const baseAlpha = isBeyondDuration ? 0.4 : 1.0;

    const isMain =
      Math.abs(time % mainInterval) < 0.001 ||
      Math.abs((time % mainInterval) - mainInterval) < 0.001;

    if (isMain) {
      context.globalAlpha = baseAlpha;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 6);
      context.stroke();

      const text = formatTime(time);
      context.fillText(text, x, height / 2 + 5);
    } else if (subInterval !== mainInterval) {
      context.globalAlpha = baseAlpha * 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 6);
      context.stroke();
    }
  }

  context.restore();
};

onMounted(() => {
  draw();
  window.addEventListener('resize', draw);
});

onUnmounted(() => {
  window.removeEventListener('resize', draw);
});

watch(
  () => [props.scrollLeft, props.scale.zoom, playbackState.value.duration, theme.value],
  () => draw(),
  { deep: true }
);

const handleMouseDown = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;

  isDragging.value = true;
  dragRef.value = {
    startX: clickX,
    startScrollPos: props.scrollLeft,
    isDragging: true,
  };

  const totalX = clickX + props.scrollLeft - props.offsetX;
  props.onClick?.(totalX);

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!dragRef.value.isDragging || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const totalX = currentX + props.scrollLeft - props.offsetX;
  props.onClick?.(totalX);
};

const handleMouseUp = () => {
  if (dragRef.value.isDragging) {
    dragRef.value.isDragging = false;
    isDragging.value = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
};
</script>

<template>
  <div
    class="relative w-full h-[24px] select-none bg-card border-b"
    :style="{ height: `${height}px` }"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-full block cursor-pointer"
      @mousedown="handleMouseDown"
    />
  </div>
</template>
