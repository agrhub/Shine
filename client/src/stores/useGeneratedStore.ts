import { GeneratedAsset } from '@/types/api';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useGeneratedStore = defineStore('generated', () => {
  // Load from localStorage if present
  const savedData = localStorage.getItem('generated-assets-storage');
  let initialVoiceovers: GeneratedAsset[] = [];
  let initialSfx: GeneratedAsset[] = [];
  let initialMusic: GeneratedAsset[] = [];

  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      if (parsed) {
        initialVoiceovers = parsed.voiceovers || [];
        initialSfx = parsed.sfx || [];
        initialMusic = parsed.music || [];
      }
    } catch (e) {
      console.error('Failed to parse saved generated assets', e);
    }
  }

  const voiceovers = ref<GeneratedAsset[]>(initialVoiceovers);
  const sfx = ref<GeneratedAsset[]>(initialSfx);
  const music = ref<GeneratedAsset[]>(initialMusic);

  const isGenerating = ref({
    voiceover: false,
    sfx: false,
    music: false,
  });

  function addAsset(asset: GeneratedAsset) {
    if (asset.type === 'voiceover') {
      voiceovers.value = [asset, ...voiceovers.value];
    } else if (asset.type === 'sfx') {
      sfx.value = [asset, ...sfx.value];
    } else {
      music.value = [asset, ...music.value];
    }
  }

  function removeAsset(id: string, type: GeneratedAsset['type']) {
    if (type === 'voiceover') {
      voiceovers.value = voiceovers.value.filter((a) => a.id !== id);
    } else if (type === 'sfx') {
      sfx.value = sfx.value.filter((a) => a.id !== id);
    } else {
      music.value = music.value.filter((a) => a.id !== id);
    }
  }

  function setGenerating(type: GeneratedAsset['type'], generating: boolean) {
    if (type === 'voiceover') {
      isGenerating.value.voiceover = generating;
    } else if (type === 'sfx') {
      isGenerating.value.sfx = generating;
    } else {
      isGenerating.value.music = generating;
    }
  }

  // Watch states to persist to localStorage
  watch(
    [voiceovers, sfx, music],
    () => {
      localStorage.setItem(
        'generated-assets-storage',
        JSON.stringify({
          voiceovers: voiceovers.value,
          sfx: sfx.value,
          music: music.value,
        })
      );
    },
    { deep: true }
  );

  return {
    voiceovers,
    sfx,
    music,
    isGenerating,
    addAsset,
    removeAsset,
    setGenerating,
  };
});
