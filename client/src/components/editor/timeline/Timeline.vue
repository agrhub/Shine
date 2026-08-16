<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import Header from './Header.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelinePlayhead from './TimelinePlayhead.vue';
import CanvasTimeline from './items/timeline';
import {
  Audio,
  Image,
  Text,
  Video,
  Caption,
  Helper,
  Track,
  Transition,
  Backdrop,
} from './items';
import PreviewTrackItem from './items/preview-drag-item';
import Effect from './items/effect';
import Shape from './items/shape';
import {
  timeUsToUnits,
  unitsToTimeUs,
  TimelineBridge,
  TimelineScrollbars,
  TIMELINE_SCALE_CHANGED,
  type ITimelineScaleState,
} from '@openvideo/timeline';
import { useStudioStore } from '@/stores/useStudioStore';
import { usePlaybackStore } from '@/composables/usePlaybackStore';
import { core } from '@/lib/project';
import { useTheme } from '@/composables/useTheme';
import { addStudioSync } from "./studio-to-store-sync";

CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Caption,
  Helper,
  Track,
  PreviewTrackItem,
  Effect,
  Transition,
  Shape,
  Backdrop,
});

const { theme } = useTheme();
const { studio } = useStudioStore();
const { state: playbackState, seek } = usePlaybackStore();

const scrollLeft = ref(0);
const scale = ref<ITimelineScaleState>({ zoom: 1, unit: 1, segments: 1, index: 0 });
const canvasElRef = ref<HTMLCanvasElement | null>(null);
const timelineContainerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<CanvasTimeline | null>(null);

const durationUs = computed(() => (playbackState.value.duration || 10) * 1_000_000);
const currentTimeUs = computed(() => (playbackState.value.currentTime || 0) * 1_000_000);

const setScale = (updater: any) => {
  if (typeof updater === 'function') {
    scale.value = updater(scale.value);
  } else {
    scale.value = { ...scale.value, ...updater };
  }
};

const onClickRuler = (units: number) => {
  const timeUs = unitsToTimeUs(units, scale.value.zoom);
  seek(timeUs / 1_000_000);
};

const onRulerScroll = (newScrollLeft: number) => {
  if (canvasRef.value) {
    (canvasRef.value as any).scrollTo({ scrollLeft: newScrollLeft });
  }
  scrollLeft.value = newScrollLeft;
};

let resizeObserver: ResizeObserver | null = null;
let bridge: any = null;
let scrollbars: any = null;

onMounted(() => {
  const canvasEl = canvasElRef.value;
  const timelineContainerEl = timelineContainerRef.value;
  if (!canvasEl || !timelineContainerEl) return;

  const containerWidth = timelineContainerEl.clientWidth || 1000;
  const containerHeight = (timelineContainerEl.clientHeight || 320) - 75;

  const isDark = theme.value === 'dark';
  const canvas = new CanvasTimeline(canvasEl, {
    width: containerWidth,
    height: containerHeight,
    bounding: {
      width: containerWidth,
      height: 0,
    },
    selectionColor: 'rgba(0, 216, 214, 0.1)',
    selectionBorderColor: 'rgba(0, 216, 214, 1.0)',
    scale: scale.value,
    duration: durationUs.value,
    spacing: {
      left: 16,
      right: 40,
    },
    sizesMap: {
      caption: 32,
      shape: 32,
      text: 30,
      effect: 32,
      audio: 36,
      video: 48,
      image: 48,
      transition: 40,
      main: 48,
    },
    itemTypes: [
      'text',
      'image',
      'audio',
      'video',
      'caption',
      'helper',
      'effect',
      'track',
      'transition',
      'shape',
    ],
    acceptsMap: {
      text: ['text', 'caption'],
      effect: ['effect'],
      image: ['image', 'video'],
      main: ['image', 'video'],
      video: ['video', 'image'],
      audio: ['audio'],
      caption: ['caption', 'text'],
      shape: ['shape'],
    },
    guideLineColor: isDark ? '#ffffff' : '#000000',
    withTransitions: ['image', 'video'],
  });

  scrollbars = new TimelineScrollbars({
    canvas,
    offsetX: 16,
    offsetY: 0,
    extraMarginX: 100,
    extraMarginY: 50,
    scrollbarWidth: 6,
    scrollbarColor: 'rgba(42, 42, 42, 0.85)',
    stroke: 'rgba(255, 255, 255, 0.013)',
    lineWidth: 1,
    cornerRadius: 0,
    onViewportChange: (left: number) => {
      scrollLeft.value = left + 16;
    },
  });

  const { setSelectedClips } = useStudioStore();

  canvas.emitter.on(TIMELINE_SCALE_CHANGED, (data: any) => {
    const newScale = data.payload.scale;
    if (newScale && newScale.zoom !== scale.value.zoom) {
      setScale(newScale);
    }
  });

  const updateActiveSelection = () => {
    const activeObjects = (canvas as any).getActiveObjects?.() || [];
    const activeObject = (canvas as any).getActiveObject?.();
    const selection = activeObjects.length > 0 ? activeObjects : (activeObject ? [activeObject] : []);
    setSelectedClips(selection.map((item: any) => ({
      id: item.id || item.resourceId || 'clip',
      type: item.itemType || item.type || 'clip',
      name: item.name || 'Clip',
      ...item,
    })));
  };

  canvas.on('selection:created', updateActiveSelection);
  canvas.on('selection:updated', updateActiveSelection);
  canvas.on('selection:cleared', () => setSelectedClips([]));

  canvasRef.value = canvas;
  bridge = new TimelineBridge(core, canvas);

  // Resize listener
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry || !canvasRef.value) return;
    const { height, width } = entry.contentRect;
    const containerW = width;
    const containerH = height - 75;
    (canvasRef.value as any).resize(
      { width: containerW, height: containerH },
      { force: true }
    );
  });
  resizeObserver.observe(timelineContainerEl);

  // watch([studio, canvasRef], (values) => {
  //   if (!studio || !studio.value || !canvasRef.value) return;
  //   addStudioSync(studio.value, canvasRef.value as CanvasTimeline);
  // }, { immediate: true });
});

