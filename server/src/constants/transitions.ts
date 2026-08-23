/**
 * OpenVideo GLSL Transitions Catalog (121 Transitions)
 * Reference: https://docs.openvideo.dev/core/03-creative/transitions#available-transition-effects
 */
export const OPENVIDEO_TRANSITIONS: Record<string, string> = {
  // Fade and Dissolve
  fade: 'fade',
  crossfade: 'fade',
  dissolve: 'fade',
  fadegrayscale: 'fadegrayscale',
  fadecolor: 'fadecolor',

  // Wipes
  wipeleft: 'wipeLeft',
  wiperight: 'wipeRight',
  wipeup: 'wipeUp',
  wipedown: 'wipeDown',
  directional: 'directional',
  directionalwipe: 'directionalwipe',
  radialswipe: 'radialSwipe',

  // Zoom and Scale
  cube: 'cube',
  zoomincircles: 'zoomInCircles',
  simplezoom: 'SimpleZoom',
  crosszoom: 'CrossZoom',
  dreamyzoom: 'DreamyZoom',

  // Distortion Effects
  glitchmemories: 'glitchMemories',
  glitchdisplace: 'GlitchDisplace',
  glitch: 'glitchMemories',
  dreamy: 'dreamy',
  swirl: 'Swirl',
  waterdrop: 'waterDrop',
  ripple: 'ripple',
  wind: 'wind',

  // Geometric
  circle: 'circle',
  circleopen: 'circleopen',
  circlecrop: 'CircleCrop',
  windowblinds: 'windowblinds',
  windowslice: 'windowslice',
  gridflip: 'GridFlip',
  hexagonalize: 'hexagonalize',
  kaleidoscope: 'kaleidoscope',

  // Creative
  heart: 'heart',
  pinwheel: 'pinwheel',
  morph: 'morph',
  flyeye: 'flyeye',
  doorway: 'doorway',
  squeeze: 'squeeze',
  swap: 'swap',
  burn: 'burn',
  angular: 'angular',

  // Advanced
  mosaic: 'Mosaic',
  polkadotscurtain: 'PolkaDotsCurtain',
  stereoviewer: 'StereoViewer',
  invertedpagecurl: 'InvertedPageCurl',
  linearblur: 'LinearBlur',
  bowtiehorizontal: 'BowTieHorizontal',
  bowtievertical: 'BowTieVertical',
  crazyparametricfun: 'CrazyParametricFun',
  colourdistance: 'ColourDistance',
  butterflywavescrawler: 'ButterflyWaveScrawler',
  displacement: 'displacement',
  directionalwarp: 'directionalwarp',
  crosswarp: 'crosswarp',
  crosshatch: 'crosshatch',
  colorphase: 'colorphase',
  luma: 'luma',
  luminance_melt: 'luminance_melt',
  multiply_blend: 'multiply_blend',
  perlin: 'perlin',
  pixelize: 'pixelize',
  randomsquares: 'randomsquares',
  rotate_scale_fade: 'rotate_scale_fade',
  squareswire: 'squareswire',
  undulatingburnout: 'undulatingBurnOut',
  cannabisleaf: 'cannabisleaf',
  bounce: 'Bounce',
};

/**
 * Normalizes user/AI transition string to official OpenVideo transitionKey.
 * Returns null for direct cuts ("cut", "none", "", etc.)
 */
export function normalizeTransitionKey(raw?: string): string | null {
  if (!raw) return null;
  const clean = raw.toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (['', 'cut', 'none', 'direct', 'nonecut', 'hardcut'].includes(clean)) {
    return null;
  }
  return OPENVIDEO_TRANSITIONS[clean] || null;
}
