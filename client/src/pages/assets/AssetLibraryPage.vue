<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { useAssetsStore, type Asset } from '@/stores/useAssetsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'vue-sonner';

const { t } = useI18n();
const assetsStore = useAssetsStore();
const authStore = useAuthStore();

const activeCategory = ref<string>('all');
const viewMode = ref<'grid' | 'list'>('grid');
const searchFilter = ref<string>('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const currentPage = ref<number>(1);
const pageSize = ref<number>(8);

const categories = computed(() => [
  { id: 'all', label: t('assets.allAssets') || 'All Files' },
  { id: 'image', label: t('assets.images') || 'Images' },
  { id: 'video', label: t('assets.videos') || 'Videos' },
  { id: 'audio', label: t('assets.audio') || 'Audio' },
  { id: 'text', label: t('assets.texts') || 'Texts & Docs' },
  { id: 'render', label: t('assets.renders') || 'Rendered Episodes' },
]);

const filteredAssets = computed(() => {
  return assetsStore.assets.filter((item) => {
    const matchCat = activeCategory.value === 'all' || item.type === activeCategory.value;
    const q = searchFilter.value.trim().toLowerCase();
    const matchQuery = !q ||
      item.name.toLowerCase().includes(q) ||
      item.ext.toLowerCase().includes(q) ||
      (item.category_label && item.category_label.toLowerCase().includes(q));
    return matchCat && matchQuery;
  });
});

const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredAssets.value.slice(start, start + pageSize.value);
});

function handleCategoryChange(catId: string) {
  activeCategory.value = catId;
  currentPage.value = 1;
}

function handleSearchChange() {
  currentPage.value = 1;
}

async function loadAssets() {
  await assetsStore.fetchAssets({
    userId: authStore.user?.id || 'usr_default',
  });
}

