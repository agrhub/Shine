import { Core, CoreConfig, BrowserMetadataProvider } from '@openvideo/core';

// Initialize browser metadata provider for OpenVideo engine
CoreConfig.setMetadataProvider(new BrowserMetadataProvider());

export const core = new Core({
  settings: {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 30_000_000,
  },
});

export const engine = core;
export const playbackController = core.playback;

if (typeof window !== 'undefined') {
  (window as any).core = core;
  (window as any).engine = core;
}
