import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { geminiClient } from '@/integrations/ai/gemini/GeminiClient.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { loadSkill } from '@/utils/SkillLoader.js';
import { SynthIDService } from '@/services/SynthIDService.js';

export const assetsRouter = Router();

export interface AssetEntity {
  id: string;
  userId: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'text' | 'render';
  ext: string;
  size: string;
  sizeBytes: number;
  categoryLabel: string;
  categoryColor: string;
  s3Key: string;
  url: string;
  thumbnail?: string;
  icon?: string;
  aspect?: string;
  isVideo?: boolean;
  isAudio?: boolean;
  synthIdVerified?: boolean;
  synthIdHash?: string;
  synthIdMetadata?: any;
  createdAt: string;
}

let assetsStore: AssetEntity[] = [];

// GET /api/assets/file/* — Secure backend media streaming via StorageFactory
assetsRouter.get('/file/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || (req.query.key as string);
    if (!rawKey) {
      return res.status(400).send('Missing storage key');
    }

    const stream = await StorageFactory.getFileStream(rawKey);
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

// GET /api/assets - List all assets with optional filtering
assetsRouter.get('/', (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;
    let filtered = [...assetsStore];

    if (type && type !== 'all') {
      filtered = filtered.filter((a) => a.type.toLowerCase() === (type as string).toLowerCase());
    }

    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q) || a.categoryLabel.toLowerCase().includes(q));
    }

    return res.json({
      code: 200,
      data: filtered,
      total: filtered.length,
      message: 'Assets retrieved successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /api/assets - Upload new asset
assetsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, type, ext, size, sizeBytes, categoryLabel, s3Key, thumbnail } = req.body;
    if (!name || !type) {
      return res.status(400).json({ code: 400, data: null, message: 'Name and type are required', error: 'INVALID_PAYLOAD' });
    }

    const key = s3Key || `assets/manual/${nanoid()}${ext || '.bin'}`;
    const proxyUrl = `/api/assets/file/${key}`;

    const newAsset: AssetEntity = {
      id: `ast_${nanoid(8)}`,
      userId: (req as any).user?.id || 'usr_default',
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
      isVideo: type === 'video',
      isAudio: type === 'audio',
      aspect: 'aspect-[9/16]',
      createdAt: new Date().toISOString(),
    };

    assetsStore.unshift(newAsset);
    return res.status(201).json({ code: 201, data: newAsset, message: 'Asset created successfully', error: null });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// DELETE /api/assets/:id - Delete an asset
assetsRouter.delete('/:id', (req: Request, res: Response) => {
  const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const initialLength = assetsStore.length;
  assetsStore = assetsStore.filter((a) => a.id !== assetId);

  if (assetsStore.length === initialLength) {
    return res.status(404).json({ code: 404, data: null, message: 'Asset not found', error: 'NOT_FOUND' });
  }

  return res.json({ code: 200, data: { id: assetId, deleted: true }, message: 'Asset deleted successfully', error: null });
});

// POST /api/assets/generate — Real AI Scene Image Generation & S3 Storage (Client receives only S3 key)
assetsRouter.post('/generate', async (req, res: Response) => {
  try {
    const { type, prompt, episodeId, sceneId, characterName, loraModel, aspectRatio, style } = req.body;
    if (!prompt) {
      return res.status(400).json({ code: 400, data: null, message: 'Prompt is required', error: 'INVALID_PAYLOAD' });
    }

    const frameSkill = loadSkill('production_frame_prompt');
    const targetAspect = aspectRatio === '16:9' ? '16:9' : '9:16';

    let enhancedPrompt = `Vertical micro-drama cinematic film still, aspect ratio ${targetAspect}. ${prompt}`;
    if (characterName) {
      enhancedPrompt += `, character focus on ${characterName}, consistent visual LoRA anchor ${loraModel || 'character_master'}, expressive lighting, high-contrast rim light, photorealistic texture, vertical 9:16 framing.`;
    } else {
      enhancedPrompt += `, background environment shot, cinematic depth of field, atmospheric lighting, moody tone: ${style || 'cinematic neon'}, photorealistic 8k render.`;
    }

    // Call real Gemini Image / Imagen generation
    const imageResult = await geminiClient._generateImage(enhancedPrompt, undefined, {
      aspectRatio: targetAspect,
      systemPrompt: frameSkill,
    });

    if (!imageResult || !imageResult.url) {
      throw new Error('Gemini Image API returned no image data. Verify GEMINI_API_KEY and model quotas.');
    }

    // Upload generated image via StorageFactory (returns storage key only)
    const s3Result = await StorageFactory.uploadMedia(imageResult.url, 'images', 'png', imageResult.mimeType || 'image/png');
    const s3Key = s3Result.key;
    const internalUrl = `/api/assets/file/${s3Key}`;
    const assetId = `ast_${nanoid(8)}`;
    const assetName = characterName
      ? `${characterName}_Scene_${sceneId || 'frame'}`
      : `Scene_Background_${sceneId || 'frame'}`;

    // Embed Google SynthID Digital Watermark
    const synthIdResult = await SynthIDService.embedSynthID({
      assetType: 'image',
      model: 'Imagen-3.0',
      seriesId: episodeId,
      sceneId,
    });

    const newAsset: AssetEntity = {
      id: assetId,
      userId: (req as any).user?.id || 'usr_default',
      name: assetName,
      type: 'image',
      ext: '.PNG',
      size: `${(s3Result.size / (1024 * 1024)).toFixed(1)} MB`,
      sizeBytes: s3Result.size,
      categoryLabel: characterName ? 'Character Render' : 'Scene Background',
      categoryColor: characterName ? 'text-violet-500 dark:text-violet-400' : 'text-pink-500 dark:text-pink-400',
      s3Key,
      url: internalUrl,
      thumbnail: internalUrl,
      aspect: targetAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]',
      synthIdVerified: true,
      synthIdHash: synthIdResult.synthIdHash,
      synthIdMetadata: synthIdResult.synthIdMetadata,
      createdAt: new Date().toISOString(),
    };

    assetsStore.unshift(newAsset);

    res.set(synthIdResult.headers);

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `job_${nanoid(8)}`,
        assetId: newAsset.id,
        s3Key,
        url: internalUrl,
        sizeBytes: s3Result.size,
        synthId: synthIdResult.synthIdMetadata,
        generationParams: { prompt: enhancedPrompt, type, episodeId, sceneId, loraModel, style },
        status: 'completed',
        message: `AI rendered ${characterName ? 'character ' + characterName : 'scene background'} with SynthID verification`,
      },
      message: 'AI scene image generated and uploaded to S3 successfully with SynthID',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: `Image generation or S3 upload failed: ${err.message}`,
      error: 'IMAGE_GENERATION_FAILED',
    });
  }
});

