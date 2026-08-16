import { clipToJSON, type IClip as StudioClip, Studio, jsonToClip } from "@openvideo/engine-pixi";
import CanvasTimeline, { TIMELINE_SEEK } from "@openvideo/timeline";
import { useStudioStore } from "@/stores/useStudioStore";
import { usePlaybackStore } from "@/composables/usePlaybackStore";

/**
 * Connects the Studio instance to the Store and Timeline.
 */
export function addStudioSync(studio: Studio, timeline: CanvasTimeline) {
  const { setCurrentTime, setIsPlaying } = usePlaybackStore();

  const handleTimeUpdate = (data: { time: number }) => {
    if (data && typeof data.time === "number") {
      setCurrentTime(data.time / 1_000_000);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  studio.on("timeupdate", handleTimeUpdate);
  studio.on("play", handlePlay);
  studio.on("pause", handlePause);

  return () => {
    studio.off("timeupdate", handleTimeUpdate);
    studio.off("play", handlePlay);
    studio.off("pause", handlePause);
  };
}
