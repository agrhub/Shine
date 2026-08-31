import { nanoid } from 'nanoid';
import { getDatabaseProvider } from '@/database/index.js';
import { Logger } from '@/utils/logger.js';
import type { PipelineJobEntity, PipelineJobStepProgress, PipelineJobLog, AssetJobItem } from '@/types.js';
import { CharacterToolExecutors } from '@/agents/chatbot/tools/character.tools.js';
import { AssetToolExecutors } from '@/agents/chatbot/tools/asset.tools.js';
import { VideoToolExecutors } from '@/agents/chatbot/tools/video.tools.js';
import { AudioToolExecutors } from '@/agents/chatbot/tools/audio.tools.js';
import { CaptionToolExecutors } from '@/agents/chatbot/tools/caption.tools.js';
import { RenderToolExecutors } from '@/agents/chatbot/tools/render.tools.js';
import { PatchSyncService } from '@/realtime/PatchSyncService.js';
import { ChatbotAgent } from '@/agents/ChatbotAgent.js';

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
    const jobTitle = title || (
      type === 'render'
        ? `Render Master Video: ${series?.title || 'Series'} (EP #${episode?.episode_number || 1})`
        : `Production Pipeline: ${series?.title || 'Series'} (EP #${episode?.episode_number || 1})`
    );

    let initialStepProgress: Record<string, PipelineJobStepProgress> = {};
    if (type === 'render') {
      initialStepProgress = {
        render: { status: 'pending', progress: 0, message: 'Final Video Compositor & Export', assets: [] },
      };
    } else {
      initialStepProgress = {
        b1: { status: 'pending', progress: 0, message: 'Cast Avatars & Wardrobe Lookbooks', assets: [] },
        b2: { status: 'pending', progress: 0, message: 'Locations, Props & Storyboard Frames', assets: [] },
        b3: { status: 'pending', progress: 0, message: 'AI Scene Video Clips', assets: [] },
        b4: { status: 'pending', progress: 0, message: 'Voiceover & Dubbing', assets: [] },
        b5: { status: 'pending', progress: 0, message: 'Word-by-Word Subtitles', assets: [] },
        b6: { status: 'pending', progress: 0, message: 'Final Video Compositor', assets: [] },
      };
    }

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

    // Broadcast job creation to connected clients
    PatchSyncService.broadcast(series_id, 'pipeline_job:updated', newJob);

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
      outputPatch?: Record<string, any>,
      assets?: AssetJobItem[]
    ) => {
      const current = await db.getPipelineJobById(job_id);
      if (!current) return;

      const stepProgress = current.step_progress || {};
      stepProgress[stepKey] = {
        ...(stepProgress[stepKey] || {}),
        status,
        progress,
        message: currentStepDesc,
        ...(assets ? { assets } : {}),
        ...(status === 'running' && !stepProgress[stepKey]?.started_at ? { started_at: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      };

      const outputs = {
        ...(current.outputs || {}),
        ...(outputPatch || {}),
      };

      const updated = await db.updatePipelineJob(job_id, {
        progress: overallProgress,
        current_step: currentStepDesc,
        step_progress: stepProgress,
        outputs,
      });

      if (updated) {
        PatchSyncService.broadcast(series_id, 'pipeline_job:updated', updated);
      }
    };

    try {
      await addLog('info', `Starting automated pipeline execution for Job ${job_id}...`);

      // ─── STANDALONE RENDER JOB ──────────────────────────────────────────────
      if (type === 'render') {
        if (!this.activeRuns.get(job_id)) return;
        await updateStep('render', 'running', 20, 30, 'Exporting & Rendering Video...');
        await addLog('info', 'Executing Render Step');

        const renderRes = await RenderToolExecutors.renderEpisodeVideo({
          userId: user_id,
          seriesId: series_id,
          episodeId: episode_id,
          forceRegenerate: force_regenerate,
        });

        if (!renderRes.success) {
          throw new Error(`Render Failed: ${renderRes.message}`);
        }

        const epAfter = await db.getEpisodeById(episode_id);
        const finalUrl = renderRes.data?.video_url || (epAfter as any)?.video_url;
        const renderAssets: AssetJobItem[] = [
          {
            id: `render_${job_id}`,
            name: `Episode #${epAfter?.episode_number || 1} Final Video`,
            type: 'render',
            status: 'completed',
            url: finalUrl,
            created_at: new Date().toISOString(),
          },
        ];

        await updateStep('render', 'completed', 100, 100, 'Master Video Rendered', { final_video: renderRes.data }, renderAssets);
        await addLog('info', 'Render completed successfully.');
      }

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

        // Collect AssetJobItems for B1
        const seriesAfterB1 = await db.getSeriesById(series_id);
        const b1Assets: AssetJobItem[] = [];
        (seriesAfterB1?.characters || []).forEach((c: any) => {
          if (c.imageUrl || c.avatar) {
            b1Assets.push({
              id: c.id,
              name: `Portrait: ${c.name}`,
              type: 'character',
              status: 'completed',
              url: c.imageUrl || c.avatar,
              thumbnail: c.imageUrl || c.avatar,
            });
          }
          (c.wardrobe_variants || []).forEach((w: any) => {
            if (w.imageUrl) {
              b1Assets.push({
                id: `${c.id}_${w.variant_id}`,
                name: `Wardrobe: ${c.name} (${w.name})`,
                type: 'wardrobe',
                status: 'completed',
                url: w.imageUrl,
                thumbnail: w.imageUrl,
              });
            }
          });
        });

        await updateStep('b1', 'completed', 100, 20, 'Step B1 completed: Cast & Wardrobes ready', {
          characters: charRes.data,
          wardrobes: wardrobeRes.data,
        }, b1Assets);
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

        // Collect AssetJobItems for B2
        const seriesAfterB2 = await db.getSeriesById(series_id);
        const epAfterB2 = await db.getEpisodeById(episode_id);
        const b2Assets: AssetJobItem[] = [];

        (seriesAfterB2?.locations || []).forEach((l: any) => {
          if (l.imageUrl) {
            b2Assets.push({
              id: l.id,
              name: `Location: ${l.name}`,
              type: 'location',
              status: 'completed',
              url: l.imageUrl,
              thumbnail: l.imageUrl,
            });
          }
        });

        (seriesAfterB2?.props || []).forEach((p: any) => {
          if (p.imageUrl) {
            b2Assets.push({
              id: p.id,
              name: `Prop: ${p.name}`,
              type: 'prop',
              status: 'completed',
              url: p.imageUrl,
              thumbnail: p.imageUrl,
            });
          }
        });

        (epAfterB2?.scenes || []).forEach((s: any) => {
          const startImg = s.storyboard_frame_url || s.storyboardFrameUrl || s.image_url || s.imageUrl;
          if (startImg) {
            b2Assets.push({
              id: `sb_${episode_id}_s${s.index}`,
              name: `Scene #${s.index} Storyboard (Start)`,
              type: 'storyboard',
              status: 'completed',
              url: startImg,
              thumbnail: startImg,
              scene_index: s.index,
            });
          }
          const endImg = s.storyboard_end_frame_url || s.storyboardEndFrameUrl;
          if (endImg) {
            b2Assets.push({
              id: `sb_end_${episode_id}_s${s.index}`,
              name: `Scene #${s.index} Storyboard (End)`,
              type: 'storyboard',
              status: 'completed',
              url: endImg,
              thumbnail: endImg,
              scene_index: s.index,
            });
          }
        });

        await updateStep('b2', 'completed', 100, 45, 'Step B2 completed: Storyboards and Assets ready', {
          locations: locRes.data,
          props: propRes.data,
          storyboards: sbRes.data,
        }, b2Assets);
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

        const epAfterB3 = await db.getEpisodeById(episode_id);
        const b3Assets: AssetJobItem[] = [];
        (epAfterB3?.scenes || []).forEach((s: any) => {
          if (s.videoUrl) {
            b3Assets.push({
              id: `vid_${episode_id}_s${s.index}`,
              name: `Scene #${s.index} Video Clip`,
              type: 'video',
              status: 'completed',
              url: s.videoUrl,
              thumbnail: s.storyboardFrameUrl || s.imageUrl,
              scene_index: s.index,
            });
          }
        });

        await updateStep('b3', 'completed', 100, 70, 'Step B3 completed: AI Video clips ready', {
          videos: vidRes.data,
        }, b3Assets);
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

        const epAfterB4 = await db.getEpisodeById(episode_id);
        const b4Assets: AssetJobItem[] = [];
        (epAfterB4?.scenes || []).forEach((s: any) => {
          if (s.audioUrl) {
            b4Assets.push({
              id: `voice_${episode_id}_s${s.index}`,
              name: `Scene #${s.index} Voiceover`,
              type: 'voice',
              status: 'completed',
              url: s.audioUrl,
              scene_index: s.index,
            });
          }
        });

        await updateStep('b4', 'completed', 100, 82, 'Step B4 completed: Voiceovers ready', {
          voiceovers: audioRes.data,
        }, b4Assets);
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

        const epAfterB5 = await db.getEpisodeById(episode_id);
        const b5Assets: AssetJobItem[] = [];
        (epAfterB5?.scenes || []).forEach((s: any) => {
          if (s.dialogue?.length > 0) {
            b5Assets.push({
              id: `sub_${episode_id}_s${s.index}`,
              name: `Scene #${s.index} Subtitle`,
              type: 'subtitle',
              status: 'completed',
              scene_index: s.index,
            });
          }
        });

        await updateStep('b5', 'completed', 100, 92, 'Step B5 completed: Subtitles synchronized', {
          captions: capRes.data,
        }, b5Assets);
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

        const epAfterB6 = await db.getEpisodeById(episode_id);
        const finalUrl = renderRes.data?.video_url || (epAfterB6 as any)?.video_url;
        const b6Assets: AssetJobItem[] = [
          {
            id: `render_${job_id}`,
            name: `Episode #${epAfterB6?.episode_number || 1} Final Video`,
            type: 'render',
            status: 'completed',
            url: finalUrl,
            created_at: new Date().toISOString(),
          },
        ];

        await updateStep('b6', 'completed', 100, 100, 'Step B6 completed: Master video exported', {
          final_video: renderRes.data,
        }, b6Assets);
        await addLog('info', 'Step B6 completed successfully.');
      }

      // ─── JOB COMPLETE ───────────────────────────────────────────────────────
      const finalJob = await db.getPipelineJobById(job_id);
      if (finalJob) {
        const completedJob = await db.updatePipelineJob(job_id, {
          status: 'completed',
          progress: 100,
          current_step: 'All pipeline tasks completed successfully!',
          completed_at: new Date().toISOString(),
        });
        await addLog('info', '🎉 Pipeline job finished successfully with 100% completion.');

        // 1. Broadcast job completion to client
        if (completedJob) {
          PatchSyncService.broadcast(series_id, 'pipeline_job:completed', completedJob);
        }

        // 2. Fetch latest episode state and broadcast to client
        const latestEpisode = await db.getEpisodeById(episode_id);
        if (latestEpisode) {
          PatchSyncService.broadcast(series_id, 'episode:updated', latestEpisode);
        }

        // 3. Option C: Proactively inject assistant completion summary into Chatbot session
        const epTitle = latestEpisode?.title || `Episode #${latestEpisode?.episode_number || 1}`;
        const finalVideoUrl = (latestEpisode as any)?.video_url || finalJob.outputs?.final_video?.video_url;

        let summaryMsg = `🎉 **Automated production completed for ${epTitle}!**\n\n`;
        if (type === 'render') {
          summaryMsg += `Master video has been successfully rendered and published.\n`;
        } else {
          summaryMsg += `All production assets (Character portraits, Storyboard, AI Video Clips, Voiceovers, Subtitles, Master Video) are ready.\n`;
        }
        if (finalVideoUrl) {
          summaryMsg += `\n🎬 **Rendered Video**: [Watch Video](${finalVideoUrl})\n`;
        }

        ChatbotAgent.injectSystemNotification(
          user_id,
          series_id,
          episode_id,
          summaryMsg,
          [
            { label: '🎬 Open Timeline', prompt: 'Open timeline editor for this episode' },
            { label: '📤 Publish Episode', prompt: 'Publish and export this episode video' },
          ]
        );
      }
    } catch (err: any) {
      Logger.error(`[PipelineJobService] Pipeline Job ${job_id} failed: ${err.message}`);
      await addLog('error', `Error: ${err.message}`);
      const failedJob = await db.updatePipelineJob(job_id, {
        status: 'failed',
        error: err.message,
        current_step: `Failed: ${err.message}`,
      });
      if (failedJob) {
        PatchSyncService.broadcast(series_id, 'pipeline_job:updated', failedJob);
      }
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

    const stepProgress = job.step_progress || {};
    for (const [key, step] of Object.entries(stepProgress)) {
      if (step.status === 'running' || step.status === 'pending') {
        stepProgress[key] = {
          ...step,
          status: 'cancelled' as any,
          message: step.status === 'running' ? 'Cancelled during execution' : 'Skipped / Cancelled',
        };
      }
    }

    const logs = job.logs || [];
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Job was cancelled by user.',
    });

    const updated = await db.updatePipelineJob(job_id, {
      status: 'cancelled',
      current_step: 'Job cancelled by user',
      step_progress: stepProgress,
      logs,
      completed_at: new Date().toISOString(),
    });
    if (updated) {
      PatchSyncService.broadcast(job.series_id, 'pipeline_job:updated', updated);
    }
    return true;
  }
}

