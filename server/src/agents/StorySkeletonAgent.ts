import { geminiClient, GEMINI_SUPPORTED_VOICES } from '../integrations/ai/gemini/GeminiClient.js';
import { loadSkill } from '../utils/SkillLoader.js';
import { Logger } from '../utils/logger.js';
import { getLanguageForCountry } from '../utils/LanguageMapping.js';

export interface StorySkeletonInput {
  title: string;
  genre: string;
  tone: string;
  synopsis: string;
  totalEpisodes?: number;
  episodeDurationSeconds?: number;
  country?: string;
  region?: string;
  ratio?: string;
  viralTopic?: string;
  referenceAssets?: any[];
}

export interface CharacterPersona {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporter';
  gender?: 'male' | 'female' | 'neutral';
  nationality?: string;
  voiceId?: string;
  identity: string;
  traits: string;
  circumstance: string;
  action: string;
  ending: string;
  avatarUrl?: string | null;
  loraAnchor?: string;
  speechStyle?: string;
  empathyElements?: string;
}

export interface ActStructure {
  actNumber: number;
  name: string;
  episodeRange: string;
  function: string;
  coreQuestion: string;
  actClimax: string;
}

export interface MajorReversal {
  reversalIndex: number;
  episodeNumber: number;
  setupHook: string;
  reversalEvent: string;
  audienceImpact: string;
}

export interface PaywallHook {
  percentage: string;
  episodeNumber: number;
  type: 'First Climax' | 'Life-Death Crisis' | 'Mid-Season Twist' | 'Late Reversal' | 'Grand Finale';
  hookDescription: string;
  adHook30sPrompt: string;
}

export interface EpisodeSkeleton {
  episodeNumber: number;
  title: string;
  synopsis: string;
  sceneCore: string;
  conflictEscalation: string;
  cliffhangerHook: string;
  phase: string;
  sceneCount: number;
  durationSeconds?: number;
}

export interface MasterPlanOutput {
  seriesId: string;
  title: string;
  genre: string;
  tone: string;
  country: string;
  targetLanguage: string;
  ratio: string;
  totalEpisodes: number;
  totalDurationSeconds: number;
  storyCore: {
    coreAttraction: string;
    psychologicalPleasure: string;
    goldFingerRule: string;
  };
  hiddenLine: string;
  targetAudience: string;
  viralHook: string;
  estimatedRetention: string;
  characters: CharacterPersona[];
  threeActs: ActStructure[];
  majorReversals: MajorReversal[];
  paywallHooks: PaywallHook[];
  episodes: EpisodeSkeleton[];
}

export type StorySkeletonOutput = MasterPlanOutput;

const CHUNK_SIZE = 15; // Max episodes per chunk to avoid JSON token limits

