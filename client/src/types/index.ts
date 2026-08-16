export type BackgroundType = "blur" | "mirror" | "color";
export type CanvasMode = "preset" | "original" | "custom";

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasPreset {
  name: string;
  width: number;
  height: number;
}

export type MediaType = "image" | "video" | "audio";

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  ephemeral?: boolean;
}

export type BlurIntensity = 4 | 8 | 18;

export interface Scene {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TProject {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
  scenes?: Scene[];
  currentSceneId: string;
  mediaItems?: string[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: BlurIntensity;
  fps?: number;
  bookmarks?: number[];
  canvasSize: CanvasSize;
  canvasMode: "preset" | "original" | "custom";
  data?: any;
}

export type TrackType =
  | "Video"
  | "Audio"
  | "Image"
  | "Text"
  | "Caption"
  | "Effect"
  | "Transition"
  | "Placeholder";

export interface IDisplay {
  from: number; // Microseconds
  to: number; // Microseconds
}

export interface IClip {
  id: string;
  type: string;
  name?: string;
  text?: string;
  src?: string;
  display: IDisplay;
  trim?: { from: number; to: number };
  duration: number; // Microseconds
  sourceDuration?: number;
  playbackRate?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  zIndex?: number;
  opacity?: number;
  flip?: { horizontal: boolean; vertical: boolean } | string | null;
  style?: any;
  caption?: any;
  effects?: any[];
  locked?: boolean;
  [key: string]: any;
}

export interface ITimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  clipIds: string[];
  muted?: boolean;
}

export const MICROSECONDS_PER_SECOND = 1_000_000;
