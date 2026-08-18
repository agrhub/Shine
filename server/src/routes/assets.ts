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
    const { type, prompt, seriesId, episodeId, sceneId, aspectRatio, style, sceneIndex, characters: reqCharacters } = req.body;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    const deduct = await CreditService.deductUserCredits(userId, 'sceneImage', 'Scene Background Generation', `Scene: ${sceneId || 'frame'}`);
    if (!deduct.success && deduct.error?.includes('Insufficient')) {
      return res.status(402).json({ code: 402, data: null, message: deduct.error, error: 'INSUFFICIENT_CREDITS' });
    }

    const frameSkill = loadSkill('production_frame_prompt') || '';
    const targetAspect = aspectRatio === '16:9' ? '16:9' : '9:16';

    // Contextual enrichment from Series and Episode in Database
    let targetSeries: any = null;
    let seriesTitle = '';
    let seriesGenre = 'micro-drama';
    let seriesTone = 'cinematic';
    let seriesVisual = 'modern cinematic';

    if (seriesId) {
      targetSeries = await db.getSeriesById(seriesId);
    }

    if (episodeId && !targetSeries) {
      const episode = await db.getEpisodeById(episodeId);
      if (episode && episode.series_id) {
        targetSeries = await db.getSeriesById(episode.series_id);
      }
    }

    if (targetSeries) {
      seriesTitle = targetSeries.title || '';
      seriesGenre = targetSeries.genre || seriesGenre;
      seriesTone = targetSeries.tone || seriesTone;
      seriesVisual = targetSeries.visual_style || seriesVisual;
    }

    // ─── Character Continuity & Face Reference Extraction ─────────────────────
    const allSeriesCharacters: any[] = targetSeries?.characters || targetSeries?.master_plan?.characters || [];
    const characterReferences: string[] = [];
    const characterContinuityDescriptions: string[] = [];
    const promptUpper = (prompt || '').toUpperCase();

    for (const char of allSeriesCharacters) {
      const charNameUpper = (char.name || '').toUpperCase();
      const isPresent = (Array.isArray(reqCharacters) && reqCharacters.some((c: string) => c.toUpperCase() === charNameUpper)) ||
                        (charNameUpper && promptUpper.includes(charNameUpper));

      if (isPresent) {
        const refUrl = char.anchors?.[0]?.imageUrl || char.avatarUrl || char.avatar;
        if (refUrl && !characterReferences.includes(refUrl)) {
          characterReferences.push(refUrl);
        }

        const ageTag = char.age ? `${char.age}-year-old ` : '';
        const genderTag = char.gender && char.gender !== 'neutral' ? `${char.gender} ` : '';
        let wardrobeTag = '';
        if (Array.isArray(char.wardrobe) && char.wardrobe.length > 0) {
          const wTags = Array.isArray(char.wardrobe[0].tags) ? char.wardrobe[0].tags.join(', ') : char.wardrobe[0].name;
          if (wTags) wardrobeTag = `, wearing ${wTags}`;
        }
        const traits = char.visualTraits || char.traits || char.identity || '';
        characterContinuityDescriptions.push(`Character ${char.name}: ${ageTag}${genderTag}${traits}${wardrobeTag}, exact face matching reference photo.`);
      }
    }

    // Build rich, contextual prompt
    let enhancedPrompt = `Vertical 9:16 micro-drama cinematic scene storyboard shot, ${seriesGenre} genre, tone: ${style || seriesTone}, visual style: ${seriesVisual}.`;
    if (prompt) {
      enhancedPrompt += ` Scene setting: ${prompt}.`;
    }
    if (characterContinuityDescriptions.length > 0) {
      enhancedPrompt += ` Character Continuity: ${characterContinuityDescriptions.join(' ')}`;
    }
    enhancedPrompt += ` Highly atmospheric cinematic lighting, depth of field, high-contrast rim lighting, photorealistic 8k render.`;

    Logger.info(`[assetsRouter] Generating scene image with ${characterReferences.length} character reference(s) for scene ${sceneId || sceneIndex || 'frame'}`);

    // Generate image via AIProviderRouter (loads Google Flow or Gemini dynamically with character references)
    const imageResult = await aiProviderRouter.generateImage(enhancedPrompt, {
      aspectRatio: targetAspect,
      systemPrompt: frameSkill,
      characterReferences,
      imageInputs: characterReferences,
    });

    if (!imageResult || !imageResult.url) {
      throw new Error('Image generation failed across all AI providers.');
    }

    // Upload to Storage
    const s3Result = await StorageFactory.uploadMedia(imageResult.url, 'images', 'png', imageResult.mimeType || 'image/png');
    const internalUrl = `/api/assets/file/${s3Result.key}`;

    // Embed SynthID Watermark
    const synthIdResult = await SynthIDService.embedSynthID({
      assetType: 'image',
      model: imageResult.provider || 'Google Flow',
      seriesId: seriesId || episodeId,
      sceneId,
    });

    const assetId = `ast_${nanoid(8)}`;
    const assetName = `Scene_${sceneId || sceneIndex || 'Background'}_${nanoid(4)}`;

    // Save Asset in Database
    const savedAsset = await db.saveAsset({
      id: assetId,
      user_id: userId,
      name: assetName,
      type: 'scene_image',
      ext: '.PNG',
      size: `${(s3Result.size / (1024 * 1024)).toFixed(1)} MB`,
      sizeBytes: s3Result.size,
      categoryLabel: 'Scene Background',
      categoryColor: 'text-pink-500 dark:text-pink-400',
      s3Key: s3Result.key,
      url: internalUrl,
      thumbnail: internalUrl,
      seriesId,
      episodeId,
      sceneId,
      prompt: enhancedPrompt,
      provider: imageResult.provider,
      aspect: targetAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]',
      synthIdVerified: true,
      synthIdHash: synthIdResult.synthIdHash,
      synthIdMetadata: synthIdResult.synthIdMetadata,
      created_at: new Date().toISOString(),
    });

    // Auto-update episode scene's storyboardFrameUrl in Database
    if (episodeId) {
      try {
        const ep = await db.getEpisodeById(episodeId);
        if (ep && Array.isArray(ep.scenes)) {
          const sIdx = typeof sceneIndex === 'number'
            ? ep.scenes.findIndex((s: any) => s.index === sceneIndex || s.id === sceneId)
            : ep.scenes.findIndex((s: any) => s.id === sceneId);
          if (sIdx !== -1) {
            ep.scenes[sIdx].storyboardFrameUrl = internalUrl;
            await db.updateEpisode(ep.id, { scenes: ep.scenes });
          }
        }
      } catch (err: any) {
        Logger.warn(`[assetsRouter] Auto-update episode scene failed: ${err.message}`);
      }
    }

    res.set(synthIdResult.headers);

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `job_${nanoid(8)}`,
        assetId: savedAsset.id,
        s3Key: s3Result.key,
        url: internalUrl,
        imageUrl: internalUrl,
        sizeBytes: s3Result.size,
        provider: imageResult.provider,
        synthId: synthIdResult.synthIdMetadata,
        generationParams: { prompt: enhancedPrompt, type, episodeId, sceneId, style },
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
assetsRouter.post('/video-generate', async (req, res: Response) => {
  try {
    const { backgroundImageId, characterImageIds, seriesId, episodeId, sceneId, duration, motion, cameraMovement, prompt } = req.body;
    const db = await getDatabaseProvider();
    const userId = getUserId(req);

    // Deduct credits for Video Generation
    await CreditService.deductUserCredits(userId, 'videoGeneration', 'Scene Video Generation', `Scene: ${sceneId || 'ep' + episodeId}`);

    // Contextual enrichment from Series and Episode in Database
    let seriesTone = 'cinematic';
    let seriesGenre = 'micro-drama';
    if (seriesId) {
      const s = await db.getSeriesById(seriesId);
      if (s) {
        seriesTone = s.tone || seriesTone;
        seriesGenre = s.genre || seriesGenre;
      }
    }

    const targetDuration = Math.min(Math.max(Number(duration) || 5, 4), 8);
    const cameraCue = cameraMovement || 'slow dolly push-in';
    const motionIntensity = motion || 'subtle cinematic movement';

    let videoPrompt = `9:16 vertical ${seriesGenre} micro-drama scene, camera: ${cameraCue}, movement: ${motionIntensity}, tone: ${seriesTone}, ultra photorealistic, cinematic high-contrast lighting.`;
    if (prompt) {
      videoPrompt += ` Scene action: ${prompt}.`;
    }

    const videoResult = await aiProviderRouter.generateVideo(videoPrompt, {
      aspectRatio: '9:16',
      characterReferences: Array.isArray(characterImageIds) ? characterImageIds : characterImageIds ? [characterImageIds] : [],
      backgroundImageId,
    });

    if (!videoResult || !videoResult.url) {
      throw new Error('Video generation failed across all providers (Google Flow Veo & Gemini).');
    }

    // Upload generated video to Storage
    const s3Result = await StorageFactory.uploadMedia(videoResult.url, 'videos', 'mp4', 'video/mp4');
    const internalUrl = `/api/assets/file/${s3Result.key}`;
    const assetId = `ast_${nanoid(8)}`;
    const assetName = `Scene_Video_${sceneId || 'ep' + episodeId}_${nanoid(4)}`;

    // Embed SynthID Digital Watermark
    const synthIdResult = await SynthIDService.embedSynthID({
      assetType: 'video',
      model: videoResult.provider || 'Veo-3.1',
      seriesId: episodeId,
      sceneId,
    });

    // Save Asset to Database
    const savedAsset = await db.saveAsset({
      id: assetId,
      user_id: userId,
      name: assetName,
      type: 'scene_video',
      ext: '.MP4',
      size: `${(s3Result.size / (1024 * 1024)).toFixed(1)} MB`,
      sizeBytes: s3Result.size,
      categoryLabel: 'Scene Video',
      categoryColor: 'text-blue-500 dark:text-blue-400',
      s3Key: s3Result.key,
      url: internalUrl,
      thumbnail: internalUrl,
      seriesId,
      episodeId,
      sceneId,
      prompt: videoPrompt,
      provider: videoResult.provider,
      isVideo: true,
      aspect: 'aspect-[9/16]',
      synthIdVerified: true,
      synthIdHash: synthIdResult.synthIdHash,
      synthIdMetadata: synthIdResult.synthIdMetadata,
      created_at: new Date().toISOString(),
    });

    res.set(synthIdResult.headers);

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `vid_${nanoid(10)}`,
        assetId: savedAsset.id,
        s3Key: s3Result.key,
        url: internalUrl,
        sizeBytes: s3Result.size,
        provider: videoResult.provider,
        synthId: synthIdResult.synthIdMetadata,
        params: { backgroundImageId, characterImageIds, duration: targetDuration, motion: motionIntensity, cameraMovement: cameraCue },
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

export default assetsRouter;
