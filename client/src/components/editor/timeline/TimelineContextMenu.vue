<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStudioStore } from '~/composables/useStudioStore';

const { t } = useI18n();
import {
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  Lock,
  LockOpen,
  Volume2,
  VolumeX,
  ChevronRight,
} from 'lucide-vue-next';

export interface TimelineContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  target: 'clip' | 'track' | 'timeline' | null;
  clipId?: string;
  trackId?: string;
}

const props = defineProps<{
  state: TimelineContextMenuState;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);

// Clipboard (session-local)
const clipboard = ref<any[]>([]);
const hasClipboard = computed(() => clipboard.value.length > 0);

// Find the clicked clip
const selectedClip = computed(() => {
  if (!props.state.clipId) return null;
  const clips = (studioState.value as any).clips || {};
  return clips[props.state.clipId] || null;
});

const isLocked = computed(() => !!(selectedClip.value as any)?.locked);
const isMuted = computed(() => !!(selectedClip.value as any)?.muted);

// Position adjustment
const menuRef = ref<HTMLElement | null>(null);
const adjustedPosition = ref(props.state.position);

watch(
  () => props.state,
  async (newState) => {
    if (!newState.isOpen) return;
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

// Keyboard handler
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const wrapClose = (fn: () => void) => () => { fn(); emit('close'); };

// ─── Actions ──────────────────────────────────────────────────────────────────

const handleCopy = () => {
  const selectedClips = studioState.value.selectedClips || [];
  if (selectedClips.length === 0) return;
  clipboard.value = selectedClips.map((c: any) => JSON.parse(JSON.stringify(c)));
};

const handlePaste = () => {
  if (!hasClipboard.value || !studio.value) return;
  const currentTime = (studio.value as any)?.currentTime ?? 0;
  const earliest = Math.min(...clipboard.value.map((c: any) => c.timing?.display?.from ?? 0));
  clipboard.value.forEach((clip: any) => {
    const offset = (clip.timing?.display?.from ?? 0) - earliest;
    const newFrom = currentTime + offset;
    const duration = clip.timing?.duration ?? 0;
    const newClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timing: {
        ...clip.timing,
        display: { ...clip.timing?.display, from: newFrom, to: newFrom + duration },
      },
    };
    (studio.value as any)?.clip?.add?.(newClip);
  });
};

const handleDuplicate = () => {
  const selectedClips = studioState.value.selectedClips || [];
  if (!studio.value || selectedClips.length === 0) return;
  selectedClips.forEach((clip: any) => {
    (studio.value as any)?.clip?.duplicate?.(clip.id);
  });
};

const handleSplit = () => {
  if (!studio.value || !selectedClip.value) return;
  const currentTime = (studio.value as any)?.currentTime ?? 0;
  const clipStart = (selectedClip.value as any)?.timing?.display?.from ?? 0;
  const clipEnd = (selectedClip.value as any)?.timing?.display?.to ?? 0;
  if (currentTime <= clipStart || currentTime >= clipEnd) return;
  (studio.value as any)?.clip?.split?.(currentTime);
};

const handleDelete = () => {
  if (!props.state.clipId || !studio.value) return;
  (studio.value as any)?.clip?.delete?.(props.state.clipId);
};

const handleToggleLock = () => {
  if (!selectedClip.value || !studio.value) return;
  (studio.value as any)?.clip?.update?.((selectedClip.value as any).id, {
    locked: !isLocked.value,
  });
};

const handleToggleMute = () => {
  if (!selectedClip.value || !studio.value) return;
  (studio.value as any)?.clip?.update?.((selectedClip.value as any).id, {
    muted: !isMuted.value,
  });
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.state.isOpen"
      class="fixed inset-0 z-[9998]"
      @click="emit('close')"
      @contextmenu.prevent
    >
      <!-- Clip-specific menu -->
      <div
        v-if="props.state.target === 'clip'"
        ref="menuRef"
        class="fixed z-[9999] w-52 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 pointer-events-auto text-xs"
        :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        @click.stop
      >
        <!-- Copy / Paste / Duplicate (only if not locked) -->
        <template v-if="!isLocked">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
            @click="wrapClose(handleCopy)()"
          >
            <Copy class="size-3.5" />
            <span>{{ t('editor.copy') }}</span>
            <span class="ml-auto text-muted-foreground text-[10px]">⌘ C</span>
          </button>

          <button
            :disabled="!hasClipboard"
            :class="['w-full flex items-center gap-2 px-2 py-1.5 rounded text-left', hasClipboard ? 'hover:bg-accent' : 'opacity-50 pointer-events-none']"
            @click="wrapClose(handlePaste)()"
          >
            <Clipboard class="size-3.5" />
            <span>{{ t('editor.paste') }}</span>
            <span class="ml-auto text-muted-foreground text-[10px]">⌘ V</span>
          </button>

          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
            @click="wrapClose(handleDuplicate)()"
          >
            <Copy class="size-3.5" />
            <span>{{ t('editor.duplicate') }}</span>
            <span class="ml-auto text-muted-foreground text-[10px]">⌘ D</span>
          </button>

          <div class="-mx-1 my-1 h-px bg-border" />

          <!-- Split at Playhead -->
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
            @click="wrapClose(handleSplit)()"
          >
            <Scissors class="size-3.5" />
            <span>{{ t('editor.split') }}</span>
            <span class="ml-auto text-muted-foreground text-[10px]">⌘ K</span>
          </button>
        </template>

        <div class="-mx-1 my-1 h-px bg-border" />

        <!-- Mute / Unmute -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
          @click="wrapClose(handleToggleMute)()"
        >
          <Volume2 v-if="isMuted" class="size-3.5" />
          <VolumeX v-else class="size-3.5" />
          <span>{{ isMuted ? t('editor.unmute') : t('editor.mute') }}</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ ⇧ M</span>
        </button>

        <!-- Lock / Unlock -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
          @click="wrapClose(handleToggleLock)()"
        >
          <LockOpen v-if="isLocked" class="size-3.5" />
          <Lock v-else class="size-3.5" />
          <span>{{ isLocked ? t('editor.unlock') : t('editor.lock') }}</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ L</span>
        </button>

        <!-- Delete (only if not locked) -->
        <template v-if="!isLocked">
          <div class="-mx-1 my-1 h-px bg-border" />
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-left"
            @click="wrapClose(handleDelete)()"
          >
            <Trash2 class="size-3.5" />
            <span>{{ t('editor.delete') }}</span>
            <span class="ml-auto text-[10px] opacity-60">⌫</span>
          </button>
        </template>
      </div>

      <!-- Timeline background menu — paste only -->
      <div
        v-else
        ref="menuRef"
        class="fixed z-[9999] w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 pointer-events-auto text-xs"
        :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        @click.stop
      >
        <button
          :disabled="!hasClipboard"
          :class="['w-full flex items-center gap-2 px-2 py-1.5 rounded text-left', hasClipboard ? 'hover:bg-accent' : 'opacity-50 pointer-events-none']"
          @click="wrapClose(handlePaste)()"
        >
          <Clipboard class="size-3.5" />
          <span>{{ t('editor.pasteAtPlayhead') }}</span>
          <span class="ml-auto text-muted-foreground text-[10px]">⌘ V</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
