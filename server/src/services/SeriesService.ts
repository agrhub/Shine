import { getDatabaseProvider } from '@/database/index.js';
import { scriptAgent } from '@/agents/ScriptAgent.js';
import { GEMINI_SUPPORTED_VOICES } from '@/integrations/ai/gemini/GeminiClient.js';
import { Logger } from '@/utils/logger.js';
import { nanoid } from 'nanoid';
import { normalizeSceneEntity } from '@/utils/sceneNormalizer.js';
import type { CharacterEntity, CharacterEpisodeEntity } from '@/types.js';

export interface CreateSeriesParams {
  id?: string;
  userId?: string;
  title: string;
  genre: string;
  synopsis?: string;
  visualStyle?: string;
  visualStylePrompt?: string;
  targetAudience?: string;
  country?: string;
  language?: string;
  ratio?: string;
  episodeCount?: number;
  masterPlan?: any;
  characters?: any[];
  locations?: any[];
  props?: any[];
}

export class SeriesService {
  /**
   * Universal series and serialized episodes creator
   * Used by REST endpoint, AI Agent create_series tool, and CLI wizards
   */
  public static async createSeries(params: CreateSeriesParams): Promise<{ series: any; episodes: any[] }> {
    const {
      title,
      genre,
      visualStyle,
      visualStylePrompt,
      targetAudience,
      episodeCount,
      userId,
      masterPlan,
      synopsis,
      country,
      language,
      ratio,
      characters,
      locations,
      props,
    } = params;

    if (!userId) {
      throw new Error('userId is required to create a series');
    }

    if (!title || !genre) {
      throw new Error('Title and genre are required to create a series');
    }

    if (!masterPlan) {
      throw new Error('Master plan object is required to create a series');
    }

    if (!masterPlan.title) {
      throw new Error('Master plan title is required');
    }

    if (!masterPlan.genre) {
      throw new Error('Master plan genre is required');
    }

    if (!masterPlan.synopsis && !masterPlan.storyCore?.coreAttraction && !masterPlan.story_core?.core_attraction && !synopsis) {
      throw new Error('Master plan synopsis is required');
    }

    const rawEpCount = Number(episodeCount) || Number(masterPlan?.total_episodes) || Number(masterPlan?.totalEpisodes) || Number(masterPlan?.episodeCount) || 24;
    const planEpisodes: any[] = Array.isArray(masterPlan?.episodes) ? masterPlan.episodes : [];

    if (planEpisodes.length < rawEpCount) {
      throw new Error(`Master plan is incomplete: target episode count is ${rawEpCount}, but only ${planEpisodes.length} episodes are present in masterPlan.episodes. All ${rawEpCount} episodes must be generated before creating the series.`);
    }

    const seriesId = params.id || `srs_${nanoid(10)}`;
    if (masterPlan) {
      masterPlan.series_id = seriesId;
      masterPlan.seriesId = seriesId;
    }

    const rawCharacters = characters || masterPlan?.characters || [];
    const normalizedCharacters: CharacterEntity[] = (Array.isArray(rawCharacters) ? rawCharacters : []).map((c: any, idx: number) => {
      const charGender = (c.gender || '').toLowerCase().trim();
      const validVoices = GEMINI_SUPPORTED_VOICES.map(v => v.id);
      const isVoiceValid = (c.voice_id || c.voiceId) && validVoices.includes(c.voice_id || c.voiceId);
      let resolvedVoice = c.voice_id || c.voiceId;
      if (!isVoiceValid) {
        if (charGender === 'female') {
          resolvedVoice = 'Kore';
        } else if (charGender === 'male') {
          resolvedVoice = 'Fenrir';
        } else {
          resolvedVoice = 'Puck';
        }
      }
      return {
        id: c.id || `char_${seriesId}_${idx + 1}`,
        series_id: seriesId,
        name: c.name,
        role: c.role || 'protagonist',
        age: c.age || 25,
        gender: c.gender || (idx === 0 ? 'male' : idx === 1 ? 'female' : 'neutral'),
        nationality: c.nationality || country || 'United States',
        voice_id: resolvedVoice,
        identity: c.identity || c.traits || '',
        traits: c.traits || '',
        visual_traits: c.visual_traits || c.visualTraits || '',
        physical_characteristics: c.physical_characteristics || c.physicalCharacteristics || c.appearance || c.visual_traits || '',
        appearance: c.appearance || c.physical_characteristics || '',
        clothing_and_accessories: c.clothing_and_accessories || c.clothingAndAccessories || c.costume_style || c.costumeStyle || c.wardrobe || '',
        speech_style: c.speech_style || c.speechStyle || 'Sharp and concise',
        avatar: c.avatar || c.avatarUrl || null,
        lora_model: c.lora_model || c.loraModel || `lora-${(c.name || 'char').toLowerCase().replace(/\s+/g, '-')}-sdxl`,
        description: c.description || '',
      };
    });

    const db = await getDatabaseProvider();
    const newSeries = await db.createSeries({
      id: seriesId,
      user_id: userId,
      title,
      genre,
      synopsis: synopsis || masterPlan?.story_core?.core_attraction || masterPlan?.storyCore?.coreAttraction || masterPlan?.synopsis || '',
      visual_style: visualStyle || masterPlan?.visual_style || masterPlan?.visualStyle || 'realistic',
      visual_style_prompt: visualStylePrompt || masterPlan?.visual_style_prompt || masterPlan?.visualStylePrompt || '',
      target_audience: targetAudience || masterPlan?.target_audience || masterPlan?.targetAudience || 'General',
      country: country || masterPlan?.country || 'United States',
      language: language || masterPlan?.language || 'en-US',
      ratio: ratio || masterPlan?.ratio || '9:16',
      viral_hook: masterPlan?.viral_hook || masterPlan?.viralHook || '',
      master_plan: masterPlan || null,
      characters: normalizedCharacters,
      locations: locations || masterPlan?.locations || [],
      props: props || masterPlan?.props || [],
      episode_count: rawEpCount,
      status: 'DRAFT',
    });

    Logger.info(`[SeriesService] Created Series "${title}" (ID: ${seriesId}) with all ${rawEpCount} episodes for user ${userId}`);

    // Pre-generate full scene screenplay for Episode 1 so it is ready immediately
    let ep1Scenes: any[] = [];
    let ep1Screenplay: string = '';
    let ep1Characters: any[] = [];
    let ep1Locations: any[] = [];
    let ep1Props: any[] = [];
    let ep1Duration: number = 90;

    if (planEpisodes.length > 0) {
      try {
        const ep1 = planEpisodes[0];
        const scriptRes = await scriptAgent.execute({
          seriesId,
          episodeNumber: Number(ep1.episode_number || ep1.episodeNumber) || 1,
          title: ep1.title,
          genre: newSeries.genre,
          visualStyle: newSeries.visual_style,
          synopsis: ep1.synopsis,
          sceneCore: ep1.scene_core || ep1.sceneCore,
          conflictEscalation: ep1.conflict_escalation || ep1.conflictEscalation,
          cliffhangerHook: ep1.cliffhanger_hook || ep1.cliffhangerHook,
          characters: newSeries.characters || masterPlan?.characters,
          storyCore: masterPlan?.story_core || masterPlan?.storyCore,
          country: newSeries.country,
          ratio: newSeries.ratio,
        });

        if (scriptRes?.scenes) {
          ep1Scenes = (scriptRes.scenes || []).map((s: any, idx: number) => normalizeSceneEntity(s, idx + 1));
          ep1Screenplay = scriptRes.screenplay || '';
          ep1Characters = scriptRes.characters || [];
          ep1Locations = scriptRes.locations || [];
          ep1Props = scriptRes.props || [];
          ep1Duration = scriptRes.total_duration_seconds || 90;
        }
      } catch (e: any) {
        Logger.warn(`[SeriesService] Ep 1 script pre-generation error: ${e.message}`);
      }
    }

    const createdEpisodes: any[] = [];

    if (planEpisodes.length > 0) {
      for (let i = 0; i < planEpisodes.length; i++) {
        const ep = planEpisodes[i];
        const epId = ep.id || `ep_${nanoid(10)}`;
        const isEp1 = i === 0 && ep1Scenes.length > 0;
        const rawEpisodeChars = isEp1 && ep1Characters.length > 0 ? ep1Characters : (ep.characters || normalizedCharacters);
        const resolvedEpCharacters = (Array.isArray(rawEpisodeChars) && rawEpisodeChars.length > 0 ? rawEpisodeChars : normalizedCharacters).map((c: any) => {
          const canonical = normalizedCharacters.find((nc: any) => nc.name?.toLowerCase().trim() === c.name?.toLowerCase().trim() || nc.id === c.id);
          const charId = canonical?.id || c.id || 'char_1';
          const defaultOutfit = c.clothing_and_accessories || c.clothingAndAccessories || c.costume_style || c.costumeStyle || canonical?.clothing_and_accessories || '';
          
          let variants: any[] = c.wardrobe_variants || c.wardrobeVariants || (canonical as any)?.wardrobe_variants || [];
          if (!variants.length) {
            const rawWardrobe = c.wardrobe || (canonical as any)?.wardrobe || [];
            if (Array.isArray(rawWardrobe) && rawWardrobe.length > 0) {
              variants = rawWardrobe.map((w: any, wIdx: number) => ({
                variant_id: typeof w === 'object' && (w?.variant_id || w?.variantId) ? (w?.variant_id || w?.variantId) : `${charId}_variant_${wIdx + 1}`,
                name: typeof w === 'string' ? w : (w?.name || `Wardrobe ${wIdx + 1}`),
                clothing_and_accessories: typeof w === 'string' ? w : (w?.clothing_and_accessories || w?.clothingAndAccessories || defaultOutfit || ''),
                associated_scenes: [1],
              }));
            } else if (defaultOutfit) {
              variants = [{
                variant_id: `${charId}_default`,
                name: defaultOutfit.slice(0, 40),
                clothing_and_accessories: defaultOutfit,
                associated_scenes: [1],
              }];
            }
          } else {
            variants = variants.map((v: any, vi: number) => ({
              variant_id: v.variant_id || v.variantId || `${charId}_variant_${vi + 1}`,
              name: v.name || `Outfit ${vi + 1}`,
              clothing_and_accessories: v.clothing_and_accessories || v.clothingAndAccessories || defaultOutfit || '',
              associated_scenes: Array.isArray(v.associated_scenes || v.associatedScenes) && (v.associated_scenes || v.associatedScenes).length > 0 ? (v.associated_scenes || v.associatedScenes) : [1],
              image_url: v.image_url || v.imageUrl || undefined,
            }));
          }

          return {
            id: charId,
            name: canonical?.name || c.name,
            clothing_and_accessories: defaultOutfit,
            frame_description: c.frame_description || c.frameDescription || 'A character sheet with a head and shoulders shot showing the characters face on the left and a full body shot of the character on the right wearing the same clothing and accessories against a seamless white background.',
            wardrobe_variants: variants,
          };
        });

        const episodeEntity = await db.createEpisode({
          id: epId,
          series_id: seriesId,
          episode_number: Number(ep.episode_number || ep.episodeNumber) || (i + 1),
          title: ep.title || `Episode ${i + 1}`,
          synopsis: ep.synopsis || ep.scene_core || ep.sceneCore || 'Plot beat and conflict escalation.',
          screenplay: isEp1 ? ep1Screenplay : (ep.screenplay || ''),
          scene_core: ep.scene_core || ep.sceneCore || '',
          conflict_escalation: ep.conflict_escalation || ep.conflictEscalation || '',
          cliffhanger_hook: ep.cliffhanger_hook || ep.cliffhangerHook || '',
          phase: ep.phase || '',
          scenes: isEp1 ? ep1Scenes : (Array.isArray(ep.scenes) ? ep.scenes.map((s: any, idx: number) => normalizeSceneEntity(s, idx + 1)) : []),
          characters: resolvedEpCharacters,
          locations: isEp1 ? ep1Locations : (ep.locations || newSeries.locations || []),
          props: isEp1 ? ep1Props : (ep.props || newSeries.props || []),
          duration: isEp1 ? ep1Duration : (Number(ep.duration) || 90),
          status: 'DRAFT',
        });
        createdEpisodes.push(episodeEntity);
      }
      Logger.info(`[SeriesService] Created ${createdEpisodes.length} serialized episodes for series ${seriesId}`);
    } else {
      // Fallback: create at least Episode 1 shell
      const epId = `ep_${nanoid(10)}`;
      const fallbackEpChars: CharacterEpisodeEntity[] = (newSeries.characters || []).map(c => ({
        id: c.id,
        name: c.name,
        clothing_and_accessories: c.clothing_and_accessories || '',
        frame_description: '',
        wardrobe_variants: [],
      }));
      const episodeEntity = await db.createEpisode({
        id: epId,
        series_id: seriesId,
        episode_number: 1,
        title: 'Episode 1: The Beginning',
        synopsis: synopsis || 'Initial hook and character introduction.',
        screenplay: ep1Screenplay || '',
        scenes: [],
        characters: fallbackEpChars,
        locations: newSeries.locations || [],
        props: newSeries.props || [],
        duration: 90,
        status: 'DRAFT',
      });
      createdEpisodes.push(episodeEntity);
      Logger.info(`[SeriesService] Created fallback Episode 1 shell for series ${seriesId}`);
    }

    return { series: newSeries, episodes: createdEpisodes };
  }
}
