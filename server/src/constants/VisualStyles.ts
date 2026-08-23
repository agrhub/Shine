export interface VisualStyleOption {
  id: string;
  name: string;
  category: 'Realistic' | 'Animation' | '3D & CGI' | 'Illustrated' | 'Artistic' | 'Retro';
  description: string;
  image: string;
  promptModifier: string;
  isFeatured?: boolean;
  badge?: string;
}

export const VISUAL_STYLE_CATEGORIES = [
  'All',
  'Featured',
  'Realistic',
  'Animation',
  '3D & CGI',
  'Illustrated',
  'Artistic',
  'Retro',
] as const;

export type VisualStyleCategory = typeof VISUAL_STYLE_CATEGORIES[number];

export const VISUAL_STYLES: VisualStyleOption[] = [
  // ─── 8 FEATURED STYLES (Exact Frameloop AI) ─────────────────────────────────
  {
    id: 'realistic',
    name: 'Realistic',
    category: 'Realistic',
    description: 'Ultra-detailed photography, cinematic studio lighting, soft diffused key light with subtle rim lighting.',
    image: '/visual-styles/realistic.png',
    promptModifier: 'ultra-detailed photorealistic photography, cinematic studio lighting, natural skin texture, 8k raw photo, photoreal cinematography',
    isFeatured: true,
    badge: 'Popular',
  },
  {
    id: 'illustration',
    name: 'Illustration',
    category: 'Illustrated',
    description: 'Digital painting, cel shading, clean vector lines, smooth gradients, vector shapes, detailed textures.',
    image: '/visual-styles/illustration.webp',
    promptModifier: 'digital painting illustration, clean cel shading, smooth vector lines, vibrant colors, detailed character art, high resolution',
    isFeatured: true,
    badge: 'Trending',
  },
  {
    id: 'anime',
    name: 'Anime',
    category: 'Animation',
    description: 'Anime style illustration, makoto shinkai aesthetic, high quality, vibrant bold flat colors, crisp lines, intricate details.',
    image: '/visual-styles/anime.webp',
    promptModifier: 'anime style illustration, makoto shinkai aesthetic, high quality, vibrant bold colors, crisp lineart, intricate details, studio animation',
    isFeatured: true,
    badge: 'Hot',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'Realistic',
    description: 'Highly detailed 35mm film photograph, cinematic shot, anamorphic lens, shallow depth of field, dramatic movie lighting.',
    image: '/visual-styles/cinematic.webp',
    promptModifier: 'highly detailed 35mm film photograph, cinematic movie still, anamorphic lens, shallow depth of field, moody dramatic lighting, 8k',
    isFeatured: true,
    badge: 'Featured',
  },
  {
    id: '2_tone_minimalist',
    name: '2-Tone Minimalist',
    category: 'Illustrated',
    description: 'Minimalist two-tone screen print illustration, vibrant orange and cerulean blue palette, bold flat color blocks.',
    image: '/visual-styles/2_tone_minimalist.webp',
    promptModifier: 'minimalist two-color screen print illustration, vibrant orange and cerulean blue palette, textured graphic art, bold dual-tone ink lines',
    isFeatured: true,
  },
  {
    id: '3d_kawaii_chibi',
    name: '3D Kawaii Chibi',
    category: '3D & CGI',
    description: '3D kawaii chibi render, smooth clay-like textures, cute chibi-style proportions, warm and vibrant soft ambient lighting.',
    image: '/visual-styles/3d_kawaii_chibi.webp',
    promptModifier: '3d stylized chibi render, smooth vinyl clay texture, cute chibi proportions, octane render, warm soft studio lighting, 8k asset',
    isFeatured: true,
    badge: 'Featured',
  },
  {
    id: 'colored_sketch',
    name: 'Colored Sketch',
    category: 'Artistic',
    description: 'Color pencil drawing, marker illustration, visible linework, stylish fashionable hand-drawn character pose.',
    image: '/visual-styles/colored_sketch.webp',
    promptModifier: 'color pencil drawing, marker illustration, visible expressive linework, stylish character sketch, editorial fashion art',
    isFeatured: true,
  },
  {
    id: 'whimsical_storybook',
    name: 'Whimsical Storybook',
    category: 'Illustrated',
    description: 'Whimsical storybook illustration, warm golden palette, textured painterly folk art, dreamy children fairy tale aesthetic.',
    image: '/visual-styles/whimsical_storybook.png',
    promptModifier: 'whimsical storybook illustration, warm golden palette, textured painterly folk art, dreamy children fairy tale art, soft magical atmosphere',
    isFeatured: true,
    badge: 'Featured',
  },

  // ─── 24 MORE VISUAL STYLES (Exact Frameloop AI) ──────────────────────────────
  {
    id: '1950s_editorial_poster',
    name: '1950s Editorial Poster',
    category: 'Retro',
    description: 'Mid-century modern editorial illustration, 1950s vintage travel poster aesthetic, bold expressive ink brushwork.',
    image: '/visual-styles/1950s_editorial_poster.webp',
    promptModifier: '1950s vintage editorial poster, mid-century modern graphic art, bold lithograph print, retro poppy red and black, textured aged paper',
  },
  {
    id: 'charcoal_expressionism',
    name: 'Charcoal Expressionism',
    category: 'Artistic',
    description: 'Dark monochrome charcoal illustration, high-contrast velvety blacks, foggy surreal landscape, eerie cinematic lighting.',
    image: '/visual-styles/charcoal_expressionism.webp',
    promptModifier: 'dark monochrome charcoal illustration, high-contrast velvety blacks, foggy surreal landscape, grainy painterly texture, eerie cinematic lighting',
  },
  {
    id: 'impasto_illustration',
    name: 'Impasto Ilustration',
    category: 'Artistic',
    description: 'Thick impasto oil painting style, highly textured visible brush strokes, palette knife technique, stylized whimsical illustration.',
    image: '/visual-styles/impasto_illustration.webp',
    promptModifier: 'thick impasto oil painting style, highly textured visible brush strokes, palette knife technique, stylized whimsical illustration, contemporary painting',
  },
  {
    id: 'retro_pop_art',
    name: 'Retro Pop Art',
    category: 'Artistic',
    description: 'High-contrast retro anime graphic art, block-shaded illustration, vibrant saturated colors, colored lens sunglasses, 80s aesthetic.',
    image: '/visual-styles/retro_pop_art.webp',
    promptModifier: 'high-contrast retro anime graphic art, block-shaded illustration, vibrant saturated colors, deep defined shadows, 80s aesthetic, pop-art',
  },
  {
    id: 'cute_minimalism',
    name: 'Cute Minimalism',
    category: 'Illustrated',
    description: 'Minimalist cute illustration, textured gouache painting style, whimsical storybook character design, soft pastel palette.',
    image: '/visual-styles/cute_minimalism.webp',
    promptModifier: 'minimalist cute illustration, textured gouache painting style, whimsical storybook character design, flat color soft grain, muted palette',
  },
  {
    id: 'chaotic_red_ink',
    name: 'Chaotic Red Ink',
    category: 'Illustrated',
    description: 'Chaotic ink sketch style, rough heavy black marker linework, erratic overlapping pen strokes, vibrant red background.',
    image: '/visual-styles/chaotic_red_ink.webp',
    promptModifier: 'chaotic ink sketch style, rough heavy black marker linework, scribbled overlapping pen strokes, solid flat vibrant red background, high contrast',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    category: 'Realistic',
    description: 'Epic high fantasy cinematic movie still, sweeping majestic landscapes, glowing magical elements, intricate medieval armor.',
    image: '/visual-styles/fantasy.webp',
    promptModifier: 'epic high fantasy cinematic movie still, sweeping majestic landscapes, glowing magical elements, rich jewel tones, intricate armor, IMAX quality',
  },
  {
    id: 'bw_film',
    name: 'B&W Film',
    category: 'Retro',
    description: 'Black and white film noir style, shot on 35mm monochrome film, heavy film grain, high contrast chiaroscuro lighting.',
    image: '/visual-styles/bw_film.webp',
    promptModifier: 'black and white film noir style, shot on 35mm monochrome film, heavy film grain, high contrast chiaroscuro lighting, deep harsh shadows',
  },
  {
    id: '90s_comic_book',
    name: '90s Comic Book',
    category: 'Illustrated',
    description: 'Early 90s comic book art style, highly dynamic and kinetic, heavy dark ink outlines, aggressive cross-hatching.',
    image: '/visual-styles/90s_comic_book.webp',
    promptModifier: 'early 90s comic book art style, dynamic kinetic superhero action, heavy dark ink outlines, aggressive cross-hatching, bold saturated colors',
  },
  {
    id: 'surrealism',
    name: 'Surrealism',
    category: 'Artistic',
    description: 'Surrealist art style, dreamlike composition, bizarre juxtaposition, melting realities, inspired by Salvador Dalí & René Magritte.',
    image: '/visual-styles/surrealism.webp',
    promptModifier: 'surrealist art style, dreamlike composition, bizarre juxtaposition of elements, melting realities, infinite horizons, inspired by Salvador Dali',
  },
  {
    id: 'claymation',
    name: 'Claymation',
    category: '3D & CGI',
    description: 'Highly detailed claymation style, hand-sculpted plasticine clay models, visible tool marks and fingerprint ridges.',
    image: '/visual-styles/claymation.webp',
    promptModifier: 'highly detailed claymation style, hand-sculpted plasticine clay models, visible tool marks and fingerprint ridges, stop-motion animation',
  },
  {
    id: 'oil_painting',
    name: 'Oil Painting',
    category: 'Artistic',
    description: 'Oil painting style, textured brushstrokes, rich colors, layered pigments, impasto technique, canvas texture, chiaroscuro.',
    image: '/visual-styles/oil_painting.webp',
    promptModifier: 'oil painting style, textured brushstrokes, rich colors, layered pigments, impasto technique, canvas texture, classical chiaroscuro composition',
  },
  {
    id: 'floral_maximalism',
    name: 'Floral Maximalism',
    category: 'Illustrated',
    description: 'Flat vector illustration, whimsical editorial art, modern gouache texture, vibrant pastel color palette, floral maximalism.',
    image: '/visual-styles/floral_maximalism.webp',
    promptModifier: 'flat vector illustration, whimsical editorial art, modern gouache texture, vibrant pastel color palette, floral maximalism, storybook aesthetic',
  },
  {
    id: 'prismatic_dreamscape',
    name: 'Prismatic Dreamscape',
    category: 'Artistic',
    description: 'Ethereal dreamy atmosphere, heavy prismatic light leaks, sunlight filtering through prismatic glass, soft glowing bloom.',
    image: '/visual-styles/prismatic_dreamscape.webp',
    promptModifier: 'ethereal dreamy atmosphere, heavy prismatic light leaks, sunlight filtering through prismatic glass, soft glowing bloom, holographic flares',
  },
  {
    id: 'pixar_style',
    name: 'Pixar Style',
    category: '3D & CGI',
    description: '3D animated movie still, Pixar style, Disney animation, vibrant color palette, soft shadows, volumetric lighting.',
    image: '/visual-styles/pixar_style.webp',
    promptModifier: '3d animated movie still, pixar style, disney animation, vibrant color palette, soft shadows, volumetric lighting, octane render, 8k CGI',
    badge: 'Popular',
  },
  {
    id: 'ghibli_style',
    name: 'Ghibli Style',
    category: 'Animation',
    description: 'Studio Ghibli style, anime movie still, lush watercolor background, soft lighting, whimsical atmosphere, Hayao Miyazaki aesthetic.',
    image: '/visual-styles/ghibli_style.webp',
    promptModifier: 'studio ghibli style, anime movie still, lush watercolor background, soft lighting, whimsical atmosphere, hayao miyazaki aesthetic',
    badge: 'Featured',
  },
  {
    id: '3d_render',
    name: '3D Render',
    category: '3D & CGI',
    description: 'Octane 3D render, ray traced, dynamic lighting, vibrant colors, fantasy elements, atmospheric effects.',
    image: '/visual-styles/3d_render.webp',
    promptModifier: 'octane 3d render, ray traced, dynamic volumetric lighting, vibrant colors, atmospheric effects, 8k 3d asset',
  },
  {
    id: 'pixel_art',
    name: 'Pixel Art',
    category: 'Retro',
    description: 'Pixel art, 8 bit & 16 bit colors, retro gaming, dithered shading, nostalgic arcade sprites.',
    image: '/visual-styles/pixel_art.webp',
    promptModifier: 'pixel art, 8 bit colors, retro gaming, dithered shading, nostalgic arcade sprite, snes pixel aesthetic',
  },
  {
    id: 'watercolor_painting',
    name: 'Watercolor Painting',
    category: 'Artistic',
    description: 'Watercolor painting art style, expressive strokes, rough paper, messy watercolor bleeding, delicate translucent wash.',
    image: '/visual-styles/watercolor_painting.webp',
    promptModifier: 'watercolor painting art style, expressive strokes, rough cold pressed paper, atmospheric wet-on-wet watercolor wash',
  },
  {
    id: 'retro_90s_cartoon',
    name: 'Retro 90s Cartoon',
    category: 'Animation',
    description: '90s animation style, vintage 2D cel animation, hard cel shading, distinct shadow layers, bold black outlines.',
    image: '/visual-styles/retro_90s_cartoon.webp',
    promptModifier: '90s animation style, vintage 2D cel animation, hard cel shading, distinct shadow layers, bold black outlines, hand painted background',
  },
  {
    id: 'pencil_sketch',
    name: 'Pencil Sketch',
    category: 'Artistic',
    description: 'Pencil drawing, charcoal sketch, graphite shading, high contrast, textured artist sketchbook paper.',
    image: '/visual-styles/pencil_sketch.webp',
    promptModifier: 'pencil drawing, charcoal sketch, graphite shading, high contrast, textured sketchbook paper, detailed fine lineart',
  },
  {
    id: 'lego',
    name: 'Lego',
    category: '3D & CGI',
    description: 'Lego style, macro shot, lego blocks, plastic lego bricks, primary colors, minifigure proportions, glossy reflections.',
    image: '/visual-styles/lego.webp',
    promptModifier: 'lego style, macro tilt-shift shot, lego blocks, plastic lego bricks, primary colors, minifigure proportions, octane render',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'Realistic',
    description: 'Cyberpunk, neon lit, futuristic, dystopian, high-tech, gritty atmosphere, wet reflections, rain-slicked city.',
    image: '/visual-styles/cyberpunk.webp',
    promptModifier: 'cyberpunk, neon lit, futuristic, dystopian, high-tech, gritty atmosphere, wet asphalt reflections, volumetric fog',
  },
  {
    id: 'luminous_oil_painting',
    name: 'Luminous Oil Painting',
    category: 'Artistic',
    description: 'Luminous oil painting with soft impasto texture and delicate blended brushwork, pastel palette, airy romantic atmosphere.',
    image: '/visual-styles/luminous_oil_painting.webp',
    promptModifier: 'luminous oil painting, soft impasto texture, delicate blended brushwork, pastel color palette, whimsical romantic elegance, fine art portrait',
  },
];

export function getVisualStyleById(id?: string): VisualStyleOption {
  if (!id) return VISUAL_STYLES[0];
  const clean = id.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return VISUAL_STYLES.find((s) => s.id === clean || s.name.toLowerCase().replace(/[\s-]+/g, '_') === clean || s.id === id) || VISUAL_STYLES[0];
}

export function getVisualStylePrompt(styleIdOrName?: string): string {
  if (!styleIdOrName) {
    return VISUAL_STYLES[0].promptModifier;
  }
  const clean = styleIdOrName.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const found = VISUAL_STYLES.find(
    (s) => s.id === clean || s.name.toLowerCase().replace(/[\s-]+/g, '_') === clean || s.id === styleIdOrName
  );
  if (found) {
    return found.promptModifier;
  }
  return `${styleIdOrName} artistic style, highly detailed portrait render`;
}
