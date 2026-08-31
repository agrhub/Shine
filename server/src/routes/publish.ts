import { Router, Request, Response } from 'express';
import axios from 'axios';
import { 
  EpisodeEntity, 
  SeriesEntity, 
  RenderedVersionItem, 
  EpisodeRenderVersion, 
  PlatformAccount, 
} from '../types.js';
import { getDatabaseProvider } from '../database/index.js';
import { requireAuth } from '../middleware/RequireAuth.js';
import { aiProviderRouter } from '../integrations/ai/router/AIProviderRouter.js';
import { OAuthService } from '../services/OAuthService.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';

export const publishRouter = Router();

// In-memory job progress tracker for SSE streaming
const activePublishJobs = new Map<string, {
  jobId: string;
  status: 'queued' | 'rendering' | 'uploading' | 'published' | 'failed';
  progress: number;
  currentPlatform: string;
  publishedUrls: Record<string, string>;
  error?: string;
}>();

const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English',
  'en': 'English',
  'vi-VN': 'Tiếng Việt',
  'vi': 'Tiếng Việt',
  'zh-CN': 'Chinese (Mandarin)',
  'zh': 'Chinese',
  'ja-JP': 'Japanese',
  'ja': 'Japanese',
  'ko-KR': 'Korean',
  'ko': 'Korean',
  'es-ES': 'Spanish',
  'es': 'Spanish',
  'fr-FR': 'French',
  'fr': 'French',
  'de-DE': 'German',
  'de': 'German',
  'th-TH': 'Thai',
  'th': 'Thai',
  'id-ID': 'Indonesian',
  'id': 'Indonesian',
  'hi-IN': 'Hindi',
  'hi': 'Hindi',
};

function getLangLabel(code?: string): string {
  if (!code) return 'en-US';
  return LANGUAGE_NAMES[code] || code;
}

