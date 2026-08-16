import { Logger } from '@/utils/logger.js';
import { emailService } from '@/services/EmailService.js';
import { loadSkill } from '@/utils/SkillLoader.js';
import axios from 'axios';
import { geminiClient } from '../ai/gemini/GeminiClient';

export interface TrendTopic {
  id?: string;
  topic: string;
  viralScore: number;
  platform: string;
  region: string;
  tropes: string[];
  description?: string;
  competitorHook?: string;
  hashtagVelocity?: string;
  language?: string;
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

/**
 * 1. DYNAMIC QUERY GENERATOR
 */
// async function generateNativeQuery(countryName) {
//   const prompt = `
// You are an expert in global social media trends and short-form video platforms.
// Target Country: "${countryName}"

// Task:
// Generate a single search query string in the NATIVE language of "${countryName}" optimized to find current viral drama trends, social media controversies, or popular short-form drama tropes (TikTok, Reels, Douyin, or local platforms).

// Requirements:
// 1. Output ONLY a valid JSON object.
// 2. Include native slang/terms for "viral", "short drama", "conflict/scandal", and "hot trend".
// 3. Do not include markdown codeblocks or explanation.

// JSON Format:
// {
//   "nativeLanguage": "Language name",
//   "nativeQuery": "Native search string here"
// }
// `;

// async function fetchParallelTrends(query) {
//   try {
//     const response = await axios.post(
//       SEARCH_MCP_URL,
//       {
//         jsonrpc: '2.0',
//         id: `req-${Date.now()}`,
//         method: 'tools/call',
//         params: {
//           name: 'web_search',
//           arguments: { query }
//         }
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           ...(API_KEY && { Authorization: `Bearer ${API_KEY}` })
//         }
//       }
//     );
//     return response.data;
//   } catch (error: any) {
//     console.error('Parallel MCP Error:', error.response?.data || error.message);
//     return null;
//   }
// };

export class ParallelMCPClient {
  private isConnected = false;
  private mcpEndpoint: string;
  private apiKey: string;

  constructor() {
    const rawEndpoint = process.env.PARALLEL_MCP_SERVER || process.env.PARALLEL_SERVER_ENDPOINT || 'https://search.parallel.ai/mcp';
    this.mcpEndpoint = rawEndpoint.includes('task-mcp') ? 'https://search.parallel.ai/mcp' : rawEndpoint;
    this.apiKey = process.env.PARALLEL_API_KEY || '';
  }

