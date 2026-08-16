import { Core, CoreConfig, BrowserMetadataProvider } from '@openvideo/core';

// Initialize browser metadata provider for core
CoreConfig.setMetadataProvider(new BrowserMetadataProvider());

const canvasSize = { width: 1920, height: 1080 };
const fps = 30;

export const core = new Core({
  settings: {
    width: canvasSize.width,
    height: canvasSize.height,
    fps,
    duration: 30_000_000,
  },
});

export const engine = core;
export const projectStore = core.store;
export const playbackController = core.playback;

if (typeof window !== 'undefined') {
  (window as any).core = core;
  (window as any).engine = core;
}
