<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { handleDownload, formatBytes } from '@/composables/useExport';
import {
  Archive,
  X,
  Download,
  Loader2,
  Video,
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

function formatDate(timestamp: number) {
  return new Date(timestamp)
    .toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

const downloadStore = useDownloadStore();

const activeCount = computed(() => {
  return downloadStore.downloads.filter((d) => d.status === 'processing').length;
});

const hasCompleted = computed(() => {
  return downloadStore.downloads.some((d) => d.status === 'completed' || d.status === 'failed');
});

const downloads = computed(() => downloadStore.downloads);

const clearCompleted = () => downloadStore.clearCompleted();
const removeDownload = (id: string) => downloadStore.removeDownload(id);
const markDownloaded = (id: string) => downloadStore.markDownloaded(id);
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative h-7 w-7 rounded-xs flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <slot />
        <span
          v-if="activeCount > 0"
          class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-medium text-primary-foreground animate-pulse"
        >
          {{ activeCount }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-80 p-0 rounded-md bg-card border border-border shadow-lg" align="end">
      <div class="flex flex-col">
        <div class="flex items-center justify-between px-3 py-2 border-b border-border">
          <span class="text-xs font-semibold text-foreground">{{ t('editor.tasks') }}</span>
          <button
            v-if="hasCompleted"
            @click="clearCompleted"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {{ t('common.clear') }}
          </button>
        </div>

        <div v-if="downloads.length === 0" class="flex flex-col items-center justify-center px-3 py-6 gap-2 text-muted-foreground">
          <Archive class="size-5 opacity-50" />
          <span class="text-xs">{{ t('editor.noRecentTasks') }}</span>
        </div>

        <div v-else class="flex flex-col max-h-72 overflow-y-auto">
          <div
            v-for="download in downloads"
            :key="download.id"
            class="flex items-start gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
          >
            <div class="relative shrink-0 h-10 w-10 rounded bg-secondary border flex items-center justify-center overflow-hidden">
              <Loader2 v-if="download.status === 'processing'" class="size-5 text-foreground animate-spin" />
              <img
                v-else-if="download.thumbnail_url"
                :src="download.thumbnail_url"
                alt=""
                class="h-full w-full object-cover"
              />
              <Video v-else class="size-5 text-muted-foreground" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-foreground truncate">
                {{ download.name }}
              </div>
              <div class="text-[10px] text-muted-foreground">
                {{ download.size !== undefined ? formatBytes(download.size) : '—' }} ·
                {{
                  download.status === 'processing'
                    ? (t('common.exporting') || 'Exporting...')
                    : download.status === 'failed'
                      ? (t('common.failed') || 'Failed')
                      : download.downloaded
                        ? (t('common.downloaded') || 'Downloaded')
                        : (t('common.exported') || 'Exported')
                }}
              </div>
              <div class="text-[10px] text-muted-foreground">
                {{ formatDate(download.completed_at || download.created_at) }}
              </div>

              <div v-if="download.status === 'processing'" class="mt-1.5">
                <div class="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    class="absolute inset-y-0 left-0 rounded-full bg-foreground transition-all duration-300"
                    :style="{ width: `${download.progress * 100}%` }"
                  />
                </div>
              </div>

              <div v-if="download.status === 'failed' && download.error" class="mt-1 text-[10px] text-destructive truncate">
                {{ download.error }}
              </div>
            </div>

            <div class="flex flex-col items-center gap-0.5">
              <Button
                v-if="download.status === 'completed'"
                size="icon"
                variant="ghost"
                class="h-7 w-7 rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                @click="() => {
                  if (download.url) {
                    handleDownload(download.url, download.format);
                    markDownloaded(download.id);
                  }
                }"
              >
                <Download class="size-3.5" />
                <span class="sr-only">{{ t('common.download') }}</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7 rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                @click="removeDownload(download.id)"
              >
                <X class="size-3.5" />
                <span class="sr-only">{{ t('common.clear') }}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