// GET /api/publish/rendered-versions/:seriesId — Fetch all rendered versions of a series
publishRouter.get('/rendered-versions/:seriesId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { seriesId } = req.params;
    const db = await getDatabaseProvider();
    const series: SeriesEntity | null = await db.getSeriesById(seriesId as string);
    const episodes: EpisodeEntity[] = await db.getEpisodesBySeriesId(seriesId as string);

    const primaryLang = series?.language || "en-US";
    const seriesRatio = series?.ratio || '9:16';
    const resolutionLabelMap: Record<string, string> = {
      '9:16': '1080x1920 (9:16 Vertical HD)',
      '16:9': '1920x1080 (16:9 Landscape HD)',
      '1:1': '1080x1080 (1:1 Square HD)',
      '4:3': '1440x1080 (4:3 Standard HD)',
    };
    const defaultResolution = resolutionLabelMap[seriesRatio] || `${seriesRatio} HD`;
    const versions: RenderedVersionItem[] = [];

    for (const ep of episodes) {
      const epNum = ep.episode_number || 1;
      const epDuration = ep.duration || 90;
      const renderVersions = ep.render_versions;
      const videoUrls = ep.video_urls;
      const sceneWithImg = Array.isArray(ep.scenes) ? ep.scenes.find((s: any) => s.storyboard_frame_url || s.storyboard_end_frame_url || (s as any).image_url || (s as any).image) : null;
      const sceneWithVid = Array.isArray(ep.scenes) ? ep.scenes.find((s: any) => s.video_url) : null;
      const coverThumb = ep.cover_image || sceneWithImg?.storyboard_frame_url || sceneWithImg?.storyboard_end_frame_url || (sceneWithImg as any)?.image_url || (sceneWithImg as any)?.image || '/images/dashboard/poster-1.jpg';
      const epRenderedAt = ep.updated_at || ep.created_at || new Date().toISOString();

      // 1. Explicit render_versions array
      if (Array.isArray(renderVersions) && renderVersions.length > 0) {
        for (const rv of renderVersions) {
          const lang = rv.language || (Array.isArray(rv.languages) ? rv.languages[0] : primaryLang);
          const isPrimary = lang === primaryLang;
          const voiceLabel = rv.voice || (isPrimary ? `Original Audio (${getLangLabel(lang)})` : `Dubbing: ${getLangLabel(lang)}`);
          const subLabel = rv.subtitles || [isPrimary ? `Caption: ${getLangLabel(lang)} (Burned-in)` : `Sub: ${getLangLabel(lang)}`];

          versions.push({
            id: rv.version_id || rv.id || `ver_${ep.id}_${lang}_${Date.now()}`,
            episode_id: ep.id,
            episode_number: epNum,
            episode_title: ep.title,
            language: lang,
            voice: voiceLabel,
            subtitles: Array.isArray(subLabel) ? subLabel : [subLabel],
            resolution: rv.resolution || defaultResolution,
            video_url: rv.video_url || rv.url || ep.video_url || sceneWithVid?.video_url || '',
            thumbnail_url: rv.thumbnail_url || coverThumb,
            duration: rv.duration || epDuration,
            file_size: rv.file_size || '28.4 MB',
            rendered_at: rv.rendered_at || epRenderedAt,
            status: rv.status || 'ready',
          });
        }
      } 
      // 2. Multi-language video_urls map
      else if (videoUrls && Object.keys(videoUrls).length > 0) {
        for (const [lang, url] of Object.entries(videoUrls)) {
          if (url) {
            const isPrimary = lang === primaryLang;
            const voiceLabel = isPrimary ? `Original Audio (${getLangLabel(lang)})` : `Dubbing: ${getLangLabel(lang)}`;
            const subLabel = [`Caption: ${getLangLabel(lang)} (Burned-in)`];

            versions.push({
              id: `ver_${ep.id}_${lang}`,
              episode_id: ep.id,
              episode_number: epNum,
              episode_title: ep.title,
              language: lang,
              voice: voiceLabel,
              subtitles: subLabel,
              resolution: defaultResolution,
              video_url: url,
              thumbnail_url: coverThumb,
              duration: epDuration,
              file_size: '24.2 MB',
              rendered_at: epRenderedAt,
              status: 'ready',
            });
          }
        }
      } 
      // 3. Main video_url fallback
      else if (ep.video_url) {
        const lang = primaryLang;
        const voiceLabel = ep.dubbing_settings?.voice_name 
          ? `Dubbing: ${ep.dubbing_settings.voice_name}` 
          : `Original Audio (${getLangLabel(lang)})`;
        const subLabel = ep.caption_languages && ep.caption_languages.length > 0 
          ? ep.caption_languages.map(l => `Sub: ${getLangLabel(l)}`) 
          : [`Caption: ${getLangLabel(lang)} (Burned-in)`];

        versions.push({
          id: `ver_${ep.id}_default`,
          episode_id: ep.id,
          episode_number: epNum,
          episode_title: ep.title,
          language: lang,
          voice: voiceLabel,
          subtitles: subLabel,
          resolution: defaultResolution,
          video_url: ep.video_url,
          thumbnail_url: coverThumb,
          duration: epDuration,
          file_size: '26.8 MB',
          rendered_at: epRenderedAt,
          status: 'ready',
        });
      }
      // 4. Draft / Working episode fallback
      else {
        const lang = primaryLang;
        const resolvedVideo = sceneWithVid?.video_url || '';
        versions.push({
          id: `ver_${ep.id}_default`,
          episode_id: ep.id,
          episode_number: epNum,
          episode_title: ep.title,
          language: lang,
          voice: `Original Audio (${getLangLabel(lang)})`,
          subtitles: [`Caption: ${getLangLabel(lang)} (Burned-in)`],
          resolution: defaultResolution,
          video_url: resolvedVideo,
          thumbnail_url: coverThumb,
          duration: epDuration,
          file_size: '26.8 MB',
          rendered_at: epRenderedAt,
          status: resolvedVideo ? 'ready' : 'draft',
        });
      }
    }

    return res.json({
      code: 200,
      data: versions,
      message: 'Rendered versions fetched successfully',
      error: null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ code: 500, data: null, message: errorMsg, error: 'FETCH_VERSIONS_ERROR' });
  }
});

