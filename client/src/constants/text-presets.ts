export interface TextPreset {
  type: string;
  name: string;
  text: string;
  style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    align?: string;
    stroke?: { color: string; width: number };
    shadow?: { color: string; alpha: number; blur: number; offsetX?: number; offsetY?: number };
  };
  timing?: {
    display: { from: number; to: number };
    duration: number;
  };
  transform?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    angle?: number;
    opacity?: number;
    zIndex?: number;
  };
  metadata?: {
    previewUrl?: string;
  };
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    type: 'Text',
    name: 'Bold Viral Header',
    text: 'EPISODE TITLE',
    style: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 90,
      fontWeight: '900',
      color: '#FFD700',
      align: 'center',
      stroke: { color: '#000000', width: 6 },
      shadow: { color: '#000000', alpha: 0.8, blur: 8, offsetX: 3, offsetY: 3 },
    },
    timing: { display: { from: 0, to: 4000000 }, duration: 4000000 },
  },
  {
    type: 'Text',
    name: 'Dramatic Subtitle',
    text: 'The Secret Revealed',
    style: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 64,
      fontWeight: '700',
      color: '#FFFFFF',
      align: 'center',
      shadow: { color: '#000000', alpha: 0.7, blur: 6 },
    },
    timing: { display: { from: 0, to: 3000000 }, duration: 3000000 },
  },
  {
    type: 'Text',
    name: 'Cyberpunk Neon',
    text: 'NEON HEIGHTS',
    style: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 78,
      fontWeight: '800',
      color: '#00FFFF',
      align: 'center',
      shadow: { color: '#00FFFF', alpha: 0.9, blur: 12 },
    },
    timing: { display: { from: 0, to: 3500000 }, duration: 3500000 },
  },
  {
    type: 'Text',
    name: 'Comic Impact',
    text: 'BETRAYED!',
    style: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 96,
      fontWeight: '900',
      color: '#FF2A6D',
      align: 'center',
      stroke: { color: '#FFFFFF', width: 4 },
      shadow: { color: '#000000', alpha: 0.9, blur: 10, offsetX: 4, offsetY: 4 },
    },
    timing: { display: { from: 0, to: 2500000 }, duration: 2500000 },
  },
  {
    type: 'Text',
    name: 'Minimal Clean Title',
    text: 'CHAPTER 01',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 48,
      fontWeight: '600',
      color: '#E0E0E0',
      align: 'center',
      shadow: { color: '#000000', alpha: 0.4, blur: 4 },
    },
    timing: { display: { from: 0, to: 3000000 }, duration: 3000000 },
  },
];
