<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, watch } from 'vue';
import { Studio, fontManager, registerCustomTransition, registerCustomEffect } from '@openvideo/engine-pixi';
import { useStudioStore } from '@/composables/useStudioStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useTheme } from '@/composables/useTheme';
import { core } from '@/lib/project';
import { generateUUID } from '@/utils/id';
import { editorFont } from '@/components/editor/constants';
import { CUSTOM_TRANSITIONS } from './transition-custom';
import { CUSTOM_EFFECTS } from './effect-custom';
import StudioCanvasContextMenu from './StudioCanvasContextMenu.vue';
import type { ContextMenuState } from './StudioCanvasContextMenu.vue';

const STUDIO_CONFIG = {
  fps: 30,
  interactivity: true,
  spacing: 20,
};

const props = defineProps<{
  onReady?: () => void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const studioRef = ref<Studio | null>(null);
const { setStudio } = useStudioStore();
const projectStore = useProjectStore();
const { theme } = useTheme();

const contextMenuState = reactive<ContextMenuState>({
  isOpen: false,
  position: { x: 0, y: 0 },
  target: null,
});

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const selectedIds = core.store.getState().selectedIds;
  const hasSelection = selectedIds.length > 0;

  contextMenuState.isOpen = true;
  contextMenuState.position = { x: e.clientX, y: e.clientY };
  contextMenuState.target = hasSelection ? 'object' : 'background';
};

const handleContextMenuClose = () => {
  contextMenuState.isOpen = false;
  contextMenuState.target = null;
};

// Handle dimension changes
watch(() => projectStore.canvasSize, (newSize) => {
  if (studioRef.value) {
    studioRef.value.setSize(newSize.width, newSize.height);
  }
  core.execute({
    id: generateUUID(),
    type: 'project.updateSettings',
    payload: { width: newSize.width, height: newSize.height },
  });
}, { deep: true });

// React to Theme changes (Light vs Dark mode for editor container background)
watch(theme, (newTheme) => {
  if (studioRef.value) {
    const editorBg = newTheme === 'dark' ? '#18181b' : '#f4f4f5';
    (studioRef.value as any).setBackgroundColor?.(editorBg);
    (studioRef.value as any).requestRender?.();
  }
}, { immediate: true });

let resizeObserver: ResizeObserver | null = null;
let unsubCore: (() => void) | null = null;

const initializeStudio = async () => {
  if (!canvasRef.value) return;

  // Register custom effects & transitions
  CUSTOM_TRANSITIONS.forEach((t) => {
    registerCustomTransition(t.key, t as any);
  });
  CUSTOM_EFFECTS.forEach((e) => {
    registerCustomEffect(e.key, e as any);
  });

  // Create studio instance
  const initialEditorBg = theme.value === 'dark' ? '#18181b' : '#f4f4f5';
  studioRef.value = new Studio({
    width: projectStore.canvasSize.width,
    height: projectStore.canvasSize.height,
    ...STUDIO_CONFIG,
    backgroundColor: initialEditorBg,
    artboardColor: '#000000',
    canvas: canvasRef.value,
    core: core,
    previewScale: 0.75,
  });

  try {
    await Promise.all([
      fontManager.loadFonts([
        {
          name: editorFont.fontFamily,
          url: editorFont.fontUrl,
        },
      ]),
      studioRef.value.ready,
    ]);
    props.onReady?.();
  } catch (error) {
    console.error('Failed to initialize studio:', error);
  }

  setStudio(studioRef.value as any);

  // Subscribe to core store setting updates (Artboard Background Color ONLY)
  unsubCore = core.store.subscribe((state) => {
    const s = state.settings as any;
    const color = s.artboardColor || s.bgColor;
    if (color && studioRef.value) {
      (studioRef.value as any).setArtboardColor?.(color);
      (studioRef.value as any).requestRender?.();
    }
  });

  const canvasElement = canvasRef.value;
  const parentElement = canvasElement.parentElement;

  if (parentElement) {
    resizeObserver = new ResizeObserver(() => {
      if (studioRef.value && (studioRef.value as any).updateArtboardLayout) {
        (studioRef.value as any).updateArtboardLayout();
      }
    });
    resizeObserver.observe(parentElement);
  }
};

onMounted(() => {
  initializeStudio();
});

onUnmounted(() => {
  if (unsubCore) {
    unsubCore();
    unsubCore = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (studioRef.value) {
    studioRef.value.destroy();
    studioRef.value = null;
    setStudio(null);
  }
});
</script>

<template>
  <div
    class="h-full w-full flex flex-col min-h-0 min-w-0 bg-background rounded-sm relative"
    @contextmenu="handleContextMenu"
  >
    <canvas
      ref="canvasRef"
      class="h-full w-full object-contain"
    />

    <!-- Context Menu -->
    <StudioCanvasContextMenu
      :state="contextMenuState"
      @close="handleContextMenuClose"
    />
  </div>
</template>
