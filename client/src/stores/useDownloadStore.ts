import { defineStore } from 'pinia';
import { ref } from 'vue';

export type DownloadStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DownloadItem {
  id: string;
  type: 'export';
  name: string;
  status: DownloadStatus;
  progress: number;
  format: string;
  size?: number;
  createdAt: number;
  completedAt?: number;
  url?: string;
  thumbnailUrl?: string;
  downloaded?: boolean;
  error?: string;
}

export const useDownloadStore = defineStore('download', () => {
  const downloads = ref<DownloadItem[]>([]);

  function addDownload(item: Omit<DownloadItem, 'id' | 'createdAt' | 'status' | 'progress'>): string {
    const id = Math.random().toString(36).slice(2);
    const download: DownloadItem = {
      ...item,
      id,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
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
    if (item?.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    downloads.value = downloads.value.filter((d) => d.id !== id);
  }

  function clearCompleted() {
    const completed = downloads.value.filter(
      (d) => d.status === 'completed' || d.status === 'failed'
    );
    completed.forEach((d) => {
      if (d.url) URL.revokeObjectURL(d.url);
      if (d.thumbnailUrl) URL.revokeObjectURL(d.thumbnailUrl);
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
