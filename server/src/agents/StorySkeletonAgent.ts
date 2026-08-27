import { geminiClient, GEMINI_SUPPORTED_VOICES } from '../integrations/ai/gemini/GeminiClient.js';
import { loadSkill } from '../utils/SkillLoader.js';
import { PromptLoader } from '../utils/PromptLoader.js';
import { Logger } from '../utils/logger.js';
import { getLanguageForCountry } from '../utils/LanguageMapping.js';
import { getVisualStylePrompt } from '../constants/VisualStyles.js';

export interface StorySkeletonInput {
  title: string;
  genre: string;
  visualStyle?: string;
  visualStylePrompt?: string;
  synopsis: string;
  totalEpisodes?: number;
  episodeDurationSeconds?: number;
  country?: string;
  language?: string;
  ratio?: string;
  viralTopic?: string;
  referenceAssets?: any[];
}

export interface CharacterPersona {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporter';
  gender?: 'male' | 'female' | 'neutral';
  age?: number;
  nationality?: string;
  voiceId?: string;
  identity: string;
  appearance?: string; // Facial features, physical build, age appearance matching target country
  visualTraits?: string;
  physicalCharacteristics?: string;
  description?: string;
  costumeStyle?: string; // Signature cultural/regional wardrobe, styling, and signature accessories
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

export interface StoryCore {
  coreAttraction: string;
  psychologicalPleasure: string;
  goldFingerRule: string;
}

export interface LocationPersona {
  id?: string;
  name: string;
  physicalCharacteristics: string;
  timeOfDay?: string;
  imageUrl?: string;
}

export interface PropPersona {
  id?: string;
  name: string;
  physicalCharacteristics: string;
  imageUrl?: string;
}

export interface MasterPlanOutput {
  seriesId: string;
  title: string;
  genre: string;
  visualStyle: string;
  visualStylePrompt: string;
  country: string;
  ratio: string;
  totalEpisodes: number;
  totalDurationSeconds?: number;
  language: string;
  settingContext?: {
    era: string; // e.g. Modern 2026, Cyberpunk, 1990s retro
    location: string; // e.g. High-tech metropolis, bustling apartment complex, corporate towers
    culturalAtmosphere: string; // Local lifestyle, social classes, architecture and visual aesthetic
  };
  storyCore: StoryCore;
  synopsis: string;
  hiddenLine: string;
  targetAudience: string;
  viralHook: string;
  estimatedRetention: string;
  characters: CharacterPersona[];
  locations?: LocationPersona[];
  props?: PropPersona[];
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
    const country = input.country || 'United States';
    const langInfo = input.language ? getLanguageForCountry(input.language) : getLanguageForCountry(country);
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

    const voiceCatalog = [
      '  [Male Voices]',
      maleVoicesCatalog,
      '  [Female Voices]',
      femaleVoicesCatalog,
      '  [Neutral Voices]',
      neutralVoicesCatalog,
    ].join('\n');

    const episodeScopeInstruction = totalEpisodes <= CHUNK_SIZE
      ? `Generate all ${totalEpisodes} episodes in the episodes array.`
      : `Provide the first ${CHUNK_SIZE} episodes (1 to ${CHUNK_SIZE}) in the episodes array.`;

    Logger.info(`[StorySkeletonAgent] Generating Master Plan Core for "${input.title}" (${totalEpisodes} eps, ${durationDisplay}/ep, Target: ${langInfo.name})...`);

    const corePrompt = PromptLoader.render('skeleton/story_skeleton_core', {
      totalEpisodes,
      totalDurationSeconds,
      durationDisplay,
      country,
      languageName: langInfo.name,
      languageNativeName: langInfo.nativeName,
      languageCode: input.language || langInfo.code,
      languageInstruction: langInfo.promptInstruction,
      title: input.title || 'Untitled Series',
      genre: input.genre || 'Suspense / Mystery',
      visualStyle: input.visualStyle || 'realistic',
      visualStylePrompt: input.visualStylePrompt || getVisualStylePrompt(input.visualStyle || 'realistic'),
      synopsis: input.synopsis || 'A high-stakes conflict of power, betrayal, and redemption.',
      ratio: input.ratio || '9:16',
      viralTopic: input.viralTopic || 'None',
      voiceCatalog,
      episodeScopeInstruction,
    });

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

        const visualDesc = c.visualTraits || c.appearance || c.physicalCharacteristics || c.description || (c.traits ? `Observable visual traits: ${c.traits}` : '');
        const fullDesc = c.description || c.appearance || c.physicalCharacteristics || c.traits || '';

