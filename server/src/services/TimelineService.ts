import { getDatabaseProvider } from '../database/index.js';
import { EpisodeEntity, SceneEntity, SeriesEntity } from '../database/IDatabaseProvider.js';
import { Logger } from '../utils/logger.js';
import { normalizeSceneEntity } from '../utils/sceneNormalizer.js';

export interface IProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
  [key: string]: any;
}

export interface ITrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
  accepts?: string[];
  static?: boolean;
  muted?: boolean;
  visible?: boolean;
  [key: string]: any;
}

export interface IProject {
  settings: IProjectSettings;
  tracks: ITrack[];
  clips: Record<string, any>;
  [key: string]: any;
}

export interface TimelineDimensions {
  width: number;
  height: number;
  fps: number;
}

export class TimelineService {
  /**
   * Helper to resolve canvas dimensions from series ratio
   */
  static getDimensionsFromRatio(ratio = '9:16', fps = 30): TimelineDimensions {
    const trimmed = (ratio || '9:16').trim();
    if (trimmed === '16:9') {
      return { width: 1920, height: 1080, fps };
    }
    if (trimmed === '4:3') {
      return { width: 1440, height: 1080, fps };
    }
    if (trimmed === '1:1') {
      return { width: 1080, height: 1080, fps };
    }
    // Default: 9:16 vertical
    return { width: 1080, height: 1920, fps };
  }

  /**
   * Extract raw scenes array safely from Episode entity
   */
  static extractScenes(episode: EpisodeEntity): SceneEntity[] {
    let rawScenes: any = episode?.scenes || [];
    if (typeof rawScenes === 'string') {
      try {
        rawScenes = JSON.parse(rawScenes);
      } catch {
        rawScenes = [];
      }
    }
    if (!rawScenes || rawScenes.length === 0) {
      if (episode?.script) {
        try {
          const parsedScript = typeof episode.script === 'string' ? JSON.parse(episode.script) : episode.script;
          if (Array.isArray(parsedScript.scenes)) {
            rawScenes = parsedScript.scenes;
          }
        } catch {}
      }
    }
    return Array.isArray(rawScenes) ? rawScenes : [];
  }

