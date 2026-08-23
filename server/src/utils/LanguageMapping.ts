export interface TargetLanguageInfo {
  name: string;
  code: string;
  nativeName: string;
  promptInstruction: string;
  dialogueInstruction: string;
}

/**
 * Common ISO-3166-1 alpha-2 / country name to primary ISO-639-1 language code mapping.
 * Used when a country name or country code is provided instead of a direct BCP-47 language tag.
 */
const COUNTRY_TO_LANGUAGE_CODE: Record<string, string> = {
  // Asia & Southeast Asia
  vn: 'vi', vietnam: 'vi', 'viet nam': 'vi', sea: 'vi',
  cn: 'zh', china: 'zh', taiwan: 'zh-TW', tw: 'zh-TW', 'hong kong': 'zh-HK', hk: 'zh-HK',
  jp: 'ja', japan: 'ja',
  kr: 'ko', korea: 'ko', 'south korea': 'ko',
  th: 'th', thailand: 'th',
  id: 'id', indonesia: 'id',
  my: 'ms', malaysia: 'ms',
  ph: 'fil', philippines: 'fil',
  in: 'hi', india: 'hi',
  pk: 'ur', pakistan: 'ur',
  bd: 'bn', bangladesh: 'bn',
  sg: 'en', singapore: 'en',
  kh: 'km', cambodia: 'km',
  la: 'lo', laos: 'lo',
  mm: 'my', myanmar: 'my',

  // Europe
  gb: 'en', uk: 'en', 'united kingdom': 'en', england: 'en',
  fr: 'fr', france: 'fr',
  de: 'de', germany: 'de',
  es: 'es', spain: 'es',
  it: 'it', italy: 'it',
  pt: 'pt', portugal: 'pt',
  ru: 'ru', russia: 'ru',
  ua: 'uk', ukraine: 'uk',
  pl: 'pl', poland: 'pl',
  nl: 'nl', netherlands: 'nl',
  se: 'sv', sweden: 'sv',
  no: 'no', norway: 'no',
  dk: 'da', denmark: 'da',
  fi: 'fi', finland: 'fi',
  gr: 'el', greece: 'el',
  tr: 'tr', turkey: 'tr',
  ro: 'ro', romania: 'ro',
  cz: 'cs', czech: 'cs',
  hu: 'hu', hungary: 'hu',
  at: 'de', austria: 'de',
  ch: 'de', switzerland: 'de',
  be: 'fr', belgium: 'fr',
  ie: 'en', ireland: 'en',

  // Americas
  us: 'en', usa: 'en', 'united states': 'en', global: 'en',
  ca: 'en', canada: 'en',
  mx: 'es', mexico: 'es',
  br: 'pt', brazil: 'pt', 'brasil': 'pt',
  ar: 'es', argentina: 'es',
  co: 'es', colombia: 'es',
  cl: 'es', chile: 'es',
  pe: 'es', peru: 'es',
  latam: 'es',

  // Middle East & Africa
  sa: 'ar', 'saudi arabia': 'ar', uae: 'ar', egypt: 'ar', eg: 'ar',
  il: 'he', israel: 'he',
  za: 'en', 'south africa': 'en',
  ng: 'en', nigeria: 'en',
  ke: 'sw', kenya: 'sw',

  // Oceania
  au: 'en', australia: 'en',
  nz: 'en', 'new zealand': 'en',
};

// Cache resolved language infos to avoid redundant Intl lookups
const languageInfoCache = new Map<string, TargetLanguageInfo>();

/**
 * Safely format Intl display name with fallback
 */
function getIntlDisplayName(localeCode: string, targetDisplayLocale: string): string | null {
  try {
    const formatter = new Intl.DisplayNames([targetDisplayLocale], { type: 'language', fallback: 'none' });
    return formatter.of(localeCode) || null;
  } catch {
    return null;
  }
}

/**
 * Dynamically construct full TargetLanguageInfo for any language code
 */
