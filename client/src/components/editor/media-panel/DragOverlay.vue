<script setup lang="ts">
import { Upload } from 'lucide-vue-next';

interface MediaDragOverlayProps {
  isVisible: boolean;
  isProcessing?: boolean;
  progress?: number;
  isEmptyState?: boolean;
}

const props = withDefaults(defineProps<MediaDragOverlayProps>(), {
  isVisible: false,
  isProcessing: false,
  progress: 0,
  isEmptyState: false,
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

function handleClick(e: MouseEvent) {
  if (props.isProcessing) return;
  e.preventDefault();
  e.stopPropagation();
  emit('click');
}
</script>

<template>
  <div
    v-if="isVisible"
    class="flex flex-col items-center justify-center gap-4 h-full text-center bg-foreground/5 hover:bg-foreground/10 transition-all duration-200 p-8 cursor-pointer"
    @click="handleClick"
  >
    <div class="flex items-center justify-center">
      <Upload class="h-10 w-10 text-foreground" />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground max-w-sm">
        {{ isProcessing
          ? `Processing your files (${progress}%)`
          : "Drag and drop videos, photos, and audio files here" }}
      </p>
    </div>

    <div v-if="isProcessing" class="w-full max-w-xs">
      <div class="w-full bg-muted/50 h-2">
        <div
          class="bg-primary h-2 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>
  </div>
</template>
