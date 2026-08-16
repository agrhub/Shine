import { ref } from 'vue';
import { MICROSECONDS_PER_SECOND } from '@/types/timeline';
import { generateUUID } from '@/utils/id';

interface TimelineState {
  _tracks: any[];
  clips: Record<string, any>;
  tracks: any[];
  selectedClipIds: string[];
}

const initialTracks: any[] = [];
const initialClips: Record<string, any> = {};

const timelineState = ref<TimelineState>({
  _tracks: initialTracks,
  clips: initialClips,
  tracks: initialTracks,
  selectedClipIds: [],
});

export const useTimelineStore = () => {
  const setTracks = (tracks: any[]) => {
    timelineState.value._tracks = tracks;
    timelineState.value.tracks = tracks;
  };

  const setClips = (clips: Record<string, any>) => {
    timelineState.value.clips = clips;
  };

  const updateClip = (clipId: string, updates: any) => {
    const clip = timelineState.value.clips[clipId];
    if (!clip) return;

    if (updates.duration !== undefined) {
      clip.duration = updates.duration;
    }

    if (updates.displayFrom !== undefined) {
      clip.display = {
        ...clip.display,
        from: updates.displayFrom,
      };
    }

    if (updates.trim !== undefined) {
      clip.trim = updates.trim;
    }
  };

  const updateClips = (updates: any[]) => {
    updates.forEach((update) => {
      updateClip(update.clipId, update);
    });
  };

  const removeClips = (clipIds: string[]) => {
    const updatedClips = { ...timelineState.value.clips };
    clipIds.forEach((id) => delete updatedClips[id]);
    timelineState.value.clips = updatedClips;

    timelineState.value._tracks = timelineState.value._tracks
      .map((track: any) => ({
        ...track,
        clipIds: track.clipIds.filter((id: string) => !clipIds.includes(id)),
      }))
      .filter((track: any) => track.clipIds.length > 0);
    
    timelineState.value.tracks = timelineState.value._tracks;
    timelineState.value.selectedClipIds = timelineState.value.selectedClipIds.filter(
      (id: string) => !clipIds.includes(id)
    );
  };

  const selectClip = (clipId: string, multi = false) => {
    if (multi) {
      if (timelineState.value.selectedClipIds.includes(clipId)) {
        timelineState.value.selectedClipIds = timelineState.value.selectedClipIds.filter((id: string) => id !== clipId);
      } else {
        timelineState.value.selectedClipIds.push(clipId);
      }
    } else {
      timelineState.value.selectedClipIds = [clipId];
    }
  };

  const clearSelection = () => {
    timelineState.value.selectedClipIds = [];
  };

  const getClip = (id: string) => timelineState.value.clips[id];

  const getTotalDuration = () => {
    let maxTime = 0;
    Object.values(timelineState.value.clips).forEach((clip: any) => {
      if (!clip || !clip.display) return;
      const from = clip.display.from ?? 0;
      const duration = clip.duration ?? 0;
      const endTime = (from + duration) / MICROSECONDS_PER_SECOND;
      if (endTime > maxTime) maxTime = endTime;
    });
    return maxTime;
  };

  const addTrack = (type: string, index?: number) => {
    const newTrack = {
      id: generateUUID(),
      name: `${type} Track`,
      type,
      clipIds: [],
      muted: false,
    };
    if (typeof index === 'number') {
      timelineState.value._tracks.splice(index, 0, newTrack);
    } else {
      timelineState.value._tracks.unshift(newTrack);
    }
    timelineState.value.tracks = timelineState.value._tracks;
    return newTrack.id;
  };

  const moveTrack = (trackId: string, newIndex: number) => {
    const currentIndex = timelineState.value._tracks.findIndex((t: any) => t.id === trackId);
    if (currentIndex === -1) return;

    const [track] = timelineState.value._tracks.splice(currentIndex, 1);
    timelineState.value._tracks.splice(newIndex, 0, track);
    timelineState.value.tracks = timelineState.value._tracks;
  };

  return {
    state: timelineState,
    setTracks,
    setClips,
    updateClip,
    updateClips,
    removeClips,
    selectClip,
    clearSelection,
    getClip,
    getTotalDuration,
    addTrack,
    moveTrack,
  };
};
