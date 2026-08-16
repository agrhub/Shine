<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import {
  Copy,
  Clipboard,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  ChevronRight,
} from 'lucide-vue-next';

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  target: 'object' | 'background' | null;
}

const props = defineProps<{
  state: ContextMenuState;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);
const selectedClips = computed(() => studioState.value.selectedClips || []);
const hasSelection = computed(() => selectedClips.value.length > 0);

// Clipboard state (local for this session)
const clipboard = ref<any[]>([]);
const hasClipboard = computed(() => clipboard.value.length > 0);

// Flip submenu
const flipSubmenuOpen = ref(false);

// Adjusted position to avoid going off-screen
const adjustedPosition = ref(props.state.position);
const menuRef = ref<HTMLElement | null>(null);

watch(
  () => props.state,
  async (newState) => {
    if (!newState.isOpen) return;
    flipSubmenuOpen.value = false;
    await nextTick();
    if (!menuRef.value) {
      adjustedPosition.value = newState.position;
      return;
    }
    const menuH = menuRef.value.offsetHeight;
    const menuW = menuRef.value.offsetWidth;
    const vpH = window.innerHeight;
    const vpW = window.innerWidth;
    let { x, y } = newState.position;
    if (y + menuH > vpH - 10) y = Math.max(10, y - menuH);
    if (x + menuW > vpW - 10) x = Math.max(10, x - menuW);
    adjustedPosition.value = { x, y };
  },
  { immediate: true, deep: true }
);

// Close on Escape
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const wrapClose = (fn: () => void) => () => { fn(); emit('close'); };

// ─── Actions ──────────────────────────────────────────────────────────────────

const handleCopy = () => {
  if (!hasSelection.value) return;
  clipboard.value = selectedClips.value.map((clip: any) =>
    JSON.parse(JSON.stringify(clip))
  );
};

const handlePaste = () => {
  if (!hasClipboard.value || !studio.value) return;
  clipboard.value.forEach((clip: any) => {
    const newClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      transform: clip.transform
        ? { ...clip.transform, x: (clip.transform.x || 0) + 20, y: (clip.transform.y || 0) + 20 }
        : clip.transform,
    };
    (studio.value as any).clip?.add?.(newClip);
  });
};

const handleDuplicate = () => {
  if (!studio.value || !hasSelection.value) return;
  selectedClips.value.forEach((clip: any) => {
    (studio.value as any).clip?.duplicate?.(clip.id);
  });
};

const handleDelete = () => {
  if (!studio.value || !hasSelection.value) return;
  selectedClips.value.forEach((clip: any) => {
    (studio.value as any).clip?.delete?.(clip.id);
  });
};

const handleFlipH = () => {
  selectedClips.value.forEach((clip: any) => {
    if (clip.transform) {
      const flip = clip.transform.flip || { x: false, y: false };
      clip.transform.flip = { ...flip, x: !flip.x };
    }
  });
};

const handleFlipV = () => {
  selectedClips.value.forEach((clip: any) => {
    if (clip.transform) {
      const flip = clip.transform.flip || { x: false, y: false };
      clip.transform.flip = { ...flip, y: !flip.y };
    }
  });
};

const handleRotate90 = () => {
  selectedClips.value.forEach((clip: any) => {
    if (clip.transform) {
      clip.transform.angle = ((clip.transform.angle || 0) + 90) % 360;
    }
  });
};

const handleToggleVisibility = () => {
  console.log('Toggle visibility — TODO: connect to engine visibility API');
};

const handleToggleLock = () => {
  console.log('Toggle lock — TODO: connect to engine lock API');
};

// ─── Next Tick helper ─────────────────────────────────────────────────────────
import { nextTick } from 'vue';
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.state.isOpen"
      class="fixed inset-0 z-[9998]"
      @click="emit('close')"
      @contextmenu.prevent
    >
      <!-- Object context menu (when clicking on a selected clip) -->
      <div
        v-if="props.state.target === 'object' && hasSelection"
        ref="menuRef"
        class="fixed z-[9999] w-52 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 pointer-events-auto text-xs"
        :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        @click.stop
      >
        <!-- Copy -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
          @click="wrapClose(handleCopy)()"
        >
          <Copy class="size-3.5" />
          <span>Copy</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ C</span>
        </button>

        <!-- Paste -->
        <button
          :disabled="!hasClipboard"
          :class="['w-full flex items-center gap-2 px-2 py-1.5 rounded text-left', hasClipboard ? 'hover:bg-accent hover:text-accent-foreground' : 'opacity-50 pointer-events-none']"
          @click="wrapClose(handlePaste)()"
        >
          <Clipboard class="size-3.5" />
          <span>Paste</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ V</span>
        </button>

        <div class="-mx-1 my-1 h-px bg-border" />

        <!-- Duplicate -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
          @click="wrapClose(handleDuplicate)()"
        >
          <Copy class="size-3.5" />
          <span>Duplicate</span>
        </button>

        <div class="-mx-1 my-1 h-px bg-border" />

        <!-- Visibility -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
          @click="wrapClose(handleToggleVisibility)()"
        >
          <Eye class="size-3.5" />
          <span>Hide</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ H</span>
        </button>

        <!-- Lock -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
          @click="wrapClose(handleToggleLock)()"
        >
          <Lock class="size-3.5" />
          <span>Lock</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ L</span>
        </button>

        <!-- Flip submenu -->
        <div class="relative">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
            @mouseenter="flipSubmenuOpen = true"
            @mouseleave="flipSubmenuOpen = false"
            @click.stop
          >
            <FlipHorizontal class="size-3.5" />
            <span>Flip</span>
            <ChevronRight class="size-3 ml-auto text-muted-foreground" />
          </button>
          <div
            v-if="flipSubmenuOpen"
            class="absolute left-full top-0 ml-1 w-44 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 z-[10000]"
            @mouseenter="flipSubmenuOpen = true"
            @mouseleave="flipSubmenuOpen = false"
          >
            <button
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
              @click="wrapClose(handleFlipH)()"
            >
              <FlipHorizontal class="size-3.5" />
              Flip Horizontal
            </button>
            <button
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
              @click="wrapClose(handleFlipV)()"
            >
              <FlipVertical class="size-3.5" />
              Flip Vertical
            </button>
          </div>
        </div>

        <!-- Rotate -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-left"
          @click="wrapClose(handleRotate90)()"
        >
          <RotateCw class="size-3.5" />
          <span>Rotate 90°</span>
        </button>

        <div class="-mx-1 my-1 h-px bg-border" />

        <!-- Delete -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-left"
          @click="wrapClose(handleDelete)()"
        >
          <Trash2 class="size-3.5" />
          <span>Delete</span>
          <span class="ml-auto text-[10px] opacity-60">⌫</span>
        </button>
      </div>

      <!-- Canvas background menu (paste only) -->
      <div
        v-else
        ref="menuRef"
        class="fixed z-[9999] w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 pointer-events-auto text-xs"
        :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        @click.stop
      >
        <button
          :disabled="!hasClipboard"
          :class="['w-full flex items-center gap-2 px-2 py-1.5 rounded text-left', hasClipboard ? 'hover:bg-accent hover:text-accent-foreground' : 'opacity-50 pointer-events-none']"
          @click="wrapClose(handlePaste)()"
        >
          <Clipboard class="size-3.5" />
          <span>Paste</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ V</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
