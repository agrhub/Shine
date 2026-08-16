import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CanvasSize } from '@/types/index';

export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 1920, height: 1080 };
export const DEFAULT_ASPECT_RATIO = '16:9';
export const DEFAULT_FPS = 30;

export const useProjectStore = defineStore('project', () => {
  const canvasSize = ref<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const aspectRatio = ref<string>(DEFAULT_ASPECT_RATIO);
  const fps = ref<number>(DEFAULT_FPS);
  const projectName = ref<string>('Untitled Video');
  const projectId = ref<string | null>(null);
  const spaceId = ref<string | null>(null);
  const initialStudioJSON = ref<any | null>(null);
  const resyncCounter = ref<number>(0);

  function setProjectName(name: string) {
    projectName.value = name;
  }

  function setCanvasSize(size: CanvasSize, ratio: string) {
    canvasSize.value = size;
    aspectRatio.value = ratio;
  }

  function setFps(newFps: number) {
    fps.value = newFps;
  }

  function triggerResync() {
    resyncCounter.value++;
  }

  function resetProject() {
    canvasSize.value = DEFAULT_CANVAS_SIZE;
    aspectRatio.value = DEFAULT_ASPECT_RATIO;
    fps.value = DEFAULT_FPS;
    projectName.value = 'Untitled Video';
    projectId.value = null;
    spaceId.value = null;
    initialStudioJSON.value = null;
    resyncCounter.value = 0;
  }

  return {
    canvasSize,
    aspectRatio,
    fps,
    projectName,
    projectId,
    spaceId,
    initialStudioJSON,
    resyncCounter,
    setProjectName,
    setCanvasSize,
    setFps,
    triggerResync,
    resetProject,
  };
});
