export const data = {
  settings: {
    width: 1080,
    height: 1920,
    fps: 30,
    backgroundColor: '#111111',
    format: 'mp4',
    videoCodec: 'avc1.640033',
    bitrate: 12000000,
    audio: true,
    audioCodec: 'opus',
    audioSampleRate: 48000,
    prioritizeSpeed: true,
  },
  tracks: [],
  clips: {},
};

import { normalizeTransitionKey, normalizeEffectKey } from '@/stores/usePipelineStore';

export const SILENT_AUDIO_SAMPLE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
const SAMPLE_IMAGE_BG = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1080&h=1920&fit=crop';

export function sanitizeTimelineData(timelineData: any) {
  if (!timelineData) return timelineData;
  const canvasWidth = Number(timelineData.settings?.width) || 1080;
  const canvasHeight = Number(timelineData.settings?.height) || 1920;
  const clips = { ...(timelineData.clips || {}) };
  for (const key of Object.keys(clips)) {
    const clip = { ...clips[key] };
    const src = clip.src || '';
    const isVideoSrc = src.endsWith('.mp4') || src.endsWith('.webm') || src.startsWith('blob:') || src.includes('video');
    const isImageSrc = src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png') || src.endsWith('.webp') || src.includes('images.unsplash.com') || src.startsWith('data:image/');

    if (clip.type === 'Video') {
      if (!src || (isImageSrc && !isVideoSrc)) {
        clip.type = 'Image';
        clip.src = src || SAMPLE_IMAGE_BG;
      }
      if (!clip.transform) {
        clip.transform = {
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          angle: 0,
          opacity: 1,
          zIndex: 10,
          flip: { x: false, y: false },
        };
      }
    } else if (clip.type === 'Image') {
      if (!src) {
        clip.src = SAMPLE_IMAGE_BG;
      }
      if (!clip.transform) {
        clip.transform = {
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          angle: 0,
          opacity: 1,
          zIndex: 10,
          flip: { x: false, y: false },
        };
      }
    } else if (clip.type === 'Audio') {
      if (!src) {
        clip.src = SILENT_AUDIO_SAMPLE;
      }
    } else if (clip.type === 'Transition') {
      clip.transitionKey = normalizeTransitionKey(clip.transitionKey) || 'fade';
    } else if (clip.type === 'Effect') {
      clip.effectKey = normalizeEffectKey(clip.effectKey) || 'vignette';
    } else if (clip.type === 'Caption' || clip.type === 'Text') {
      const vAlign = clip.style?.verticalAlign || 'bottom';
      const capWidth = clip.transform?.width || clip.width || Math.round(canvasWidth * 0.88);
      const capHeight = clip.transform?.height || clip.height || 100;
      const left = clip.transform?.x ?? clip.left ?? Math.round((canvasWidth - capWidth) / 2);
      const defaultTop = vAlign === 'top'
        ? 80
        : vAlign === 'center'
          ? Math.round((canvasHeight - capHeight) / 2)
          : canvasHeight - 450;
      const top = clip.transform?.y ?? clip.top ?? defaultTop;

      clip.transform = {
        x: left,
        y: top,
        width: capWidth,
        height: capHeight,
        angle: clip.transform?.angle ?? clip.angle ?? 0,
        opacity: clip.transform?.opacity ?? clip.opacity ?? 1,
        zIndex: clip.transform?.zIndex ?? clip.zIndex ?? 100,
        flip: clip.transform?.flip ?? clip.flip ?? { x: false, y: false },
      };
      if (clip.type === 'Caption') {
        if(!clip.caption){
          const text = clip.text || '';
          const durMs = clip.timing?.duration ? Math.round(clip.timing.duration / 1000) : (clip.duration ? Math.round(clip.duration / 1000) : 1500);

          let rawWords = Array.isArray(clip.caption?.words) && clip.caption.words.length > 0
            ? clip.caption.words
            : [];

          if (rawWords.length === 0) {
            rawWords = [{ text, from: 0, to: durMs, isKeyWord: true }];
          } else {
            const firstFrom = rawWords[0].from || 0;
            const isMicroseconds = rawWords.some((w: any) => (w.from || 0) > 10000 || (w.to || 0) > 10000);
            const divisor = isMicroseconds ? 1000 : 1;
            const baseOffsetMs = Math.round(firstFrom / divisor);

            rawWords = rawWords.map((w: any, idx: number) => {
              const rawFromMs = Math.round((w.from || 0) / divisor);
              const rawToMs = Math.round((w.to || (rawFromMs + 300)) / divisor);
              const relFromMs = baseOffsetMs > 100 ? Math.max(0, rawFromMs - baseOffsetMs) : rawFromMs;
              const relToMs = baseOffsetMs > 100 ? Math.min(durMs, Math.max(relFromMs + 50, rawToMs - baseOffsetMs)) : Math.min(durMs, rawToMs);
              const isKeyWord = (idx === 0 || idx === rawWords.length - 1);
              return {
                text: w.text || '',
                from: relFromMs,
                to: relToMs,
                isKeyWord: isKeyWord,
              };
            });
          }

          clip.caption = {
            words: rawWords
          };
        }

        if(!clip.style){
          clip.style = {
            "color": "#ffffff"
          }
        }
      }
    }
    clips[key] = clip;
  }
  return { ...timelineData, clips };
}