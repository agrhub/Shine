import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { aiProviderRouter } from '@/integrations/ai/router/AIProviderRouter.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { SfxService } from '@/services/SfxService.js';
import { loadSkill } from '@/utils/SkillLoader.js';
import { SynthIDService } from '@/services/SynthIDService.js';
import { CreditService } from '@/services/CreditService.js';
import { getUserId } from '@/utils/auth.js';
import { getDatabaseProvider } from '@/database/index.js';
import { Logger } from '@/utils/logger.js';
import { getVisualStylePrompt } from '../constants/VisualStyles.js';
import { geminiClient } from '@/integrations/ai/gemini/GeminiClient.js';
import { videoService } from '@/services/VideoService.js';
import { normalizeSceneEntity, normalizeLocationAsset, normalizePropAsset, normalizeCharacterEntity } from '@/utils/sceneNormalizer.js';
import type { CharacterSeriesEntity, EpisodeEntity, LocationAsset, PropAsset, SceneEntity } from '@/types.js';

export const assetsRouter = Router();

// GET /api/assets/file/* — Secure backend media streaming via StorageFactory
assetsRouter.get('/file/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || (req.query.key as string);
    if (!rawKey) {
      return res.status(400).send('Missing storage key');
    }

    const stream = await StorageFactory.getFileStream(rawKey);
    const mimeType = rawKey.endsWith('.mp4') ? 'video/mp4' : rawKey.endsWith('.wav') ? 'audio/wav' : rawKey.endsWith('.mp3') ? 'audio/mpeg' : rawKey.endsWith('.png') ? 'image/png' : rawKey.endsWith('.jpg') || rawKey.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (stream && typeof stream.pipe === 'function') {
      stream.on('error', (streamErr: any) => {
        Logger.warn(`[Asset Proxy] Stream error for key ${rawKey}: ${streamErr?.message || streamErr}`);
        if (!res.headersSent) {
          res.status(404).json({
            code: 404,
            data: null,
            message: `Asset key not found in storage: ${streamErr?.message || 'Not found'}`,
            error: 'ASSET_NOT_FOUND',
          });
        }
      });
      stream.pipe(res);
    } else {
      res.send(stream);
    }
  } catch (err: any) {
    return res.status(404).json({
      code: 404,
      data: null,
      message: `Asset key not found in storage: ${err.message}`,
      error: 'ASSET_NOT_FOUND',
    });
  }
});

