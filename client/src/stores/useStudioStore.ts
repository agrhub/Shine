import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IClip } from '@/types/timeline';

export const useStudioStore = defineStore('studio', () => {
  const studio = ref<any | null>(null);
  const selectedClips = ref<IClip[]>([]);
  const currentTime = ref<number>(0); // Microseconds or Seconds
  const isPlaying = ref<boolean>(false);
  const zoomLevel = ref<number>(1);

  function setStudio(instance: any) {
    studio.value = instance;
  }

  function setSelectedClips(clips: IClip[]) {
    selectedClips.value = clips;
  }

  function setCurrentTime(time: number) {
    currentTime.value = time;
  }

  function setIsPlaying(playing: boolean) {
    isPlaying.value = playing;
  }

  function setZoomLevel(zoom: number) {
    zoomLevel.value = zoom;
  }

  return {
    studio,
    selectedClips,
    currentTime,
    isPlaying,
    zoomLevel,
    setStudio,
    setSelectedClips,
    setCurrentTime,
    setIsPlaying,
    setZoomLevel,
  };
});