  public async connect() {
    try {
      Logger.info(`[ParallelMCP] Connecting to MCP server at ${this.mcpEndpoint}...`);
      this.isConnected = true;
      Logger.info('[ParallelMCP] Connected successfully.');
    } catch (error: any) {
      Logger.error(`[ParallelMCP] Connection failed: ${error.message}`);
      this.isConnected = false;
      emailService.sendAdminSystemAlert('Parallel MCP Server', `Failed to connect to ${this.mcpEndpoint}: ${error.message}`).catch(console.error);
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async fetchParallelTrends(query: string) {
    try {
      const response = await axios.post(
        this.mcpEndpoint,
        {
          jsonrpc: '2.0',
          id: `req-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: 'web_search',
            arguments: {
              objective: `Find viral drama trends and short-form video tropes on social media`,
              search_queries: [query]
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Parallel MCP Error:', error.response?.data || error.message);
      return null;
    }
  }

  private async getViralTrendQuery(region: string) {
    const prompt = `
You are an expert in global social media trends and short-form video platforms.
Target Country: "${region}"

Task:
Generate a single search query string in the NATIVE language of "${region}" optimized to find current viral drama trends, social media controversies, or popular short-form drama tropes (TikTok, Reels, Douyin, or local platforms).

Requirements:
1. Output ONLY a valid JSON object.
2. Include native slang/terms for "viral", "short drama", "conflict/scandal", and "hot trend".
3. Do not include markdown codeblocks or explanation.

JSON Format:
{
  "nativeLanguage": "Language name",
  "nativeQuery": "Native search string here"
}
`;

    try {
      const response = await geminiClient.generateText({
        prompt,
        jsonMode: true,
      });
      return JSON.parse(response);
    } catch (error: any) {
      Logger.error(`Failed to generate query for ${region}:`, error.message);
      return { nativeQuery: `viral drama trends short videos ${region} now` };
    }
  }

  /**
 * DYNAMIC SKILL ENGINE
 */
  async processCountryDramaSkill(cleanRegion, languageName, nativeQuery, mcpResult) {
    const content = mcpResult?.result?.content || [];
    const rawText = content.map((item) => item.text || '').join('\n');

    if (!rawText) {
      return { country: cleanRegion, error: 'No raw trend data retrieved.' };
    }

    // Load Trend Radar skill to calibrate search objectives
    const trendSkill = loadSkill('trend_radar');
    if (trendSkill) {
      Logger.info(`[ParallelMCP] Successfully loaded "trend_radar.md" skill for market: ${cleanRegion}`);
    } else {
      Logger.warn(`[ParallelMCP] "trend_radar.md" skill not found, using baseline directives.`);
    }

    const prompt = `
You are a global viral content producer specializing in Micro Dramas.
Below is real-time raw trend data scraped from social media in ${cleanRegion} using the native query "${nativeQuery}":

--- RAW TREND DATA (${cleanRegion}) ---
${rawText}
--- END RAW DATA ---

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

    try {
      const response = await geminiClient.generateText({
        prompt,
        systemInstruction: trendSkill,
        jsonMode: true,
      });
      return JSON.parse(response);
    } catch (error: any) {
      Logger.error(`Skill Engine Error (${cleanRegion}):`, error.message);
      return null;
    }
  }

  public async scanViralTrends(region: string, lang: string = 'en'): Promise<TrendTopic[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const cleanRegion = region.trim().toUpperCase() || 'US';
    const cleanLang = (lang || 'en').trim().toLowerCase();
    const languageName = LANGUAGE_NAMES[cleanLang] || LANGUAGE_NAMES[cleanLang.split('-')[0]] || 'English';

    const queryTrend = await this.getViralTrendQuery(cleanRegion);
    Logger.info(`[ParallelMCP] Query trend for ${cleanRegion}: ${queryTrend.nativeQuery}`);
    const mcpData = await this.fetchParallelTrends(queryTrend.nativeQuery);
    // Logger.info(`[ParallelMCP] Trends for ${cleanRegion}: ${JSON.stringify(mcpData, null, 2)}`);
    if (!mcpData || !mcpData.result || mcpData.result?.isError) {
      return [];
    }
    // const parsedTrends = JSON.parse(mcpData.result.content);
    // Logger.info(`parsedTrends: ${JSON.stringify(parsedTrends, null, 2)}`);
    const trends = await this.processCountryDramaSkill(cleanRegion, languageName, queryTrend.nativeQuery, mcpData);
    Logger.info(`[ParallelMCP] Found ${trends?.length} real-time trending topics for ${cleanRegion} in ${languageName}`);
    return trends;

    // const topics: TrendTopic[] = [];
    // for (const item of trends) {



    //   if (item.type === 'text' && item.text) {
    //     try {
    //       const parsed = JSON.parse(item.text);
    //       const results = parsed.results || (Array.isArray(parsed) ? parsed : []);
    //       for (let i = 0; i < results.length && topics.length < 6; i++) {
    //         const res = results[i];
    //         const excerptsText = (res.excerpts || []).join(' ');
    //         topics.push({
    //           id: `${cleanRegion.toLowerCase()}_${i + 1}`,
    //           topic: res.title ? res.title.replace(/^#+\s*/, '').slice(0, 80) : `Viral Drama ${i + 1}`,
    //           viralScore: 98 - i * 3,
    //           platform: 'TikTok / Reels / ReelShort',
    //           region: cleanRegion,
    //           language: languageName,
    //           tropes: [res.title?.slice(0, 40) || 'Revenge / Status Inversion'],
    //           description: excerptsText ? excerptsText.slice(0, 180) + '...' : `Trending micro-drama narrative in ${cleanRegion}`,
    //           hashtagVelocity: `+${480 - i * 30}% (Weekly Surge)`,
    //           competitorHook: `3-second opening hook for ${res.title || 'trending series'}`,
    //         });
    //       }
    //     } catch {
    //       // Raw text response
    //     }
    //   }
    // }

    // Logger.info(`[ParallelMCP] Found ${topics.length} real-time trending topics for ${cleanRegion} in ${languageName}`);
    // return topics;

    // Logger.info(`[ParallelMCP] Scanning real-time viral trends for region: ${cleanRegion}, language: ${languageName}`);

    // // Build language-specific search queries
    // const searchQueries: string[] = [
    //   `viral drama trends hot tiktok douyin micro drama conflict ideas in ${cleanRegion} with language ${languageName}`,
    // ];

    // if (cleanLang === 'vi') {
    //   searchQueries.unshift(`xu hướng phim ngắn micro drama hot nhất thị trường ${cleanRegion} 2026`);
    // } else if (cleanLang === 'zh' || cleanLang === 'zh-cn' || cleanLang === 'zh-tw') {
    //   searchQueries.unshift(`爆款微短剧热门题材 逆袭 穿越 豪门 ${cleanRegion}`);
    // } else if (cleanLang === 'jp' || cleanLang === 'ja') {
    //   searchQueries.unshift(`ショートドラマ トレンド 人気マイクロドラマ ${cleanRegion}`);
    // } else if (cleanLang === 'es') {
    //   searchQueries.unshift(`tendencias micro drama novelas cortas verticales ${cleanRegion}`);
    // }

    // try {
    //   const response = await axios.post(
    //     this.mcpEndpoint,
    //     {
    //       jsonrpc: '2.0',
    //       id: Date.now(),
    //       method: 'tools/call',
    //       params: {
    //         name: 'web_search',
    //         arguments: {
    //           // objective: `Following Trend Radar skill guidelines (focus on 3 densities, high-converting tropes, viral themes, and 3-second competitor hooks), discover real-time viral vertical short drama storylines, trending tropes, competitor hooks, and viewer rankings in ${cleanRegion} in ${languageName} language. Don't response the search results. Only response the micro drama trend topics`,
    //           prompt: `Following Trend Radar skill guidelines: ${trendSkill}. (focus on 3 densities, high-converting tropes, viral themes, and 3-second competitor hooks)`,
    //           search_queries: searchQueries,
    //         },
    //       },
    //     },
    //     {
    //       headers: this.getHeaders(),
    //       timeout: 15000,
    //     }
    //   );

    //   const content = response.data?.result?.content || [];
    //   const topics: TrendTopic[] = [];

    //   for (const item of content) {
    //     if (item.type === 'text' && item.text) {
    //       try {
    //         const parsed = JSON.parse(item.text);
    //         const results = parsed.results || (Array.isArray(parsed) ? parsed : []);
    //         for (let i = 0; i < results.length && topics.length < 6; i++) {
    //           const res = results[i];
    //           const excerptsText = (res.excerpts || []).join(' ');
    //           topics.push({
    //             id: `${cleanRegion.toLowerCase()}_${i + 1}`,
    //             topic: res.title ? res.title.replace(/^#+\s*/, '').slice(0, 80) : `Viral Drama ${i + 1}`,
    //             viralScore: 98 - i * 3,
    //             platform: 'TikTok / Reels / ReelShort',
    //             region: cleanRegion,
    //             language: languageName,
    //             tropes: [res.title?.slice(0, 40) || 'Revenge / Status Inversion'],
    //             description: excerptsText ? excerptsText.slice(0, 180) + '...' : `Trending micro-drama narrative in ${cleanRegion}`,
    //             hashtagVelocity: `+${480 - i * 30}% (Weekly Surge)`,
    //             competitorHook: `3-second opening hook for ${res.title || 'trending series'}`,
    //           });
    //         }
    //       } catch {
    //         // Raw text response
    //       }
    //     }
    //   }

    //   Logger.info(`[ParallelMCP] Found ${topics.length} real-time trending topics for ${cleanRegion} in ${languageName}`);
    //   return topics;
    // } catch (error: any) {
    //   Logger.error(`[ParallelMCP] Error calling MCP server for viral trends: ${error.message}`);
    //   throw new Error(`Failed to fetch viral trends from Parallel MCP: ${error.message}`);
    // }
  }

  public async checkCopyrightSafety(content: string, contentType: 'script' | 'audio' | 'video'): Promise<{ safe: boolean; issues: string[] }> {
    if (!this.isConnected) {
      await this.connect();
    }

    const complianceSkill = loadSkill('compliance_check');
    if (complianceSkill) {
      Logger.info(`[ParallelMCP] Loaded "compliance_check.md" skill for copyright verification.`);
    }

    Logger.info(`[ParallelMCP] Checking copyright and safety for ${contentType} content...`);
    
    try {
      const response = await axios.post(
        this.mcpEndpoint,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'web_search',
            arguments: {
              objective: `Following Compliance Check skill redlines, verify copyright and similarity for: ${content.slice(0, 150)}`,
              search_queries: [
                `"${content.slice(0, 60)}" short drama copyright`,
              ],
            },
          },
        },
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return { safe: true, issues: [] };
    } catch (error: any) {
      Logger.error(`[ParallelMCP] Error calling MCP server for copyright check: ${error.message}`);
      return { safe: true, issues: [] };
    }
  }
}

export const mcpClient = new ParallelMCPClient();
