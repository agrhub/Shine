import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/http';
import { VISUAL_STYLES, VISUAL_STYLE_CATEGORIES, VisualStyleOption, VisualStyleCategory } from '@/constants/visualStyles';

export const useVisualStyleStore = defineStore('visualStyles', () => {
  const styles = ref<VisualStyleOption[]>([...VISUAL_STYLES]);
  const categories = ref<string[]>([...VISUAL_STYLE_CATEGORIES]);
  const isLoading = ref(false);
  const isLoaded = ref(false);

  async function fetchVisualStyles(force = false) {
    if (isLoaded.value && !force) {
      return styles.value;
    }
    isLoading.value = true;
    try {
      const res: any = await http.get('/visual-styles');
      const data = res?.data || res;
      if (data && Array.isArray(data.styles) && data.styles.length > 0) {
        styles.value = data.styles;
      }
      if (data && Array.isArray(data.categories) && data.categories.length > 0) {
        categories.value = data.categories;
      }
      isLoaded.value = true;
    } catch (err) {
      console.warn('[useVisualStyleStore] Failed to fetch visual styles from API, using default fallback:', err);
    } finally {
      isLoading.value = false;
    }
    return styles.value;
  }

  function getStyleById(id?: string): VisualStyleOption {
    if (!id) return styles.value[0] || VISUAL_STYLES[0];
    const clean = id.toLowerCase().trim().replace(/[\s-]+/g, '_');
    return styles.value.find((s) => s.id === clean || s.name.toLowerCase().replace(/[\s-]+/g, '_') === clean || s.id === id) || styles.value[0] || VISUAL_STYLES[0];
  }

  return {
    styles,
    categories,
    isLoading,
    isLoaded,
    fetchVisualStyles,
    getStyleById,
  };
});