export class StorySkeletonAgent {
  async execute(input: StorySkeletonInput): Promise<MasterPlanOutput> {
    const totalEpisodes = input.totalEpisodes || 24;
    const totalDurationSeconds = Math.min(Math.max(Number(input.episodeDurationSeconds), 30), 600);
    const durationDisplay = `${Math.floor(totalDurationSeconds / 60)}m ${totalDurationSeconds % 60 ? `${totalDurationSeconds % 60}s` : ''}`.trim();
    const country = input.country || input.region || 'US';
    const langInfo = getLanguageForCountry(country);
    const skillInstruction = loadSkill('script_skeleton');

    if (!skillInstruction) {
      throw new Error('Skill definition "script_skeleton.md" could not be loaded from skills repository.');
    }

    // Prepare detailed voice catalogs with tone and pitch descriptions directly from GeminiClient
    const maleVoicesCatalog = GEMINI_SUPPORTED_VOICES
      .filter(v => v.gender === 'male')
      .map(v => `  * "${v.id}": ${v.description}`)
      .join('\n');
    const femaleVoicesCatalog = GEMINI_SUPPORTED_VOICES
      .filter(v => v.gender === 'female')
      .map(v => `  * "${v.id}": ${v.description}`)
      .join('\n');
    const neutralVoicesCatalog = GEMINI_SUPPORTED_VOICES
      .filter(v => v.gender === 'neutral')
      .map(v => `  * "${v.id}": ${v.description}`)
      .join('\n');

    // Step 1: Generate the Core Architecture (Story Core, Characters, Three Acts, Reversals, Paywalls)
    Logger.info(`[StorySkeletonAgent] Generating Master Plan Core for "${input.title}" (${totalEpisodes} eps, ${durationDisplay}/ep, Target: ${langInfo.name})...`);
    
    const corePrompt = `
Generate the complete high-level Master Story Plan Core for a ${totalEpisodes}-episode vertical micro-drama series.
Target Country: ${country} (${langInfo.name} - ${langInfo.nativeName}).

LANGUAGE SPECIFICATION (MANDATORY):
${langInfo.promptInstruction}
- The story must resonate culturally with audiences in ${country}.
- All titles, loglines, synopses, character descriptions, and narrative hooks MUST BE IN ${langInfo.name.toUpperCase()} (${langInfo.nativeName}).

Project Parameters:
- Series Title: ${input.title || 'Untitled Series'}
- Genre: ${input.genre || 'Suspense / Mystery'}
- Visual Tone: ${input.tone || 'Cinematic Neon'}
- Synopsis: ${input.synopsis || 'A high-stakes conflict of power, betrayal, and redemption.'}
- Target Country: ${country}
- Aspect Ratio: ${input.ratio || '9:16'}
- Total Episodes: ${totalEpisodes}
- Duration per Episode: ${durationDisplay} (${totalDurationSeconds} seconds)
- Viral Topic: ${input.viralTopic || 'None'}

Characters Specification (mandatory for each character persona):
- name: Culturally authentic character name for ${country}
- role: "protagonist" | "antagonist" | "supporter"
- gender: "male" | "female" | "neutral" (MANDATORY: Must accurately assign biological/character gender "female", "male", or "neutral" based on character name, identity, pronouns, and role in ${langInfo.name})
- nationality: Authentic nationality / citizenship (e.g. "${country}")
- voiceId: Selected voice preset precisely matching character gender, age, personality, and tone from the official Gemini Voice Catalog below (MUST strictly match the character's gender):
  [Male Voices]
${maleVoicesCatalog}
  [Female Voices]
${femaleVoicesCatalog}
  [Neutral Voices]
${neutralVoicesCatalog}
- identity: Social standing / profession
- traits: Key personality traits
- circumstance: Initial context / backstory / trigger
- action: Core goal and strategic actions
- ending: Fate / resolution / ultimate outcome
- speechStyle: Vocal tone and speaking style
- empathyElements: Emotional resonance points for audience

Generate the storyCore, hiddenLine, targetAudience, viralHook, estimatedRetention, characters (≤ 4), threeActs, majorReversals (~3), and paywallHooks (at ~10%, ~30%, ~50%, ~70%, ~90%).
${totalEpisodes <= CHUNK_SIZE ? `Generate all ${totalEpisodes} episodes in the episodes array.` : `Provide the first ${CHUNK_SIZE} episodes (1 to ${CHUNK_SIZE}) in the episodes array.`}

Respond strictly in JSON matching the MasterPlanOutput schema.
`;

    const rawText = await geminiClient.generateText({
      prompt: corePrompt,
      systemInstruction: `${skillInstruction}\n\nCRITICAL LANGUAGE MANDATE: ${langInfo.promptInstruction}`,
      jsonMode: true,
    });

    if (!rawText || !rawText.trim()) {
      throw new Error('Gemini model returned empty response for master plan generation.');
    }

    let parsed: MasterPlanOutput;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError: any) {
      throw new Error(`Failed to parse Master Plan JSON from AI response: ${parseError.message}\nRaw Text: ${rawText.slice(0, 300)}...`);
    }

    const maleVoices = GEMINI_SUPPORTED_VOICES.filter(v => v.gender === 'male').map(v => v.id);
    const femaleVoices = GEMINI_SUPPORTED_VOICES.filter(v => v.gender === 'female').map(v => v.id);
    const neutralVoices = GEMINI_SUPPORTED_VOICES.filter(v => v.gender === 'neutral').map(v => v.id);
    const validVoiceIds = new Set(GEMINI_SUPPORTED_VOICES.map(v => v.id));