// React to Theme changes (Light / Dark mode guide lines & canvas render)
watch(theme, (newTheme) => {
  if (canvasRef.value) {
    const isDark = newTheme === 'dark';
    (canvasRef.value as any).options.guideLineColor = isDark ? '#ffffff' : '#000000';
    (canvasRef.value as any).requestRenderAll();
  }
});

// React to scale zoom changes
watch(scale, (newScale) => {
  if (canvasRef.value) {
    (canvasRef.value as any).syncScale({ scale: newScale });
  }
}, { deep: true });

// React to Playhead time change scroll follow
watch(currentTimeUs, (newTimeUs) => {
  const position = timeUsToUnits(newTimeUs, scale.value.zoom);
  const canvasEl = canvasElRef.value;
  if (!canvasEl) return;
  const playHeadPos = position - scrollLeft.value + 40;
  if (playHeadPos >= canvasEl.clientWidth) {
    onRulerScroll(position);
  }
});

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const speed = 0.998;
    const oldZoom = scale.value.zoom;
    let newZoom = oldZoom * speed ** e.deltaY;
    const clampedZoom = Math.max(0.1, Math.min(10, newZoom));
    if (oldZoom !== clampedZoom) {
      setScale({ zoom: clampedZoom });
    }
  } else {
    const delta = e.shiftKey ? e.deltaY : e.deltaX;
    if (delta !== 0) {
      e.preventDefault();
      onRulerScroll(Math.max(0, scrollLeft.value + delta));
    }
  }
};

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (bridge) bridge.dispose();
  if (scrollbars) scrollbars.dispose();
  if (canvasRef.value) (canvasRef.value as any).purge();
});
</script>

<template>
  <div
    ref="timelineContainerRef"
    id="timeline-container"
    data-timeline="true"
    class="flex border-t flex-col relative w-full h-full overflow-hidden bg-background select-none"
    @wheel="handleWheel"
  >
    <!-- Header Controls -->
    <Header :zoomLevel="scale.zoom" @update:zoomLevel="(z) => setScale({ zoom: z })" />

    <!-- Timeline Canvas Ruler -->
    <TimelineRuler
      :scale="scale"
      :scrollLeft="scrollLeft"
      :onClick="onClickRuler"
      :onScroll="onRulerScroll"
    />

    <!-- Playhead Indicator -->
    <TimelinePlayhead
      :scale="scale"
      :scrollLeft="scrollLeft"
    />

    <!-- Tracks & Canvas Container -->
    <div class="flex flex-1 min-h-0 overflow-hidden relative">
      <div class="relative flex-1 min-h-0 overflow-hidden">
        <canvas id="designcombo-timeline-canvas" ref="canvasElRef" class="w-full h-full block" />
      </div>
    </div>
  </div>
</template>