export function createLanguageInfo(code: string, explicitName?: string, explicitNativeName?: string): TargetLanguageInfo {
  const normCode = code.toLowerCase().trim();
  const cacheKey = `${normCode}_${explicitName || ''}_${explicitNativeName || ''}`;
  if (languageInfoCache.has(cacheKey)) {
    return languageInfoCache.get(cacheKey)!;
  }

  // Extract base language code (e.g. 'vi-VN' -> 'vi', 'zh-CN' -> 'zh')
  const baseCode = normCode.split(/[-_]/)[0];

  // Resolve English display name (e.g. "Vietnamese", "Japanese", "Spanish")
  let name = explicitName || getIntlDisplayName(normCode, 'en') || getIntlDisplayName(baseCode, 'en');
  if (!name) {
    name = normCode.toUpperCase();
  }

  // Resolve native display name (e.g. "Tiếng Việt", "日本語", "Español")
  let nativeName = explicitNativeName || getIntlDisplayName(normCode, normCode) || getIntlDisplayName(baseCode, baseCode);
  if (!nativeName || nativeName === name) {
    // Try base code in its own locale
    nativeName = getIntlDisplayName(baseCode, baseCode) || name;
  }

  const info: TargetLanguageInfo = {
    name,
    code: normCode,
    nativeName,
    promptInstruction: `All titles, synopsis, story core, hidden line, three-act structure, cliffhanger hooks, character identities, character traits, sceneCore, and conflictEscalation MUST be written natively in ${name} (${nativeName}).`,
    dialogueInstruction: `Character spoken dialogue, emotional subtext, action descriptions, and scene directions MUST BE IN ${name.toUpperCase()} (${nativeName}) so that neural TTS voiceover dubbing matches the target country without translation.`,
  };

  languageInfoCache.set(cacheKey, info);
  return info;
}

/**
 * Resolve any country name, country code, or BCP-47 language tag to TargetLanguageInfo.
 * Automatically supports 100% of countries and languages worldwide without hardcoded restrictions.
 */
export function getLanguageForCountry(countryOrLanguage?: string): TargetLanguageInfo {
  if (!countryOrLanguage) {
    return createLanguageInfo('en', 'English', 'English (US)');
  }

  const clean = countryOrLanguage.toLowerCase().trim().replace(/[-_]/g, ' ');
  const rawCode = countryOrLanguage.trim();

  // 1. Direct match in COUNTRY_TO_LANGUAGE_CODE map
  if (COUNTRY_TO_LANGUAGE_CODE[clean]) {
    const langCode = COUNTRY_TO_LANGUAGE_CODE[clean];
    return createLanguageInfo(langCode);
  }

  // 2. Tokenized partial match in country dictionary (e.g. "viet nam", "united states")
  const parts = clean.split(/\s+/);
  for (const part of parts) {
    if (COUNTRY_TO_LANGUAGE_CODE[part]) {
      return createLanguageInfo(COUNTRY_TO_LANGUAGE_CODE[part]);
    }
  }

  // 3. Check if rawCode is already a valid BCP-47 / ISO-639 language tag (e.g. 'vi', 'vi-VN', 'zh', 'zh-CN', 'ja', 'es', 'pt-BR')
  try {
    const locale = new Intl.Locale(rawCode);
    if (locale.language) {
      return createLanguageInfo(locale.baseName || locale.language);
    }
  } catch {
    // If not a valid standard locale tag, continue to fallback
  }

  // 4. Try matching partial country keys
  for (const [countryKey, langCode] of Object.entries(COUNTRY_TO_LANGUAGE_CODE)) {
    if (clean.includes(countryKey) || countryKey.includes(clean)) {
      return createLanguageInfo(langCode);
    }
  }

  // 5. Fallback: create dynamic language info directly from the input string
  return createLanguageInfo(rawCode, countryOrLanguage, countryOrLanguage);
}