    // Ensure all characters have valid gender, nationality, and matching voiceId assigned
    if (Array.isArray(parsed.characters)) {
      parsed.characters = parsed.characters.map((c, i) => {
        const rawGender = String(c.gender || '').toLowerCase().trim();
        const gender: 'male' | 'female' | 'neutral' = 
          rawGender === 'female' || rawGender === 'male' || rawGender === 'neutral'
            ? (rawGender as any)
            : (i % 2 === 0 ? 'female' : 'male');
            
        const nationality = c.nationality || country;
        let voiceId = c.voiceId;
        
        // Ensure voiceId matches the character gender
        const currentVoiceMeta = GEMINI_SUPPORTED_VOICES.find(v => v.id === voiceId);
        const voiceGenderMismatch = currentVoiceMeta && currentVoiceMeta.gender !== 'neutral' && currentVoiceMeta.gender !== gender;

        if (!voiceId || !validVoiceIds.has(voiceId) || voiceGenderMismatch) {
          if (gender === 'female') {
            voiceId = femaleVoices[i % femaleVoices.length];
          } else if (gender === 'male') {
            voiceId = maleVoices[i % maleVoices.length];
          } else {
            voiceId = neutralVoices[i % neutralVoices.length];
          }
        }

        return {
          ...c,
          gender,
          nationality,
          voiceId,
        };
      });
    }

    parsed.totalEpisodes = totalEpisodes;
    parsed.totalDurationSeconds = totalDurationSeconds;
    parsed.country = country;
    parsed.targetLanguage = langInfo.name;

    if (!parsed.seriesId) {
      parsed.seriesId = `series_${Date.now()}`;
    }

    // Step 2: Chunk Generation for remaining episodes if totalEpisodes > CHUNK_SIZE
    if (totalEpisodes > CHUNK_SIZE) {
      Logger.info(`[StorySkeletonAgent] totalEpisodes (${totalEpisodes}) > ${CHUNK_SIZE}. Executing Chunk Mode for episodes ${CHUNK_SIZE + 1} to ${totalEpisodes}...`);
      const allEpisodes = await this.generateEpisodesInChunks(
        parsed,
        totalEpisodes,
        parsed.episodes || [],
        skillInstruction,
        langInfo.promptInstruction,
        country
      );
      parsed.episodes = allEpisodes;
    }

