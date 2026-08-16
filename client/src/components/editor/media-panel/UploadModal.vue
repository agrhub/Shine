<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileIcon, ImageIcon, VideoIcon, MusicIcon, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'uploadFiles', files: File[]): void;
}>();

const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);

function detectType(file: File): 'image' | 'video' | 'audio' {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'image';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (!props.isUploading) isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  if (props.isUploading) return;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFiles(Array.from(e.dataTransfer.files));
  }
};

const handleFileSelect = (e: Event) => {
  if (props.isUploading) return;
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    addFiles(Array.from(files));
  }
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const addFiles = (newFiles: File[]) => {
  const existingNames = new Set(selectedFiles.value.map((f) => f.name + f.size));
  const unique = newFiles.filter((f) => !existingNames.has(f.name + f.size));
  selectedFiles.value = [...selectedFiles.value, ...unique];
};

const removeFile = (index: number) => {
  if (props.isUploading) return;
  selectedFiles.value.splice(index, 1);
};

const triggerFileInput = () => {
  if (props.isUploading) return;
  fileInputRef.value?.click();
};

const handleConfirmUpload = () => {
  if (selectedFiles.value.length === 0 || props.isUploading) return;
  emit('uploadFiles', [...selectedFiles.value]);
  // Do NOT close dialog yet — wait until props.isUploading turns false
};

const handleCancel = () => {
  if (props.isUploading) return;
  selectedFiles.value = [];
  emit('update:open', false);
};

// Automatically close dialog ONLY when uploading finishes
watch(
  () => props.isUploading,
  (uploading, oldUploading) => {
    if (oldUploading && !uploading) {
      selectedFiles.value = [];
      emit('update:open', false);
    }
  }
);
</script>

<template>
  <Dialog :open="open" @update:open="!props.isUploading && emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg bg-card border-border p-6 rounded-2xl">
      <DialogHeader class="flex flex-row items-center justify-between pb-2">
        <DialogTitle class="text-base font-semibold">Upload assets</DialogTitle>
      </DialogHeader>

      <!-- Step 1: Dropzone -->
      <div
        :class="[
          'relative mt-2 border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/10' : 'border-border/60 hover:border-primary/50 bg-muted/20',
          isUploading ? 'opacity-60 pointer-events-none' : ''
        ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          class="hidden"
          :disabled="isUploading"
          @change="handleFileSelect"
        />

        <div class="size-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
          <Upload class="size-5 text-muted-foreground" />
        </div>

        <p class="text-xs font-semibold text-foreground mb-0.5">
          Drag & drop files here to upload
        </p>
        <p class="text-[11px] text-muted-foreground mb-3">
          or click to browse files from your computer
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          class="h-7 text-xs font-medium px-3"
          :disabled="isUploading"
          @click.prevent.stop="triggerFileInput"
        >
          Browse files
        </Button>
      </div>

      <!-- Step 2: Selected Files Preview List -->
      <div v-if="selectedFiles.length > 0" class="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
        <p class="text-xs font-medium text-muted-foreground">
          Selected files ({{ selectedFiles.length }})
        </p>

        <div
          v-for="(file, idx) in selectedFiles"
          :key="file.name + file.size + idx"
          class="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <ImageIcon v-if="detectType(file) === 'image'" class="size-4 text-blue-400 shrink-0" />
            <VideoIcon v-else-if="detectType(file) === 'video'" class="size-4 text-purple-400 shrink-0" />
            <MusicIcon v-else-if="detectType(file) === 'audio'" class="size-4 text-emerald-400 shrink-0" />
            <FileIcon v-else class="size-4 text-muted-foreground shrink-0" />

            <div class="truncate min-w-0">
              <p class="font-medium text-foreground truncate text-[11px]">{{ file.name }}</p>
              <p class="text-[10px] text-muted-foreground">{{ formatSize(file.size) }}</p>
            </div>
          </div>

          <button
            type="button"
            class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            :disabled="isUploading"
            @click.prevent.stop="removeFile(idx)"
          >
            <Trash2 class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Uploading Progress Indicator -->
      <div v-if="isUploading" class="mt-4 space-y-2 bg-primary/10 border border-primary/20 rounded-xl p-3">
        <div class="flex items-center justify-between text-xs font-medium text-primary">
          <span class="flex items-center gap-2">
            <Loader2 class="size-4 animate-spin" />
            Uploading files to storage...
          </span>
          <span>{{ uploadProgress || 0 }}%</span>
        </div>
        <div class="w-full bg-primary/20 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-primary h-full transition-all duration-200"
            :style="{ width: `${uploadProgress || 0}%` }"
          />
        </div>
      </div>

      <!-- Footer Controls -->
      <div class="flex justify-end gap-2 mt-5 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 text-xs"
          :disabled="isUploading"
          @click.prevent.stop="handleCancel"
        >
          Cancel
        </Button>

        <Button
          type="button"
          size="sm"
          class="h-8 text-xs font-medium px-4"
          :disabled="selectedFiles.length === 0 || isUploading"
          @click.prevent.stop="handleConfirmUpload"
        >
          <Loader2 v-if="isUploading" class="size-3.5 mr-1.5 animate-spin" />
          <Upload v-else class="size-3.5 mr-1.5" />
          <span v-if="isUploading">Uploading...</span>
          <span v-else>Upload {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}</span>
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
