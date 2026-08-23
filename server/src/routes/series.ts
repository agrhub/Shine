import { Router, Request, Response } from 'express';
import { getDatabaseProvider, UserEntity } from '../database/index.js';
import { scriptAgent } from '../agents/ScriptAgent.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';
import { Logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';
import { getAuthUser, getUserId } from '~/utils/auth.js';

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
      visualStyle,
      visualStylePrompt,
      targetAudience,
      episodeCount,
      userId,
      masterPlan,
      description,
      synopsis,
      country,
      language,
      ratio,
      characters,
    } = req.body;

    if (!title || !genre) {
      fail(res, 400, 'Title and genre are required'); return;
    }

    const seriesId = req.body.id || `srs_${nanoid(10)}`;
    if (masterPlan) {
      masterPlan.seriesId = seriesId;
    }
    const uId = userId || 'usr_default';
    const rawEpCount = Number(episodeCount) || Number(masterPlan?.totalEpisodes) || 20;

    const db = await getDatabaseProvider();
    const newSeries = await db.createSeries({
      id: seriesId,
      user_id: uId,
      title,
      genre,
      synopsis: synopsis || masterPlan?.storyCore?.coreAttraction || description || '',
      description: description || masterPlan?.storyCore?.coreAttraction || '',
      visual_style: visualStyle || masterPlan?.visualStyle || 'realistic',
      visual_style_prompt: visualStylePrompt || masterPlan?.visualStylePrompt || '',
      target_audience: targetAudience || masterPlan?.targetAudience || 'General',
      country: country || masterPlan?.country || 'Vietnam',
      language: language || masterPlan?.language || 'vi-VN',
      ratio: ratio || masterPlan?.ratio || '9:16',
      viral_hook: masterPlan?.viralHook || '',
      master_plan: masterPlan || null,
      characters: characters || masterPlan?.characters || [],
      locations: req.body.locations || masterPlan?.locations || [],
      props: req.body.props || masterPlan?.props || [],
      episode_count: rawEpCount,
      status: 'DRAFT',
    });

    // Populate all episodes from Master Plan (e.g. all 20, 50, 100 episodes)
    const planEpisodes: any[] = Array.isArray(masterPlan?.episodes) && masterPlan.episodes.length > 0
      ? masterPlan.episodes
      : [];

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
          episodeNumber: Number(ep1.episodeNumber) || 1,
          title: ep1.title,
          genre: newSeries.genre,
          visualStyle: newSeries.visual_style,
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
          ep1Screenplay = scriptRes.screenplay || '';
          ep1Characters = scriptRes.characters || [];
          ep1Locations = scriptRes.locations || [];
          ep1Props = scriptRes.props || [];
          ep1Duration = scriptRes.totalDurationSeconds || 90;
        }
      } catch (e: any) {
        console.warn('[SeriesRoute] Ep 1 script pre-generation error:', e.message);
      }
    }

    if (planEpisodes.length > 0) {
      for (let i = 0; i < planEpisodes.length; i++) {
        const ep = planEpisodes[i];
        const epId = ep.id || `ep_${nanoid(10)}`;
        const isEp1 = i === 0 && ep1Scenes.length > 0;
        await db.createEpisode({
          id: epId,
          series_id: seriesId,
          episode_number: Number(ep.episodeNumber) || (i + 1),
          title: ep.title || `Episode ${i + 1}`,
          synopsis: ep.synopsis || ep.sceneCore || 'Plot beat and conflict escalation.',
          screenplay: isEp1 ? ep1Screenplay : (ep.screenplay || ''),
          scene_core: ep.sceneCore || '',
          conflict_escalation: ep.conflictEscalation || '',
          cliffhanger_hook: ep.cliffhangerHook || '',
          phase: ep.phase || '',
          scenes: isEp1 ? ep1Scenes : (ep.scenes || []),
          characters: isEp1 ? ep1Characters : (ep.characters || []),
          locations: isEp1 ? ep1Locations : (ep.locations || []),
          props: isEp1 ? ep1Props : (ep.props || []),
          duration: isEp1 ? ep1Duration : 90,
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
        screenplay: ep1Screenplay || '',
        locations: newSeries.locations || [],
        props: newSeries.props || [],
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
    const { scenes, title, synopsis, languageTracks, thumbnail_url, cover_image, status } = req.body;
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
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (cover_image !== undefined) updates.cover_image = cover_image;
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
    const ep = episodes.find(e => e.id === epId || (e as any)._id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found'); return;
    }

    let screenplay = ep.screenplay || '';
    if (!screenplay && Array.isArray(ep.scenes) && ep.scenes.length > 0) {
      screenplay = `# ${(ep.title || `Episode ${ep.episode_number}`).toUpperCase()}\n\n` +
        ep.scenes.map((s: any) => {
          let block = `### ${(s.heading || `SCENE ${s.index}`).toUpperCase()}\n\n${s.action || ''}`;
          if (s.dialogue && s.dialogue.length > 0) {
            const dlgText = s.dialogue.map((d: any) => {
              const tone = d.speechTone || d.emotion ? `_(${d.speechTone || d.emotion})_\n` : '';
              return `**${(d.character || 'CHARACTER').toUpperCase()}**\n${tone}${d.line || ''}`;
            }).join('\n\n');
            block += `\n\n${dlgText}`;
          }
          return block;
        }).join('\n\n') + '\n\n##### FADE TO BLACK:';
    }

    const characters = ep.characters && ep.characters.length > 0
      ? ep.characters
      : (series.characters || series.master_plan?.characters || []);

    const locations = ep.locations && ep.locations.length > 0
      ? ep.locations
      : (series.locations || series.master_plan?.locations || []);

    const props = ep.props && ep.props.length > 0
      ? ep.props
      : (series.props || series.master_plan?.props || []);

    const hasFullScreenplay = Boolean(
      ep.screenplay &&
      Array.isArray(ep.scenes) &&
      ep.scenes.length >= 4 &&
      Array.isArray(ep.characters) &&
      ep.characters.length > 0
    );

    if (hasFullScreenplay) {
      ok(res, {
        episode: `EP ${String(ep.episode_number).padStart(2, '0')}`,
        episodeNumber: ep.episode_number,
        title: ep.title,
        synopsis: ep.synopsis,
        screenplay,
        scenes: ep.scenes,
        characters,
        locations,
        props,
      });
      return;
    }

    // Auto-generate scene screenplay on demand
    const scriptRes = await scriptAgent.execute({
      seriesId: seriesId as string,
      episodeNumber: ep.episode_number,
      title: ep.title,
      genre: series.genre,
      visualStyle: series.visual_style,
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
      const episodeCharacters = scriptRes.characters && scriptRes.characters.length > 0
        ? scriptRes.characters
        : (ep.characters && ep.characters.length > 0 ? ep.characters : (series.characters || series.master_plan?.characters || []));

      const episodeLocations = scriptRes.locations && scriptRes.locations.length > 0
        ? scriptRes.locations
        : (ep.locations && ep.locations.length > 0 ? ep.locations : (series.locations || series.master_plan?.locations || []));

      const episodeProps = scriptRes.props && scriptRes.props.length > 0
        ? scriptRes.props
        : (ep.props && ep.props.length > 0 ? ep.props : (series.props || series.master_plan?.props || []));

      await db.updateEpisode(ep.id, {
        scenes: scriptRes.scenes,
        screenplay: scriptRes.screenplay || '',
        characters: episodeCharacters,
        locations: episodeLocations,
        props: episodeProps,
        duration: scriptRes.totalDurationSeconds,
        script: JSON.stringify(scriptRes),
      });

      ok(res, {
        ...scriptRes,
        characters: episodeCharacters,
        locations: episodeLocations,
        props: episodeProps,
      });
      return;
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
    const ep = episodes.find(e => e.id === epId || (e as any)._id === epId || String(e.episode_number) === String(epId));
    if (!ep) {
      fail(res, 404, 'Episode not found'); return;
    }

    // Generate screenplay via ScriptAgent
    const scriptRes = await scriptAgent.execute({
      seriesId: seriesId as string,
      episodeNumber: ep.episode_number,
      title: req.body.title || ep.title,
      genre: series.genre,
      visualStyle: series.visual_style,
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
      const episodeCharacters = scriptRes.characters && scriptRes.characters.length > 0
        ? scriptRes.characters
        : (ep.characters && ep.characters.length > 0 ? ep.characters : (series.characters || series.master_plan?.characters || []));

      const episodeLocations = scriptRes.locations && scriptRes.locations.length > 0
        ? scriptRes.locations
        : (ep.locations && ep.locations.length > 0 ? ep.locations : (series.locations || series.master_plan?.locations || []));

      const episodeProps = scriptRes.props && scriptRes.props.length > 0
        ? scriptRes.props
        : (ep.props && ep.props.length > 0 ? ep.props : (series.props || series.master_plan?.props || []));

      await db.updateEpisode(ep.id, {
        scenes: scriptRes.scenes,
        screenplay: scriptRes.screenplay || '',
        characters: episodeCharacters,
        locations: episodeLocations,
        props: episodeProps,
        duration: scriptRes.totalDurationSeconds,
        script: JSON.stringify(scriptRes),
      });

      ok(res, {
        ...scriptRes,
        characters: episodeCharacters,
        locations: episodeLocations,
        props: episodeProps,
      });
      return;
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

import { normalizeTransitionKey } from '../constants/transitions.js';
import { normalizeEffectKey } from '../constants/effects.js';

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
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }
    
    const series = await db.getSeriesById(ep.series_id);
    if (!series) {
      fail(res, 404, 'Series not found');
      return;
    }

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

    const seriesRatio = (series?.ratio || '9:16').trim();
    let canvasWidth = 1080;
    let canvasHeight = 1920;
    if (seriesRatio === '16:9') {
      canvasWidth = 1920;
      canvasHeight = 1080;
    } else if (seriesRatio === '4:3') {
      canvasWidth = 1440;
      canvasHeight = 1080;
    } else if (seriesRatio === '1:1') {
      canvasWidth = 1080;
      canvasHeight = 1080;
    }

    // 1. Check if a saved timeline version already exists in the database
    const latest = await db.getLatestTimeline(episodeId);
    if (latest?.timelineData?.tracks && latest?.timelineData?.clips) {
      const savedTimeline = { ...latest.timelineData };
      const clips = { ...(savedTimeline.clips || {}) };

      // Synchronize any newly rendered scene assets (video, bgm, voiceover) into existing timeline clips
      rawScenes.forEach((scene: any, idx: number) => {
        const vClipId = `clip_v_${episodeId}_s${scene.index || (idx + 1)}`;
        if (clips[vClipId]) {
          if (scene.videoUrl) {
            clips[vClipId].src = scene.videoUrl;
            clips[vClipId].type = 'Video';
            clips[vClipId].volume = (scene.dialogue && scene.dialogue.length > 0) ? 0 : 1;
          } else if (scene.storyboardFrameUrl && clips[vClipId].type === 'Image') {
            clips[vClipId].src = scene.storyboardFrameUrl;
          }
        }
      });

      savedTimeline.clips = clips;
      return ok(res, savedTimeline);
    }

    // 2. Build initial timeline from scratch if not yet saved
    const timeline = {
      settings: {
        width: canvasWidth,
        height: canvasHeight,
        fps: 30,
        backgroundColor: '#111111',
        format: 'mp4',
        videoCodec: 'avc1.640033',
        bitrate: 12000000,
        audio: true,
        audioCodec: 'opus',
        audioSampleRate: 48000,
        prioritizeSpeed: true,
        duration: 3_000_000
      },
      tracks: [] as any[],
      clips: {} as Record<string, any>,
    };

    if (!rawScenes || rawScenes.length === 0) {
      return ok(res, timeline);
    }

    let currentUs = 0;
    const videoClipIds: string[] = [];
    const effectClipIds: string[] = [];
    const bgmClipIds: string[] = [];
    const voiceClipIds: string[] = [];
    const captionClipIds: string[] = [];
    const clips: Record<string, any> = {};

    const SAMPLE_IMAGE_BG = `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=${canvasWidth}&h=${canvasHeight}&fit=crop`;

    rawScenes.forEach((scene: any, idx: number) => {
      const sceneDurSec = Math.max(2, Number(scene.durationSeconds) || 6);
      const durationUs = Math.round(sceneDurSec * 1_000_000);

      const fromUs = currentUs;
      const toUs = currentUs + durationUs;
      currentUs += durationUs;

      // Visual Scene Clip (Image for storyboard frame, Video if real video rendered)
      const vClipId = `clip_v_${episodeId}_s${scene.index || (idx + 1)}`;
      videoClipIds.push(vClipId);
      const hasVideo = !!scene.videoUrl;
      const hasDialogue = scene.dialogue?.length > 0;
      clips[vClipId] = {
        id: vClipId,
        type: 'Video',
        src: scene.videoUrl || scene.imageUrl,
        name: scene.heading || `Scene ${scene.index || (idx + 1)}`,
        timing: {
          display: { from: fromUs, to: toUs },
          trim: { from: 0, to: durationUs },
          duration: durationUs,
          playbackRate: 1,
        },
        visible: true,
        volume: hasDialogue ? 0 : 1,
        style: {},
        locked: false,
        effects: [],
        animations: [],
        transform: {
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          angle: 0,
          opacity: 1,
          zIndex: 10,
          flip: {
            x: false,
            y: false,
          },
        },
      };

      // If Video Effect is specified for this scene
      const effectKey = normalizeEffectKey(scene.videoEffect);
      if (effectKey) {
        // Attach directly to video clip according to OpenVideo core spec
        clips[vClipId].effects = [
          {
            id: `eff_${vClipId}`,
            key: effectKey,
            startTime: 0,
            duration: durationUs,
          },
        ];

        const effClipId = `clip_eff_${episodeId}_s${scene.index || (idx + 1)}`;
        effectClipIds.push(effClipId);
        clips[effClipId] = {
          id: effClipId,
          type: 'Effect',
          name: `FX: ${effectKey}`,
          effectKey: effectKey,
          timing: {
            display: { from: fromUs, to: toUs },
            trim: { from: 0, to: durationUs },
            duration: durationUs,
            playbackRate: 1,
          },
          visible: true,
          style: {},
          locked: false,
          effects: [],
          animations: [],
        };
      }

      // If BGM already exists for this scene
      if (scene.bgmUrl) {
        const bgmClipId = `clip_bgm_${episodeId}_s${scene.index || (idx + 1)}`;
        bgmClipIds.push(bgmClipId);
        clips[bgmClipId] = {
          id: bgmClipId,
          type: 'Audio',
          name: `BGM Scene ${scene.index || (idx + 1)}`,
          src: scene.bgmUrl,
          timing: {
            display: { from: fromUs, to: toUs },
            trim: { from: 0, to: durationUs },
            duration: durationUs,
            playbackRate: 1,
          },
          visible: true,
          volume: 0.8,
          style: {},
          locked: false,
          effects: [],
          animations: [],
        };
      }

      // Compute exact voiceover and dialogue duration (never stretch to full video duration)
      let voiceStartUs = 0;
      let voiceDurUs = 0;

      const rawCues = (Array.isArray(scene.captionsData) && scene.captionsData.length > 0)
        ? scene.captionsData
        : (Array.isArray(scene.dialogue) && scene.dialogue.length > 0 ? scene.dialogue : []);

      if (scene.voiceDurationUs && scene.voiceDurationUs > 0) {
        voiceDurUs = scene.voiceDurationUs;
        voiceStartUs = scene.voiceStartUs !== undefined ? scene.voiceStartUs : 200_000;
      } else if (rawCues.length > 0) {
        const firstCue = rawCues[0];
        const lastCue = rawCues[rawCues.length - 1];
        const start = firstCue?.fromUs !== undefined && firstCue.fromUs > 100_000
          ? Number(firstCue.fromUs)
          : (firstCue?.startMs !== undefined ? Number(firstCue.startMs) * 1000 : 200_000);
        const end = lastCue?.toUs !== undefined && lastCue.toUs > 100_000
          ? Number(lastCue.toUs)
          : (lastCue?.endMs !== undefined
            ? Number(lastCue.endMs) * 1000
            : (start + (Number(lastCue?.durationUs) || (Number(lastCue?.durationMs) * 1000) || 2_500_000)));
        voiceStartUs = Math.max(0, start);
        voiceDurUs = Math.min(durationUs - voiceStartUs, Math.max(200_000, end - voiceStartUs));
      } else if (scene.voiceoverUrl) {
        voiceStartUs = 200_000;
        voiceDurUs = Math.min(durationUs - voiceStartUs, 3_000_000);
      }

      // If Voiceover already exists for this scene
      if (scene.voiceoverUrl && voiceDurUs > 0) {
        const aClipId = `clip_a_voice_${episodeId}_s${scene.index || (idx + 1)}`;
        voiceClipIds.push(aClipId);

        clips[aClipId] = {
          id: aClipId,
          type: 'Audio',
          name: `${scene.dialogue?.[0]?.character || 'Voice'}: ${scene.dialogue?.[0]?.line || ''}`,
          src: scene.voiceoverUrl,
          timing: {
            display: { from: fromUs + voiceStartUs, to: fromUs + voiceStartUs + voiceDurUs },
            trim: { from: 0, to: voiceDurUs },
            duration: voiceDurUs,
            playbackRate: 1,
          },
          visible: true,
          volume: 1,
          style: {},
          locked: false,
          effects: [],
          animations: [],
        };
      }

      // If Captions or Dialogue exist for this scene
      if (rawCues.length > 0 && voiceDurUs > 0) {
        const getCaptionTop = (align: string, height: number): number => {
          if (align === 'top') return 80;
          if (align === 'center') return Math.round((canvasHeight - height) / 2);
          return canvasHeight - 450;
        };

        const verticalAlign = (scene.captionStyle?.verticalAlign || 'bottom') as string;
        const captionWidth = Math.round(canvasWidth * 0.88);
        const captionHeight = 100;
        const left = Math.round((canvasWidth - captionWidth) / 2);
        const top = getCaptionTop(verticalAlign, captionHeight);

        const totalChars = rawCues.reduce((sum: number, c: any) => sum + (c.text?.length || c.line?.length || 1), 0) || 1;
        let runningOffsetUs = voiceStartUs;

        rawCues.forEach((cue: any, cIdx: number) => {
          const cClipId = `clip_cap_${episodeId}_s${scene.index || (idx + 1)}_${cIdx + 1}`;
          captionClipIds.push(cClipId);
          const cueText = cue.text || cue.line || '';

          // If only 1 cue, span full voice duration; otherwise proportion based on text length
          const cueFromOffsetUs = cue.fromUs !== undefined
            ? Number(cue.fromUs)
            : (cue.startMs !== undefined ? Number(cue.startMs) * 1000 : runningOffsetUs);
          const cueFromUs = fromUs + cueFromOffsetUs;

          const cueDurUs = cue.durationUs !== undefined
            ? Number(cue.durationUs)
            : (cue.durationMs !== undefined
              ? Number(cue.durationMs) * 1000
              : (cue.toUs !== undefined && cue.fromUs !== undefined
                ? (Number(cue.toUs) - Number(cue.fromUs))
                : (cue.endMs !== undefined && cue.startMs !== undefined
                  ? (Number(cue.endMs) - Number(cue.startMs)) * 1000
                  : 1_000_000)));

          const cueToUs = Math.min(toUs, cueFromUs + cueDurUs);
          runningOffsetUs = (cue.toUs !== undefined ? Number(cue.toUs) : (cueFromOffsetUs + cueDurUs)) + 30_000;
          const cueDurationUs = cueToUs - cueFromUs;
          clips[cClipId] = {
            id: cClipId,
            type: 'Caption',
            name: 'Caption',
            text: cueText,
            mediaId: vClipId,
            metadata: {
              sourceClipId: vClipId,
            },
            timing: {
              display: { from: cueFromUs, to: cueToUs },
              trim: { from: 0, to: cueDurationUs },
              duration: cueDurationUs,
              playbackRate: 1,
            },
            visible: true,
            caption: {
              words: Array.isArray(cue.words) && cue.words.length > 0
                ? cue.words.map((w: any, wIdx: number) => {
                    const divisor = (w.from > 10000 || w.to > 10000) ? 1000 : 1;
                    const isKeyWord = (wIdx === 0 || wIdx === cue.words.length - 1);//w.isKeyWord 
                    return {
                      text: w.text || w.word || '',
                      from: Math.round((w.from || 0) / divisor),
                      to: Math.round((w.to || ((w.from || 0) + 300 * divisor)) / divisor),
                      isKeyWord: isKeyWord
                    };
                  })
                : [{ text: cueText, from: 0, to: Math.round(cueDurUs / 1000), isKeyWord: true }],
            },
            style: {
              color: "#FFFFFF",
              align: 'center',
              verticalAlign,
            },
            locked: false,
            effects: [],
            animations: [],
            wordsPerLine: '',
            transform: {
              x: left,
              y: top,
              width: captionWidth,
              height: captionHeight,
              angle: 0,
              opacity: 1,
              zIndex: 10,
              flip: {
                x: false,
                y: false,
              },
            },
          };
        });
      }
    });

    // Add Transitions between adjacent video clips if transitionEffect is specified
    for (let i = 1; i < videoClipIds.length; i++) {
      const prevClipId = videoClipIds[i - 1];
      const currClipId = videoClipIds[i];
      const rawTrans = rawScenes[i]?.transitionEffect || rawScenes[i - 1]?.transitionEffect;
      const transKey = normalizeTransitionKey(rawTrans);
      if (transKey) {
        const transClipId = `clip_trans_${episodeId}_s${i}`;
        clips[transClipId] = {
          id: transClipId,
          type: 'Transition',
          name: `Transition: ${transKey}`,
          transitionKey: transKey,
          duration: 1_000_000,
          fromClipId: prevClipId,
          toClipId: currClipId,
        };
      }
    }

    const totalDurUs = Math.max(currentUs, 10_000_000);

    const dynamicTracks: any[] = [];

    // 1. Caption Track (Topmost layer, multi-language supported)
    if (captionClipIds.length > 0) {
      const captionConfig = {
        captions: {
          style: {
            fontSize: 80,
            fontFamily: 'Inter',
            fontWeight: '700',
            fontStyle: 'normal',
            color: '#ffffff',
            align: 'center',
            fontUrl: 'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
            stroke: {
              color: '#000000',
              width: 4,
            },
            shadow: {
              color: '#000000',
              alpha: 0.5,
              blur: 4,
              offsetX: 2,
              offsetY: 2,
            },
          },
          colors: {
            active: {
              color: '#ffffff',
              background: '#FF5700',
            },
            future: {
              color: '#ffffff',
            },
            keyword: {
              color: '#ffffff',
              preserveAfterSpoken: true,
            },
          },
          positioning: {
            videoWidth: canvasWidth,
            videoHeight: canvasHeight,
          },
          wordsPerLine: 'multiple',
        },
      };

      dynamicTracks.push({
        id: 'track_captions_main',
        name: 'Captions',
        type: 'caption',
        clipIds: captionClipIds,
        accepts: ['caption'],
        config: captionConfig,
      });
    }

    // 2. Video Effects Track (Above video)
    if (effectClipIds.length > 0) {
      dynamicTracks.push({
        id: 'track_effects',
        name: 'Effects',
        type: 'effect',
        clipIds: effectClipIds,
        accepts: ['effect'],
      });
    }

    // 3. Video Track (Main visual content)
    dynamicTracks.push({
      id: 'track_video',
      name: `Video`,
      type: 'video',
      clipIds: videoClipIds,
      accepts: ['video', 'image'],
    });

    // 4. Voiceover Audio Track (Multi-language supported)
    if (voiceClipIds.length > 0) {
      dynamicTracks.push({
        id: 'track_voiceover_main',
        name: 'Voiceover',
        type: 'audio',
        clipIds: voiceClipIds,
        accepts: ['audio'],
      });
    }

    // 5. BGM Ambient Audio Track (Bottom layer)
    if (bgmClipIds.length > 0) {
      dynamicTracks.push({
        id: 'track_bgm',
        name: 'BGM',
        type: 'audio',
        clipIds: bgmClipIds,
        accepts: ['audio'],
      });
    }

    timeline.settings.duration = totalDurUs;
    timeline.tracks = dynamicTracks;
    timeline.clips = clips;

    // Automatically persist initial timeline
    try {
      await db.saveTimeline(episodeId, timeline, { id: 'system', name: 'Studio System' }, 'Initial Timeline Creation');
    } catch (saveErr) {
      Logger.warn(`[seriesRouter.getTimeline] Auto-save initial timeline notice: ${(saveErr as any)?.message}`);
    }

    ok(res, timeline);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// PUT /v1/episodes/:episodeId/timeline
episodesRouter.put('/:episodeId/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const user = getAuthUser(req) as any;
    if (!user) {
      fail(res, 401, 'Unauthorized');
      return;
    }
    const { settings, tracks, clips, changeSummary, clientTimestamp, baseVersionNumber } = req.body;
    const db = await getDatabaseProvider();
    const ep = await db.getEpisodeById(episodeId);
    if (!ep) {
      fail(res, 404, 'Episode not found');
      return;
    }
    const series = ep.series_id ? await db.getSeriesById(ep.series_id) : null;
    const seriesRatio = (series?.ratio || '9:16').trim();
    let canvasWidth = 1080;
    let canvasHeight = 1920;
    if (seriesRatio === '16:9') {
      canvasWidth = 1920;
      canvasHeight = 1080;
    } else if (seriesRatio === '4:3') {
      canvasWidth = 1440;
      canvasHeight = 1080;
    } else if (seriesRatio === '1:1') {
      canvasWidth = 1080;
      canvasHeight = 1080;
    }

    // 1. Concurrency Timestamp Check: Ensure client is not overwriting a newer version
    const historyRes = await db.getTimelineHistory(episodeId, 1, 0);
    const latestVersion = historyRes.history?.[0];
    const latestTimeline = await db.getLatestTimeline(episodeId);

    if (latestVersion && clientTimestamp) {
      const serverTime = new Date(latestVersion.createdAt).getTime();
      const clientTime = new Date(clientTimestamp).getTime();
      if (!isNaN(serverTime) && !isNaN(clientTime) && clientTime < serverTime) {
        fail(res, 409, `Timeline version conflict: Your edit is based on an older version (${clientTimestamp}). Current server version was updated at ${latestVersion.createdAt}.`);
        return;
      }
    }

    const timelineData = {
      settings: settings || { width: canvasWidth, height: canvasHeight, fps: 30 },
      tracks: tracks || [],
      clips: clips || {},
    };

    // 2. Change Detection (Diffing)
    const diffDetails: string[] = [];
    if (latestTimeline) {
      const oldTracks = latestTimeline.tracks || [];
      const newTracks = tracks || [];
      const oldClips = latestTimeline.clips || {};
      const newClips = clips || {};

      if (newTracks.length !== oldTracks.length) {
        diffDetails.push(`${newTracks.length} tracks (was ${oldTracks.length})`);
      }
      const oldClipKeys = Object.keys(oldClips);
      const newClipKeys = Object.keys(newClips);
      const addedClips = newClipKeys.filter(k => !oldClips[k]);
      const removedClips = oldClipKeys.filter(k => !newClips[k]);
      const modifiedClips = newClipKeys.filter(k => oldClips[k] && JSON.stringify(oldClips[k]) !== JSON.stringify(newClips[k]));

      if (addedClips.length > 0) diffDetails.push(`+${addedClips.length} clips`);
      if (removedClips.length > 0) diffDetails.push(`-${removedClips.length} clips`);
      if (modifiedClips.length > 0) diffDetails.push(`updated ${modifiedClips.length} clips`);

      // If data is identical, return current version without duplicating history
      if (diffDetails.length === 0 && JSON.stringify(latestTimeline.settings) === JSON.stringify(timelineData.settings)) {
        ok(res, {
          success: true,
          versionId: latestVersion?.versionId || 'ver_current',
          versionNumber: latestVersion?.versionNumber || 1,
          updatedAt: latestVersion?.createdAt || new Date().toISOString(),
          noChanges: true,
        }, 'Timeline data is already up to date');
        return;
      }
    }

    const effectiveSummary = changeSummary || (diffDetails.length > 0 ? diffDetails.join(', ') : 'Timeline update');
    const userObject = {
      id: user.id || 'usr_default',
      name: user.name || 'Studio Editor',
      avatar: user.avatar,
    };

    // 3. Save new Timeline version & snapshot history
    const result = await db.saveTimeline(episodeId, timelineData, userObject, effectiveSummary);

    ok(res, {
      success: true,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      updatedAt: result.updatedAt,
      changeSummary: effectiveSummary,
      diff: diffDetails,
    }, 'Timeline saved successfully');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// GET /v1/episodes/:episodeId/timeline/history
episodesRouter.get('/:episodeId/timeline/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = req.params.episodeId as string;
    const userId = getUserId(req);
    if (!userId) {
      fail(res, 401, 'Unauthorized');
      return;
    }
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
    const userId = getUserId(req);
    if (!userId) {
      fail(res, 401, 'Unauthorized');
      return;
    }

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
    const userId = getUserId(req);
    if (!userId) {
      fail(res, 401, 'Unauthorized');
      return;
    }

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