  /**
   * Build a complete, valid IProject timeline structure from an Episode and Series
   */
  static buildInitialTimelineData(episode: EpisodeEntity, series?: SeriesEntity | null): IProject {
    const episodeId = episode.id;
    const rawScenes = this.extractScenes(episode);
    const { width, height, fps } = this.getDimensionsFromRatio(series?.ratio || '9:16');

    const totalScenes = rawScenes.length;
    const targetDurationUs = (Number(episode.duration) || Math.max(90, totalScenes * 6)) * 1_000_000;
    const defaultSceneDurUs = totalScenes > 0 ? Math.round(targetDurationUs / totalScenes) : 6_000_000;

    const clips: Record<string, any> = {};
    const videoClipIds: string[] = [];
    const bgmClipIds: string[] = [];
    const effectClipIds: string[] = [];

    let currentTimelineUs = 0;

    rawScenes.forEach((scene: SceneEntity, idx: number) => {
      const scIdx = scene.index || (idx + 1);
      const sceneDurSeconds = Number(scene.duration_seconds) || 6;
      const sceneDurUs = sceneDurSeconds > 0 ? sceneDurSeconds * 1_000_000 : defaultSceneDurUs;

      const fromUs = currentTimelineUs;
      const toUs = fromUs + sceneDurUs;

      // 1. Visual Clip (Video or Storyboard Image)
      const vClipId = `clip_v_${episodeId}_s${scIdx}`;
      const srcUrl = scene.video_url || scene.storyboard_frame_url || '/images/dashboard/poster-1.jpg';
      const isVideo = !!scene.video_url;
      const hasDialogue = (scene.dialogue && scene.dialogue.length > 0);
      const volume = hasDialogue ? 0.2 : 1;

      clips[vClipId] = {
        id: vClipId,
        trackId: 'track_video',
        type: isVideo ? 'Video' : 'Image',
        name: scene.heading || `Scene #${scIdx}`,
        src: srcUrl,
        timing: {
          display: { from: fromUs, to: toUs },
          trim: { from: 0, to: sceneDurUs },
          duration: sceneDurUs,
          playbackRate: 1,
        },
        volume: volume,
        style: {},
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width,
          height,
          angle: 0,
          zIndex: 10,
          opacity: 1,
        },
      };
      videoClipIds.push(vClipId);

      // 2. Transition between visual clips
      if (scIdx > 1 && scene.transition_effect && (scene.transition_effect as string) !== 'cut' && (scene.transition_effect as string) !== 'none') {
        const transClipId = `clip_trans_${episodeId}_s${scIdx - 1}`;
        clips[transClipId] = {
          id: transClipId,
          type: 'Transition',
          name: `Transition: ${scene.transition_effect}`,
          transitionKey: scene.transition_effect,
          duration: 1_000_000,
          fromClipId: `clip_v_${episodeId}_s${scIdx - 1}`,
          toClipId: vClipId,
        };
      }

      // 3. Visual Effect Clip on track_effects
      if (scene.video_effect) {
        const effClipId = `clip_eff_${episodeId}_s${scIdx}`;
        clips[effClipId] = {
          id: effClipId,
          trackId: 'track_effects',
          type: 'Effect',
          name: `Effect: ${scene.video_effect}`,
          effectKey: scene.video_effect,
          intensity: 0.8,
          timing: {
            display: { from: fromUs, to: fromUs + 1_000_000 },
            trim: { from: 0, to: 1_000_000 },
            duration: 1_000_000,
            playbackRate: 1,
          },
          visible: true,
          style: {},
          locked: false,
        };
        effectClipIds.push(effClipId);
      }

      // 4. BGM Clip
      if (scene.bgm_url) {
        const bgmClipId = `clip_bgm_${episodeId}_s${scIdx}`;
        clips[bgmClipId] = {
          id: bgmClipId,
          trackId: 'track_bgm',
          type: 'Audio',
          name: `BGM #${scIdx}`,
          src: scene.bgm_url,
          timing: {
            display: { from: fromUs, to: toUs },
            trim: { from: 0, to: sceneDurUs },
            duration: sceneDurUs,
            playbackRate: 1,
          },
          volume: 0.35,
          style: {},
          locked: false,
          transform: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            angle: 0,
            zIndex: 0,
            opacity: 1,
          },
        };
        bgmClipIds.push(bgmClipId);
      }

      currentTimelineUs += sceneDurUs;
    });

    const totalDurationUs = Math.max(targetDurationUs, currentTimelineUs);

    const projectData: IProject = {
      settings: {
        width,
        height,
        fps,
        duration: totalDurationUs,
        backgroundColor: '#000000',
      },
      tracks: [
        { id: 'track_effects', name: 'Visual Effects', type: 'Effect', clipIds: effectClipIds },
        { id: 'track_video', name: 'Scene Video (9:16)', type: 'Video', clipIds: videoClipIds },
        { id: 'track_bgm', name: 'Background Music (BGM)', type: 'Audio', clipIds: bgmClipIds },
      ],
      clips,
    };

    // Synchronize language tracks (voiceover & subtitles) for primary and configured languages
    const primaryLang = series?.language || episode.dubbing_languages?.[0] || episode.caption_languages?.[0] || 'vi-VN';
    this.syncLanguageTracksIntoTimeline(projectData, episode, primaryLang);

    return projectData;
  }

  /**
   * Synchronize dubbing, caption, and translation tracks into an existing timeline
   */
  static syncLanguageTracksIntoTimeline(
    timeline: IProject,
    episode: EpisodeEntity,
    primaryLang = 'en-US'
  ): void {
    if (!timeline.tracks) timeline.tracks = [];
    if (!timeline.clips) timeline.clips = {};

    const episodeId = episode.id;
    const rawScenes = this.extractScenes(episode);
    const canvasWidth = timeline.settings?.width || 1080;
    const canvasHeight = timeline.settings?.height || 1920;

    // Collect all configured language codes (always include primaryLang)
    const langSet = new Set<string>();
    if (primaryLang) langSet.add(primaryLang);

    // Only add additional sub-languages if they have actual translations in scenes
    const sceneTranslationLangs = new Set<string>();
    rawScenes.forEach((sc: any) => {
      if (sc.translations && typeof sc.translations === 'object') {
        Object.keys(sc.translations).forEach(k => {
          if (k && k !== primaryLang) {
            sceneTranslationLangs.add(k);
            langSet.add(k);
          }
        });
      }
    });

    (episode.dubbing_languages || []).forEach(l => {
      if (l && (l === primaryLang || sceneTranslationLangs.has(l))) {
        langSet.add(l);
      }
    });
    (episode.caption_languages || []).forEach(l => {
      if (l && (l === primaryLang || sceneTranslationLangs.has(l))) {
        langSet.add(l);
      }
    });

    // Prune legacy or unconfigured language tracks to avoid leftover tracks (e.g. unwanted en-US)
    timeline.tracks = timeline.tracks.filter(t => {
      if (t.id === 'track_voiceover_main' || t.id === 'track_captions_main') return false;
      if (t.type === 'Audio' && t.id.startsWith('track_voiceover_')) {
        const lCode = t.languageCode || t.id.replace('track_voiceover_', '');
        return langSet.has(lCode) || langSet.has(lCode.replace(/_/g, '-'));
      }
      if (t.type === 'Caption' && t.id.startsWith('track_caption_')) {
        const lCode = t.languageCode || t.id.replace('track_caption_', '');
        return langSet.has(lCode) || langSet.has(lCode.replace(/_/g, '-'));
      }
      return true;
    });

    Object.keys(timeline.clips).forEach(cid => {
      const clip = timeline.clips[cid];
      if (clip && (clip.trackId === 'track_voiceover_main' || clip.trackId === 'track_captions_main')) {
        delete timeline.clips[cid];
      }
    });

    const languages = Array.from(langSet);
    const activeSceneIndices = new Set(rawScenes.map((sc, i) => sc.index || (i + 1)));

    languages.forEach((langCode) => {
      const safeLang = langCode.replace(/[^a-zA-Z0-9_-]/g, '_');
      const voTrackId = `track_voiceover_${safeLang}`;
      const capTrackId = `track_caption_${safeLang}`;
      const isPrimary = langCode === primaryLang;

      // 1. Ensure Voiceover Track exists
      let voTrack = timeline.tracks.find(t => t.id === voTrackId);
      if (!voTrack) {
        const newVoTrack: ITrack = {
          id: voTrackId,
          name: `Voiceover (${langCode})`,
          type: 'Audio',
          accepts: ['Audio'],
          languageCode: langCode,
          muted: !isPrimary,
          visible: isPrimary,
          clipIds: [],
        };
        timeline.tracks.push(newVoTrack);
        voTrack = newVoTrack;
      } else {
        voTrack.languageCode = langCode;
        if (!Array.isArray(voTrack.clipIds)) voTrack.clipIds = [];
      }

      // 2. Ensure Caption Track exists
      const captionWidth = Math.round(canvasWidth * 0.86);
      const captionHeight = 120;
      const left = Math.round((canvasWidth - captionWidth) / 2);
      const top = canvasHeight - 450;

      const defaultCaptionConfig = {
        captions: {
          style: {
            fontSize: 44,
            fontFamily: 'Inter',
            fontWeight: '700',
            fontStyle: 'normal',
            color: '#ffffff',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: captionWidth,
            breakWords: true,
            fontUrl: 'https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvtYwYL8g.woff2',
            stroke: { color: '#000000', width: 4 },
            shadow: { color: '#000000', alpha: 0.5, blur: 4, offsetX: 2, offsetY: 2 },
          },
          colors: {
            active: { color: '#ffffff', background: '#FF5700' },
            future: { color: '#ffffff' },
            keyword: { color: '#ffffff', preserveAfterSpoken: true },
          },
          positioning: {
            videoWidth: canvasWidth,
            videoHeight: canvasHeight,
          },
          wordsPerLine: 'multiple',
        },
      };

      let capTrack = timeline.tracks.find(t => t.id === capTrackId);
      if (!capTrack) {
        const newCapTrack: ITrack = {
          id: capTrackId,
          name: `Subtitles (${langCode})`,
          type: 'Caption',
          accepts: ['caption', 'Caption'],
          languageCode: langCode,
          visible: isPrimary,
          config: defaultCaptionConfig,
          clipIds: [],
        };
        timeline.tracks.unshift(newCapTrack);
        capTrack = newCapTrack;
      } else {
        capTrack.languageCode = langCode;
        if (!capTrack.config) capTrack.config = defaultCaptionConfig;
        if (!Array.isArray(capTrack.clipIds)) capTrack.clipIds = [];
      }

      // 3. Build & Sync clips for this language
      rawScenes.forEach((scene: SceneEntity, idx: number) => {
        const scIdx = scene.index || (idx + 1);
        const vClipId = `clip_v_${episodeId}_s${scIdx}`;
        const vClip = timeline.clips[vClipId];
        const sceneFromUs = vClip?.timing?.display?.from ?? (idx * 6_000_000);
        const sceneDurUs = vClip?.timing?.duration ?? ((Number(scene.duration_seconds) || 6) * 1_000_000);
        const sceneEndUs = sceneFromUs + sceneDurUs;
        const hasDialogue = (scene.dialogue && scene.dialogue.length > 0);
        const trans = scene.translations?.[langCode];

        const voClipId = `clip_vo_${episodeId}_s${scIdx}_${safeLang}`;
        const voUrl = trans?.voiceover_url || (isPrimary ? scene.voiceover_url : null);

        // --- Voiceover Management ---
        if (voTrack) {
          if (hasDialogue && voUrl) {
            const ltCues = (trans?.captions_data && trans.captions_data.length > 0)
              ? trans.captions_data
              : (isPrimary ? (scene.captions_data || []) : []);
            const firstCue = ltCues[0];
            const lastCue = ltCues[ltCues.length - 1];

            const cueVoiceDurUs = (firstCue && lastCue)
              ? Math.min(sceneDurUs, Math.max(500_000, ((Number(lastCue.end_ms) || (sceneDurUs / 1000)) - (Number(firstCue.start_ms) || 0)) * 1000))
              : sceneDurUs;
            const voFromUs = sceneFromUs + (firstCue?.start_ms ? Math.round(Number(firstCue.start_ms) * 1000) : 0);
            const voToUs = Math.min(sceneEndUs, voFromUs + cueVoiceDurUs);

            if (!voTrack.clipIds.includes(voClipId)) {
              voTrack.clipIds.push(voClipId);
            }
            timeline.clips[voClipId] = {
              id: voClipId,
              trackId: voTrackId,
              type: 'Audio',
              name: `Voice #${scIdx} (${langCode})`,
              src: voUrl,
              timing: {
                display: { from: voFromUs, to: voToUs },
                trim: { from: 0, to: cueVoiceDurUs },
                duration: cueVoiceDurUs,
                playbackRate: 1,
              },
              visible: isPrimary,
              volume: 1,
              style: {},
              locked: false,
              transform: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                angle: 0,
                zIndex: 0,
                opacity: 1,
              },
            };
          } else {
            // No dialogue or voiceover: Remove old voiceover clip from timeline
            delete timeline.clips[voClipId];
            voTrack.clipIds = voTrack.clipIds.filter(id => id !== voClipId);
          }
        }

        // --- Caption Cues Management ---
        const capPrefix = `clip_cap_${episodeId}_s${scIdx}_${safeLang}_`;
        if (capTrack) {
          const ltCues = (trans?.captions_data && trans.captions_data.length > 0)
            ? trans.captions_data
            : (isPrimary ? (scene.captions_data || []) : []);

          if (hasDialogue && ltCues.length > 0) {
            const activeCapClipIds = new Set<string>();
            let lastEndUs = sceneFromUs;

            ltCues.forEach((cue: any, cIdx: number) => {
              const capClipId = `${capPrefix}${cIdx + 1}`;
              activeCapClipIds.add(capClipId);

              if (!capTrack!.clipIds.includes(capClipId)) {
                capTrack!.clipIds.push(capClipId);
              }

              // Calculate start and end ms safely
              const rawStartMs = cue.start_ms !== undefined ? Number(cue.start_ms) : (cue.startMs !== undefined ? Number(cue.startMs) : (cue.from_us !== undefined ? Number(cue.from_us) / 1000 : 0));
              const rawEndMs = cue.end_ms !== undefined ? Number(cue.end_ms) : (cue.endMs !== undefined ? Number(cue.endMs) : (rawStartMs + 2000));

              let cueFromUs = sceneFromUs + Math.round(rawStartMs * 1000);
              let cueToUs = sceneFromUs + Math.round(rawEndMs * 1000);

              // 1. Strict overlap prevention: current cue cannot start before previous cue ends
              if (cueFromUs < lastEndUs) {
                cueFromUs = lastEndUs;
              }

              // 2. Minimum duration & Scene boundary clamping
              if (cueToUs <= cueFromUs) {
                cueToUs = Math.min(sceneEndUs, cueFromUs + 1_500_000);
              }
              if (cueToUs > sceneEndUs) {
                cueToUs = sceneEndUs;
              }

              const cueDurUs = Math.max(200_000, cueToUs - cueFromUs);
              cueToUs = cueFromUs + cueDurUs;
              lastEndUs = cueToUs; // Advance watermark

              const rawWords = cue.words || trans?.words || (isPrimary ? scene.words : []);
              const cueWords = Array.isArray(rawWords) && rawWords.length > 0 ? rawWords.map((w: any) => ({
                text: w.text || w.punctuated_word || w.word || '',
                from: Number(w.from ?? 0),
                to: Number(w.to ?? (cueDurUs / 1000)),
                isKeyWord: Boolean(w.isKeyWord ?? w.is_key_word),
              })) : [{ text: cue.text || '', from: 0, to: Math.round(cueDurUs / 1000), isKeyWord: true }];

              timeline.clips[capClipId] = {
                id: capClipId,
                trackId: capTrackId,
                type: 'Caption',
                name: `Sub #${scIdx} (${langCode})`,
                text: cue.text || '',
                mediaId: vClipId,
                metadata: {
                  sourceClipId: vClipId,
                },
                wordsPerLine: 'multiple',
                timing: {
                  display: { from: cueFromUs, to: cueToUs },
                  trim: { from: 0, to: cueDurUs },
                  duration: cueDurUs,
                  playbackRate: 1,
                },
                visible: isPrimary,
                caption: {
                  words: cueWords,
                },
                style: {
                  color: '#ffffff',
                  align: 'center',
                },
                locked: false,
                effects: [],
                animations: [],
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

            // Clean up any stale caption clips if cue count was reduced
            capTrack.clipIds = capTrack.clipIds.filter((cid: string) => {
              if (cid.startsWith(capPrefix) && !activeCapClipIds.has(cid)) {
                delete timeline.clips[cid];
                return false;
              }
              return true;
            });
          } else {
            // Scene has no dialogue or cues: Prune all caption clips for this scene
            capTrack.clipIds = capTrack.clipIds.filter((cid: string) => {
              if (cid.startsWith(capPrefix)) {
                delete timeline.clips[cid];
                return false;
              }
              return true;
            });
          }
        }
      });

      // Purge orphan voiceover & caption clips from deleted scenes
      if (voTrack) {
        voTrack.clipIds = voTrack.clipIds.filter((cid: string) => {
          const match = cid.match(/_s(\d+)_/);
          if (match && !activeSceneIndices.has(Number(match[1]))) {
            delete timeline.clips[cid];
            return false;
          }
          return true;
        });
      }
      if (capTrack) {
        capTrack.clipIds = capTrack.clipIds.filter((cid: string) => {
          const match = cid.match(/_s(\d+)_/);
          if (match && !activeSceneIndices.has(Number(match[1]))) {
            delete timeline.clips[cid];
            return false;
          }
          return true;
        });
      }
    });
  }

  /**
   * Synchronize updated scene media (new video URLs, storyboards, audio) into an existing timeline
   */
  static syncTimelineWithScenes(episode: EpisodeEntity, timeline: IProject, series?: SeriesEntity | null): IProject {
    const rawScenes = this.extractScenes(episode);
    const episodeId = episode.id;
    const clips = { ...(timeline.clips || {}) };
    let tracks = Array.isArray(timeline.tracks) ? [...timeline.tracks] : [];

    const canvasWidth = timeline.settings?.width || 1080;
    const canvasHeight = timeline.settings?.height || 1920;

    // Prune legacy generic tracks
    tracks = tracks.filter(t => t.id !== 'track_voiceover_main' && t.id !== 'track_captions_main');
    Object.keys(clips).forEach(cid => {
      const clip = clips[cid];
      if (clip && (clip.trackId === 'track_voiceover_main' || clip.trackId === 'track_captions_main')) {
        delete clips[cid];
      }
    });

    // Ensure core tracks exist
    let videoTrack = tracks.find(t => t.id === 'track_video');
    if (!videoTrack) {
      videoTrack = { id: 'track_video', name: 'Scene Video (9:16)', type: 'Video', accepts: ['Video', 'Image'], clipIds: [] };
      tracks.push(videoTrack);
    }
    if (!Array.isArray(videoTrack.clipIds)) videoTrack.clipIds = [];

    let effectsTrack = tracks.find(t => t.id === 'track_effects');
    if (!effectsTrack) {
      effectsTrack = { id: 'track_effects', name: 'Visual Effects', type: 'Effect', accepts: ['Effect'], clipIds: [] };
      tracks.unshift(effectsTrack);
    }
    if (!Array.isArray(effectsTrack.clipIds)) effectsTrack.clipIds = [];

    let bgmTrack = tracks.find(t => t.id === 'track_bgm');
    if (!bgmTrack) {
      bgmTrack = { id: 'track_bgm', name: 'Background Music (BGM)', type: 'Audio', accepts: ['Audio'], clipIds: [] };
      tracks.push(bgmTrack);
    }
    if (!Array.isArray(bgmTrack.clipIds)) bgmTrack.clipIds = [];

    let currentTimelineUs = 0;

    rawScenes.forEach((scene: SceneEntity, idx: number) => {
      const scIdx = scene.index || (idx + 1);
      const vClipId = `clip_v_${episodeId}_s${scIdx}`;
      const sceneDurSeconds = Number(scene.duration_seconds) || 6;
      const sceneDurUs = sceneDurSeconds * 1_000_000;
      const fromUs = currentTimelineUs;
      const toUs = fromUs + sceneDurUs;

      // 1. Video / Visual Clip
      if (clips[vClipId]) {
        if (scene.video_url) {
          clips[vClipId].src = scene.video_url;
          clips[vClipId].type = 'Video';
        } else if (scene.storyboard_frame_url && (!clips[vClipId].src || clips[vClipId].src.includes('unsplash.com') || clips[vClipId].src.includes('poster-1.jpg'))) {
          clips[vClipId].src = scene.storyboard_frame_url;
          clips[vClipId].type = 'Image';
        }
      } else {
        const srcUrl = scene.video_url || scene.storyboard_frame_url || '/images/dashboard/poster-1.jpg';
        clips[vClipId] = {
          id: vClipId,
          trackId: 'track_video',
          type: scene.video_url ? 'Video' : 'Image',
          name: scene.heading || `Scene #${scIdx}`,
          src: srcUrl,
          timing: {
            display: { from: fromUs, to: toUs },
            trim: { from: 0, to: sceneDurUs },
            duration: sceneDurUs,
            playbackRate: 1,
          },
          volume: 1,
          style: {},
          locked: false,
          transform: {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            angle: 0,
            zIndex: 10,
            opacity: 1,
          },
        };
      }
      if (!videoTrack!.clipIds.includes(vClipId)) {
        videoTrack!.clipIds.push(vClipId);
      }

      // 2. Transition between visual clips
      if (scIdx > 1 && scene.transition_effect && (scene.transition_effect as string) !== 'cut' && (scene.transition_effect as string) !== 'none') {
        const transClipId = `clip_trans_${episodeId}_s${scIdx - 1}`;
        clips[transClipId] = {
          id: transClipId,
          type: 'Transition',
          name: `Transition: ${scene.transition_effect}`,
          transitionKey: scene.transition_effect,
          duration: 1_000_000,
          fromClipId: `clip_v_${episodeId}_s${scIdx - 1}`,
          toClipId: vClipId,
        };
      }

      // 3. Visual Effect Clip on track_effects
      if (scene.video_effect) {
        const effClipId = `clip_eff_${episodeId}_s${scIdx}`;
        clips[effClipId] = {
          id: effClipId,
          trackId: 'track_effects',
          type: 'Effect',
          name: `Effect: ${scene.video_effect}`,
          effectKey: scene.video_effect,
          intensity: 0.8,
          timing: {
            display: { from: fromUs, to: fromUs + 500_000 },
            trim: { from: 0, to: 500_000 },
            duration: 500_000,
            playbackRate: 1,
          },
          visible: true,
          style: {},
          locked: false,
        };
        if (!effectsTrack!.clipIds.includes(effClipId)) {
          effectsTrack!.clipIds.push(effClipId);
        }
      }

      // 4. BGM Clip (Music Track)
      if (scene.bgm_url) {
        const bgmClipId = `clip_bgm_${episodeId}_s${scIdx}`;
        if (clips[bgmClipId]) {
          clips[bgmClipId].src = scene.bgm_url;
        } else {
          clips[bgmClipId] = {
            id: bgmClipId,
            trackId: 'track_bgm',
            type: 'Audio',
            name: `BGM #${scIdx}`,
            src: scene.bgm_url,
            timing: {
              display: { from: fromUs, to: toUs },
              trim: { from: 0, to: sceneDurUs },
              duration: sceneDurUs,
              playbackRate: 1,
            },
            volume: 0.35,
            style: {},
            locked: false,
            transform: {
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              angle: 0,
              zIndex: 0,
              opacity: 1,
            },
          };
        }
        if (!bgmTrack!.clipIds.includes(bgmClipId)) {
          bgmTrack!.clipIds.push(bgmClipId);
        }
      }

      currentTimelineUs += sceneDurUs;
    });

    timeline.tracks = tracks;
    timeline.clips = clips;
    const primaryLang = episode.dubbing_languages?.[0] || episode.caption_languages?.[0] || series?.language || 'en-US';
    this.syncLanguageTracksIntoTimeline(timeline, episode, primaryLang);
    return timeline;
  }

  /**
   * High-level method: Get or build the synchronized timeline for an episode
   */
  static async getOrBuildEpisodeTimeline(episodeId: string): Promise<IProject> {
    const db = await getDatabaseProvider();
    const episode = await db.getEpisodeById(episodeId);
    if (!episode) throw new Error(`Episode ${episodeId} not found`);

    const series = await db.getSeriesById(episode.series_id);
    const latest = await db.getLatestTimeline(episodeId);

    if (latest?.timeline_data?.tracks && latest?.timeline_data?.clips) {
      const updatedTimeline = this.syncTimelineWithScenes(episode, { ...latest.timeline_data }, series);
      try {
        await db.saveTimeline(episodeId, updatedTimeline, { id: 'system', name: 'Studio System' }, 'Synchronized timeline with latest scene media');
      } catch (saveErr) {
        Logger.warn(`[TimelineService] Failed to auto-save synchronized timeline: ${saveErr}`);
      }
      return updatedTimeline;
    }

    // Build fresh initial timeline
    const freshTimeline = this.buildInitialTimelineData(episode, series);
    try {
      await db.saveTimeline(episodeId, freshTimeline, { id: 'system', name: 'Studio System' }, 'Auto-generated initial timeline from episode scenes');
    } catch (saveErr) {
      Logger.warn(`[TimelineService] Failed to auto-save initial timeline version: ${saveErr}`);
    }

    return freshTimeline;
  }
}

export const timelineService = TimelineService;
