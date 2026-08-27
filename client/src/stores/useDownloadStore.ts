import { DownloadItem } from '@/types/api';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDownloadStore = defineStore('download', () => {
  const downloads = ref<DownloadItem[]>([]);

  function addDownload(item: Omit<DownloadItem, 'id' | 'createdAt' | 'status' | 'progress'>): string {
    const id = Math.random().toString(36).slice(2);
    const download: DownloadItem = {
      ...item,
      id,
      status: 'pending',
      progress: 0,
      created_at: Date.now(),
    };
    downloads.value = [download, ...downloads.value];
    return id;
  }

  function updateDownload(id: string, patch: Partial<DownloadItem>) {
    downloads.value = downloads.value.map((d) => (d.id === id ? { ...d, ...patch } : d));
  }

  function removeDownload(id: string) {
    const item = downloads.value.find((d) => d.id === id);
    if (item?.url) URL.revokeObjectURL(item.url);
    if (item?.thumbnail_url) URL.revokeObjectURL(item.thumbnail_url);
    downloads.value = downloads.value.filter((d) => d.id !== id);
  }

  function clearCompleted() {
    const completed = downloads.value.filter(
      (d) => d.status === 'completed' || d.status === 'failed'
    );
    completed.forEach((d) => {
      if (d.url) URL.revokeObjectURL(d.url);
      if (d.thumbnail_url) URL.revokeObjectURL(d.thumbnail_url);
    });
    downloads.value = downloads.value.filter((d) => d.status !== 'completed' && d.status !== 'failed');
  }

  function markDownloaded(id: string) {
    downloads.value = downloads.value.map((d) => (d.id === id ? { ...d, downloaded: true } : d));
  }

  return {
    downloads,
    addDownload,
    updateDownload,
    removeDownload,
    clearCompleted,
    markDownloaded,
  };
});
