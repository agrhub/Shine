export interface TargetLanguageInfo {
  name: string;
  code: string;
  nativeName: string;
  promptInstruction: string;
  dialogueInstruction: string;
}

const COUNTRY_LANGUAGE_MAP: Record<string, TargetLanguageInfo> = {
  // Vietnam
  vietnam: {
    name: 'Vietnamese',
    code: 'vi',
    nativeName: 'Tiếng Việt',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Vietnamese (Tiếng Việt).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN VIETNAMESE (Tiếng Việt) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  vn: {
    name: 'Vietnamese',
    code: 'vi',
    nativeName: 'Tiếng Việt',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Vietnamese (Tiếng Việt).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN VIETNAMESE (Tiếng Việt) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  sea: {
    name: 'Vietnamese',
    code: 'vi',
    nativeName: 'Tiếng Việt / Southeast Asia',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Vietnamese (Tiếng Việt).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN VIETNAMESE (Tiếng Việt) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // China / Taiwan
  china: {
    name: 'Chinese',
    code: 'zh',
    nativeName: '简体中文',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Simplified Chinese (简体中文).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN SIMPLIFIED CHINESE (简体中文) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  cn: {
    name: 'Chinese',
    code: 'zh',
    nativeName: '简体中文',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Simplified Chinese (简体中文).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN SIMPLIFIED CHINESE (简体中文) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // Japan
  japan: {
    name: 'Japanese',
    code: 'jp',
    nativeName: '日本語',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Japanese (日本語).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN JAPANESE (日本語) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  jp: {
    name: 'Japanese',
    code: 'jp',
    nativeName: '日本語',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Japanese (日本語).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN JAPANESE (日本語) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // South Korea
  'south korea': {
    name: 'Korean',
    code: 'ko',
    nativeName: '한국어',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Korean (한국어).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN KOREAN (한국어) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  kr: {
    name: 'Korean',
    code: 'ko',
    nativeName: '한국어',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Korean (한국어).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN KOREAN (한국어) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // Thailand
  thailand: {
    name: 'Thai',
    code: 'th',
    nativeName: 'ภาษาไทย',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Thai (ภาษาไทย).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN THAI (ภาษาไทย) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // Spain / Latin America / Brazil / Mexico
  spain: {
    name: 'Spanish',
    code: 'es',
    nativeName: 'Español',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Spanish (Español).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN SPANISH (Español) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  mexico: {
    name: 'Spanish',
    code: 'es',
    nativeName: 'Español (Latinoamérica)',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Latin American Spanish (Español).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN SPANISH (Español) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  latam: {
    name: 'Spanish',
    code: 'es',
    nativeName: 'Español (Latinoamérica)',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Latin American Spanish (Español).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN SPANISH (Español) so that neural TTS voiceover dubbing matches the target country without translation.',
  },
  brazil: {
    name: 'Portuguese',
    code: 'pt',
    nativeName: 'Português (Brasil)',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in Brazilian Portuguese (Português).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN PORTUGUESE (Português) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // France
  france: {
    name: 'French',
    code: 'fr',
    nativeName: 'Français',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in French (Français).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN FRENCH (Français) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // Germany
  germany: {
    name: 'German',
    code: 'de',
    nativeName: 'Deutsch',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in German (Deutsch).',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN GERMAN (Deutsch) so that neural TTS voiceover dubbing matches the target country without translation.',
  },

  // Default: US / UK / Global English
  us: {
    name: 'English',
    code: 'en',
    nativeName: 'English (US)',
    promptInstruction: 'All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written in English.',
    dialogueInstruction: 'Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN ENGLISH.',
  },
};

export function getLanguageForCountry(country?: string): TargetLanguageInfo {
  if (!country) {
    return COUNTRY_LANGUAGE_MAP.us;
  }
  const key = country.toLowerCase().trim();
  if (COUNTRY_LANGUAGE_MAP[key]) {
    return COUNTRY_LANGUAGE_MAP[key];
  }
  for (const [mapKey, info] of Object.entries(COUNTRY_LANGUAGE_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return info;
    }
  }
  return COUNTRY_LANGUAGE_MAP.us;
}
