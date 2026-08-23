<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Search,
  Upload,
  Loader2,
  Music,
  Video as VideoIcon,
  Trash2,
} from 'lucide-vue-next';
import { core } from '@/utils/project';
import { Log } from '@openvideo/engine-pixi';
import { uploadFilesToBackend, deleteUploadedFile, fetchUploadedAssets, type UploadedAsset } from '@/utils/upload-utils';

import UploadModal from './UploadModal.vue';

interface VisualAsset {
  id: string;
  filePath: string;
  type: 'image' | 'video' | 'audio';
  src: string;
  name: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

const STORAGE_KEY = 'openvideo_uploads';
const THUMBNAILS_KEY = 'openvideo_thumbnails';

function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const searchQuery = ref('');
const uploads = ref<VisualAsset[]>([]);
const thumbnailMap = ref<Record<string, string>>({});
const isUploading = ref(false);
const isModalOpen = ref(false);
const uploadProgress = ref(0);
const isLoaded = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function loadCachedThumbnails() {
  try {
    const stored = localStorage.getItem(THUMBNAILS_KEY);
    if (stored) thumbnailMap.value = JSON.parse(stored);
  } catch (e) {
    // Ignore storage parse error
  }
}

function saveCachedThumbnails() {
  try {
    localStorage.setItem(THUMBNAILS_KEY, JSON.stringify(thumbnailMap.value));
  } catch (e) {
    // Ignore storage save error
  }
}

/**
 * Generates a lightweight JPEG thumbnail image for a video asset
 * instead of embedding full heavy <video> elements in the asset panel.
 */
function generateVideoThumbnail(src: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const cleanUp = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          cleanUp();
          resolve(dataUrl);
          return;
        }
      } catch (e) {
        console.warn('Canvas video thumbnail capture failed:', e);
      }
      cleanUp();
      resolve('');
    };

    video.onerror = () => {
      cleanUp();
      resolve('');
    };

    video.src = src;
  });
}

// Load persisted uploads from SQLite database backend on mount
onMounted(async () => {
  loadCachedThumbnails();
  try {
    const backendAssets = await fetchUploadedAssets();
    if (backendAssets && backendAssets.length > 0) {
      uploads.value = backendAssets.map((asset: UploadedAsset) => ({
        id: asset.id,
        filePath: asset.filePath,
        name: asset.name,
        src: asset.url,
        type: asset.type,
        size: asset.size,
        thumbnail: thumbnailMap.value[asset.id],
      }));

      // Generate missing video thumbnails lazily
      for (const asset of uploads.value) {
        if (asset.type === 'video' && !thumbnailMap.value[asset.id]) {
          generateVideoThumbnail(asset.src).then((thumb) => {
            if (thumb) {
              thumbnailMap.value[asset.id] = thumb;
              asset.thumbnail = thumb;
              saveCachedThumbnails();
            }
          });
        }
      }
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) uploads.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load uploads from database backend:', e);
  } finally {
    isLoaded.value = true;
  }
});

const filteredAssets = computed(() =>
  uploads.value.filter((a) => a.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
);

const saveToStorage = (items: VisualAsset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save uploads to localStorage:', e);
  }
};

const handleFileUpload = async (fileList: FileList | File[]) => {
  const files = Array.from(fileList);
  if (files.length === 0) return;

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const uploadedAssets = await uploadFilesToBackend(files, (percentage) => {
      uploadProgress.value = percentage;
    });

    const newAssets: VisualAsset[] = uploadedAssets.map((asset) => ({
      id: asset.id,
      filePath: asset.filePath,
      name: asset.name,
      src: asset.url,
      type: asset.type,
      size: asset.size,
    }));

    // Generate thumbnails for newly uploaded video files
    for (const asset of newAssets) {
      if (asset.type === 'video') {
        const thumb = await generateVideoThumbnail(asset.src);
        if (thumb) {
          asset.thumbnail = thumb;
          thumbnailMap.value[asset.id] = thumb;
          saveCachedThumbnails();
        }
      }
    }

    uploads.value = [...newAssets, ...uploads.value];
    saveToStorage(uploads.value);
  } catch (error) {
    console.error('Failed to upload files:', error);
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const handleInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFileUpload(input.files);
    input.value = '';
  }
};

const handleDelete = async (asset: VisualAsset) => {
  try {
    if (asset.filePath) {
      await deleteUploadedFile(asset.filePath);
    }

    delete thumbnailMap.value[asset.id];
    saveCachedThumbnails();

    uploads.value = uploads.value.filter((a) => a.id !== asset.id);
    saveToStorage(uploads.value);
  } catch (error) {
    console.error('Failed to delete asset:', error);
  }
};

const getAbsoluteUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

const addItemToCanvas = async (asset: VisualAsset) => {
  try {
    const fullUrl = getAbsoluteUrl(asset.src);

    if (asset.type === 'image') {
      await core.clip.add(
        {
          type: 'Image',
          src: fullUrl,
          name: asset.name,
          timing: { display: { from: 0, to: 5_000_000 } },
        },
        { objectFit: 'contain' }
      );
    } else if (asset.type === 'video') {
      await core.clip.add(
        {
          type: 'Video',
          src: fullUrl,
          name: asset.name,
          timing: { display: { from: 0, to: 5_000_000 } },
        },
        { objectFit: 'contain' }
      );
    } else if (asset.type === 'audio') {
      await core.clip.add({
        type: 'Audio',
        src: fullUrl,
        name: asset.name,
        timing: { display: { from: 0, to: 5_000_000 } },
      });
    }
  } catch (error) {
    Log.error(`Failed to add ${asset.type}:`, error as any);
  }
};
</script>

<template>
  <div class="h-full flex flex-col">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*,video/*,audio/*"
      multiple
      @change="handleInputChange"
    />

    <!-- Header with search + upload button -->
    <div v-if="uploads.length > 0" class="flex gap-2 p-4">
      <InputGroup>
        <InputGroupAddon class="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
          <Search :size="14" />
        </InputGroupAddon>
        <InputGroupInput
          v-model="searchQuery"
          placeholder="Search uploads..."
          class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </InputGroup>
      <Button type="button" variant="outline" :disabled="isUploading" @click.prevent.stop="isModalOpen = true">
        <Loader2 v-if="isUploading" class="animate-spin size-3.5" />
        <Upload v-else :size="14" />
      </Button>
    </div>

    <div v-else class="flex gap-2 p-4">
      <Button
        type="button"
        variant="outline"
        class="w-full"
        :disabled="isUploading"
        @click.prevent.stop="isModalOpen = true"
      >
        <Loader2 v-if="isUploading" class="animate-spin size-3.5 mr-1" />
        <Upload v-else :size="14" class="mr-1" />
        <span v-if="isUploading">Uploading ({{ uploadProgress }}%)...</span>
        <span v-else>Upload</span>
      </Button>
    </div>

    <!-- Content -->
    <div v-if="!isLoaded" class="h-full flex items-center justify-center">
      <Loader2 class="animate-spin text-muted-foreground size-5" />
    </div>

    <ScrollArea v-else class="flex-1 px-4">
      <div v-if="filteredAssets.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Upload :size="32" class="opacity-50" />
        <span class="text-sm">
          {{ uploads.length === 0 ? 'No uploads yet' : 'No matches found' }}
        </span>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-x-3 gap-y-4 pb-4">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="flex flex-col gap-1.5 group cursor-pointer"
          @click="addItemToCanvas(asset)"
        >
          <div class="relative aspect-square rounded-sm overflow-hidden bg-foreground/20 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
            <!-- Image Asset -->
            <img
              v-if="asset.type === 'image'"
              :src="asset.src"
              :alt="asset.name"
              class="max-w-full max-h-full object-contain"
            />
            <!-- Audio Asset -->
            <div v-else-if="asset.type === 'audio'" class="w-full h-full flex items-center justify-center">
              <Music class="text-[#2dc28c] size-8" />
            </div>
            <!-- Video Asset: Render lightweight JPEG Thumbnail image instead of heavy <video> element -->
            <div v-else class="w-full h-full flex items-center justify-center bg-black/40">
              <img
                v-if="asset.thumbnail || thumbnailMap[asset.id]"
                :src="asset.thumbnail || thumbnailMap[asset.id]"
                :alt="asset.name"
                class="max-w-full max-h-full object-contain pointer-events-none"
              />
              <div v-else class="flex flex-col items-center justify-center text-muted-foreground">
                <VideoIcon class="size-6 text-purple-400 opacity-80 mb-1" />
              </div>
            </div>

            <div v-if="asset.duration" class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
              {{ formatDuration(asset.duration) }}
            </div>

            <button
              type="button"
              class="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              @click.prevent.stop="handleDelete(asset)"
            >
              <Trash2 :size="12" class="text-white" />
            </button>
          </div>
          <span class="text-[11px] truncate text-muted-foreground group-hover:text-foreground font-medium transition-colors">
            {{ asset.name }}
          </span>
        </div>
      </div>
    </ScrollArea>

    <UploadModal
      :open="isModalOpen"
      :is-uploading="isUploading"
      :upload-progress="uploadProgress"
      @update:open="isModalOpen = $event"
      @uploadFiles="handleFileUpload"
    />
  </div>
</template>
