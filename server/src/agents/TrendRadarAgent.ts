import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';
import { mcpClient } from '../integrations/mcp/ParallelMCPClient.js';
import { loadSkill } from '../utils/SkillLoader.js';
import { Logger } from '../utils/logger.js';

export interface TrendTopicOutput {
  id: string;
  topic: string;
  description?: string;
  trope: string;
  hashtagVelocity: string;
  competitorHook: string;
  region: string;
  engagementScore: number;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese (Tiếng Việt)',
  zh: 'Simplified Chinese (简体中文)',
  'zh-cn': 'Simplified Chinese (简体中文)',
  'zh-tw': 'Traditional Chinese (繁體中文)',
  jp: 'Japanese (日本語)',
  ja: 'Japanese (日本語)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  ko: 'Korean (한국어)',
  th: 'Thai (ไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
};

export class TrendRadarAgent {
  async execute(region: string = 'US', lang: string = 'en'): Promise<TrendTopicOutput[]> {
    const cleanRegion = region.trim().toUpperCase() || 'US';
    const cleanLang = (lang || 'en').trim().toLowerCase();
    const languageName = LANGUAGE_NAMES[cleanLang] || LANGUAGE_NAMES[cleanLang.split('-')[0]] || 'English';

    // 1. Primary Strategy: Try Parallel MCP Client with target language
    try {
      Logger.info(`[TrendRadarAgent] Attempting real-time scan via Parallel MCP for region: ${cleanRegion}, language: ${languageName}...`);
      const mcpTopics = await mcpClient.scanViralTrends(cleanRegion, cleanLang);

      if (Array.isArray(mcpTopics) && mcpTopics.length > 0) {
        Logger.info(`[TrendRadarAgent] Successfully retrieved ${mcpTopics.length} viral trends from Parallel MCP.`);
        return mcpTopics.map((item: any, idx: number) => ({
          id: item.id || `${cleanRegion.toLowerCase()}_${idx + 1}`,
          topic: item.title || item.topic || `Viral Trend ${idx + 1}`,
          description: item.description || `Trending micro-drama trope: ${(item.tropes || []).join(', ') || 'High-stakes conflict'}`,
          trope: (Array.isArray(item.tropes) && item.tropes[0]) || item.trope || 'High-Converting Trope',
          hashtagVelocity: item.hashtagVelocity || `+${item.viralScore ? item.viralScore * 5 : 480}% (TikTok/Reels/Shorts)`,
          competitorHook: item.competitorHook || `3-second opening hook for ${item.title || item.topic || 'story'}`,
          region: item.region || cleanRegion,
          engagementScore: item.viralScore || item.engagementScore || (98 - idx * 2),
        }));
      }
    } catch (mcpError: any) {
      Logger.warn(`[TrendRadarAgent] Parallel MCP scan unavailable (${mcpError.message}). Falling back to Gemini AI + Trend Radar Skill.`);
    }

    // 2. Fallback Strategy: Gemini AI + trend_radar.md Skill (Always guarantees localized drama topics)
    return this.executeGeminiLocalized(cleanRegion, cleanLang);
  }

  private async executeGeminiLocalized(region: string, lang: string): Promise<TrendTopicOutput[]> {
    const trendSkill = loadSkill('trend_radar');
    if (!trendSkill) {
      throw new Error('Trend Radar skill definition "trend_radar.md" could not be loaded.');
    }
    const cleanRegion = region.trim().toUpperCase() || 'US';
    const languageName = LANGUAGE_NAMES[lang] || LANGUAGE_NAMES[lang.split('-')[0]] || 'English';
    Logger.info(`[TrendRadarAgent] Running Gemini AI trend scan with trend_radar skill for region: ${region}, language: ${languageName}`);

    const prompt = `
Execute a real-time viral micro-drama trend scan for target region: "${region}".

TARGET OUTPUT LANGUAGE: ${languageName} (Locale code: ${lang}).
IMPORTANT: All text fields ("topic", "description", "trope", "competitorHook") MUST be written fluently in ${languageName} so the end-user can read the viral trends in their app's configured interface language.

TASK:
1. Extract top 10 viral drama trends in ${cleanRegion}.
2. Translate local context into clear English concepts.
3. Structure each into a 60-second Micro Drama script formula.
4. Output strictly valid JSON with format:

Respond strictly in JSON matching the TrendTopicOutput array schema:
[
  {
    "id": "${cleanRegion.toLowerCase()}_1",
    "topic": "Catchy Drama Title in ${languageName}",
    "description": "2-sentence dramatic synopsis in ${languageName}",
    "trope": "Core Trope in ${languageName}",
    "hashtagVelocity": "+520% (TikTok/Reels/Shorts)",
    "competitorHook": "3-second opening hook in ${languageName}",
    "region": "${cleanRegion}",
    "engagementScore": 98
  }
]
`;

    const rawText = await geminiClient.generateText({
      prompt,
      systemInstruction: trendSkill,
      jsonMode: true,
    });

    if (!rawText || !rawText.trim()) {
      throw new Error(`Trend Radar AI returned an empty response for region: ${cleanRegion}`);
    }

    try {
      const parsed = JSON.parse(rawText);
      const list = Array.isArray(parsed) ? parsed : parsed.topics || [];
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('Parsed Trend Radar JSON is not a valid non-empty array.');
      }
      return list;
    } catch (parseErr: any) {
      throw new Error(`Failed to parse Trend Radar response as JSON: ${parseErr.message}\nRaw Text: ${rawText.slice(0, 200)}...`);
    }
  }
}

export const trendRadarAgent = new TrendRadarAgent();
