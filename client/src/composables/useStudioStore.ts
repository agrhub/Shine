import { ref, markRaw } from 'vue';
import type { Studio, IClip } from '@openvideo/engine-pixi';

interface StudioState {
  studio: Studio | null;
  selectedClips: IClip[];
}

const studioState = ref<StudioState>({
  studio: null,
  selectedClips: [],
});

export const useStudioStore = () => {
  const setStudio = (studio: Studio | null) => {
    studioState.value.studio = studio ? (markRaw(studio) as any) : null;
  };

  const setSelectedClips = (clips: IClip[]) => {
    studioState.value.selectedClips = clips.map((c) => markRaw(c) as any);
  };

  return {
    state: studioState,
    setStudio,
    setSelectedClips,
  };
};