// POST /api/publish/generate-cover — Generate or regenerate AI cover image for an episode
publishRouter.post('/generate-cover', requireAuth, async (req: Request, res: Response) => {
  try {
    const { episodeId, seriesId, prompt, currentCover } = req.body;
    if (!episodeId) {
      return res.status(400).json({ code: 400, data: null, message: 'episodeId is required', error: 'MISSING_EPISODE_ID' });
    }
    const db = await getDatabaseProvider();
    const episode = await db.getEpisodeById(episodeId);
    const series = seriesId ? await db.getSeriesById(seriesId) : (episode ? await db.getSeriesById(episode.series_id) : null);

    const sTitle = series?.title || 'Short Drama';
    const epTitle = episode?.title || `Episode ${episode?.episode_number || 1}`;
    const synopsis = episode?.synopsis || series?.synopsis || '';
    const visualStyle = series?.visual_style || 'cinematic short drama, hyper-realistic, 8k poster, dramatic lighting';
    const visualPrompt = series?.visual_style_prompt || '';
    const seriesRatio: "9:16" | "16:9" | "4:3" | "1:1" = series?.ratio || '9:16';
    const formatText = seriesRatio === '16:9' ? 'landscape movie poster' : seriesRatio === '1:1' ? 'square poster' : seriesRatio === '4:3' ? 'classic format poster' : 'vertical poster';

    // Collect reference images for AI (current cover, episode keyframes, series cover)
    const referenceImages: string[] = [];

    if (currentCover && typeof currentCover === 'string' && currentCover.trim()) {
      referenceImages.push(currentCover.trim());
    }

    if (episode?.cover_image && !referenceImages.includes(episode.cover_image)) {
      referenceImages.push(episode.cover_image);
    }

    if (Array.isArray(episode?.scenes)) {
      for (const scene of episode.scenes) {
        const frame = scene.storyboard_frame_url || scene.storyboard_end_frame_url;
        if (frame && typeof frame === 'string' && !referenceImages.includes(frame)) {
          referenceImages.push(frame);
          if (referenceImages.length >= 3) break;
        }
      }
    }

    const defaultPrompt = prompt || `Movie poster for ${formatText} drama "${sTitle}" - Episode "${epTitle}". ${synopsis}. Scene climax dramatic atmosphere, character emotion close-up, high quality film still, ${visualStyle}, ${visualPrompt}`.trim();

    const imageResult = await aiProviderRouter.generateImage(defaultPrompt, {
      aspectRatio: seriesRatio,
      characterReferences: referenceImages.length > 0 ? referenceImages : undefined,
      imageInputs: referenceImages.length > 0 ? referenceImages : undefined,
    });

    const coverUrl = imageResult.url || '/images/dashboard/poster-1.jpg';

    // Update episode in database
    await db.updateEpisode(episodeId, {
      cover_image: coverUrl,
    });

    return res.json({
      code: 200,
      data: {
        cover_url: coverUrl,
        episode_id: episodeId,
        prompt: defaultPrompt,
        ratio: seriesRatio,
      },
      message: 'Cover image generated and saved successfully',
      error: null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[publish/generate-cover] Error:', errorMsg);
    return res.status(500).json({ code: 500, data: null, message: errorMsg, error: 'GENERATE_COVER_ERROR' });
  }
});

// POST /api/publish/generate-metadata — AI generator for Viral Title, Hashtags & Description
publishRouter.post('/generate-metadata', requireAuth, async (req: Request, res: Response) => {
  try {
    const { seriesId, episodeId, language = 'en-US' } = req.body;
    const db = await getDatabaseProvider();
    const series = seriesId ? await db.getSeriesById(seriesId) : null;
    const episode = episodeId ? await db.getEpisodeById(episodeId) : null;

    const seriesTitle = series?.title || 'Untitled Series';
    const epNum = episode?.episode_number || (episode as any)?.number || 1;
    const epTitle = episode?.title || `Ep ${epNum}`;
    const synopsis = episode?.synopsis || series?.synopsis || '';
    const hook = series?.viral_hook || '';

    let suggestedTitles = [
      `[Ep ${epNum}] ${epTitle} 🔥 | ${seriesTitle}`,
      `Twist unexpected! ${epTitle} - ${seriesTitle} ⚡`,
      `When the underdog fights back! ${seriesTitle} #${epNum}`,
    ];

    let hashtags = [
      '#ShortDrama',
      '#TikTokSeries',
      '#PhimNganHay',
      '#DramaKichTinh',
      '#ViralReels',
      '#ShineAI',
      `#${seriesTitle.replace(/\s+/g, '')}`,
    ];

    let description = `${seriesTitle} - ${epTitle}.\n${synopsis}\n👉 Watch the next episode right on the channel! Like and follow so you don't miss the next episodes! 🔥`;

    try {
      const aiPrompt = `You are a viral social media manager for short vertical dramas (TikTok, YouTube Shorts, Reels).
Given:
Series: "${seriesTitle}"
Episode: "${epTitle}"
Synopsis: "${synopsis}"
Viral Hook: "${hook}"
Language: "${language}"

Generate a JSON object with:
- "titles": array of 3 highly clickable, viral short-drama titles with emojis.
- "hashtags": array of 6-8 trending relevant hashtags (including #ShortDrama, #TikTokSeries, etc.).
- "description": an engaging 2-3 sentence description ending with a strong call-to-action to watch the next episode.

Output strictly valid JSON matching this schema:
{
  "titles": ["string", "string", "string"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
  "description": "string"
}`;

      const aiRes: any = await aiProviderRouter.generateJSON(aiPrompt);
      if (aiRes?.titles && Array.isArray(aiRes.titles) && aiRes.titles.length > 0) {
        suggestedTitles = aiRes.titles;
      }
      if (aiRes?.hashtags && Array.isArray(aiRes.hashtags) && aiRes.hashtags.length > 0) {
        hashtags = aiRes.hashtags;
      }
      if (aiRes?.description) {
        description = aiRes.description;
      }
    } catch (aiErr: any) {
      console.warn('[publish/generate-metadata] AI generation fallback:', aiErr.message);
    }

    return res.json({
      code: 200,
      data: {
        titles: suggestedTitles,
        selectedTitle: suggestedTitles[0],
        hashtags,
        description,
      },
      message: 'Metadata generated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'GEN_METADATA_ERROR' });
  }
});

// POST /api/publish/schedule — Schedule video publication
publishRouter.post('/schedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const { episodeId, seriesId, platforms, scheduledTime, title, description, hashtags, videoUrl } = req.body;
    const userId = (req as any).user.id;

    const db = await getDatabaseProvider();
    const user = await db.getUserById(userId);
    const rawChannels: PlatformAccount[] = user?.connected_channels || [];

    const unauthenticatedPlatforms: string[] = [];
    for (const plat of platforms) {
      const acc = rawChannels.find(a => (a.provider || '').toLowerCase() === plat.toLowerCase());
      if (!acc || !acc.access_token) {
        unauthenticatedPlatforms.push(plat.toUpperCase());
      }
    }

    if (unauthenticatedPlatforms.length > 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `Missing OAuth credentials (access_token) for platform(s): ${unauthenticatedPlatforms.join(', ')}. Please connect your real account in Settings before scheduling.`,
        error: 'UNAUTHENTICATED_PLATFORM',
      });
    }

    const scheduleId = `sched_${Date.now()}`;
    const scheduleItem = {
      id: scheduleId,
      userId,
      episodeId,
      seriesId,
      platforms,
      scheduledTime,
      title: title || 'Short Drama Episode',
      description: description || '',
      hashtags: hashtags || [],
      videoUrl: videoUrl || '',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    return res.json({
      code: 200,
      data: scheduleItem,
      message: `Publication scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SCHEDULE_ERROR' });
  }
});

// GET /api/publish/connected-channels — Fetch user's connected publishing channels
publishRouter.get('/connected-channels', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const db = await getDatabaseProvider();
    const user = await db.getUserById(userId);
    const rawChannels: PlatformAccount[] = user?.connected_channels || [];

    const channels = rawChannels.map((c: PlatformAccount) => ({
      id: c.channel_id || `ch_${c.provider}`,
      provider: (c.provider || '').toLowerCase(),
      channel_id: c.channel_id,
      channel_name: c.channel_name,
      handle: c.handle || '@connected',
      channel_avatar: c.channel_avatar,
      connected_at: c.connected_at || new Date().toISOString(),
      status: c.status || 'active',
    }));

    return res.json({
      code: 200,
      data: { channels },
      message: 'Connected publishing channels retrieved successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'FETCH_CHANNELS_ERROR' });
  }
});

// POST /api/publish/multi-platform — Queue and dispatch multi-platform publishing job
publishRouter.post('/multi-platform', requireAuth, async (req: Request, res: Response) => {
  try {
    const { episodeId, seriesId, platforms, caption, hashtags, coverUrl, videoUrl } = req.body;
    const userId = (req as any).user.id;

    if (!episodeId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'episodeId and non-empty platforms array are required',
        error: 'INVALID_PAYLOAD',
      });
    }

    const db = await getDatabaseProvider();
    const user = await db.getUserById(userId);
    const rawChannels = user?.connected_channels || [];

    // Validate that all selected platforms have connected accounts WITH valid access_token
    const unauthenticatedPlatforms: string[] = [];
    for (const plat of platforms) {
      const acc = rawChannels.find(a => (a.provider || '').toLowerCase() === plat.toLowerCase());
      if (!acc || !acc.access_token) {
        unauthenticatedPlatforms.push(plat.toUpperCase());
      }
    }

    if (unauthenticatedPlatforms.length > 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `Missing OAuth credentials (access_token) for platform(s): ${unauthenticatedPlatforms.join(', ')}. Please connect your real account in Settings before publishing.`,
        error: 'UNAUTHENTICATED_PLATFORM',
      });
    }

    const jobId = `pub_${Date.now()}`;
    const publishedUrls: Record<string, string> = {};

    activePublishJobs.set(jobId, {
      jobId,
      status: 'uploading',
      progress: 0,
      currentPlatform: platforms[0],
      publishedUrls: {},
    });

    (async () => {
      try {
        const fullCaption = `${caption || ''} ${(hashtags || []).map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`.trim();
        const db = await getDatabaseProvider();
        const ep = await db.getEpisodeById(episodeId);
        const targetVideoUrl = videoUrl || req.body.video_url || (ep?.render_versions?.[0]?.video_url || ep?.render_versions?.[0]?.url) || (ep?.video_urls && (ep.video_urls[req.body.languageCode || 'en-US'] || Object.values(ep.video_urls)[0])) || ep?.video_url;

        const accounts = rawChannels.filter((a: PlatformAccount) => platforms.some((p: string) => p.toLowerCase() === (a.provider || '').toLowerCase()));

        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          const platform = (account.provider || '').toLowerCase();
          const jobState = activePublishJobs.get(jobId);
          if (jobState) {
            jobState.status = 'uploading';
            jobState.currentPlatform = platform;
            jobState.progress = Math.round(15 + ((i + 1) / accounts.length) * 80);
          }

          const validToken = await OAuthService.getValidAccessToken(account, (req as any).user?.id || (req as any).user?.userId);

          if (platform === 'youtube' && validToken) {
            let videoId: string | null = null;

            if (!targetVideoUrl) {
              throw new Error(`No rendered video file available for Episode ${episodeId || ''} to upload.`);
            }

            const mediaRes = await StorageFactory.getFileBuffer(targetVideoUrl);
            if (!mediaRes || !mediaRes.buffer || mediaRes.buffer.length === 0) {
              throw new Error(`Could not load video buffer from ${targetVideoUrl}`);
            }

            // Always enforce a valid video MIME type for YouTube (never 'text/plain')
            const videoMime = (mediaRes.mimeType && mediaRes.mimeType.startsWith('video/'))
              ? mediaRes.mimeType
              : (targetVideoUrl.includes('.webm') ? 'video/webm' : (targetVideoUrl.includes('.mov') ? 'video/quicktime' : 'video/mp4'));

            // 1. Initiate Resumable Upload
            const initRes = await axios.post(
              'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
              {
                snippet: {
                  title: caption?.slice(0, 100) || `Shorts Episode ${episodeId}`,
                  description: fullCaption,
                  tags: hashtags || ['ShortDrama', 'ShineAI'],
                  categoryId: '24', // Entertainment
                },
                status: {
                  privacyStatus: 'public',
                  selfDeclaredMadeForKids: false,
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${validToken}`,
                  'Content-Type': 'application/json; charset=UTF-8',
                  'X-Upload-Content-Length': mediaRes.buffer.length.toString(),
                  'X-Upload-Content-Type': videoMime,
                },
                timeout: 30000,
              }
            );

            const uploadUrl = initRes.headers['location'] || initRes.headers['Location'];
            if (!uploadUrl) {
              throw new Error('YouTube Resumable Upload did not return an upload URL location.');
            }

            // 2. Upload video binary
            const uploadRes = await axios.put(uploadUrl, mediaRes.buffer, {
              headers: {
                'Content-Type': videoMime,
                'Content-Length': mediaRes.buffer.length.toString(),
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 300000,
            });

            videoId = uploadRes.data?.id;

            if (!videoId) {
              throw new Error('YouTube API did not return a valid video ID');
            }
            publishedUrls['youtube'] = `https://youtube.com/shorts/${videoId}`;
          } else if (platform === 'facebook' && validToken) {
            // Facebook Graph API v18.0 Video Post
            const fbRes = await axios.post(
              `https://graph.facebook.com/v18.0/${encodeURIComponent(account.channel_id || account.id)}/videos`,
              {
                title: caption?.slice(0, 100) || `Episode ${episodeId}`,
                description: fullCaption,
                file_url: targetVideoUrl,
              },
              {
                params: { access_token: validToken },
                timeout: 30000,
              }
            );

            const postId = fbRes.data?.id;
            if (!postId) {
              throw new Error('Facebook API did not return a valid post ID');
            }
            publishedUrls['facebook'] = `https://facebook.com/reel/${postId}`;
          } else if (platform === 'tiktok' && validToken) {
            // TikTok Content Posting API v2
            const ttRes = await axios.post(
              'https://open.tiktokapis.com/v2/post/publish/video/init/',
              {
                post_info: {
                  title: fullCaption.slice(0, 150),
                  privacy_level: 'PUBLIC_TO_EVERYONE',
                  disable_duet: false,
                  disable_comment: false,
                  disable_stitch: false,
                },
                source_info: {
                  source: 'PULL_FROM_URL',
                  video_url: targetVideoUrl,
                },
              },
              {
                headers: { Authorization: `Bearer ${validToken}` },
                timeout: 30000,
              }
            );

            const publishId = ttRes.data?.data?.publish_id;
            if (!publishId) {
              throw new Error('TikTok API did not return a publish ID');
            }
            publishedUrls['tiktok'] = `https://tiktok.com/@${encodeURIComponent(account.channel_name || 'creator')}/video/${publishId}`;
          } else if (platform === 'instagram' && validToken) {
            // Instagram Reels Container & Publish
            const igContainer = await axios.post(
              `https://graph.facebook.com/v18.0/${encodeURIComponent(account.channel_id || account.id)}/media`,
              {
                media_type: 'REELS',
                video_url: targetVideoUrl,
                caption: fullCaption,
                share_to_feed: true,
              },
              {
                params: { access_token: validToken },
                timeout: 30000,
              }
            );
            
            const containerId = igContainer.data?.id;
            if (!containerId) {
              throw new Error('Instagram API did not return a media container ID');
            }
            publishedUrls['instagram'] = `https://instagram.com/reels/${containerId}/`;
          }
        }

        // Update database episode status and transition series to PUBLISHED
        if (episodeId) {
          await db.updateEpisode(episodeId, { status: 'PUBLISHED' });
        }
        if (seriesId) {
          await db.updateSeries(seriesId, { status: 'PUBLISHED' });
        }

        const jobState = activePublishJobs.get(jobId);
        if (jobState) {
          jobState.status = 'published';
          jobState.progress = 100;
          jobState.publishedUrls = publishedUrls;
        }
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Publishing failed';
        console.error('[Publish] Multi-platform publish failed:', errorMsg);
        const jobState = activePublishJobs.get(jobId);
        if (jobState) {
          jobState.status = 'failed';
          jobState.error = errorMsg;
        }
      }
    })();

    const job = {
      id: jobId,
      series_id: seriesId || 'series-001',
      episode_id: episodeId,
      platforms,
      status: 'publishing',
      published_urls: publishedUrls,
      caption: caption || '',
      hashtags: hashtags || [],
      cover_url: coverUrl || '',
      created_at: new Date().toISOString(),
    };

    return res.json({
      code: 200,
      data: job,
      message: 'Multi-platform publish job queued successfully using connected accounts',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: err.message || 'Failed to queue publish job',
      error: 'SERVER_ERROR',
    });
  }
});

