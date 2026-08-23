<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import {
  Trash2,
  Copy,
  Plus,
  Minus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Camera,
} from 'lucide-vue-next';
import { useStudioStore } from '@/stores/useStudioStore';
import { usePlaybackStore } from '@/composables/usePlaybackStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { core } from '@/utils/project';

const props = defineProps<{
  zoomLevel: number;
}>();

const emit = defineEmits<{
  (e: 'update:zoomLevel', val: number): void;
}>();

const studioStore = useStudioStore();
const { state: playbackState, play, pause, seek } = usePlaybackStore();
const { canvasSize } = useProjectStore();

const selectedClips = computed(() => studioStore.selectedClips);
const isPlaying = computed(() => playbackState.value.isPlaying);
const currentTime = computed(() => playbackState.value.currentTime);
const duration = computed(() => playbackState.value.duration);

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const handlePlayPause = () => {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
};

const handleSeekBack = () => seek(0);
const handleSeekForward = () => seek(duration.value);

const handleSplit = async () => {
  try {
    const currentTimeUs = Math.round(currentTime.value * 1_000_000);
    await core.clip.split(currentTimeUs);
  } catch (e) {
    console.warn('Failed to split clip:', e);
  }
};

const handleDuplicate = async () => {
  try {
    const ids = selectedClips.value.map((c) => c.id);
    if (ids.length > 0) {
      await core.clip.duplicate(ids);
    }
  } catch (e) {
    console.warn('Failed to duplicate clip:', e);
  }
};

const handleDelete = async () => {
  try {
    const ids = selectedClips.value.map((c) => c.id);
    if (ids.length > 0) {
      await core.clip.remove(ids);
      studioStore.setSelectedClips([]);
    }
  } catch (e) {
    console.warn('Failed to delete clip:', e);
  }
};

const handleSnapshot = async () => {
  const studio = studioStore.studio;
  if (!studio) return;
  try {
    const base64 = await (studio as any).snapshot({ transparent: true });
    const link = document.createElement('a');
    link.href = base64;
    link.download = `frame-${Math.floor(currentTime.value * 30)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to capture frame:', err);
  }
};

const zoomOut = () => emit('update:zoomLevel', Math.max(0.15, props.zoomLevel - 0.15));
const zoomIn = () => emit('update:zoomLevel', Math.min(3.5, props.zoomLevel + 0.15));
const setZoom = (val: number) => emit('update:zoomLevel', val);
</script>

<template>
  <div id="timeline-header" class="relative h-[50px] shrink-0 bg-card border-b flex items-center px-2 select-none">
    <div class="w-full grid grid-cols-[1fr_260px_1fr] items-center">
      <!-- Left actions -->
      <div class="flex items-center gap-1">
        <Button
          type="button"
          :disabled="selectedClips.length === 0"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
          @click="handleDelete"
        >
          <Trash2 class="size-4" />
        </Button>
        <Button
          type="button"
          :disabled="selectedClips.length === 0"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
          @click="handleSplit"
        >
          <Scissors class="size-4" />
        </Button>
        <Button
          type="button"
          :disabled="selectedClips.length === 0"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
          @click="handleDuplicate"
        >
          <Copy class="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-muted-foreground hover:text-foreground"
          @click="handleSnapshot"
        >
          <Camera class="size-4" />
        </Button>
      </div>

      <!-- Center playback controls -->
      <div class="flex items-center justify-center gap-2">
        <div class="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground" @click="handleSeekBack">
            <SkipBack class="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" class="h-8 w-8 text-foreground" @click="handlePlayPause">
            <Pause v-if="isPlaying" class="size-4" />
            <Play v-else class="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground" @click="handleSeekForward">
            <SkipForward class="size-4" />
          </Button>
        </div>
        <div class="text-xs font-mono flex items-center gap-1 text-foreground/90">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="text-muted-foreground">|</span>
          <span class="text-muted-foreground">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Right zoom controls -->
      <div class="flex items-center justify-end gap-1 px-2">
        <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground" @click="zoomOut">
          <Minus class="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <span class="text-xs font-mono font-medium text-foreground/80 cursor-pointer min-w-[40px] text-center">
              {{ Math.round(zoomLevel * 100) }}%
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44 text-xs">
            <DropdownMenuItem @click="zoomIn">
              <span>Zoom in</span>
              <DropdownMenuShortcut>⌘=</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="zoomOut">
              <span>Zoom out</span>
              <DropdownMenuShortcut>⌘-</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="setZoom(1.0)">
              <span>100%</span>
              <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="setZoom(0.5)">
              <span>Fit in view</span>
              <DropdownMenuShortcut>⌥⌘1</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground" @click="zoomIn">
          <Plus class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
