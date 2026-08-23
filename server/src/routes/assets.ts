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
    const { type, search, seriesId } = req.query;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    const assets = await db.getAssets({
      userId,
      seriesId: seriesId as string,
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
    const { name, type, ext, size, sizeBytes, categoryLabel, s3Key, thumbnail, seriesId, episodeId, sceneId, prompt } = req.body;
    if (!name || !type) {
      return res.status(400).json({ code: 400, data: null, message: 'Name and type are required', error: 'INVALID_PAYLOAD' });
    }

    const key = s3Key || `assets/manual/${nanoid()}${ext || '.bin'}`;
    const proxyUrl = `/api/assets/file/${key}`;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    const newAsset = await db.saveAsset({
      id: `ast_${nanoid(8)}`,
      user_id: userId,
      name,
      type,
      ext: ext || (type === 'image' ? '.PNG' : type === 'video' ? '.MP4' : '.WAV'),
      size: size || '2.4 MB',
      sizeBytes: sizeBytes || 2516582,
      categoryLabel: categoryLabel || (type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Audio'),
      categoryColor: type === 'image' ? 'text-pink-500 dark:text-pink-400' : type === 'video' ? 'text-blue-500 dark:text-blue-400' : 'text-amber-500 dark:text-amber-400',
      s3Key: key,
      url: proxyUrl,
      thumbnail: thumbnail || proxyUrl,
      seriesId,
      episodeId,
      sceneId,
      prompt,
      isVideo: type === 'video',
      isAudio: type === 'audio',
      aspect: 'aspect-[9/16]',
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({ code: 201, data: newAsset, message: 'Asset created and stored in database successfully', error: null });
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
    const { type, prompt, seriesId, episodeId, sceneId, aspectRatio, style, sceneIndex, characters, sceneData, isEndFrame } = req.body;
    const userId = getUserId(req);

    const deduct = await CreditService.deductUserCredits(userId, 'sceneImage', 'Scene Background Generation', `Scene: ${sceneId || 'frame'}`);
    if (!deduct.success && deduct.error?.includes('Insufficient')) {
      return res.status(402).json({ code: 402, data: null, message: deduct.error, error: 'INSUFFICIENT_CREDITS' });
    }

    const result = await videoService.generateSceneImage({
      userId,
      type,
      prompt,
      seriesId,
      episodeId,
      sceneId,
      aspectRatio,
      style,
      sceneIndex,
      characters,
      sceneData,
      isEndFrame,
    });

    if (result.synthIdHeaders) {
      res.set(result.synthIdHeaders);
    }

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `job_${nanoid(8)}`,
        assetId: result.assetId,
        s3Key: result.s3Key,
        url: result.url,
        imageUrl: result.imageUrl,
        sizeBytes: result.sizeBytes,
        provider: result.provider,
        synthId: result.synthId,
        generationParams: { prompt: result.enhancedPrompt, type, episodeId, sceneId, style },
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
    const { startFrameUrl, endFrameUrl, characterImageIds, seriesId, episodeId, sceneId, duration, motion, cameraMovement, prompt, aspectRatio, language, sceneData } = req.body;
    const userId = getUserId(req);

    // Deduct credits for Video Generation
    await CreditService.deductUserCredits(userId, 'videoGeneration', 'Scene Video Generation', `Scene: ${sceneId || 'ep' + episodeId}`);

    const result = await videoService.generateSceneVideo({
      userId,
      startFrameUrl: startFrameUrl,
      endFrameUrl: endFrameUrl,
      characterImageIds,
      seriesId,
      episodeId,
      sceneId,
      duration,
      motion,
      cameraMovement,
      prompt,
      aspectRatio,
      language,
      sceneData,
    });

    if (result.synthIdHeaders) {
      res.set(result.synthIdHeaders);
    }

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `vid_${nanoid(10)}`,
        assetId: result.assetId,
        s3Key: result.s3Key,
        url: result.url,
        bgmUrl: (result as any).bgmUrl || '',
        voiceoverUrl: (result as any).voiceoverUrl || '',
        voiceId: (result as any).voiceId || '',
        voiceStartUs: (result as any).voiceStartUs || 200_000,
        voiceDurationUs: (result as any).voiceDurationUs || (Number(duration) || 6) * 1_000_000,
        captionsData: (result as any).captionsData || [],
        sizeBytes: result.sizeBytes,
        provider: result.provider,
        synthId: result.synthId,
        params: { startFrameUrl: startFrameUrl, endFrameUrl: endFrameUrl || sceneData?.endFrameUrl, characterImageIds, duration: result.duration, motion: result.motion, cameraMovement: result.cameraMovement },
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
    const { episodeId, seriesId, prompt, genre, duration } = req.body;
    const userId = getUserId(req);
    const db = await getDatabaseProvider();

    await CreditService.deductUserCredits(userId, 'bgmMusic', 'BGM Soundtrack Generation', `Ep: ${episodeId}`);

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
      sizeBytes: s3Size,
      categoryLabel: 'BGM Audio',
      categoryColor: 'text-amber-500 dark:text-amber-400',
      s3Key,
      url: finalUrl,
      thumbnail: finalUrl,
      seriesId,
      episodeId,
      prompt: musicPrompt,
      provider: musicResult?.provider || 'Sound Effects Engine',
      isAudio: true,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      code: 201,
      data: {
        assetId: savedAsset.id,
        audioUrl: finalUrl,
        musicUrl: finalUrl,
        durationSeconds,
        genre: genre || 'micro_drama_suspense',
        s3Key,
        sizeBytes: s3Size,
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
          if ((masterPlanObj as any)?.totalDurationSeconds) {
            duration = Number((masterPlanObj as any).totalDurationSeconds);
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
          language = (ep as any).activeLanguageCode || (ep as any).language || language;
          const epDur = Number(ep.duration);
          if (epDur && epDur >= 30) {
            duration = epDur;
          }
          if (Array.isArray(ep.characters) && ep.characters.length > 0) {
            characters = ep.characters;
          }
          if (Array.isArray(ep.locations) && ep.locations.length > 0) {
            locations = ep.locations;
          }
          if (Array.isArray(ep.props) && ep.props.length > 0) {
            props = ep.props;
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
    const { screenplay, seriesId, episodeId, country, language } = req.body;
    if (!screenplay || typeof screenplay !== 'string') {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    const ctx = await resolveProjectLanguageContext(seriesId, episodeId, country, language);
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
    const { screenplay, characters, locations, props, seriesId, episodeId, country, language } = req.body;
    if (!screenplay) {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    const ctx = await resolveProjectLanguageContext(seriesId, episodeId, country, language);
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
      seriesId,
      episodeId,
      targetDurationSeconds,
      existingCharacters,
      existingLocations,
      existingProps,
    } = req.body;

    if (!screenplay || typeof screenplay !== 'string') {
      return res.status(400).json({ code: 400, data: null, message: 'Screenplay text is required', error: 'INVALID_PAYLOAD' });
    }

    // Automatically resolve country, language, duration, and existing assets from Series & Episode in DB
    const ctx = await resolveProjectLanguageContext(seriesId, episodeId, country, language);
    const effectiveDuration = Number(targetDurationSeconds) || ctx.duration || undefined;

    const result = await scriptAgent.analyzeAndBreakdownScreenplay({
      screenplay,
      country: ctx.language || ctx.country,
      targetDurationSeconds: effectiveDuration,
      existingCharacters: (Array.isArray(existingCharacters) && existingCharacters.length > 0) ? existingCharacters : ctx.existingCharacters,
      existingLocations: (Array.isArray(existingLocations) && existingLocations.length > 0) ? existingLocations : ctx.existingLocations,
      existingProps: (Array.isArray(existingProps) && existingProps.length > 0) ? existingProps : ctx.existingProps,
    });

    // If seriesId & episodeId are provided, persist update to database
    if (seriesId && episodeId) {
      try {
        const db = await getDatabaseProvider();
        const ep = await db.getEpisodeById(episodeId);
        if (ep) {
          await db.updateEpisode(episodeId, {
            screenplay,
            scenes: result.scenes,
            characters: result.characters,
            locations: result.locations,
            props: result.props,
            duration: result.totalDurationSeconds,
            script: JSON.stringify({
              episode: ep.title,
              episodeNumber: ep.episode_number,
              title: ep.title,
              screenplay,
              scenes: result.scenes,
              characters: result.characters,
              locations: result.locations,
              props: result.props,
              totalDurationSeconds: result.totalDurationSeconds,
            }),
          });
        }
      } catch (dbErr: any) {
        Logger.warn(`[assetsRouter.analyze] Failed to auto-persist to DB: ${dbErr.message}`);
      }
    }

    return res.json({
      code: 200,
      data: result,
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
    const { characterName, physicalCharacteristics, clothingAndAccessories, visualStyle, referenceImageUrl } = req.body;
    if (!characterName) {
      return res.status(400).json({ code: 400, data: null, message: 'Character name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generateCharacterSheet(
      characterName,
      physicalCharacteristics || '',
      clothingAndAccessories || '',
      visualStyle,
      referenceImageUrl
    );

    return res.json({
      code: 200,
      data: result,
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
    const { locationName, physicalCharacteristics, timeOfDay, visualStyle } = req.body;
    if (!locationName) {
      return res.status(400).json({ code: 400, data: null, message: 'Location name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generateLocationSheet(
      locationName,
      physicalCharacteristics || '',
      timeOfDay || 'Daytime',
      visualStyle
    );

    return res.json({
      code: 200,
      data: result,
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
    const { propName, physicalCharacteristics, visualStyle } = req.body;
    if (!propName) {
      return res.status(400).json({ code: 400, data: null, message: 'Prop name is required', error: 'INVALID_PAYLOAD' });
    }

    const result = await AssetService.generatePropProductShot(
      propName,
      physicalCharacteristics || '',
      visualStyle
    );

    return res.json({
      code: 200,
      data: result,
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
    const { sceneTitle, sceneContent, availableAssets } = req.body;
    if (!sceneTitle || !sceneContent) {
      return res.status(400).json({ code: 400, data: null, message: 'Scene title and content are required', error: 'INVALID_PAYLOAD' });
    }

    const shots = await scriptAgent.breakdownSceneToShots(
      sceneTitle,
      sceneContent,
      Array.isArray(availableAssets) ? availableAssets : []
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
    const { shot, assets, visualStyle, aspectRatio } = req.body;
    if (!shot || !shot.frameVisual) {
      return res.status(400).json({ code: 400, data: null, message: 'Shot data is required', error: 'INVALID_PAYLOAD' });
    }

    const assetsMap = new Map<string, { name: string; type: string; imageUrl?: string; physicalCharacteristics?: string }>();
    if (Array.isArray(assets)) {
      for (const a of assets) {
        if (a.id) assetsMap.set(a.id, a);
      }
    }

    const result = await AssetService.generateShotImage(
      shot,
      assetsMap,
      visualStyle,
      aspectRatio || '16:9'
    );

    return res.json({
      code: 200,
      data: result,
      message: 'Shot frame image generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SHOT_IMAGE_FAILED' });
  }
});

export default assetsRouter;