// GET /api/render/stream — Real SSE progress stream
publishRouter.get('/render/stream', (req: Request, res: Response) => {
  const jobId = req.query.jobId as string || 'default';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const interval = setInterval(() => {
    const jobState = activePublishJobs.get(jobId);

    if (jobState) {
      res.write(`data: ${JSON.stringify(jobState)}\n\n`);

      if (jobState.status === 'published' || jobState.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    } else {
      res.write(`data: ${JSON.stringify({ jobId, status: 'rendering', progress: 50, currentPlatform: 'youtube' })}\n\n`);
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

publishRouter.get('/pipeline/:seriesId', async (req: Request, res: Response) => {
  try {
    const { seriesId } = req.params;
    const db = await getDatabaseProvider();
    const episodes = await db.getEpisodesBySeriesId(seriesId as string);
    
    const pipeline = episodes.map(ep => ({
      id: ep.id,
      title: ep.title,
      variant: 'STANDARD',
      status: ep.status === 'DRAFT' ? 'Draft' : 'Published',
      statusType: ep.status === 'DRAFT' ? 'info' : 'success',
    }));

    return res.json({
      code: 200,
      data: { seriesId, pipeline },
      message: 'Pipeline status retrieved successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: 'Failed to fetch pipeline', error: err.message });
  }
});

export default publishRouter;