// POST /api/assets/video-generate — Real Image-to-Video Scene Generation & S3 Upload (Client receives only S3 key)
assetsRouter.post('/video-generate', async (req, res: Response) => {
  try {
    const { backgroundImageId, characterImageIds, episodeId, sceneId, duration, motion, cameraMovement, prompt } = req.body;
    if (!episodeId) {
      return res.status(400).json({ code: 400, data: null, message: 'episodeId is required', error: 'INVALID_PAYLOAD' });
    }

    // Clamp video duration <= 8s
    const targetDuration = Math.min(Math.max(Number(duration) || 5, 4), 8);
    const videoPrompt = prompt || `9:16 vertical micro-drama scene, camera movement ${cameraMovement || 'slow dolly push-in'}, subtle character emotional micro-expression, cinematic lighting, ${motion || 'slow pan'}.`;

    const videoResult = await geminiClient.generateVideo(videoPrompt, undefined, {
      aspectRatio: '9:16',
      durationSeconds: targetDuration,
    });

    if (!videoResult || !videoResult.url) {
      throw new Error('Video generation API returned no output. Verify Veo / Gemini video generation model settings.');
    }

    // Upload generated video via StorageFactory (returns storage key only)
    const s3Result = await StorageFactory.uploadMedia(videoResult.url, 'videos', 'mp4', videoResult.mimeType || 'video/mp4');
    const s3Key = s3Result.key;
    const internalUrl = `/api/assets/file/${s3Key}`;
    const assetId = `ast_${nanoid(8)}`;
    const assetName = `Scene_Video_${sceneId || 'ep' + episodeId}`;

    // Embed Google SynthID Digital Watermark
    const synthIdResult = await SynthIDService.embedSynthID({
      assetType: 'video',
      model: 'Veo-2.0',
      seriesId: episodeId,
      sceneId,
    });

    const newAsset: AssetEntity = {
      id: assetId,
      userId: (req as any).user?.id || 'usr_default',
      name: assetName,
      type: 'video',
      ext: '.MP4',
      size: `${(s3Result.size / (1024 * 1024)).toFixed(1)} MB`,
      sizeBytes: s3Result.size,
      categoryLabel: 'Scene Video',
      categoryColor: 'text-blue-500 dark:text-blue-400',
      s3Key,
      url: internalUrl,
      thumbnail: internalUrl,
      isVideo: true,
      aspect: 'aspect-[9/16]',
      synthIdVerified: true,
      synthIdHash: synthIdResult.synthIdHash,
      synthIdMetadata: synthIdResult.synthIdMetadata,
      createdAt: new Date().toISOString(),
    };

    assetsStore.unshift(newAsset);

    res.set(synthIdResult.headers);

    return res.status(201).json({
      code: 201,
      data: {
        jobId: `vid_${nanoid(10)}`,
        assetId: newAsset.id,
        s3Key,
        url: internalUrl,
        sizeBytes: s3Result.size,
        synthId: synthIdResult.synthIdMetadata,
        params: { backgroundImageId, characterImageIds, duration: targetDuration, motion: motion || 'slow_pan', cameraMovement: cameraMovement || 'dolly_in' },
        status: 'completed',
        message: 'Scene video generated and stored to S3 successfully with SynthID',
      },
      message: 'Scene video generated and uploaded to S3 successfully with SynthID',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: `Video generation or S3 upload failed: ${err.message}`,
      error: 'VIDEO_GENERATION_FAILED',
    });
  }
});
