export interface GenreOption {
  name: string;
  labelKey: string;
  emoji: string;
  tagline: string;
  desc: string;
  image: string;
  badge?: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  {
    name: 'Suspense / Mystery',
    labelKey: 'wizard.genreSuspense',
    emoji: '🔍',
    tagline: 'High-stakes Secrets & Twists',
    desc: 'Unravel deep conspiracies, undercover detective mysteries, and sudden shocking plot turns.',
    image: '/genres/suspense.jpg',
    badge: 'Trending',
  },
  {
    name: 'Revenge / Drama',
    labelKey: 'wizard.genreRevenge',
    emoji: '⚡',
    tagline: 'Comeback Arc & Identity',
    desc: 'Hidden billionaire heir, underdog humiliation, and ruthless satisfying retribution.',
    image: '/genres/revenge.jpg',
    badge: 'Viral Hook',
  },
  {
    name: 'Romance / Contract',
    labelKey: 'wizard.genreRomance',
    emoji: '💍',
    tagline: 'Contract Marriage & Lovers',
    desc: 'Fake marriage arrangements that turn into passionate romance against family opposition.',
    image: '/genres/romance.jpg',
    badge: 'Popular',
  },
  {
    name: 'Satire / Comedy',
    labelKey: 'wizard.genreSatire',
    emoji: '🎭',
    tagline: 'Fast Humor & Social Irony',
    desc: 'Hilarious miscommunications, workplace chaos, and viral comedic short-form situations.',
    image: '/genres/satire.jpg',
  },
  {
    name: 'Fantasy / Rebirth',
    labelKey: 'wizard.genreFantasy',
    emoji: '🗡️',
    tagline: 'Second Chance & Powers',
    desc: 'Reincarnation with future knowledge, magical cultivation, and mythical creature bonds.',
    image: '/genres/fantasy.jpg',
    badge: 'High CTR',
  },
  {
    name: 'Sci-Fi / Cyberpunk',
    labelKey: 'wizard.genreScifi',
    emoji: '🤖',
    tagline: 'Near-future Tech & AI',
    desc: 'Rogue AI systems, virtual reality heists, corporate android surveillance, and neon dystopia.',
    image: '/genres/scifi.jpg',
  },
];