function triggerFileUpload() {
  fileInputRef.value?.click();
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const ext = '.' + (file.name.split('.').pop()?.toUpperCase() || 'DAT');
  let type: Asset['type'] = 'text';
  let catLabel = t('assets.texts') || 'Text';
  let catColor = 'text-indigo-500 dark:text-indigo-400';
  let icon = 'Document';
  let thumbnail: string | undefined;
  let isVideo = false;
  let isAudio = false;

  if (['.PNG', '.JPG', '.JPEG', '.WEBP', '.GIF', '.SVG', '.EXR', '.HDR'].includes(ext)) {
    type = 'image';
    catLabel = t('assets.images') || 'Image';
    catColor = 'text-pink-500 dark:text-pink-400';
    icon = 'Picture';
    thumbnail = URL.createObjectURL(file);
  } else if (['.MP4', '.MOV', '.WEBM', '.MKV', '.AVI'].includes(ext)) {
    type = 'video';
    catLabel = t('assets.videos') || 'Video';
    catColor = 'text-blue-500 dark:text-blue-400';
    icon = 'VideoPlay';
    isVideo = true;
  } else if (['.MP3', '.WAV', '.AAC', '.OGG', '.FLAC', '.M4A'].includes(ext)) {
    type = 'audio';
    catLabel = t('assets.audio') || 'Audio';
    catColor = 'text-amber-500 dark:text-amber-400';
    icon = 'Headset';
    isAudio = true;
  } else if (['.TXT', '.DOC', '.DOCX', '.PDF', '.JSON', '.MD', '.SRT', '.VTT'].includes(ext)) {
    type = 'text';
    catLabel = t('assets.texts') || 'Text';
    catColor = 'text-indigo-500 dark:text-indigo-400';
    icon = 'Document';
  }

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const sizeStr = Number(sizeMb) > 1 ? `${sizeMb} MB` : `${(file.size / 1024).toFixed(0)} KB`;

  try {
    await assetsStore.createAsset({
      name: file.name.replace(/\.[^/.]+$/, ''),
      type,
      ext,
      size: sizeStr,
      size_bytes: file.size,
      category_label: catLabel,
      category_color: catColor,
      icon,
      thumbnail,
      is_video: isVideo,
      is_audio: isAudio,
      user_id: authStore.user?.id || 'usr_default',
    });
    toast.success(t('assets.uploadedSuccess', { name: file.name }));
  } catch {
    toast.error('Failed to upload asset');
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

const selectedAsset = ref<Asset | null>(null);
const isViewModalOpen = ref<boolean>(false);

function handleAssetClick(asset: Asset) {
  selectedAsset.value = asset;
  isViewModalOpen.value = true;
}

function handleDownload(asset: Asset) {
  if (asset.thumbnail) {
    const a = document.createElement('a');
    a.href = asset.thumbnail;
    a.download = `${asset.name}${asset.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    toast.success(`Download started: ${asset.name}${asset.ext}`);
  }
}

async function handleDeleteAsset(e: MouseEvent, asset: Asset) {
  e.stopPropagation();
  try {
    await ElMessageBox.confirm(
      `Delete "${asset.name}"?`,
      'Confirm Delete',
      { type: 'warning' }
    );
    await assetsStore.deleteAsset(asset.id);
    toast.success(t('assets.deletedSuccess', { name: asset.name }));
  } catch (err) {
    if (err !== 'cancel') {
      toast.error('Failed to delete asset');
    }
  }
}

onMounted(() => {
  loadAssets();
});
</script>

<template>
  <div class="h-full overflow-y-auto px-6 lg:px-10 py-6 pb-16 font-sans">
    <!-- Hidden File Input for uploading assets -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
          {{ t('assets.title') }}
        </h2>
        <p class="text-[var(--el-text-color-secondary)] text-sm mt-1">
          {{ t('assets.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Grid / List switch -->
        <div class="flex items-center gap-1 bg-[var(--el-fill-color-light)] p-1 rounded-xl border border-[var(--el-border-color)]">
          <button
            @click="viewMode = 'grid'"
            :class="viewMode === 'grid'
              ? 'bg-[var(--el-card-bg-color)] shadow-sm text-[var(--el-text-color-primary)] font-semibold'
              : 'text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)]'"
            class="px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <el-icon class="ml-1"><Grid /></el-icon>
            {{ t('assets.grid') }}
          </button>
          <button
            @click="viewMode = 'list'"
            :class="viewMode === 'list'
              ? 'bg-[var(--el-card-bg-color)] shadow-sm text-[var(--el-text-color-primary)] font-semibold'
              : 'text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)]'"
            class="px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <el-icon class="ml-1"><Files /></el-icon>
            {{ t('assets.list') }}
          </button>
        </div>

        <!-- Quick Upload Button -->
        <el-button
          type="primary"
          round
          :loading="assetsStore.isUploading"
          @click="triggerFileUpload"
          icon="Upload"
        >
          <span>{{ assetsStore.isUploading ? t('assets.uploading') : t('assets.uploadBtn') }}</span>
        </el-button>
      </div>
    </div>

    <!-- Category Filter Tabs & In-page Filter -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="handleCategoryChange(cat.id)"
          :class="activeCategory === cat.id
            ? 'bg-[var(--el-text-color-primary)] text-[var(--el-bg-color)] font-semibold'
            : 'bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)]'"
          class="px-5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="relative min-w-[200px] max-w-[260px]">
        <el-input
          v-model="searchFilter"
          @input="handleSearchChange"
          type="text"
          :placeholder="t('assets.filterPlaceholder')"
          class="w-full bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-full p-1 placeholder:text-[var(--el-text-color-secondary)] outline-none focus:border-[var(--el-color-primary)] transition-colors"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="assetsStore.isLoading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="n in 4" :key="n" class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-[24px] p-4 animate-pulse">
        <div class="aspect-square bg-[var(--el-fill-color-light)] rounded-2xl mb-4"></div>
        <div class="h-4 bg-[var(--el-fill-color-light)] rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-[var(--el-fill-color-light)] rounded w-1/2"></div>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <!-- Asset Card -->
      <div
        v-for="asset in paginatedAssets"
        :key="asset.id"
        @click="handleAssetClick(asset)"
        class="group bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-[24px] overflow-hidden shadow-soft hover:shadow-float transition-all duration-500 cursor-pointer flex flex-col justify-between relative"
      >
        <!-- Media / Preview Container -->
        <div :class="['relative overflow-hidden', asset.aspect || 'aspect-square', asset.thumbnail ? '' : 'bg-[var(--el-fill-color-lighter)] p-6']">
          <template v-if="asset.thumbnail">
            <img
              :src="asset.thumbnail"
              :alt="asset.name"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <el-icon v-if="asset.is_video" class="text-white text-3xl drop-shadow-md"><VideoPlay /></el-icon>
            </div>
          </template>

          <template v-else>
            <div class="w-full h-full rounded-2xl bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)]/60 flex items-center justify-center text-[var(--el-text-color-secondary)] group-hover:scale-105 transition-transform duration-700">
              <el-icon :size="36" class="opacity-30"><component :is="asset.icon || 'Document'" /></el-icon>
            </div>
          </template>

          <!-- Extension Tag -->
          <span class="absolute top-4 right-4 bg-[var(--el-card-bg-color)]/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--el-border-color)] text-[var(--el-text-color-primary)]">
            {{ asset.ext }}
          </span>

          <!-- Delete Action on hover -->
          <button
            @click="handleDeleteAsset($event, asset)"
            class="absolute top-4 left-4 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow cursor-pointer"
            title="Delete Asset"
          >
            <el-icon class="text-[10px]"><Delete /></el-icon>
          </button>
        </div>

        <!-- Meta info -->
        <div class="p-5 border-t border-[var(--el-border-color)]/30">
          <h4 class="font-medium text-sm text-[var(--el-text-color-primary)] truncate" :title="asset.name">
            {{ asset.name }}
          </h4>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ asset.size }}</span>
            <span :class="['text-xs font-medium', asset.category_color]">{{ asset.category_label }}</span>
          </div>
        </div>
      </div>

      <!-- Upload Placeholder Card -->
      <div
        @click="triggerFileUpload"
        class="group border-2 border-dashed border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] rounded-[24px] flex flex-col items-center justify-center p-8 transition-all cursor-pointer bg-[var(--el-fill-color-lighter)]/50 aspect-square"
      >
        <div class="w-12 h-12 rounded-full bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] flex items-center justify-center text-[var(--el-text-color-secondary)] mb-4 group-hover:text-[var(--el-color-primary)] group-hover:border-[var(--el-color-primary)] transition-all">
          <el-icon :size="20"><Plus /></el-icon>
        </div>
        <p class="text-xs font-medium text-[var(--el-text-color-secondary)] group-hover:text-[var(--el-text-color-primary)] text-center">
          {{ t('assets.dropPlaceholder') }}
        </p>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl overflow-hidden shadow-soft">
      <div class="divide-y divide-[var(--el-border-color)]/60">
        <div
          v-for="asset in paginatedAssets"
          :key="asset.id"
          @click="handleAssetClick(asset)"
          class="flex items-center justify-between px-6 py-4 hover:bg-[var(--el-fill-color-lighter)]/50 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-[var(--el-fill-color-light)] border border-[var(--el-border-color)] flex items-center justify-center shrink-0">
              <el-icon :size="16" class="text-[var(--el-text-color-secondary)]"><component :is="asset.icon || (asset.thumbnail ? 'Picture' : 'Document')" /></el-icon>
            </div>
            <div>
              <p class="text-sm font-medium text-[var(--el-text-color-primary)]">{{ asset.name }}</p>
              <span class="text-xs text-[var(--el-text-color-secondary)]">{{ asset.size }} · {{ asset.ext }}</span>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span :class="['text-xs font-semibold px-3 py-1 rounded-full bg-[var(--el-fill-color-light)]', asset.category_color]">
              {{ asset.category_label }}
            </span>
            <button
              @click="handleDeleteAsset($event, asset)"
              class="text-[var(--el-text-color-secondary)] hover:text-red-500 p-2 rounded-lg transition-colors cursor-pointer"
              title="Delete"
            >
              <el-icon class="text-xs"><Delete /></el-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Section -->
    <div v-if="filteredAssets.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-[var(--el-border-color)]/50">
      <span class="text-xs text-[var(--el-text-color-secondary)]">
        Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredAssets.length) }} of {{ filteredAssets.length }} assets
      </span>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[8, 12, 24, 48]"
        :total="filteredAssets.length"
        layout="sizes, prev, pager, next"
        background
        class="!p-0"
      />
    </div>

    <!-- Asset Preview / Details Modal -->
    <el-dialog
      v-model="isViewModalOpen"
      :title="t('assets.viewAsset')"
      width="720px"
      align-center
      destroy-on-close
      class="!rounded-[24px] overflow-hidden"
    >
      <div v-if="selectedAsset" class="space-y-6">
        <!-- Media Preview Box -->
        <div class="w-full bg-[var(--el-fill-color-light)] rounded-2xl overflow-hidden flex items-center justify-center min-h-[260px] max-h-[420px] relative border border-[var(--el-border-color)]/60">
          <template v-if="selectedAsset.thumbnail">
            <img
              v-if="!selectedAsset.is_video"
              :src="selectedAsset.thumbnail"
              :alt="selectedAsset.name"
              class="max-h-[400px] w-auto object-contain"
            />
            <video
              v-else
              :src="selectedAsset.thumbnail"
              controls
              autoplay
              class="max-h-[400px] w-full object-contain rounded-xl"
            />
          </template>
          <template v-else>
            <div class="flex flex-col items-center justify-center p-10 text-[var(--el-text-color-secondary)]">
              <el-icon :size="64" class="opacity-40 mb-3"><component :is="selectedAsset.icon || 'Document'" /></el-icon>
              <p class="text-xs">{{ t('assets.noPreview') }}</p>
            </div>
          </template>

          <span class="absolute top-3 right-3 bg-[var(--el-card-bg-color)]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--el-border-color)]">
            {{ selectedAsset.ext }}
          </span>
        </div>

        <!-- Meta Details Table -->
        <div class="bg-[var(--el-card-bg-color)] rounded-2xl border border-[var(--el-border-color)] p-5 space-y-3">
          <div class="flex items-center justify-between border-b border-[var(--el-border-color)]/40 pb-2">
            <span class="text-xs text-[var(--el-text-color-secondary)] font-medium">{{ t('assets.fileName') }}</span>
            <span class="text-sm font-semibold text-[var(--el-text-color-primary)] truncate max-w-[360px]">{{ selectedAsset.name }}</span>
          </div>

          <div class="flex items-center justify-between border-b border-[var(--el-border-color)]/40 pb-2">
            <span class="text-xs text-[var(--el-text-color-secondary)] font-medium">{{ t('assets.fileType') }}</span>
            <span :class="['text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--el-fill-color-light)]', selectedAsset.category_color]">
              {{ selectedAsset.category_label }}
            </span>
          </div>

          <div class="flex items-center justify-between border-b border-[var(--el-border-color)]/40 pb-2">
            <span class="text-xs text-[var(--el-text-color-secondary)] font-medium">{{ t('assets.fileSize') }}</span>
            <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">{{ selectedAsset.size }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--el-text-color-secondary)] font-medium">{{ t('assets.format') }}</span>
            <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">{{ selectedAsset.ext }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between pt-2">
          <el-button
            v-if="selectedAsset"
            type="danger"
            link
            @click="handleDeleteAsset($event, selectedAsset); isViewModalOpen = false;"
          >
            <el-icon class="mr-1.5 text-xs"><Delete /></el-icon>
            <span>Delete</span>
          </el-button>
          <div class="flex items-center gap-2 ml-auto">
            <el-button round @click="isViewModalOpen = false">
              {{ t('assets.close') }}
            </el-button>
            <el-button
              v-if="selectedAsset"
              type="primary"
              round
              @click="handleDownload(selectedAsset)"
            >
              <el-icon class="mr-1.5 text-xs"><Download /></el-icon>
              {{ t('assets.download') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.shadow-soft {
  box-shadow: 0 1px 2px rgba(23, 23, 23, 0.04);
}
.shadow-float {
  box-shadow: 0 18px 40px -24px rgba(23, 23, 23, 0.45);
}
</style>
