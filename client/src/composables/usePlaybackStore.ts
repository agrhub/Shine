import { ref } from 'vue';
import { core, projectStore } from '@/lib/project';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  previousVolume: number;
  speed: number;
}

const initialState = projectStore.getState();

const calculateDuration = (state: any) => {
  let maxDurationUs = state?.settings?.duration || 10_000_000;
  if (state?.clips) {
    const clipsArr = Object.values(state.clips);
    for (const clip of clipsArr as any[]) {
      const clipTo = clip.timing?.display?.to || 0;
      if (clipTo > maxDurationUs) {
        maxDurationUs = clipTo;
      }
    }
  }
  return maxDurationUs / 1_000_000;
};

const playbackState = ref<PlaybackState>({
  isPlaying: !!initialState.isPlaying,
  currentTime: (initialState.currentTime || 0) / 1_000_000,
  duration: calculateDuration(initialState),
  volume: 1,
  muted: false,
  previousVolume: 1,
  speed: 1.0,
});

// 1:1 Core-First subscription to projectStore
projectStore.subscribe((state: any) => {
  playbackState.value.currentTime = (state.currentTime || 0) / 1_000_000;
  playbackState.value.isPlaying = !!state.isPlaying;
  playbackState.value.duration = calculateDuration(state);
});

export const usePlaybackStore = () => {
  const play = async () => {
    try {
      await core.play();
    } catch (e) {
      console.warn('Playback error:', e);
    }
    playbackState.value.isPlaying = true;
  };

  const pause = () => {
    try {
      core.pause();
    } catch (e) {
      console.warn('Pause error:', e);
    }
    playbackState.value.isPlaying = false;
  };

  const toggle = () => {
    if (playbackState.value.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seek = (time: number) => {
    const duration = playbackState.value.duration > 0 ? playbackState.value.duration : 30;
    const clampedTime = Math.max(0, Math.min(duration, time));
    try {
      core.seek(Math.round(clampedTime * 1_000_000));
    } catch (e) {
      console.warn('Seek error:', e);
    }
    playbackState.value.currentTime = clampedTime;
  };

  const setVolume = (volume: number) => {
    const v = Math.max(0, Math.min(1, volume));
    playbackState.value.volume = v;
    playbackState.value.muted = v === 0;
    if (v > 0) playbackState.value.previousVolume = v;
  };

  const setSpeed = (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    playbackState.value.speed = newSpeed;
  };

  const setDuration = (duration: number) => {
    playbackState.value.duration = duration;
    try {
      core.store.setState({
        settings: {
          ...core.store.getState().settings,
          duration: Math.round(duration * 1_000_000),
        },
      });
    } catch (e) {
      console.warn('Failed to set core duration:', e);
    }
  };

  const setCurrentTime = (time: number) => {
    playbackState.value.currentTime = time;
  };

  const setIsPlaying = (isPlaying: boolean) => {
    playbackState.value.isPlaying = isPlaying;
  };

  return {
    state: playbackState,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    setSpeed,
    setDuration,
    setCurrentTime,
    setIsPlaying,
  };
};
