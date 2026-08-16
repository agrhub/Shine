import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/http';

export interface Asset {
  id: string;
  userId?: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'text' | 'render';
  ext: string;
  size: string;
  sizeBytes?: number;
  categoryLabel: string;
  categoryColor: string;
  thumbnail?: string;
  icon?: string;
  aspect?: string;
  isVideo?: boolean;
  isAudio?: boolean;
  createdAt?: string;
}

export const useAssetsStore = defineStore('assets', () => {
  const assets = ref<Asset[]>([]);
  const isLoading = ref<boolean>(false);
  const isUploading = ref<boolean>(false);

  async function fetchAssets(params?: { type?: string; search?: string; userId?: string }) {
    isLoading.value = true;
    try {
      const res: any = await http.get('/assets', { params });
      const list = res?.data?.assets || res?.assets || res?.data || res;
      assets.value = Array.isArray(list) ? list : [];
      return assets.value;
    } catch (err) {
      console.error('Failed to fetch assets from API', err);
      return assets.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAsset(payload: Partial<Asset>) {
    isUploading.value = true;
    try {
      const res: any = await http.post('/assets', payload);
      const created = res?.data || res;
      if (created && created.id) {
        assets.value.unshift(created);
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to create asset via API', err);
      throw err;
    } finally {
      isUploading.value = false;
    }
  }

  async function deleteAsset(id: string) {
    try {
      await http.delete(`/assets/${id}`);
      assets.value = assets.value.filter(a => a.id !== id);
      return true;
    } catch (err) {
      console.error('Failed to delete asset via API', err);
      throw err;
    }
  }

  return {
    assets,
    isLoading,
    isUploading,
    fetchAssets,
    createAsset,
    deleteAsset,
  };
});