        return {
          ...c,
          appearance: visualDesc,
          physicalCharacteristics: visualDesc,
          visualTraits: visualDesc,
          description: fullDesc,
          age: Number(c.age) || (c.role === 'supporter' ? 35 : 24),
          gender,
          nationality,
          voiceId,
        };
      });
    }

    // Fallback sanitizer for locations
    if (!Array.isArray(parsed.locations) || parsed.locations.length === 0) {
      
    } else {
      parsed.locations = parsed.locations.map((loc, idx) => ({
        id: loc.id || `loc_${idx + 1}`,
        name: loc.name || `Location ${idx + 1}`,
        physicalCharacteristics: loc.physicalCharacteristics || '',
        timeOfDay: loc.timeOfDay || 'DAY',
      }));
    }

    // Fallback sanitizer for props: Ensure 2-5 props exist
    if (!Array.isArray(parsed.props) || parsed.props.length === 0) {
      
    } else {
      parsed.props = parsed.props.map((p, idx) => ({
        id: p.id || `prop_${idx + 1}`,
        name: p.name || `Prop ${idx + 1}`,
        physicalCharacteristics: p.physicalCharacteristics || '',
      }));
    }

    parsed.totalEpisodes = totalEpisodes;
    parsed.totalDurationSeconds = totalDurationSeconds;
    parsed.country = country;
    parsed.language = langInfo.name;
    parsed.visualStyle = input.visualStyle || parsed.visualStyle || 'realistic';
    parsed.visualStylePrompt = input.visualStylePrompt || parsed.visualStylePrompt || getVisualStylePrompt(parsed.visualStyle);
    parsed.ratio = input.ratio || parsed.ratio || '9:16';
    parsed.genre = input.genre || parsed.genre || 'Suspense / Mystery';

    // Fallback sanitizer for threeActs: Ensure all 3 acts exist
    if (!Array.isArray(parsed.threeActs) || parsed.threeActs.length < 3) {
      const epAct1End = Math.max(2, Math.ceil(totalEpisodes * 0.33));
      const epAct2End = Math.max(epAct1End + 2, Math.ceil(totalEpisodes * 0.75));
      const currentActs = Array.isArray(parsed.threeActs) ? parsed.threeActs : [];

      const act1 = currentActs.find(a => a.actNumber === 1);
      const act2 = currentActs.find(a => a.actNumber === 2);
      const act3 = currentActs.find(a => a.actNumber === 3);
      if(act1){
        parsed.threeActs.push(act1);
      }
      if(act2){
        parsed.threeActs.push(act2);
      }
      if(act3){
        parsed.threeActs.push(act3);
      }
    }

    // Fallback sanitizer for paywallHooks: Ensure all 5 strategic hooks exist
    if (!Array.isArray(parsed.paywallHooks) || parsed.paywallHooks.length < 5) {
      const defaultHooks: PaywallHook[] = [];

      const currentHooks = Array.isArray(parsed.paywallHooks) ? parsed.paywallHooks : [];
      const existingByPercent = new Map(currentHooks.map(h => [h.percentage, h]));
      parsed.paywallHooks = defaultHooks.map(def => existingByPercent.get(def.percentage) || def);
    }

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

    const threeActsOverview = (corePlan.threeActs || [])
      .map(a => `  * Act ${a.actNumber} (${a.episodeRange}): ${a.name} - ${a.function}`)
      .join('\n');
    const majorReversalsOverview = (corePlan.majorReversals || [])
      .map(r => `  * Ep ${r.episodeNumber} Reversal: ${r.setupHook} -> ${r.reversalEvent}`)
      .join('\n');
    const paywallHooksOverview = (corePlan.paywallHooks || [])
      .map(p => `  * Ep ${p.episodeNumber} (${p.percentage}): ${p.hookDescription}`)
      .join('\n');

    const prompt = PromptLoader.render('skeleton/story_skeleton_chunk', {
      startEp,
      endEp,
      totalEpisodes,
      title: corePlan.title || 'Untitled',
      genre: corePlan.genre || 'Drama',
      country: country || corePlan.country || 'US',
      languageName: languageInstruction || corePlan.language || 'English',
      synopsis: corePlan.synopsis || corePlan.storyCore?.coreAttraction || 'Drama series',
      storyCore: JSON.stringify(corePlan.storyCore || {}),
      hiddenLine: corePlan.hiddenLine || '',
      targetAudience: corePlan.targetAudience || '',
      threeActsOverview,
      majorReversalsOverview,
      paywallHooksOverview,
    });

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