    Logger.info(`[StorySkeletonAgent] Master Plan completed with ${parsed.episodes.length}/${totalEpisodes} episodes in ${langInfo.name}.`);
    return parsed;
  }

  /**
   * Generates episodes in chunks of 15 to handle 50, 100, 200+ episodes without JSON overflow
   */
  public async generateEpisodesInChunks(
    corePlan: Partial<MasterPlanOutput>,
    totalEpisodes: number,
    initialEpisodes: EpisodeSkeleton[],
    skillInstruction: string,
    languageInstruction?: string,
    country?: string
  ): Promise<EpisodeSkeleton[]> {
    const episodesMap = new Map<number, EpisodeSkeleton>();

    // Index initial episodes
    for (const ep of initialEpisodes) {
      if (ep && ep.episodeNumber <= totalEpisodes) {
        episodesMap.set(ep.episodeNumber, ep);
      }
    }

    // Determine missing chunk ranges
    const chunkPromises: Promise<EpisodeSkeleton[]>[] = [];

    for (let startEp = 1; startEp <= totalEpisodes; startEp += CHUNK_SIZE) {
      const endEp = Math.min(startEp + CHUNK_SIZE - 1, totalEpisodes);
      
      // Check if all episodes in this chunk already exist
      let hasMissing = false;
      for (let epNum = startEp; epNum <= endEp; epNum++) {
        if (!episodesMap.has(epNum)) {
          hasMissing = true;
          break;
        }
      }

      if (hasMissing) {
        chunkPromises.push(
          this.generateSingleChunk(corePlan, startEp, endEp, totalEpisodes, skillInstruction, languageInstruction, country)
        );
      }
    }

    if (chunkPromises.length > 0) {
      Logger.info(`[StorySkeletonAgent] Generating ${chunkPromises.length} episode chunks in parallel...`);
      const chunkResults = await Promise.all(chunkPromises);
      for (const chunk of chunkResults) {
        for (const ep of chunk) {
          if (ep && ep.episodeNumber) {
            episodesMap.set(ep.episodeNumber, ep);
          }
        }
      }
    }

    // Build contiguous array 1..totalEpisodes
    const finalEpisodes: EpisodeSkeleton[] = [];
    for (let epNum = 1; epNum <= totalEpisodes; epNum++) {
      if (episodesMap.has(epNum)) {
        finalEpisodes.push(episodesMap.get(epNum)!);
      } else {
        // Fallback placeholder if a single episode failed in chunk
        finalEpisodes.push({
          episodeNumber: epNum,
          title: `Episode ${epNum}: Crisis Escalation`,
          synopsis: `The conflict intensifies as key secrets threaten to unravel.`,
          sceneCore: `Dramatic confrontation pushing protagonist towards breaking point.`,
          conflictEscalation: `Rising stakes along the main narrative axis.`,
          cliffhangerHook: `Urgent turning point demanding continuation.`,
          phase: `Act ${epNum <= totalEpisodes * 0.3 ? 1 : epNum <= totalEpisodes * 0.7 ? 2 : 3}`,
          sceneCount: 3,
        });
      }
    }

    return finalEpisodes;
  }

  private async generateSingleChunk(
    corePlan: Partial<MasterPlanOutput>,
    startEp: number,
    endEp: number,
    totalEpisodes: number,
    skillInstruction: string,
    languageInstruction?: string,
    country?: string
  ): Promise<EpisodeSkeleton[]> {
    Logger.info(`[StorySkeletonAgent] Chunk Generation: Episodes ${startEp} to ${endEp}...`);

    const prompt = `
You are the Episode Chunk Generator for a vertical micro-drama series.
Target Country: ${country || 'Global'}
${languageInstruction ? `LANGUAGE REQUIREMENT: ${languageInstruction}` : ''}

Series Context:
- Title: ${corePlan.title}
- Genre: ${corePlan.genre}
- Core Story: ${corePlan.storyCore?.coreAttraction || ''}
- Total Episodes in Series: ${totalEpisodes}
- Three-Act Structure: ${JSON.stringify(corePlan.threeActs || [])}
- Characters: ${(corePlan.characters || []).map(c => `${c.name} (${c.role}): ${c.identity}`).join('; ')}

Task:
Generate EXACTLY episodes ${startEp} through ${endEp} (inclusive). Every episode from ${startEp} to ${endEp} MUST be generated.
Each episode must follow the Golden Single-Episode Formula (Plot Continuation + Conflict Escalation + Value Exchange + Next-Episode Hook).
All episode titles, synopses, sceneCore, and cliffhangerHook must be in the target language.

Respond strictly in JSON matching the following schema:
{
  "episodes": [
    {
      "episodeNumber": ${startEp},
      "title": "Episode ${startEp} Title",
      "synopsis": "Concise episode plot synopsis",
      "sceneCore": "Core dramatic experience",
      "conflictEscalation": "Conflict escalation beat",
      "cliffhangerHook": "End-of-episode cliffhanger hook",
      "phase": "Act Phase",
      "sceneCount": 3
    }
  ]
}
`;

    try {
      const rawText = await geminiClient.generateText({
        prompt,
        systemInstruction: `${skillInstruction}\n\n${languageInstruction || ''}`,
        jsonMode: true,
      });

      const parsed = JSON.parse(rawText);
      const list: EpisodeSkeleton[] = Array.isArray(parsed) ? parsed : parsed.episodes || [];
      return list;
    } catch (err: any) {
      Logger.warn(`[StorySkeletonAgent] Failed generating chunk ${startEp}-${endEp}: ${err.message}`);
      return [];
    }
  }
}

export const storySkeletonAgent = new StorySkeletonAgent();
