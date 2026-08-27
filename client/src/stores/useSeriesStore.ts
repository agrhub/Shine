import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/http';
import { core } from '@/utils/project';
import { GEMINI_LANGUAGE_DEFAULTS, getLanguageByCode } from '@/constants/geminiLanguages';
import type { Series, Episode, Character, SceneTranslation, CaptionCue, LanguageTrack } from '../types/api';

export const useSeriesStore = defineStore('series', () => {
  const seriesList = ref<Series[]>([]);
  const currentSeries = ref<Series | null>(null);
  const episodesList = ref<Episode[]>([]);
  const charactersList = ref<Character[] | []>([]);
  const activeEpisodeId = ref<string>('');
  const activeLanguageCode = ref<string>('en-US');
  const activeScript = ref<Episode | null>(null);
  const isLoading = ref(false);
  const isScriptLoading = ref(false);

  const activeEpisode = computed<Episode | null>(() => {
    return episodesList.value.find(ep => ep.id === activeEpisodeId.value) || episodesList.value[0] || null;
  });

  function setActiveLanguage(code: string) {
    if (!code) return;
    activeLanguageCode.value = code;
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function fetchSeriesList(params?: { userId?: string }): Promise<Series[]> {
    isLoading.value = true;
    try {
      const res: any = await http.get('/series', { params });
      const list = res?.data?.series || res?.series || res?.data || res;
      seriesList.value = Array.isArray(list) ? list : [];
      return seriesList.value;
    } catch {
      seriesList.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createSeries(data: {
    title: string;
    genre: string;
    visualStyle?: string;
    visualStylePrompt?: string;
    episodeCount?: number;
    userId?: string;
    masterPlan?: any;
    description?: string;
    synopsis?: string;
    country?: string;
    ratio?: string;
    characters?: any[];
    locations?: any[];
    props?: any[];
  }) : Promise<Series> {
    isLoading.value = true;
    try {
      const res: any = await http.post('/series', data);
      const newSeries = res.series || res.data?.series || res.data || res;
      seriesList.value.unshift(newSeries);
      return newSeries;
    } finally {
      isLoading.value = false;
    }
  }

  // Unified single loader for entire workspace
  async function loadWorkspaceData(seriesId: string) {
    isLoading.value = true;
    try {
      const res: any = await http.get(`/series/${seriesId}`);
      if (res?.data?.series) {
        currentSeries.value = res.data.series;

        // 1. Sync Characters
        const rawChars = res.data.series.characters || res.data.series.master_plan?.characters || [];
        if (Array.isArray(rawChars) && rawChars.length > 0) {
          charactersList.value = rawChars.map((c: Character, idx: number) => ({
            id: c.id || `char_${seriesId}_${idx + 1}`,
            series_id: seriesId,
            name: c.name,
            role: c.role || 'protagonist',
            gender: c.gender || (idx === 0 ? 'male' : idx === 1 ? 'female' : 'neutral'),
            age: c.age || 25,
            nationality: c.nationality || res.data.series.country || 'Vietnam',
            voice_id: c.voice_id || (c.gender === 'female' ? 'Kore' : 'Fenrir'),
            identity: c.identity || '',
            traits: c.traits || '',
            visual_traits: c.visual_traits || '',
            physical_characteristics: c.physical_characteristics || '',
            appearance: c.appearance || '',
            clothing_and_accessories: c.clothing_and_accessories || '',
            speech_style: c.speech_style || 'Sharp and concise',
            avatar: c.avatar || undefined,
            lora_model: c.lora_model || `lora-${(c.name || 'char').toLowerCase().replace(/\s+/g, '-')}-sdxl`,
            description: c.description || '',
          }));
        }

        // 2. Sync Episodes
        if (res.data.episodes && Array.isArray(res.data.episodes)) {
          episodesList.value = res.data.episodes.map((ep: Episode, idx: number) => ({
            id: ep.id,
            number: Number(ep.episode_number) || idx + 1,
            episode_number: Number(ep.episode_number) || idx + 1,
            title: ep.title || `Episode ${idx + 1}`,
            synopsis: ep.synopsis || '',
            screenplay: ep.screenplay || ep.script || '',
            script: ep.script || ep.screenplay || '',
            scene_core: ep.scene_core || '',
            conflict_escalation: ep.conflict_escalation || '',
            cliffhanger_hook: ep.cliffhanger_hook || '',
            duration: ep.duration_seconds ? formatTime(ep.duration_seconds) : '1:30',
            duration_seconds: ep.duration_seconds || 90,
            scenes_count: `${ep.scenes?.length || 3} scenes`,
            status: ep.status === 'PUBLISHED' ? 'PUBLISHED' : ep.status === 'REVIEW' ? 'REVIEWING' : 'LIVE EDITING',
            status_class: ep.status === 'PUBLISHED' ? 'text-green-500 bg-green-500/10' : 'text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]',
            cover_image: ep.cover_image || (Array.isArray(ep.scenes) && (ep.scenes[0]?.storyboard_frame_url)) || '/images/dashboard/episode-thumb-default.jpg',
            scenes: ep.scenes || [],
            characters: ep.characters || res.data.series?.characters || [],
            locations: ep.locations || res.data.series?.locations || [],
            props: ep.props || res.data.series?.props || [],
          }));

          if (episodesList.value.length > 0) {
            const exists = episodesList.value.some(e => e.id === activeEpisodeId.value);
            if (!exists) {
              activeEpisodeId.value = episodesList.value[0].id;
            }
          } else {
            activeEpisodeId.value = '';
          }
        }

        // 3. Load script for active episode
        if (activeEpisodeId.value) {
          await loadEpisodeScript(seriesId, activeEpisodeId.value);
        }
      }
      return { series: currentSeries.value, episodes: episodesList.value, characters: charactersList.value };
    } finally {
      isLoading.value = false;
    }
  }

  async function loadEpisodeScript(seriesId: string, epId: string) {
    isScriptLoading.value = true;
    try {
      const res: any = await http.get(`/series/${seriesId}/episodes/${epId}/script`);
      if (res?.data) {
        activeScript.value = res.data;
        const targetEp = episodesList.value.find(e => e.id === epId);
        if (targetEp) {
          if (res.data.screenplay) {
            targetEp.screenplay = res.data.screenplay;
          }
          if (res.data.characters) {
            targetEp.characters = res.data.characters;
          }
          if (res.data.locations) {
            targetEp.locations = res.data.locations;
          }
          if (res.data.props) {
            targetEp.props = res.data.props;
          }
          if (res.data.scenes) {
            targetEp.scenes = res.data.scenes;
            targetEp.scenes_count = `${res.data.scenes.length} scenes`;
          }
          if (res.data.dubbing_settings) {
            targetEp.dubbing_settings = res.data.dubbing_settings;
          }
          if (res.data.caption_settings) {
            targetEp.caption_settings = res.data.caption_settings;
          }
          const capLangs = (res.data.caption_languages) as string[] | undefined;
          if (capLangs?.length) {
            captionLanguages.value = [...new Set<string>(capLangs)];
          }
          const dubLangs = (res.data.dubbing_languages) as string[] | undefined;
          if (dubLangs?.length) {
            dubbingLanguages.value = [...new Set<string>(dubLangs)];
          }
          (targetEp.scenes || []).forEach((sc: any) => {
            if (sc.translations && typeof sc.translations === 'object') {
              Object.keys(sc.translations).forEach((code: string) => {
                if (!captionLanguages.value.includes(code)) captionLanguages.value.push(code);
                if (!dubbingLanguages.value.includes(code)) dubbingLanguages.value.push(code);
              });
            }
          });
        }
      }
      return activeScript.value;
    } catch (e) {
      console.warn('Failed to load episode script', e);
      return null;
    } finally {
      isScriptLoading.value = false;
    }
  }

  async function selectEpisode(epId: string) {
    activeEpisodeId.value = epId;
    if (currentSeries.value?.id) {
      await loadEpisodeScript(currentSeries.value.id, epId);
    }
  }

  async function generateScriptForEpisode(epId: string, overrides?: any) {
    if (!currentSeries.value?.id) return null;
    isScriptLoading.value = true;
    try {
      const res: any = await http.post(`/series/${currentSeries.value.id}/episodes/${epId}/generate-script`, overrides || {});
      if (res?.data) {
        activeScript.value = res.data;
        const targetEp = episodesList.value.find(e => e.id === epId);
        if (targetEp) {
          if (res.data.screenplay) {
            targetEp.screenplay = res.data.screenplay;
          }
          if (res.data.characters) {
            targetEp.characters = res.data.characters;
          }
          if (res.data.locations) {
            targetEp.locations = res.data.locations;
          }
          if (res.data.props) {
            targetEp.props = res.data.props;
          }
          if (res.data.scenes) {
            targetEp.scenes = res.data.scenes;
            targetEp.scenes_count = `${res.data.scenes.length} scenes`;
          }
        }
      }
      return activeScript.value;
    } catch (e) {
      console.warn('Failed to generate script for episode', e);
      return null;
    } finally {
      isScriptLoading.value = false;
    }
  }

  async function getSeriesById(id: string) {
    return loadWorkspaceData(id);
  }

  // ─── Asset Update Mutations ───────────────────────────────────────────────

  function updateCharacterAvatar(charId: string, avatarUrl: string) {
    const char = charactersList.value.find(c => c.id === charId || c.name?.toLowerCase() === charId?.toLowerCase());
    if (char) {
      char.avatar = avatarUrl;
    }
    if (activeEpisode.value?.characters) {
      const epChar = activeEpisode.value.characters.find((c: any) => c.id === charId || c.name?.toLowerCase() === charId?.toLowerCase());
      if (epChar && epChar.wardrobe_variants?.length > 0) {
        epChar.wardrobe_variants[0].image_url = avatarUrl;
      }
    }
  }

  function getCharacterById(id: string) {
    if (!id) return undefined;
    return charactersList.value.find(c => c.id === id || c.name?.toLowerCase().trim() === id?.toLowerCase().trim());
  }

  function updateSceneStoryboard(epId: string, sceneIndex: number, url: string) {
    // Update in activeScript
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex);
      if (scene) {
        scene.storyboard_frame_url = url;
      }
    }
    // Update in episodesList scenes
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      if (ep.scenes) {
        const scene = ep.scenes.find((s: any) => s.index === sceneIndex);
        if (scene) {
          scene.storyboard_frame_url = url;
        }
      }
      // Auto-update episode thumbnail if scene 1 or no custom thumb
      if (sceneIndex === 1 || !ep.cover_image) {
        ep.cover_image = url;
      }
    }
  }

  function updateSceneVideoUrl(epId: string, sceneIndex: number, url: string) {
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex) as any;
      if (scene) scene.video_url = url;
    }
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      if (ep.scenes) {
        const scene = ep.scenes.find((s: any) => s.index === sceneIndex) as any;
        if (scene) scene.video_url = url;
      }
    }
  }

  function updateSceneAssets(epId: string, sceneIndex: number, assets: { voiceover_url?: string; voiceoverUrl?: string; bgm_url?: string; bgmUrl?: string; captions_data?: any[]; captionsData?: any[]; voice_duration_us?: number; voiceDurationUs?: number; [key: string]: any }) {
    const vUrl = assets.voiceover_url || assets.voiceoverUrl;
    const bUrl = assets.bgm_url || assets.bgmUrl;
    const cData = assets.captions_data || assets.captionsData;
    const vDurUs = assets.voice_duration_us || assets.voiceDurationUs;

    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex) as any;
      if (scene) {
        if (vUrl) scene.voiceover_url = vUrl;
        if (bUrl) scene.bgm_url = bUrl;
        if (cData) scene.captions_data = cData;
        if (vDurUs) scene.voice_duration_us = vDurUs;
      }
    }
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep?.scenes) {
      const scene = ep.scenes.find((s: any) => s.index === sceneIndex) as any;
      if (scene) {
        if (vUrl) scene.voiceover_url = vUrl;
        if (bUrl) scene.bgm_url = bUrl;
        if (cData) scene.captions_data = cData;
        if (vDurUs) scene.voice_duration_us = vDurUs;
      }
    }
  }

  // ─── Auto-save Episode Scenes & Settings to Server ────────────────────────────
  async function saveEpisodeScenes(seriesId: string, epId: string) {
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];
    if (!scenes.length) return;
    const thumbUrl = ep?.cover_image || scenes[0]?.storyboard_frame_url || '';
    try {
      await http.put(`/series/${seriesId}/episodes/${epId}`, {
        scenes,
        title: ep?.title,
        synopsis: ep?.synopsis,
        cover_image: thumbUrl,
        dubbing_settings: ep?.dubbing_settings || {},
        caption_settings: ep?.caption_settings || {},
        caption_languages: captionLanguages.value,
        dubbing_languages: dubbingLanguages.value,
      });
    } catch (err) {
      console.warn('[saveEpisodeScenes] Failed to auto-save episode scenes:', err);
    }
  }

  // ─── Language Track Mutations & Sync ──────────────────────────────────────────
  const LANGUAGE_DEFAULTS: Record<string, { label: string }> = GEMINI_LANGUAGE_DEFAULTS;

  const activePreviewCaptionLang = ref<string>('en-US');
  const activePreviewVoiceLang = ref<string>('en-US');
  const captionLanguages = ref<string[]>(['en-US']);
  const dubbingLanguages = ref<string[]>(['en-US']);

  function setCaptionLanguages(langs: string[]) {
    captionLanguages.value = [...new Set(langs)];
    dubbingLanguages.value = [...new Set(langs)];
    if (activePreviewCaptionLang.value !== 'off' && !captionLanguages.value.includes(activePreviewCaptionLang.value)) {
      setPreviewCaptionLanguage(captionLanguages.value[0] || 'off');
    }
  }

  function setDubbingLanguages(langs: string[]) {
    setCaptionLanguages(langs);
  }

  function addLanguage(langCode: string) {
    if (!captionLanguages.value.includes(langCode)) {
      captionLanguages.value.push(langCode);
    }
    if (!dubbingLanguages.value.includes(langCode)) {
      dubbingLanguages.value.push(langCode);
    }
    if (activeEpisodeId.value) {
      const sId = currentSeries.value?.id;
      if (sId) saveEpisodeScenes(sId, activeEpisodeId.value);
    }
  }

  function removeLanguage(langCode: string) {
    captionLanguages.value = captionLanguages.value.filter(c => c !== langCode);
    dubbingLanguages.value = dubbingLanguages.value.filter(c => c !== langCode);
    if (activePreviewCaptionLang.value === langCode) {
      setPreviewCaptionLanguage(captionLanguages.value[0] || 'off');
    }
    if (activePreviewVoiceLang.value === langCode) {
      setPreviewVoiceLanguage(dubbingLanguages.value[0] || 'mute');
    }
    if (activeEpisodeId.value) {
      const sId = currentSeries.value?.id;
      if (sId) saveEpisodeScenes(sId, activeEpisodeId.value);
    }
  }

  function addCaptionLanguage(langCode: string) {
    addLanguage(langCode);
  }

  function removeCaptionLanguage(langCode: string) {
    removeLanguage(langCode);
  }

  function addDubbingLanguage(langCode: string) {
    addLanguage(langCode);
  }

  function removeDubbingLanguage(langCode: string) {
    removeLanguage(langCode);
  }

  function setPreviewCaptionLanguage(langCode: string | 'off') {
    activePreviewCaptionLang.value = langCode;
    try {
      const state = core.store.getState();
      const tracks = [...((state.tracks as any[]) || [])];
      const clips = { ...(state.clips || {}) };
      const safeLang = langCode !== 'off' ? langCode.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
      const targetCaptionTrackId = safeLang ? `track_caption_${safeLang}` : '';

      tracks.forEach((track: any) => {
        if (track.type === 'Caption' || track.id?.startsWith('track_caption_')) {
          const isTarget = langCode !== 'off' && track.id === targetCaptionTrackId;
          track.visible = isTarget;
        }
      });

      Object.keys(clips).forEach((clipId) => {
        const clip = clips[clipId];
        if (clip && (clip.type === 'Caption' || clip.trackId?.startsWith('track_caption_'))) {
          const isTarget = langCode !== 'off' && clip.trackId === targetCaptionTrackId;
          clip.visible = isTarget;
        }
      });

      core.store.setState({ ...state, tracks, clips });
    } catch (err) {
      console.warn('[setPreviewCaptionLanguage] Failed:', err);
    }
  }

  function setPreviewVoiceLanguage(langCode: string | 'mute') {
    activePreviewVoiceLang.value = langCode;
    try {
      const state = core.store.getState();
      const tracks = [...((state.tracks as any[]) || [])];
      const clips = { ...(state.clips || {}) };
      const safeLang = langCode !== 'mute' ? langCode.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
      const targetVoiceTrackId = safeLang ? `track_voiceover_${safeLang}` : '';

      tracks.forEach((track: any) => {
        if (track.type === 'Audio' && track.id?.startsWith('track_voiceover_')) {
          const isTarget = langCode !== 'mute' && track.id === targetVoiceTrackId;
          track.muted = !isTarget;
          track.visible = isTarget;
        }
      });

      Object.keys(clips).forEach((clipId) => {
        const clip = clips[clipId];
        if (clip && clip.trackId?.startsWith('track_voiceover_')) {
          const isTarget = langCode !== 'mute' && clip.trackId === targetVoiceTrackId;
          clip.visible = isTarget;
        }
      });

      core.store.setState({ ...state, tracks, clips });
    } catch (err) {
      console.warn('[setPreviewVoiceLanguage] Failed:', err);
    }
  }

  function syncVoiceoverTrackToTimeline(epId: string, langCode: string) {
    const safeLang = langCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const voiceTrackId = `track_voiceover_${safeLang}`;
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];

    try {
      const state = core.store.getState();
      const tracks = [...((state.tracks as any[]) || [])];
      const clips = { ...(state.clips || {}) };

      let targetTrack = tracks.find((t: any) => t.id === voiceTrackId);
      const isVoiceActive = activePreviewVoiceLang.value === langCode;

      if (!targetTrack) {
        targetTrack = {
          id: voiceTrackId,
          name: `Voiceover (${langCode})`,
          type: 'Audio',
          languageCode: langCode,
          muted: !isVoiceActive,
          visible: isVoiceActive,
          clipIds: [],
        };
        tracks.push(targetTrack);
      } else {
        targetTrack.muted = !isVoiceActive;
        targetTrack.visible = isVoiceActive;
        targetTrack.clipIds = targetTrack.clipIds || [];
      }

      const mainLang = currentSeries.value?.language || 'en-US';
      let currentUs = 0;
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const scIdx = sc.index || (i + 1);
        const vClipId = `clip_v_${epId}_s${scIdx}`;
        const vClip: any = clips[vClipId] || Object.values(clips).find((c: any) =>
          c.id === vClipId || ((c.type === 'Video' || c.type === 'Image') && (c.name?.includes(`Scene ${scIdx}`) || c.label?.includes(`Scene ${scIdx}`)))
        );
        const sceneFromUs = vClip?.timing?.display?.from ?? (vClip?.display?.from ?? currentUs);
        const sceneDurUs = vClip?.timing?.duration ?? (vClip?.duration ?? ((sc.duration_seconds || 6) * 1_000_000));

        const trans = sc.translations?.[langCode];
        const voiceUrl = (langCode === mainLang ? sc.voiceover_url : trans?.voiceover_url) || trans?.voiceover_url;
        const cues = (langCode === mainLang ? sc.captions_data : trans?.captions_data) || trans?.captions_data || sc.captions_data || [];
        const firstCue = cues[0];
        const lastCue = cues[cues.length - 1];

        let voiceOffsetUs = 200_000;
        let voiceDurationUs = trans?.voice_duration_us || Math.min(sceneDurUs - voiceOffsetUs, 3_500_000);

        if (firstCue) {
          voiceOffsetUs = firstCue.fromUs !== undefined && firstCue.fromUs > 0
            ? firstCue.fromUs
            : (firstCue.startMs !== undefined ? Math.round(firstCue.startMs * 1000) : 200_000);
          if (lastCue) {
            const lastCueEndUs = lastCue.toUs !== undefined && lastCue.toUs > 0
              ? lastCue.toUs
              : (lastCue.endMs !== undefined ? Math.round(lastCue.endMs * 1000) : (voiceOffsetUs + 3_000_000));
            voiceDurationUs = Math.max(500_000, lastCueEndUs - voiceOffsetUs);
          }
        }

        voiceDurationUs = Math.min(Math.max(100_000, voiceDurationUs), Math.max(500_000, sceneDurUs - voiceOffsetUs));
        const fromUs = sceneFromUs + voiceOffsetUs;
        const toUs = fromUs + voiceDurationUs;

        if (voiceUrl) {
          const clipId = `clip_vo_${epId}_s${scIdx}_${safeLang}`;
          clips[clipId] = {
            id: clipId,
            trackId: voiceTrackId,
            type: 'Audio',
            name: `Voice #${scIdx} (${langCode})`,
            src: voiceUrl,
            timing: {
              display: { from: fromUs, to: toUs },
              trim: { from: 0, to: voiceDurationUs },
              duration: voiceDurationUs,
              playbackRate: 1,
            },
            display: { from: fromUs, to: toUs },
            duration: voiceDurationUs,
            visible: isVoiceActive,
            volume: 1,
            style: {},
            locked: false,
            effects: [],
            animations: [],
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          } as any;
          if (!targetTrack.clipIds.includes(clipId)) {
            targetTrack.clipIds.push(clipId);
          }
        }
        currentUs = sceneFromUs + sceneDurUs;
      }

      core.store.setState({ ...state, tracks, clips });
    } catch (err) {
      console.warn('[syncVoiceoverTrackToTimeline] Error:', err);
    }
  }

  function syncCaptionTrackToTimeline(epId: string, langCode: string, styleOpts?: any) {
    const safeLang = langCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const capTrackId = `track_caption_${safeLang}`;
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];

    try {
      const state = core.store.getState();
      const tracks = [...((state.tracks as any[]) || [])];
      const clips = { ...(state.clips || {}) };

      let targetTrack = tracks.find((t: any) => t.id === capTrackId);
      const isCapActive = activePreviewCaptionLang.value === langCode;

      if (!targetTrack) {
        const langInfo = getLanguageByCode(langCode);
        const label = LANGUAGE_DEFAULTS[langCode]?.label || langInfo?.nativeName || langCode;
        targetTrack = {
          id: capTrackId,
          name: `Captions (${label})`,
          type: 'Caption',
          languageCode: langCode,
          visible: isCapActive,
          clipIds: [],
        };
        tracks.push(targetTrack);
      } else {
        targetTrack.visible = isCapActive;
        targetTrack.clipIds = targetTrack.clipIds || [];
      }

      const mainLang = currentSeries.value?.language || 'en-US';
      let currentUs = 0;
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const scIdx = sc.index || (i + 1);
        const vClipId = `clip_v_${epId}_s${scIdx}`;
        const vClip: any = clips[vClipId] || Object.values(clips).find((c: any) =>
          c.id === vClipId || ((c.type === 'Video' || c.type === 'Image') && (c.name?.includes(`Scene ${scIdx}`) || c.label?.includes(`Scene ${scIdx}`)))
        );
        const sceneFromUs = vClip?.timing?.display?.from ?? (vClip?.display?.from ?? currentUs);
        const sceneDurUs = vClip?.timing?.duration ?? (vClip?.duration ?? ((sc.duration_seconds || 6) * 1_000_000));

        const trans = sc.translations?.[langCode];
        const cues = (langCode === mainLang ? sc.captions_data : trans?.captions_data) || trans?.captions_data || sc.captions_data || [];
        const words = trans?.words || sc.words;
        const firstCue = cues[0];
        const lastCue = cues[cues.length - 1];

        let capOffsetUs = 200_000;
        let capDurationUs = trans?.voice_duration_us || Math.min(sceneDurUs - capOffsetUs, 3_500_000);

        if (firstCue) {
          capOffsetUs = firstCue.fromUs !== undefined && firstCue.fromUs > 0
            ? firstCue.fromUs
            : (firstCue.startMs !== undefined ? Math.round(firstCue.startMs * 1000) : 200_000);
          if (lastCue) {
            const lastCueEndUs = lastCue.toUs !== undefined && lastCue.toUs > 0
              ? lastCue.toUs
              : (lastCue.endMs !== undefined ? Math.round(lastCue.endMs * 1000) : (capOffsetUs + 3_000_000));
            capDurationUs = Math.max(500_000, lastCueEndUs - capOffsetUs);
          }
        }

        capDurationUs = Math.min(Math.max(100_000, capDurationUs), Math.max(500_000, sceneDurUs - capOffsetUs));
        const fromUs = sceneFromUs + capOffsetUs;
        const toUs = fromUs + capDurationUs;

        const lineText = Array.isArray(cues) && cues.length > 0
          ? cues.map((c: any) => c.text).join(' ')
          : (trans?.dialogue || trans?.translated_dialogue || (Array.isArray(sc.dialogue) ? sc.dialogue.map((d: any) => d.line).join(' ') : (sc.dialogue || '')));

        if (lineText) {
          const clipId = `clip_cap_${epId}_s${scIdx}_${safeLang}`;
          clips[clipId] = {
            id: clipId,
            trackId: capTrackId,
            type: 'Caption',
            name: `Sub #${scIdx} (${langCode})`,
            text: lineText,
            mediaId: clipId,
            wordsPerLine: 'multiple',
            timing: {
              display: { from: fromUs, to: toUs },
              trim: { from: 0, to: capDurationUs },
              duration: capDurationUs,
              playbackRate: 1,
            },
            display: { from: fromUs, to: toUs },
            duration: capDurationUs,
            visible: isCapActive,
            fontSize: styleOpts?.fontSize || 44,
            fontFamily: styleOpts?.fontFamily || 'Bangers-Regular',
            color: styleOpts?.color || '#FFFFFF',
            outlineColor: styleOpts?.outlineColor || '#000000',
            outlineWeight: styleOpts?.outlineWeight || 4,
            style: {
              fontFamily: styleOpts?.fontFamily || 'Bangers-Regular',
              fontSize: styleOpts?.fontSize || 44,
              color: styleOpts?.color || '#FFFFFF',
            },
            caption: {
              colors: {
                active: { color: '#FFD700' },
                keyword: { color: '#FFD700' },
              },
              words: Array.isArray(words) && words.length > 0 ? words : undefined,
            },
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          } as any;
          if (!targetTrack.clipIds.includes(clipId)) {
            targetTrack.clipIds.push(clipId);
          }
        }
        currentUs = sceneFromUs + sceneDurUs;
      }

      core.store.setState({ ...state, tracks, clips });
    } catch (err) {
      console.warn('[syncCaptionTrackToTimeline] Error:', err);
    }
  }

  function updateSceneTranslation(epId: string, sceneIndex: number, langCode: string, translationData: Partial<SceneTranslation>) {
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep?.scenes) {
      const scene = ep.scenes.find((s: any) => s.index === sceneIndex);
      if (scene) {
        if (!scene.translations) scene.translations = {};
        scene.translations[langCode] = { ...(scene.translations[langCode] || {}), ...translationData };
      }
    }
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find((s: any) => s.index === sceneIndex);
      if (scene) {
        if (!scene.translations) scene.translations = {};
        scene.translations[langCode] = { ...(scene.translations[langCode] || {}), ...translationData };
      }
    }
  }

  function getSceneTranslation(epId: string, sceneIndex: number, langCode: string): SceneTranslation | undefined {
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];
    const scene = scenes.find((s: any) => s.index === sceneIndex);
    return scene?.translations?.[langCode];
  }

  function updateLanguageTrackVoiceover(epId: string, langCode: string, sceneIndex: number, url: string) {
    const mainLang = currentSeries.value?.language || 'en-US';
    updateSceneTranslation(epId, sceneIndex, langCode, { voiceover_url: url });
    if (langCode === mainLang) {
      updateSceneAssets(epId, sceneIndex, { voiceoverUrl: url });
    }
    syncVoiceoverTrackToTimeline(epId, langCode);
  }

  function updateLanguageTrackCaptions(epId: string, langCode: string, sceneIndex: number, cues: CaptionCue[], words?: any[]) {
    const mainLang = currentSeries.value?.language || 'en-US';
    updateSceneTranslation(epId, sceneIndex, langCode, { captions_data: cues, ...(words ? { words } : {}) });
    if (langCode === mainLang) {
      updateSceneAssets(epId, sceneIndex, { captionsData: cues, ...(words ? { words } : {}) });
    }
    syncCaptionTrackToTimeline(epId, langCode);
  }

  function updateLanguageTrackDialogue(epId: string, langCode: string, sceneIndex: number, text: string) {
    updateSceneTranslation(epId, sceneIndex, langCode, { dialogue: text, translated_dialogue: text });
  }

  function getLanguageTrackDialogue(epId: string, langCode: string, sceneIndex: number): string | null {
    const trans = getSceneTranslation(epId, sceneIndex, langCode);
    return trans?.dialogue || trans?.translated_dialogue || null;
  }

  function updateEpisodeDubbingSettings(epId: string, settings: any) {
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      ep.dubbing_settings = { ...(ep.dubbing_settings || {}), ...settings };
    }
  }

  function updateEpisodeCaptionSettings(epId: string, settings: any) {
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      ep.caption_settings = { ...(ep.caption_settings || {}), ...settings };
    }
  }

  function getLanguageTracks(epId: string): LanguageTrack[] {
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];
    const mainLang = currentSeries.value?.language || 'en-US';
    const allLangs = [...new Set([...captionLanguages.value, ...dubbingLanguages.value, mainLang])];

    return allLangs.map(langCode => {
      const langInfo = getLanguageByCode(langCode);
      const label = LANGUAGE_DEFAULTS[langCode]?.label || langInfo?.nativeName || langCode;
      const sceneVoiceovers: Record<number, string> = {};
      const sceneCaptions: Record<number, any[]> = {};
      const sceneDialogues: Record<number, string> = {};

      scenes.forEach((sc: any) => {
        const scIdx = sc.index;
        if (langCode === mainLang) {
          const vUrl = sc.voiceover_url || sc.voiceoverUrl;
          const cData = sc.captions_data || sc.captionsData;
          if (vUrl) sceneVoiceovers[scIdx] = vUrl;
          if (cData) sceneCaptions[scIdx] = cData;
          if (sc.dialogue) sceneDialogues[scIdx] = Array.isArray(sc.dialogue) ? sc.dialogue.map((d: any) => d.line).join(' ') : sc.dialogue;
        } else if (sc.translations?.[langCode]) {
          const trans = sc.translations[langCode];
          const vUrl = trans.voiceover_url || trans.voiceoverUrl;
          const cData = trans.captions_data || trans.captionsData;
          if (vUrl) sceneVoiceovers[scIdx] = vUrl;
          if (cData) sceneCaptions[scIdx] = cData;
          if (trans.dialogue || trans.translated_dialogue || trans.translatedDialogue) {
            sceneDialogues[scIdx] = trans.dialogue || trans.translated_dialogue || trans.translatedDialogue;
          }
        }
      });

      return {
        language_code: langCode,
        language_label: label,
        scene_voiceovers: sceneVoiceovers,
        scene_captions: sceneCaptions,
        scene_dialogues: sceneDialogues,
      };
    });
  }

  // ─── Auto-save Character Avatars to Server ─────────────────────────────────
  async function saveCharacterAvatars(seriesId: string) {
    try {
      await http.put(`/series/${seriesId}/characters`, {
        characters: charactersList.value,
      });
    } catch (err) {
      console.warn('[saveCharacterAvatars] Failed to auto-save character avatars:', err);
    }
  }

  async function updateSeries(id: string, updates: {
    title?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';
    description?: string;
    visual_style?: string;
    genre?: string;
  }) {
    isLoading.value = true;
    try {
      const res: any = await http.patch(`/series/${id}`, updates);
      const updated = res?.data?.series || res?.series || res?.data;
      if (updated) {
        const idx = seriesList.value.findIndex(s => s.id === id);
        if (idx >= 0) {
          seriesList.value[idx] = { ...seriesList.value[idx], ...updated };
        }
        if (currentSeries.value?.id === id) {
          currentSeries.value = { ...currentSeries.value, ...updated };
        }
      }
      return updated;
    } finally {
      isLoading.value = false;
    }
  }

  async function renameSeries(id: string, title: string) {
    return updateSeries(id, { title });
  }

  async function archiveSeries(id: string) {
    return updateSeries(id, { status: 'ARCHIVED' });
  }

  async function unarchiveSeries(id: string) {
    return updateSeries(id, { status: 'DRAFT' });
  }

  async function deleteSeries(id: string) {
    isLoading.value = true;
    try {
      await http.delete(`/series/${id}`);
      seriesList.value = seriesList.value.filter(s => s.id !== id);
      if (currentSeries.value?.id === id) {
        currentSeries.value = null;
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCharacter(charId: string, updates: Partial<Character>) {
    const char = charactersList.value.find(c => c.id === charId || c.name === charId);
    if (char) {
      Object.assign(char, updates);
    }
    const seriesId = currentSeries.value?.id;
    if (seriesId) {
      try {
        await http.put(`/series/${seriesId}/characters`, {
          characters: charactersList.value,
        });
      } catch (err) {
        console.warn('Failed to update character to server:', err);
      }
    }
  }

  return {
    seriesList,
    currentSeries,
    episodesList,
    charactersList,
    activeEpisodeId,
    activeEpisode,
    activeScript,
    isLoading,
    isScriptLoading,
    fetchSeriesList,
    createSeries,
    updateSeries,
    renameSeries,
    archiveSeries,
    unarchiveSeries,
    getSeriesById,
    loadWorkspaceData,
    loadEpisodeScript,
    selectEpisode,
    generateScriptForEpisode,
    deleteSeries,
    getCharacterById,
    updateCharacter,
    updateCharacterAvatar,
    updateSceneStoryboard,
    updateSceneVideoUrl,
    updateSceneAssets,
    saveEpisodeScenes,
    saveCharacterAvatars,
    updateLanguageTrackVoiceover,
    updateLanguageTrackCaptions,
    updateLanguageTrackDialogue,
    getLanguageTrackDialogue,
    updateEpisodeDubbingSettings,
    updateEpisodeCaptionSettings,
    getLanguageTracks,
    activeLanguageCode,
    setActiveLanguage,
    LANGUAGE_DEFAULTS,
    activePreviewCaptionLang,
    activePreviewVoiceLang,
    captionLanguages,
    dubbingLanguages,
    setCaptionLanguages,
    setDubbingLanguages,
    addCaptionLanguage,
    removeCaptionLanguage,
    addDubbingLanguage,
    removeDubbingLanguage,
    setPreviewCaptionLanguage,
    setPreviewVoiceLanguage,
    syncVoiceoverTrackToTimeline,
    syncCaptionTrackToTimeline,
  };
});