// GET /api/assets - List all assets directly from Database
assetsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, search, series_id } = req.query;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    const assets = await db.getAssets({
      user_id: userId,
      series_id: series_id as string | undefined,
      type: type as string,
      search: search as string,
    });

    return res.json({
      code: 200,
      data: assets,
      total: assets.length,
      message: 'Assets retrieved successfully from database',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /api/assets - Upload/Register new asset in Database
assetsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, ext, size, size_bytes, category_label, category_color, s3_key, thumbnail, series_id, episode_id, scene_id, prompt } = req.body;
    if (!name || !type) {
      return res.status(400).json({ code: 400, data: null, message: 'Name and type are required', error: 'INVALID_PAYLOAD' });
    }

    const key = s3_key || `assets/manual/${nanoid()}${ext || '.bin'}`;
    const proxyUrl = `/api/assets/file/${key}`;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    const newAsset = await db.saveAsset({
      id: `ast_${nanoid(8)}`,
      user_id: userId,
      name,
      type,
      ext: ext || (type === 'image' ? '.png' : type === 'audio' ? '.mp3' : '.mp4'),
      size: size || '1.0 MB',
      size_bytes: size_bytes || 1024 * 1024,
      category_label: category_label || 'Uploaded Asset',
      category_color: category_color || 'text-indigo-500 dark:text-indigo-400',
      s3_key: key,
      url: proxyUrl,
      thumbnail: thumbnail || proxyUrl,
      series_id,
      episode_id,
      scene_id,
      prompt,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      code: 201,
      data: newAsset,
      message: 'Asset registered in database successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// DELETE /api/assets/:id - Delete an asset from Database
assetsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabaseProvider();
    const deleted = await db.deleteAsset(assetId);

    if (!deleted) {
      return res.status(404).json({ code: 404, data: null, message: 'Asset not found in database', error: 'NOT_FOUND' });
    }

    return res.json({ code: 200, data: { id: assetId, deleted: true }, message: 'Asset deleted from database successfully', error: null });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /api/assets/image-generate — Dedicated Scene & Background Image Generation
assetsRouter.post('/image-generate', async (req: Request, res: Response) => {
  try {
    const { type, prompt, style, characters, scene_data, series_id, episode_id, scene_id, aspect_ratio = '9:16', scene_index, is_end_frame = false } = req.body;
    const userId = getUserId(req);

    const deduct = await CreditService.deductUserCredits(userId, 'sceneImage', 'Scene Background Generation', `Scene: ${scene_id || 'frame'}`);
    if (!deduct.success && deduct.error?.includes('Insufficient')) {
      return res.status(402).json({ code: 402, data: null, message: deduct.error, error: 'INSUFFICIENT_CREDITS' });
    }

    const result = await videoService.generateSceneImage({
      user_id: userId,
      type,
      prompt,
      series_id,
      episode_id,
      scene_id,
      aspect_ratio,
      style,
      scene_index,
      characters,
      scene_data,
      is_end_frame,
    });

    if (result.synthIdHeaders) {
      res.set(result.synthIdHeaders);
    }

    return res.status(201).json({
      code: 201,
      data: {
        job_id: `job_${nanoid(8)}`,
        asset_id: result.assetId,
        s3_key: result.s3Key,
        url: result.url,
        image_url: result.imageUrl,
        size_bytes: result.sizeBytes,
        provider: result.provider,
        synth_id: result.synthId,
        generation_params: { prompt: result.enhancedPrompt, type, episode_id, scene_id, style },
        status: 'completed',
        message: 'AI scene background rendered and saved to database successfully with SynthID',
      },
      message: 'AI scene image generated and stored to database successfully',
      error: null,
    });
  } catch (err: any) {
    Logger.error(`[assetsRouter] Scene image generation failed: ${err.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `Image generation or storage failed: ${err.message}`,
      error: 'IMAGE_GENERATION_FAILED',
    });
  }
});

// POST /api/assets/video-generate — Real Scene Image-to-Video Generation & S3 Storage
assetsRouter.post('/video-generate', async (req: Request, res: Response) => {
  try {
    const { start_frame_url, end_frame_url, character_image_ids, series_id, episode_id, scene_id, duration, motion, camera_movement, prompt, aspect_ratio, language, scene_data } = req.body;
    const userId = getUserId(req);

    // Deduct credits for Video Generation
    await CreditService.deductUserCredits(userId, 'videoGeneration', 'Scene Video Generation', `Scene: ${scene_id || 'ep' + episode_id}`);

    const result = await videoService.generateSceneVideo({
      user_id: userId,
      start_frame_url,
      end_frame_url,
      character_image_ids,
      series_id,
      episode_id,
      scene_id,
      duration,
      motion,
      camera_movement,
      prompt,
      aspect_ratio,
      language,
      scene_data,
    });

    if (result.synthIdHeaders) {
      res.set(result.synthIdHeaders);
    }

    return res.status(201).json({
      code: 201,
      data: {
        job_id: `vid_${nanoid(10)}`,
        asset_id: result.assetId,
        s3_key: result.s3Key,
        url: result.url,
        bgm_url: (result as any).bgmUrl || '',
        voiceover_url: (result as any).voiceoverUrl || '',
        voice_id: (result as any).voiceId || '',
        voice_start_us: (result as any).voiceStartUs || 200_000,
        voice_duration_us: (result as any).voiceDurationUs || (Number(duration) || 6) * 1_000_000,
        captions_data: (result as any).captionsData || [],
        size_bytes: result.sizeBytes,
        provider: result.provider,
        synth_id: result.synthId,
        params: { start_frame_url, end_frame_url: end_frame_url || scene_data?.end_frame_url, character_image_ids, duration: result.duration, motion: result.motion, camera_movement: result.cameraMovement },
        status: 'completed',
        message: 'Scene video generated and saved to database successfully with SynthID',
      },
      message: 'Scene video generated and stored to database successfully',
      error: null,
    });
  } catch (err: any) {
    Logger.error(`[assetsRouter] Video generation error: ${err.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `Video generation failed: ${err.message}`,
      error: 'VIDEO_GENERATION_FAILED',
    });
  }
});

// POST /api/assets/music-generate — AI BGM Soundtrack Generation
assetsRouter.post('/music-generate', async (req, res: Response) => {
  try {
    const { series_id, episode_id, prompt, genre, duration } = req.body;
    const userId = getUserId(req);
    const db = await getDatabaseProvider();

    await CreditService.deductUserCredits(userId, 'bgmMusic', 'BGM Soundtrack Generation', `Ep: ${episode_id}`);

    const musicPrompt = prompt || `Cinematic vertical micro-drama background score, mood: dramatic suspense, genre: ${genre || 'orchestral_hybrid'}, 120 BPM, high dynamic tension.`;
    const durationSeconds = Number(duration) || 15;

    // Use unified SfxService to search across Freesound, Pixabay, FlexClip, and Parallel, then ingest to S3
    const musicResult = await SfxService.getSceneAudio({
      prompt: musicPrompt,
      genre,
      duration: durationSeconds,
    });

    const s3Key = musicResult.s3Key;
    const s3Size = musicResult.sizeBytes;
    const finalUrl = musicResult.audioUrl;
    const assetId = `ast_${nanoid(8)}`;

    const savedAsset = await db.saveAsset({
      id: assetId,
      user_id: userId,
      name: `BGM_${genre || 'Dramatic'}_${nanoid(4)}`,
      type: 'audio',
      ext: '.MP3',
      size: `${(s3Size / (1024 * 1024)).toFixed(1)} MB`,
      size_bytes: s3Size,
      category_label: 'BGM Audio',
      category_color: 'text-amber-500 dark:text-amber-400',
      s3_key: s3Key,
      url: finalUrl,
      thumbnail: finalUrl,
      series_id,
      episode_id,
      prompt: musicPrompt,
      provider: musicResult?.provider || 'Sound Effects Engine',
      is_audio: true,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      code: 201,
      data: {
        asset_id: savedAsset.id,
        audio_url: finalUrl,
        music_url: finalUrl,
        duration_seconds: durationSeconds,
        genre: genre || 'micro_drama_suspense',
        s3_key: s3Key,
        size_bytes: s3Size,
        provider: musicResult?.provider || 'Pixabay Audio',
      },
      message: 'BGM score generated and saved to database successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: `BGM generation failed: ${err.message}`,
      error: 'MUSIC_GENERATION_FAILED',
    });
  }
});

import { AssetService } from '@/services/AssetService.js';
import { scriptAgent } from '@/agents/ScriptAgent.js';

/**
 * Helper: Automatically resolves country, language, and duration from Series & Episode in DB
 */
async function resolveProjectLanguageContext(
  seriesId?: string,
  episodeId?: string,
  explicitCountry?: string,
  explicitLanguage?: string
): Promise<{
  country?: string;
  language?: string;
  duration?: number;
  existingCharacters?: any[];
  existingLocations?: any[];
  existingProps?: any[];
}> {
  let country = explicitCountry;
  let language = explicitLanguage;
  let duration: number | undefined;
  let characters: any[] = [];
  let locations: any[] = [];
  let props: any[] = [];

  if (seriesId || episodeId) {
    try {
      const db = await getDatabaseProvider();
      if (seriesId) {
        const series = await db.getSeriesById(seriesId);
        if (series) {
          country = country || series.country;
          let masterPlanObj = series.master_plan;
          if (typeof masterPlanObj === 'string') {
            try {
              masterPlanObj = JSON.parse(masterPlanObj);
            } catch {}
          }
          language = language || series.language || (masterPlanObj as any)?.language;
          const planDuration = Number((masterPlanObj as any)?.totalDurationSeconds) || Number((masterPlanObj as any)?.episodeDurationSeconds) || Number((series as any).episode_duration);
          if (planDuration && planDuration >= 30) {
            duration = planDuration;
          }
          if (Array.isArray(series.characters) && series.characters.length > 0) {
            characters = series.characters;
          } else if (Array.isArray((masterPlanObj as any)?.characters)) {
            characters = (masterPlanObj as any).characters;
          }
          if (Array.isArray(series.locations) && series.locations.length > 0) {
            locations = series.locations;
          } else if (Array.isArray((masterPlanObj as any)?.locations)) {
            locations = (masterPlanObj as any).locations;
          }
          if (Array.isArray(series.props) && series.props.length > 0) {
            props = series.props;
          } else if (Array.isArray((masterPlanObj as any)?.props)) {
            props = (masterPlanObj as any).props;
          }
        }
      }
      if (episodeId) {
        const ep = await db.getEpisodeById(episodeId);
        if (ep) {
          if (!duration) {
            const epDur = Number(ep.duration);
            if (epDur && epDur >= 30) {
              duration = epDur;
            }
          }
        }
      }
    } catch (e: any) {
      Logger.warn(`[resolveProjectLanguageContext] DB lookup error: ${e.message}`);
    }
  }

  return {
    country,
    language,
    duration: duration || 90,
    existingCharacters: characters.length > 0 ? characters : undefined,
    existingLocations: locations.length > 0 ? locations : undefined,
    existingProps: props.length > 0 ? props : undefined,
  };
}

// POST /api/assets/screenplay/extract — Extract Characters, Locations, and Props from screenplay
assetsRouter.post('/screenplay/extract', async (req: Request, res: Response) => {
  try {
    const { screenplay, series_id, episode_id, country, language } = req.body;
    if (!screenplay || typeof screenplay !== 'string') {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    const ctx = await resolveProjectLanguageContext(series_id, episode_id, country, language);
    const result = await scriptAgent.extractAssets(screenplay, ctx.language || ctx.country);
    return res.json({
      code: 200,
      data: result,
      message: 'Screenplay assets extracted successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'EXTRACT_ASSETS_FAILED' });
  }
});

// POST /api/assets/screenplay/describe-assets — Auto-fill detailed descriptions for characters, locations, and props
assetsRouter.post('/screenplay/describe-assets', async (req: Request, res: Response) => {
  try {
    const { screenplay, characters, locations, props, series_id, episode_id, country, language } = req.body;
    if (!screenplay) {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    const ctx = await resolveProjectLanguageContext(series_id, episode_id, country, language);
    const targetLang = ctx.language || ctx.country;

    const charDescriptions = Array.isArray(characters) && characters.length > 0
      ? await scriptAgent.describeCharacters(screenplay, characters, targetLang)
      : {};

    const locDescriptions = Array.isArray(locations) && locations.length > 0
      ? await scriptAgent.describeLocations(screenplay, locations, targetLang)
      : {};

    const propDescriptions = Array.isArray(props) && props.length > 0
      ? await scriptAgent.describeProps(screenplay, props, targetLang)
      : {};

    return res.json({
      code: 200,
      data: {
        characters: charDescriptions,
        locations: locDescriptions,
        props: propDescriptions,
      },
      message: 'Asset descriptions generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'DESCRIBE_ASSETS_FAILED' });
  }
});

// POST /api/assets/screenplay/analyze — End-to-end Screenplay Analysis: Extract Assets, Describe in Native Language, and Breakdown into Scenes/Shots
assetsRouter.post('/screenplay/analyze', async (req: Request, res: Response) => {
  try {
    const {
      screenplay,
      country,
      language,
      series_id,
      episode_id,
      target_duration_seconds,
      existing_characters,
      existing_locations,
      existing_props,
    } = req.body;

    if (!screenplay || typeof screenplay !== 'string') {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(series_id);
    if (!series) {
      return res.status(400).json({ code: 400, data: null, message: 'Series not found', error: 'INVALID_PAYLOAD' });
    }
    const targetDurationSeconds = Number(target_duration_seconds) || series.episode_duration || series.master_plan?.total_duration_seconds || 60;

    let episode: EpisodeEntity | null = null;
    if (episode_id) {
      episode = await db.getEpisodeById(episode_id);
      if (!episode) {
        return res.status(400).json({ code: 400, data: null, message: 'Episode not found', error: 'INVALID_PAYLOAD' });
      }
    }

    // Automatically resolve country, language, duration, and existing assets from Series & Episode in DB
    const ctx = await resolveProjectLanguageContext(series_id, episode_id, country, language);

    const result = await scriptAgent.analyzeAndBreakdownScreenplay({
      screenplay,
      country: ctx.language || ctx.country,
      targetDurationSeconds: targetDurationSeconds,
      existingCharacters: (Array.isArray(existing_characters) && existing_characters.length > 0) ? existing_characters : ctx.existingCharacters,
      existingLocations: (Array.isArray(existing_locations) && existing_locations.length > 0) ? existing_locations : ctx.existingLocations,
      existingProps: (Array.isArray(existing_props) && existing_props.length > 0) ? existing_props : ctx.existingProps,
    });

    // If seriesId & episodeId are provided, persist update to database
    const normalizedScenes: SceneEntity[] = (result.scenes || []).map((s: any, idx: number) => normalizeSceneEntity(s, idx + 1)).filter((s): s is SceneEntity => s !== null);
    const normalizedCharacters: CharacterSeriesEntity[] = (result.characters || []).map((c: any, idx: number) => normalizeCharacterEntity(c, idx + 1)).filter((c): c is CharacterSeriesEntity => c !== null);
    const normalizedLocations: LocationAsset[] = (result.locations || []).map((l: any, idx: number) => normalizeLocationAsset(l, idx + 1)).filter((l): l is LocationAsset => l !== null);
    const normalizedProps: PropAsset[] = (result.props || []).map((p: any, idx: number) => normalizePropAsset(p, idx + 1)).filter((p): p is PropAsset => p !== null);

    if (series_id) {
      try {
        const db = await getDatabaseProvider();
        const targetSeries = await db.getSeriesById(series_id);
        if (targetSeries) {
          const existingChars = Array.isArray(targetSeries.characters) ? [...targetSeries.characters] : [];
          for (const c of normalizedCharacters) {
            const idx = existingChars.findIndex(ec => ec.id === c.id || ec.name.toLowerCase() === c.name.toLowerCase());
            if (idx >= 0) existingChars[idx] = { ...existingChars[idx], ...c };
            else existingChars.push(c);
          }

          const existingLocs = Array.isArray(targetSeries.locations) ? [...targetSeries.locations] : [];
          for (const l of normalizedLocations) {
            const idx = existingLocs.findIndex(el => el.id === l.id || el.name.toLowerCase() === l.name.toLowerCase());
            if (idx >= 0) existingLocs[idx] = { ...existingLocs[idx], ...l };
            else existingLocs.push(l);
          }

          const existingProps = Array.isArray(targetSeries.props) ? [...targetSeries.props] : [];
          for (const p of normalizedProps) {
            const idx = existingProps.findIndex(epItem => epItem.id === p.id || epItem.name.toLowerCase() === p.name.toLowerCase());
            if (idx >= 0) existingProps[idx] = { ...existingProps[idx], ...p };
            else existingProps.push(p);
          }

          await db.updateSeries(series_id, {
            characters: existingChars,
            locations: existingLocs,
            props: existingProps,
          });
        }

        if (episode_id) {
          const ep = await db.getEpisodeById(episode_id);
          if (ep) {
            const totalDuration = result.total_duration_seconds || 60;
            await db.updateEpisode(episode_id, {
              screenplay,
              scenes: normalizedScenes,
              reference_assets: {
                character_ids: normalizedCharacters.map(c => c.id),
                location_ids: normalizedLocations.map(l => l.id),
                prop_ids: normalizedProps.map(p => p.id),
              },
              duration: totalDuration,
              script: JSON.stringify({
                episode: ep.title,
                episode_number: ep.episode_number,
                title: ep.title,
                screenplay,
                scenes: normalizedScenes,
                total_duration_seconds: totalDuration,
              }),
            });
          }
        }
      } catch (dbErr: any) {
        Logger.warn(`[assetsRouter.analyze] Failed to auto-persist to DB: ${dbErr.message}`);
      }
    }

    return res.json({
      code: 200,
      data: {
        ...result,
        scenes: normalizedScenes,
        characters: normalizedCharacters,
        locations: normalizedLocations,
        props: normalizedProps,
      },
      message: 'Screenplay analyzed, assets extracted, and scenes generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'ANALYZE_SCREENPLAY_FAILED' });
  }
});

// POST /api/assets/character/sheet — Generate 2-in-1 Character Sheet (Head & shoulders left + Full body right)
assetsRouter.post('/character/sheet', async (req: Request, res: Response) => {
  try {
    const { character_name, physical_characteristics = '', clothing_and_accessories = '', visual_style, reference_image_url } = req.body;

    if (!character_name) {
      return res.status(400).json({ code: 400, data: null, message: 'character_name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generateCharacterSheet(
      character_name,
      physical_characteristics,
      clothing_and_accessories,
      visual_style,
      reference_image_url
    );

    return res.json({
      code: 200,
      data: {
        image_url: result.imageUrl || (result as any).image_url,
        ...result,
      },
      message: 'Character sheet generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'CHARACTER_SHEET_FAILED' });
  }
});

// POST /api/assets/location/sheet — Generate 4-in-1 Location Sheet (1 establishing + 3 perspective views 16:9)
assetsRouter.post('/location/sheet', async (req: Request, res: Response) => {
  try {
    const { location_name, physical_characteristics = '', time_of_day = 'Daytime', visual_style } = req.body;

    if (!location_name) {
      return res.status(400).json({ code: 400, data: null, message: 'location_name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generateLocationSheet(
      location_name,
      physical_characteristics,
      time_of_day,
      visual_style
    );

    return res.json({
      code: 200,
      data: {
        image_url: result.imageUrl || (result as any).image_url,
        ...result,
      },
      message: 'Location sheet generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'LOCATION_SHEET_FAILED' });
  }
});

// POST /api/assets/prop/sheet — Generate Prop Product Shot (Isolated on seamless white background)
assetsRouter.post('/prop/sheet', async (req: Request, res: Response) => {
  try {
    const { prop_name, physical_characteristics = '', visual_style } = req.body;

    if (!prop_name) {
      return res.status(400).json({ code: 400, data: null, message: 'prop_name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generatePropProductShot(
      prop_name,
      physical_characteristics,
      visual_style
    );

    return res.json({
      code: 200,
      data: {
        image_url: result.imageUrl || (result as any).image_url,
        ...result,
      },
      message: 'Prop product shot generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'PROP_SHOT_FAILED' });
  }
});

// POST /api/assets/screenplay/breakdown-shots — Break down Scene into Sequential Shots with Asset Linking
assetsRouter.post('/screenplay/breakdown-shots', async (req: Request, res: Response) => {
  try {
    const { scene_title, scene_content, available_assets } = req.body;

    if (!scene_title || !scene_content) {
      return res.status(400).json({ code: 400, data: null, message: 'scene_title and scene_content are required', error: 'INVALID_PAYLOAD' });
    }

    const shots = await scriptAgent.breakdownSceneToShots(
      scene_title,
      scene_content,
      Array.isArray(available_assets) ? available_assets : []
    );

    return res.json({
      code: 200,
      data: { shots },
      message: 'Scene broken down into shots successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'BREAKDOWN_SHOTS_FAILED' });
  }
});

// POST /api/assets/storyboard/shot-image — Generate Shot Frame Image with linked assets
assetsRouter.post('/storyboard/shot-image', async (req: Request, res: Response) => {
  try {
    const { shot, assets, visual_style, aspect_ratio } = req.body;
    const frameVisual = shot?.frame_visual;
    if (!shot || !frameVisual) {
      return res.status(400).json({ code: 400, data: null, message: 'Shot data is required', error: 'INVALID_PAYLOAD' });
    }

    const assetsMap = new Map<string, { name: string; type: string; image_url?: string; physical_characteristics?: string }>();
    if (Array.isArray(assets)) {
      for (const a of assets) {
        if (a.id) assetsMap.set(a.id, a);
      }
    }

    const result = await AssetService.generateShotImage(
      shot,
      assetsMap,
      visual_style,
      aspect_ratio
    );

    return res.json({
      code: 200,
      data: {
        image_url: result.imageUrl || (result as any).image_url,
        ...result,
      },
      message: 'Shot image generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SHOT_IMAGE_FAILED' });
  }
});

export default assetsRouter;

