import { Router, Request, Response } from 'express';
import { getDatabaseProvider } from '../database/index.js';
import { scriptAgent } from '../agents/ScriptAgent.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';
import { Logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';

const router = Router();

// Standardized response helpers
function ok(res: Response, data: any, message = 'Success', statusCode = 200) {
  res.status(statusCode).json({ code: statusCode, data, message, error: null });
}
function fail(res: Response, statusCode: number, message: string) {
  res.status(statusCode).json({ code: statusCode, data: null, message: null, error: message });
}

// GET /v1/series - List all series
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'usr_default';
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';

    const db = await getDatabaseProvider();
    const seriesList = await db.getSeriesList(userId, search, status);
    ok(res, { series: seriesList, total: seriesList.length });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PATCH /v1/series/:id - Update series metadata (Rename, Archive, Status)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.id as string;
    const { title, status, description, tone, genre } = req.body;

    const db = await getDatabaseProvider();
    const existing = await db.getSeriesById(seriesId);
    if (!existing) {
      fail(res, 404, 'Series not found'); return;
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (description !== undefined) updates.description = description;
    if (tone !== undefined) updates.tone = tone;
    if (genre !== undefined) updates.genre = genre;

    const updated = await db.updateSeries(seriesId, updates);
    ok(res, { series: updated }, 'Series updated successfully');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// DELETE /v1/series/:id - Permanently delete series and all S3/cloud assets
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.id as string;
    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(seriesId);
    if (!series) {
      fail(res, 404, 'Series not found'); return;
    }

    const episodes = await db.getEpisodesBySeriesId(seriesId);

    // 1. Purge all related assets on S3 / Storage Provider before deleting DB records
    try {
      const storage = await StorageFactory.getActiveAdapter();
      Logger.info(`[SeriesDelete] Purging cloud assets for series "${seriesId}" and ${episodes.length} episodes...`);

      // Delete series asset folders
      await storage.deleteFolder(`series/${seriesId}`);
      await storage.deleteFolder(`images/${seriesId}`);
      await storage.deleteFolder(`videos/${seriesId}`);
      await storage.deleteFolder(`audio/${seriesId}`);

      // Delete episode asset folders
      for (const ep of episodes) {
        await storage.deleteFolder(`episodes/${ep.id}`);
      }
      Logger.info(`[SeriesDelete] Successfully purged cloud assets for "${seriesId}".`);
    } catch (storageErr: any) {
      Logger.warn(`[SeriesDelete] Cloud storage asset purge warning: ${storageErr.message}`);
    }

    // 2. Delete series and episodes from database
    await db.deleteSeries(seriesId);

    ok(res, { deleted: true, seriesId }, 'Series and all associated assets deleted successfully');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/series - Create a new series
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      genre,
      tone,
      visualStyle,
      targetAudience,
      episodeCount,
      userId,
      masterPlan,
      description,
      synopsis,
      country,
      ratio,
      characters,
    } = req.body;

    if (!title || !genre) {
      fail(res, 400, 'Title and genre are required'); return;
    }

    const seriesId = masterPlan?.seriesId || `srs_${nanoid(10)}`;
    const uId = userId || 'usr_default';
    const rawEpCount = Number(episodeCount) || Number(masterPlan?.totalEpisodes) || 20;

    const db = await getDatabaseProvider();
    const newSeries = await db.createSeries({
      id: seriesId,
      user_id: uId,
      title,
      genre,
      tone: tone || masterPlan?.tone || 'Dramatic',
      synopsis: synopsis || masterPlan?.storyCore?.coreAttraction || description || '',
      description: description || masterPlan?.storyCore?.coreAttraction || '',
      visual_style: visualStyle || (ratio ? `Cinematic ${ratio}` : 'Cinematic 9:16'),
      target_audience: targetAudience || masterPlan?.targetAudience || 'General',
      country: country || masterPlan?.country || 'US',
      ratio: ratio || masterPlan?.ratio || '9:16',
      viral_hook: masterPlan?.viralHook || '',
      master_plan: masterPlan || null,
      characters: characters || masterPlan?.characters || [],
      episode_count: rawEpCount,
      status: 'DRAFT',
    });

    // Populate all episodes from Master Plan (e.g. all 20, 50, 100 episodes)
    const planEpisodes: any[] = Array.isArray(masterPlan?.episodes) && masterPlan.episodes.length > 0
      ? masterPlan.episodes
      : [];

        // Pre-generate full scene screenplay for Episode 1 so it is ready immediately
    let ep1Scenes: any[] = [];
    if (planEpisodes.length > 0) {
      try {
        const ep1 = planEpisodes[0];
        const scriptRes = await scriptAgent.execute({
          seriesId,
          episodeNumber: Number(ep1.episodeNumber) || 1,
          title: ep1.title,
          genre: newSeries.genre,
          tone: newSeries.tone,
          synopsis: ep1.synopsis,
          sceneCore: ep1.sceneCore,
          conflictEscalation: ep1.conflictEscalation,
          cliffhangerHook: ep1.cliffhangerHook,
          characters: newSeries.characters || masterPlan?.characters,
          storyCore: masterPlan?.storyCore,
          country: newSeries.country,
          ratio: newSeries.ratio,
        });
        if (scriptRes?.scenes) {
          ep1Scenes = scriptRes.scenes;
        }
      } catch (e: any) {
        console.warn('[SeriesRoute] Ep 1 script pre-generation error:', e.message);
      }
    }

    if (planEpisodes.length > 0) {
      for (let i = 0; i < planEpisodes.length; i++) {
        const ep = planEpisodes[i];
        const epId = ep.id || `ep_${nanoid(10)}`;
        await db.createEpisode({
          id: epId,
          series_id: seriesId,
          episode_number: Number(ep.episodeNumber) || (i + 1),
          title: ep.title || `Episode ${i + 1}`,
          synopsis: ep.synopsis || ep.sceneCore || 'Plot beat and conflict escalation.',
          scene_core: ep.sceneCore || '',
          conflict_escalation: ep.conflictEscalation || '',
          cliffhanger_hook: ep.cliffhangerHook || '',
          phase: ep.phase || '',
          scenes: i === 0 && ep1Scenes.length > 0 ? ep1Scenes : (ep.scenes || []),
          duration: 90,
          status: 'DRAFT',
        });
      }
    } else {
      // Fallback: Auto-create Episode 1 shell
      const epId = `ep_${nanoid(10)}`;
      await db.createEpisode({
        id: epId,
        series_id: seriesId,
        episode_number: 1,
        title: 'Episode 1: The Beginning',
        synopsis: synopsis || 'Initial hook and character introduction.',
        duration: 90,
        status: 'DRAFT',
      });
    }

    ok(res, { series: newSeries }, 'Series created successfully', 201);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/series/:id - Get series details with episodes
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.id as string;
    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(seriesId as string);
    if (!series) {
      fail(res, 404, 'Series not found'); return;
    }

    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    ok(res, { series, episodes });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PUT /v1/series/:id/characters - Update and persist series characters
router.put('/:id/characters', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.id as string;
    const { characters } = req.body;
    if (!Array.isArray(characters)) {
      fail(res, 400, 'characters must be an array');
      return;
    }

    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(seriesId);
    if (!series) {
      fail(res, 404, 'Series not found');
      return;
    }

    let parsedPlan: any = {};
    if (series.master_plan) {
      parsedPlan = typeof series.master_plan === 'string' ? JSON.parse(series.master_plan) : series.master_plan;
    }
    parsedPlan.characters = characters;

    await db.updateSeries(seriesId, {
      characters,
      master_plan: JSON.stringify(parsedPlan),
    });

    ok(res, { characters, message: 'Characters updated successfully' });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PUT /v1/series/:id/episodes/:epId - Update episode scenes, metadata, and language tracks
router.put('/:id/episodes/:epId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: seriesId, epId } = req.params;
    const { scenes, title, synopsis, languageTracks, status } = req.body;
    const db = await getDatabaseProvider();

    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    const ep = episodes.find(e => e.id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }

    const updates: any = {};
    if (scenes !== undefined) updates.scenes = scenes;
    if (title !== undefined) updates.title = title;
    if (synopsis !== undefined) updates.synopsis = synopsis;
    if (languageTracks !== undefined) updates.languageTracks = languageTracks;
    if (status !== undefined) updates.status = status;

    const updatedEpisode = await db.updateEpisode(ep.id, updates);
    ok(res, { episode: updatedEpisode, message: 'Episode updated successfully' });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PATCH /v1/series/:id/episodes/:epId - Partial update episode
router.patch('/:id/episodes/:epId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: seriesId, epId } = req.params;
    const db = await getDatabaseProvider();

    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    const ep = episodes.find(e => e.id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }

    const updatedEpisode = await db.updateEpisode(ep.id, req.body);
    ok(res, { episode: updatedEpisode, message: 'Episode updated successfully' });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/series/:id/episodes/:epId/script - Get or auto-generate full screenplay for episode
router.get('/:id/episodes/:epId/script', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: seriesId, epId } = req.params;
    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(seriesId as string);
    if (!series) {
      fail(res, 404, 'Series not found'); return;
    }

    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    const ep = episodes.find(e => e.id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found'); return;
    }

    if (Array.isArray(ep.scenes) && ep.scenes.length > 0) {
      ok(res, {
        episode: `EP ${String(ep.episode_number).padStart(2, '0')}`,
        episodeNumber: ep.episode_number,
        title: ep.title,
        synopsis: ep.synopsis,
        scenes: ep.scenes,
      });
      return;
    }

    // Auto-generate scene screenplay on demand
    const scriptRes = await scriptAgent.execute({
      seriesId: seriesId as string,
      episodeNumber: ep.episode_number,
      title: ep.title,
      genre: series.genre,
      tone: series.tone,
      synopsis: ep.synopsis,
      sceneCore: ep.scene_core,
      conflictEscalation: ep.conflict_escalation,
      cliffhangerHook: ep.cliffhanger_hook,
      characters: series.characters || series.master_plan?.characters,
      storyCore: series.master_plan?.storyCore,
      country: series.country,
      ratio: series.ratio,
      targetDurationSeconds: Number(ep.duration) || Number(series.master_plan?.totalDurationSeconds) || 90,
    });

    if (scriptRes?.scenes) {
      await db.updateEpisode(ep.id, {
        scenes: scriptRes.scenes,
        script: JSON.stringify(scriptRes),
      });
      ok(res, scriptRes);
    } else {
      fail(res, 500, 'Failed to generate script');
    }
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/series/:id/episodes/:epId/generate-script - Force re-generate screenplay for episode
router.post('/:id/episodes/:epId/generate-script', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: seriesId, epId } = req.params;
    const db = await getDatabaseProvider();
    const series = await db.getSeriesById(seriesId as string);
    if (!series) {
      fail(res, 404, 'Series not found'); return;
    }

    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    const ep = episodes.find(e => e.id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found'); return;
    }

    // Generate screenplay via ScriptAgent
    const scriptRes = await scriptAgent.execute({
      seriesId: seriesId as string,
      episodeNumber: ep.episode_number,
      title: req.body.title || ep.title,
      genre: series.genre,
      tone: series.tone,
      synopsis: req.body.synopsis || ep.synopsis,
      sceneCore: req.body.sceneCore || ep.scene_core,
      conflictEscalation: req.body.conflictEscalation || ep.conflict_escalation,
      cliffhangerHook: req.body.cliffhangerHook || ep.cliffhanger_hook,
      characters: series.characters || series.master_plan?.characters,
      storyCore: series.master_plan?.storyCore,
      country: series.country,
      ratio: series.ratio,
      targetDurationSeconds: Number(req.body.targetDurationSeconds) || Number(ep.duration) || Number(series.master_plan?.totalDurationSeconds) || 90,
    });

    if (scriptRes?.scenes) {
      await db.updateEpisode(ep.id, {
        scenes: scriptRes.scenes,
        script: JSON.stringify(scriptRes),
      });
      ok(res, scriptRes);
    } else {
      fail(res, 500, 'Failed to generate script');
    }
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/series/:id/episodes - Add episode to series
router.post('/:id/episodes', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.id as string;
    const { title, synopsis } = req.body;

    const db = await getDatabaseProvider();
    const existingEps = await db.getEpisodesBySeriesId(seriesId);
    const nextEpNumber = existingEps.length + 1;
    const epId = `ep_${nanoid(10)}`;

    const targetDuration = req.body.duration || existingEps[0]?.duration || 90;

    const episode = await db.createEpisode({
      id: epId,
      series_id: seriesId,
      episode_number: nextEpNumber,
      title: title || `Episode ${nextEpNumber}`,
      synopsis: synopsis || '',
      duration: targetDuration,
      status: 'DRAFT',
    });

    ok(res, { episode }, 'Episode created successfully', 201);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

export const episodesRouter = Router();

// GET /v1/episodes/:episodeId
episodesRouter.get('/:episodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const db = await getDatabaseProvider();
    const ep = await db.getEpisodeById(episodeId);
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }
    ok(res, { episode: ep });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PUT /v1/episodes/:episodeId
episodesRouter.put('/:episodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const db = await getDatabaseProvider();
    const ep = await db.getEpisodeById(episodeId);
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }
    const updated = await db.updateEpisode(episodeId, req.body);
    ok(res, { episode: updated, message: 'Episode updated successfully' });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PATCH /v1/episodes/:episodeId
episodesRouter.patch('/:episodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const db = await getDatabaseProvider();
    const ep = await db.getEpisodeById(episodeId);
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }
    const updated = await db.updateEpisode(episodeId, req.body);
    ok(res, { episode: updated, message: 'Episode updated successfully' });
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/episodes/:episodeId/timeline
episodesRouter.get('/:episodeId/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    if (!episodeId || episodeId.trim() === '') {
      fail(res, 400, 'Episode ID is required');
      return;
    }

    const db = await getDatabaseProvider();
    const ep = await db.getEpisodeById(episodeId);
    let rawScenes = ep?.scenes || [];
    if (typeof rawScenes === 'string') {
      try { rawScenes = JSON.parse(rawScenes); } catch { rawScenes = []; }
    }
    if (!rawScenes || rawScenes.length === 0) {
      if (ep?.script) {
        try {
          const parsedScript = typeof ep.script === 'string' ? JSON.parse(ep.script) : ep.script;
          if (Array.isArray(parsedScript.scenes)) {
            rawScenes = parsedScript.scenes;
          }
        } catch {}
      }
    }

    // Default scenes placeholder if none yet generated
    if (!rawScenes || rawScenes.length === 0) {
      rawScenes = [
        { index: 1, heading: 'SCENE 1: OPENING HOOK', action: 'Dramatic visual hook & character encounter', durationSeconds: 6, dialogue: [{ character: 'Lead', line: 'The truth begins now.' }] },
        { index: 2, heading: 'SCENE 2: CONFLICT ESCALATION', action: 'Tension rises with shocking revelation', durationSeconds: 8, dialogue: [{ character: 'Rival', line: 'You have no idea what you just started.' }] },
        { index: 3, heading: 'SCENE 3: CLIFFHANGER', action: 'Dramatic cliffhanger hook cuts to black', durationSeconds: 6, dialogue: [{ character: 'Lead', line: 'Watch me.' }] },
      ];
    }

    // 2. Build multi-track 9:16 vertical micro-drama timeline
    let currentUs = 0;
    const videoClipIds: string[] = [];
      const bgmClipIds: string[] = [];
      const multiLangVoiceTrackClipIds: Record<string, string[]> = {};
      const multiLangCaptionTrackClipIds: Record<string, string[]> = {};
      const langTrackMeta: Record<string, any> = {};
      const clips: Record<string, any> = {};

      const SILENT_AUDIO_SAMPLE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      const SAMPLE_IMAGE_BG = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1080&h=1920&fit=crop';

      const targetEpDurSec = Number(ep?.duration) || 90;
      const targetEpDurUs = targetEpDurSec * 1_000_000;
      const sceneCount = rawScenes.length;
      const rawTotalDurationSec = rawScenes.reduce((acc: number, s: any) => acc + (Number(s.durationSeconds) || 0), 0);

      rawScenes.forEach((scene: any, idx: number) => {
        let durationUs: number;
        if (idx === sceneCount - 1) {
          durationUs = Math.max(1_000_000, targetEpDurUs - currentUs);
        } else if (rawTotalDurationSec > 0) {
          const proportion = (Number(scene.durationSeconds) || (targetEpDurSec / sceneCount)) / rawTotalDurationSec;
          durationUs = Math.round(targetEpDurUs * proportion);
        } else {
          durationUs = Math.round(targetEpDurUs / sceneCount);
        }

        const fromUs = currentUs;
        const toUs = currentUs + durationUs;

        // Visual Scene Clip (Image for storyboard frame, Video if real video rendered)
        const vClipId = `clip_v_${episodeId}_s${idx + 1}`;
        videoClipIds.push(vClipId);
        const hasVideo = !!scene.videoUrl;
        clips[vClipId] = {
          id: vClipId,
          type: hasVideo ? 'Video' : 'Image',
          name: scene.heading || `Scene ${idx + 1}`,
          src: scene.videoUrl || scene.storyboardFrameUrl || SAMPLE_IMAGE_BG,
          display: { from: fromUs, to: toUs },
          trim: { from: 0, to: durationUs },
          duration: durationUs,
          label: scene.heading || `Scene ${idx + 1}`,
          width: 1080,
          height: 1920,
          left: 0,
          top: 0,
          transform: {
            x: 0,
            y: 0,
            width: 1080,
            height: 1920,
          },
          visualPrompt: scene.visualPrompt || scene.action,
          cameraMovement: scene.cameraMovement || 'slow push-in',
          lightingMood: scene.lightingMood || 'cinematic rim light',
        };

        // Voiceover Dialogue Clip
        // if (Array.isArray(scene.dialogue) && scene.dialogue.length > 0) {
        //   const firstLine = scene.dialogue[0];
        //   const aClipId = `clip_a_voice_${episodeId}_s${idx + 1}`;
        //   voiceClipIds.push(aClipId);
        //   clips[aClipId] = {
        //     id: aClipId,
        //     type: 'Audio',
        //     name: `${firstLine.character || 'Voice'}: ${firstLine.line || ''}`,
        //     src: scene.voiceoverUrl || SILENT_AUDIO_SAMPLE,
        //     display: { from: fromUs, to: toUs },
        //     duration: durationUs,
        //     volume: 1,
        //     label: `${firstLine.character || 'Voice'}: "${firstLine.line || ''}"`,
        //     speechTone: firstLine.speechTone || firstLine.emotion || 'dramatic',
        //   };

        //   // Caption Subtitle Clip
        //   const cClipId = `clip_cap_${episodeId}_s${idx + 1}`;
        //   captionClipIds.push(cClipId);
        //   clips[cClipId] = {
        //     id: cClipId,
        //     type: 'Caption',
        //     name: `Sub ${idx + 1}`,
        //     text: `${firstLine.character ? `${firstLine.character}: ` : ''}${firstLine.line}`,
        //     display: { from: fromUs + 200_000, to: Math.max(fromUs + 200_000, toUs - 200_000) },
        //     duration: durationUs - 400_000,
        //     style: {
        //       fontSize: 42,
        //       color: '#FFFFFF',
        //       verticalPos: 80,
        //     },
        //   };
        // }

        // Scene Background Music (BGM) Clip
        const bgmClipId = `clip_bgm_${episodeId}_s${idx + 1}`;
        bgmClipIds.push(bgmClipId);
        clips[bgmClipId] = {
          id: bgmClipId,
          type: 'Audio',
          name: `BGM: ${scene.bgmMood || scene.heading || `Scene ${idx + 1}`}`,
          src: scene.bgmUrl || SILENT_AUDIO_SAMPLE,
          display: { from: fromUs, to: toUs },
          duration: durationUs,
          volume: 0.35,
          label: `BGM (${scene.bgmMood || 'Cinematic Suspense'})`,
        };

        // Multi-Language Tracks Generator (Voiceover Audio + Captions per language)
        const languageTracksList = Array.isArray(ep?.languageTracks) && ep.languageTracks.length > 0
          ? ep.languageTracks
          : [
              {
                languageCode: ep?.activeLanguageCode || 'en-US',
                languageName: 'English',
                voiceId: 'Puck',
                sceneVoiceovers: {},
                sceneCaptions: {},
              }
            ];

        languageTracksList.forEach((lTrack: any) => {
          const langCode = lTrack.languageCode || 'vi-VN';
          const safeLang = langCode.replace(/[^a-zA-Z0-9_-]/g, '_');
          const voiceTrackId = `track_voiceover_${safeLang}`;
          const capTrackId = `track_caption_${safeLang}`;

          if (!multiLangVoiceTrackClipIds[voiceTrackId]) {
            multiLangVoiceTrackClipIds[voiceTrackId] = [];
            langTrackMeta[voiceTrackId] = {
              id: voiceTrackId,
              name: `🎙 Voiceover (${langCode})`,
              type: 'Audio',
              languageCode: langCode,
              muted: langCode !== (ep?.activeLanguageCode || languageTracksList[0].languageCode),
            };
          }
          if (!multiLangCaptionTrackClipIds[capTrackId]) {
            multiLangCaptionTrackClipIds[capTrackId] = [];
            langTrackMeta[capTrackId] = {
              id: capTrackId,
              name: `💬 Subtitles (${langCode})`,
              type: 'Caption',
              languageCode: langCode,
              visible: langCode === (ep?.activeLanguageCode || languageTracksList[0].languageCode),
            };
          }

          // Voiceover Clip for this language
          const voiceSrc = lTrack.sceneVoiceovers?.[scene.index] || (langCode === 'vi-VN' ? scene.voiceoverUrl : '') || SILENT_AUDIO_SAMPLE;
          const aClipId = `clip_a_voice_${safeLang}_${episodeId}_s${idx + 1}`;
          multiLangVoiceTrackClipIds[voiceTrackId].push(aClipId);
          clips[aClipId] = {
            id: aClipId,
            type: 'Audio',
            name: `${scene.dialogue?.[0]?.character || 'Voice'} (${langCode}): ${scene.dialogue?.[0]?.line || ''}`,
            src: voiceSrc,
            display: { from: fromUs, to: toUs },
            duration: durationUs,
            volume: 1,
            languageCode: langCode,
            label: `${scene.dialogue?.[0]?.character || 'Voice'} (${langCode})`,
          };

          // Caption Clip for this language
          const capData = lTrack.sceneCaptions?.[scene.index] || [];
          const captionText = capData.length > 0
            ? capData.map((c: any) => c.text).join(' ')
            : (scene.dialogue?.[0]?.line || '');
          const cClipId = `clip_cap_${safeLang}_${episodeId}_s${idx + 1}`;
          multiLangCaptionTrackClipIds[capTrackId].push(cClipId);
          clips[cClipId] = {
            id: cClipId,
            type: 'Caption',
            name: `Sub (${langCode}) ${idx + 1}`,
            text: captionText,
            display: { from: fromUs + 200_000, to: Math.max(fromUs + 200_000, toUs - 200_000) },
            duration: durationUs - 400_000,
            languageCode: langCode,
            style: {
              fontSize: 42,
              color: '#FFFFFF',
              verticalPos: 80,
            },
          };
        });

        currentUs += durationUs;
      });

      const totalDurUs = targetEpDurUs;

      // Construct tracks array: Video Track + BGM Track + [Voiceover + Caption per Language]
      const dynamicTracks: any[] = [
        { id: 'track_video_main', name: 'Scene Video (9:16)', type: 'Video', clipIds: videoClipIds },
        { id: 'track_bgm_main', name: 'Background Music (BGM)', type: 'Audio', clipIds: bgmClipIds },
      ];

      // Add each language's voiceover and caption track
      Object.keys(langTrackMeta).forEach((trackId) => {
        const meta = langTrackMeta[trackId];
        const clipIds = meta.type === 'Audio'
          ? (multiLangVoiceTrackClipIds[trackId] || [])
          : (multiLangCaptionTrackClipIds[trackId] || []);

        dynamicTracks.push({
          id: meta.id,
          name: meta.name,
          type: meta.type,
          languageCode: meta.languageCode,
          muted: meta.muted || false,
          visible: meta.visible !== undefined ? meta.visible : true,
          clipIds,
        });
      });

      const timeline = {
        settings: {
          width: 1080,
          height: 1920,
          fps: 30,
          duration: totalDurUs,
          backgroundColor: '#0a0a0a',
          format: 'mp4',
          videoCodec: 'avc1.640033',
          bitrate: 12000000,
          audio: true,
          audioCodec: 'opus',
          audioSampleRate: 48000,
          prioritizeSpeed: true,
        },
        tracks: dynamicTracks,
        clips,
      };

    ok(res, timeline);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PUT /v1/episodes/:episodeId/timeline
episodesRouter.put('/:episodeId/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const { settings, tracks, clips, changeSummary, author } = req.body;

    const timelineData = {
      settings: settings || { width: 1080, height: 1920, fps: 30 },
      tracks: tracks || [],
      clips: clips || {},
    };

    const authorObj = author || { id: 'usr_default', name: 'Editor Alpha' };
    const db = await getDatabaseProvider();
    const result = await db.saveTimeline(episodeId, timelineData, authorObj, changeSummary || 'Manual timeline edit');

    ok(res, {
      success: true,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      updatedAt: result.updatedAt,
    }, 'Timeline saved successfully');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/episodes/:episodeId/timeline/history
episodesRouter.get('/:episodeId/timeline/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const db = await getDatabaseProvider();
    const historyData = await db.getTimelineHistory(episodeId, limit, offset);
    ok(res, historyData);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/episodes/:episodeId/timeline/history/:versionId (Zero-Render Preview)
episodesRouter.get('/:episodeId/timeline/history/:versionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const versionId = req.params.versionId as string;

    const db = await getDatabaseProvider();
    const versionData = await db.getTimelineVersion(episodeId, versionId);

    if (!versionData) {
      fail(res, 404, 'Version snapshot not found');
      return;
    }

    ok(res, versionData, 'Historical snapshot loaded for zero-render preview');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/episodes/:episodeId/timeline/restore
episodesRouter.post('/:episodeId/timeline/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const { versionId, reason, author } = req.body;

    if (!versionId) {
      fail(res, 400, 'versionId is required for restore');
      return;
    }

    const authorObj = author || { id: 'usr_default', name: 'Editor Alpha' };
    const db = await getDatabaseProvider();
    const restoreResult = await db.restoreTimelineVersion(episodeId, versionId, authorObj, reason || 'Restored version');

    ok(res, restoreResult, 'Timeline version successfully restored');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

export default router;

