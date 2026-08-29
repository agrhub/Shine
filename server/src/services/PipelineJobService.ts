import { nanoid } from 'nanoid';
import { getDatabaseProvider } from '@/database/index.js';
import { Logger } from '@/utils/logger.js';
import type { PipelineJobEntity, PipelineJobStepProgress, PipelineJobLog } from '@/types.js';
import { CharacterToolExecutors } from '@/agents/chatbot/tools/character.tools.js';
import { AssetToolExecutors } from '@/agents/chatbot/tools/asset.tools.js';
import { VideoToolExecutors } from '@/agents/chatbot/tools/video.tools.js';
import { AudioToolExecutors } from '@/agents/chatbot/tools/audio.tools.js';
import { CaptionToolExecutors } from '@/agents/chatbot/tools/caption.tools.js';
import { RenderToolExecutors } from '@/agents/chatbot/tools/render.tools.js';

export class PipelineJobService {
  private static activeRuns: Map<string, boolean> = new Map();

  /**
   * Start a new background pipeline job or return the existing running job for this episode
   */
  public static async startOrGetPipelineJob(params: {
    user_id: string;
    series_id: string;
    episode_id: string;
    type?: string;
    force_regenerate?: boolean;
    session_id?: string;
    title?: string;
  }): Promise<{ job: PipelineJobEntity; is_new: boolean }> {
    const { user_id, series_id, episode_id, type = 'full_pipeline', force_regenerate, session_id, title } = params;
    const db = await getDatabaseProvider();

    // 1. Check if there is already an active running job for this episode
    const active = await db.findActivePipelineJob(series_id, episode_id, type);
    if (active) {
      Logger.info(`[PipelineJobService] Active job ${active.id} already exists for Series ${series_id} / Episode ${episode_id}. Returning existing job.`);
      return { job: active, is_new: false };
    }

    const series = await db.getSeriesById(series_id);
    const episode = await db.getEpisodeById(episode_id);
    const jobTitle = title || `Production Pipeline: ${series?.title || 'Series'} (EP #${episode?.episode_number || 1})`;

    const initialStepProgress: Record<string, PipelineJobStepProgress> = {
      b1: { status: 'pending', progress: 0, message: 'Cast Avatars & Wardrobe Lookbooks' },
      b2: { status: 'pending', progress: 0, message: 'Locations, Props & Storyboard Frames' },
      b3: { status: 'pending', progress: 0, message: 'AI Scene Video Clips' },
      b4: { status: 'pending', progress: 0, message: 'Voiceover & Dubbing' },
      b5: { status: 'pending', progress: 0, message: 'Word-by-Word Subtitles' },
      b6: { status: 'pending', progress: 0, message: 'Final Video Compositor' },
    };

    const newJob: PipelineJobEntity = {
      id: `job_${nanoid(12)}`,
      user_id,
      series_id,
      episode_id,
      session_id,
      type,
      title: jobTitle,
      status: 'running',
      progress: 5,
      current_step: 'Initializing pipeline...',
      step_progress: initialStepProgress,
      outputs: {},
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Job created. Target: ${jobTitle}`,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.savePipelineJob(newJob);

    // Launch execution asynchronously (non-blocking)
    this.activeRuns.set(newJob.id, true);
    setImmediate(() => {
      this.runPipelineExecution(newJob.id, params).catch((err) => {
        Logger.error(`[PipelineJobService] Uncaught error in job ${newJob.id}: ${err.message}`);
      });
    });

    return { job: newJob, is_new: true };
  }

  /**
   * Asynchronous background execution of pipeline steps
   */
  private static async runPipelineExecution(
    job_id: string,
    params: {
      user_id: string;
      series_id: string;
      episode_id: string;
      type?: string;
      force_regenerate?: boolean;
    }
  ): Promise<void> {
    const { user_id, series_id, episode_id, type = 'full_pipeline', force_regenerate } = params;
    const db = await getDatabaseProvider();

    const addLog = async (level: 'info' | 'warn' | 'error', message: string) => {
      const current = await db.getPipelineJobById(job_id);
      if (!current) return;
      const logs = current.logs || [];
      logs.push({ timestamp: new Date().toISOString(), level, message });
      await db.updatePipelineJob(job_id, { logs });
    };

    const updateStep = async (
      stepKey: string,
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
      progress: number,
      overallProgress: number,
      currentStepDesc: string,
      outputPatch?: Record<string, any>
    ) => {
      const current = await db.getPipelineJobById(job_id);
      if (!current) return;

      const stepProgress = current.step_progress || {};
      stepProgress[stepKey] = {
        ...(stepProgress[stepKey] || {}),
        status,
        progress,
        message: currentStepDesc,
        ...(status === 'running' && !stepProgress[stepKey]?.started_at ? { started_at: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      };

      const outputs = {
        ...(current.outputs || {}),
        ...(outputPatch || {}),
      };

      await db.updatePipelineJob(job_id, {
        progress: overallProgress,
        current_step: currentStepDesc,
        step_progress: stepProgress,
        outputs,
      });
    };

    try {
      await addLog('info', `Starting automated pipeline execution for Job ${job_id}...`);

      // ─── STEP B1: CAST PORTRAITS & WARDROBE LOOKBOOKS ───────────────────────
      if (type === 'full_pipeline' || type === 'step_b1') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b1', 'running', 10, 10, 'Step B1: Generating Cast Portraits & 2-in-1 Wardrobes...');
        await addLog('info', 'Executing Step B1: Cast Portraits & Wardrobes');

        const charRes = await CharacterToolExecutors.generateCharacterAsset({ userId: user_id, seriesId: series_id, forceRegenerate: force_regenerate });
        const wardrobeRes = await CharacterToolExecutors.generateWardrobeVariants({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });

        if (!charRes.success && !wardrobeRes.success) {
          throw new Error(`Step B1 Failed: ${charRes.message || wardrobeRes.message}`);
        }

        await updateStep('b1', 'completed', 100, 20, 'Step B1 completed: Cast & Wardrobes ready', {
          characters: charRes.data,
          wardrobes: wardrobeRes.data,
        });
        await addLog('info', 'Step B1 completed successfully.');
      }

      // ─── STEP B2: ASSETS & SCENE STORYBOARDS ───────────────────────────────
      if (type === 'full_pipeline' || type === 'step_b2') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b2', 'running', 20, 30, 'Step B2: Generating Location Sheets & Storyboard Keyframes...');
        await addLog('info', 'Executing Step B2: Assets & Storyboards');

        const locRes = await AssetToolExecutors.generateLocationAsset({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        const propRes = await AssetToolExecutors.generatePropAsset({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        const sbRes = await AssetToolExecutors.generatePipelineEpisodeStoryboard({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });

        if (!sbRes.success) {
          throw new Error(`Step B2 Failed: ${sbRes.message}`);
        }

        await updateStep('b2', 'completed', 100, 45, 'Step B2 completed: Storyboards and Assets ready', {
          locations: locRes.data,
          props: propRes.data,
          storyboards: sbRes.data,
        });
        await addLog('info', 'Step B2 completed successfully.');
      }

      // ─── STEP B3: AI SCENE VIDEO CLIPS ─────────────────────────────────────
      if (type === 'full_pipeline' || type === 'step_b3') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b3', 'running', 40, 55, 'Step B3: Synthesizing AI Video Clips from Storyboards...');
        await addLog('info', 'Executing Step B3: AI Video Clips');

        const vidRes = await VideoToolExecutors.generateSceneVideo({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        if (!vidRes.success) {
          throw new Error(`Step B3 Failed: ${vidRes.message}`);
        }

        await updateStep('b3', 'completed', 100, 70, 'Step B3 completed: AI Video clips ready', {
          videos: vidRes.data,
        });
        await addLog('info', 'Step B3 completed successfully.');
      }

      // ─── STEP B4: VOICEOVER TTS & DUBBING ──────────────────────────────────
      if (type === 'full_pipeline' || type === 'step_b4') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b4', 'running', 60, 75, 'Step B4: Synthesizing Voiceovers and Dialogue TTS...');
        await addLog('info', 'Executing Step B4: Voiceover & TTS');

        const audioRes = await AudioToolExecutors.generateSceneVoiceover({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        if (!audioRes.success) {
          throw new Error(`Step B4 Failed: ${audioRes.message}`);
        }

        await updateStep('b4', 'completed', 100, 82, 'Step B4 completed: Voiceovers ready', {
          voiceovers: audioRes.data,
        });
        await addLog('info', 'Step B4 completed successfully.');
      }

      // ─── STEP B5: SUBTITLES & WORD-BY-WORD ALIGNMENT ───────────────────────
      if (type === 'full_pipeline' || type === 'step_b5') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b5', 'running', 75, 88, 'Step B5: Building Word-Level Kinetic Subtitles...');
        await addLog('info', 'Executing Step B5: Word-by-Word Subtitles');

        const capRes = await CaptionToolExecutors.generateSceneCaption({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        if (!capRes.success) {
          throw new Error(`Step B5 Failed: ${capRes.message}`);
        }

        await updateStep('b5', 'completed', 100, 92, 'Step B5 completed: Subtitles synchronized', {
          captions: capRes.data,
        });
        await addLog('info', 'Step B5 completed successfully.');
      }

      // ─── STEP B6: COMPOSITOR VIDEO RENDER / EXPORT ─────────────────────────
      if (type === 'full_pipeline' || type === 'step_b6') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('b6', 'running', 90, 95, 'Step B6: Compositing Final High-Definition Master Video...');
        await addLog('info', 'Executing Step B6: Final Video Compositor');

        const renderRes = await RenderToolExecutors.renderEpisodeVideo({ userId: user_id, seriesId: series_id, episodeId: episode_id, forceRegenerate: force_regenerate });
        if (!renderRes.success) {
          throw new Error(`Step B6 Failed: ${renderRes.message}`);
        }

        await updateStep('b6', 'completed', 100, 100, 'Step B6 completed: Master video exported', {
          final_video: renderRes.data,
        });
        await addLog('info', 'Step B6 completed successfully.');
      }

      // ─── JOB COMPLETE ───────────────────────────────────────────────────────
      const finalJob = await db.getPipelineJobById(job_id);
      if (finalJob) {
        await db.updatePipelineJob(job_id, {
          status: 'completed',
          progress: 100,
          current_step: 'All pipeline tasks completed successfully!',
          completed_at: new Date().toISOString(),
        });
        await addLog('info', '🎉 Pipeline job finished successfully with 100% completion.');
      }
    } catch (err: any) {
      Logger.error(`[PipelineJobService] Pipeline Job ${job_id} failed: ${err.message}`);
      await addLog('error', `Error: ${err.message}`);
      await db.updatePipelineJob(job_id, {
        status: 'failed',
        error: err.message,
        current_step: `Failed: ${err.message}`,
      });
    } finally {
      this.activeRuns.delete(job_id);
    }
  }

  /**
   * Cancel a currently running pipeline job
   */
  public static async cancelJob(job_id: string): Promise<boolean> {
    this.activeRuns.delete(job_id);
    const db = await getDatabaseProvider();
    const job = await db.getPipelineJobById(job_id);
    if (!job) return false;
    await db.updatePipelineJob(job_id, {
      status: 'cancelled',
      current_step: 'Job cancelled by user',
      completed_at: new Date().toISOString(),
    });
    return true;
  }
}
