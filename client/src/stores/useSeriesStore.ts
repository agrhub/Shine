import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/http';

export interface ScriptScene {
  index: number;
  sceneNumber?: number;
  shotNumber?: number;
  title?: string;
  heading: string;
  location: string;
  timeOfDay: string;
  lightingMood?: string;
  frameDescription?: string;
  cameraMovement?: string;
  action: string;
  characterCostumes?: Array<{
    character: string;
    wardrobe: string;
    variantId?: string;
  }>;
  props?: string[];
  dialogue: Array<{
    character: string;
    line: string;
    emotion?: string;
    speechTone?: string;
  }>;
  durationSeconds: number;
  bgmMood?: string;
  sfxCues?: string[];
  referenceAssets?: {
    characters?: string[];
    locations?: string[];
    props?: string[];
  };
  visualPrompt?: string;
  storyboardFrameUrl?: string;
  videoUrl?: string;
  voiceoverUrl?: string;
  bgmUrl?: string;
  captionsData?: Array<{ startMs: number; endMs: number; text: string }>;
}

export interface EpisodeScript {
  episode: string;
  episodeNumber: number;
  title: string;
  synopsis?: string;
  screenplay?: string;
  sceneCore?: string;
  conflictEscalation?: string;
  cliffhangerHook?: string;
  totalDurationSeconds?: number;
  scenes: ScriptScene[];
  characters?: any[];
  locations?: any[];
  props?: any[];
}

export interface CharacterItem {
  id: string;
  seriesId?: string;
  name: string;
  role: string;
  age?: number;
  gender?: string;
  nationality?: string;
  voiceId?: string;
  identity?: string;
  traits?: string;
  visualTraits?: string;
  physicalCharacteristics?: string;
  appearance?: string;
  clothingAndAccessories?: string;
  speechStyle?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  loraModel?: string;
  description?: string;
  meshMatchRate?: number;
  anchors?: Array<{
    id: string;
    name: string;
    landmarkType?: string;
    matchScore?: number;
    status?: 'locked' | 'pending';
    imageUrl?: string;
  }>;
  wardrobe?: Array<{
    id?: string;
    name: string;
    category?: string;
    status?: string;
    thumbnailUrl?: string;
  }>;
  wardrobeVariants?: Array<{
    variantId: string;
    name: string;
    clothingAndAccessories?: string;
    imageUrl?: string;
  }>;
}

export interface CaptionCue {
  id?: string;
  text: string;
  startMs: number;
  endMs: number;
  words?: Array<{ text: string; from: number; to: number; isKeyWord?: boolean }>;
}

export interface LanguageTrack {
  languageCode: string;  // e.g. 'vi-VN', 'en-US', 'zh-CN'
  languageLabel: string; // e.g. 'Tiếng Việt', 'English', '中文'
  voiceId?: string;      // Gemini voice ID for this language
  sceneVoiceovers: Record<number, string>;      // sceneIndex -> audioUrl
  sceneCaptions: Record<number, CaptionCue[]>;  // sceneIndex -> cues
}

export interface EpisodeItem {
  id: string;
  number: number;
  episodeNumber?: number;
  title: string;
  synopsis?: string;
  screenplay?: string;
  script?: string;
  sceneCore?: string;
  conflictEscalation?: string;
  cliffhangerHook?: string;
  duration: string;
  durationSeconds?: number;
  scenesCount: string;
  status: string;
  statusClass: string;
  thumb: string;
  scenes?: ScriptScene[];
  characters?: any[];
  locations?: any[];
  props?: any[];
  languageTracks?: LanguageTrack[];
  activeLanguageCode?: string;
  videoUrlsByLang?: Record<string, string>;
  renderUrl?: string;
}

export interface Series {
  id: string;
  title: string;
  genre: string;
  synopsis?: string;
  description?: string;
  visual_style?: string;
  visual_style_prompt?: string;
  target_audience?: string;
  country?: string;
  ratio?: string;
  viral_hook?: string;
  master_plan?: any;
  characters?: CharacterItem[];
  locations?: any[];
  props?: any[];
  episode_count: number;
  episodes_count?: number;
  totalEpisodes?: number;
  status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';
  created_at?: string;
  updated_at?: string;
}

export const useSeriesStore = defineStore('series', () => {
  const seriesList = ref<Series[]>([]);
  const currentSeries = ref<Series | null>(null);
  const episodesList = ref<EpisodeItem[]>([]);
  const charactersList = ref<CharacterItem[]>([]);
  const activeEpisodeId = ref<string>('');
  const activeLanguageCode = ref<string>('vi-VN');
  const activeScript = ref<EpisodeScript | null>(null);
  const isLoading = ref(false);
  const isScriptLoading = ref(false);

  const activeEpisode = computed(() => {
    return episodesList.value.find(ep => ep.id === activeEpisodeId.value) || episodesList.value[0] || null;
  });

  function setActiveLanguage(code: string) {
    if (!code) return;
    activeLanguageCode.value = code;
    const ep = activeEpisode.value;
    if (ep) {
      ep.activeLanguageCode = code;
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function fetchSeriesList(params?: { userId?: string }) {
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
  }) {
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
          charactersList.value = rawChars.map((c: any, idx: number) => ({
            id: c.id || `char_${seriesId}_${idx + 1}`,
            seriesId,
            name: c.name,
            role: c.role || 'protagonist',
            gender: c.gender || (idx === 0 ? 'male' : idx === 1 ? 'female' : 'neutral'),
            age: c.age || 25,
            nationality: c.nationality || res.data.series.country || 'Vietnam',
            voiceId: c.voiceId || (c.gender === 'female' ? 'Kore' : 'Fenrir'),
            identity: c.identity || c.traits || '',
            traits: c.traits || '',
            speechStyle: c.speechStyle || c.speech_style || 'Sharp and concise',
            // Only use real avatar URLs — no fake placeholder images
            avatar: c.avatarUrl || c.avatar_url || c.avatar || null,
            avatarUrl: c.avatarUrl || c.avatar_url || c.avatar || null,
            loraModel: c.loraAnchor || c.lora_model || `lora-${(c.name || 'char').toLowerCase().replace(/\s+/g, '-')}-sdxl`,
            description: c.description || '',
            anchors: c.anchors || [],
            meshMatchRate: c.meshMatchRate || 0,
            wardrobe: c.wardrobe || []
          }));
        }

        // 2. Sync Episodes
        if (res.data.episodes && Array.isArray(res.data.episodes)) {
          episodesList.value = res.data.episodes.map((ep: any, idx: number) => ({
            id: ep.id,
            number: Number(ep.episode_number) || idx + 1,
            episodeNumber: Number(ep.episode_number) || idx + 1,
            title: ep.title || `Episode ${idx + 1}`,
            synopsis: ep.synopsis || '',
            screenplay: ep.screenplay || ep.script || '',
            script: ep.script || ep.screenplay || '',
            sceneCore: ep.scene_core || '',
            conflictEscalation: ep.conflict_escalation || '',
            cliffhangerHook: ep.cliffhanger_hook || '',
            duration: ep.duration ? formatTime(ep.duration) : '1:30',
            durationSeconds: ep.duration || 90,
            scenesCount: `${ep.scenes?.length || 3} scenes`,
            status: ep.status === 'PUBLISHED' ? 'PUBLISHED' : ep.status === 'REVIEW' ? 'REVIEWING' : 'LIVE EDITING',
            statusClass: ep.status === 'PUBLISHED' ? 'text-green-500 bg-green-500/10' : 'text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]',
            thumb: ep.thumbnail_url || ep.cover_image || (Array.isArray(ep.scenes) && (ep.scenes[0]?.storyboardFrameUrl || ep.scenes[0]?.imageUrl || ep.scenes[0]?.videoUrl)) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&h=260&fit=crop',
            scenes: ep.scenes || [],
            characters: ep.characters || res.data.series?.characters || [],
            locations: ep.locations || res.data.series?.locations || [],
            props: ep.props || res.data.series?.props || [],
            languageTracks: ep.languageTracks || [],
            activeLanguageCode: ep.activeLanguageCode || 'vi-VN',
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
            targetEp.scenesCount = `${res.data.scenes.length} scenes`;
          }
          if (res.data.languageTracks) {
            targetEp.languageTracks = res.data.languageTracks;
          }
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
            targetEp.scenesCount = `${res.data.scenes.length} scenes`;
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
    const char = charactersList.value.find(c => c.id === charId);
    if (char) {
      char.avatar = avatarUrl;
      char.avatarUrl = avatarUrl;
    }
  }

  function updateSceneStoryboard(epId: string, sceneIndex: number, url: string) {
    // Update in activeScript
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex);
      if (scene) {
        scene.storyboardFrameUrl = url;
        (scene as any).imageUrl = url;
      }
    }
    // Update in episodesList scenes
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      if (ep.scenes) {
        const scene = ep.scenes.find((s: any) => s.index === sceneIndex);
        if (scene) {
          (scene as any).storyboardFrameUrl = url;
          (scene as any).imageUrl = url;
        }
      }
      // Auto-update episode thumbnail if scene 1 or no custom thumb
      if (sceneIndex === 1 || !ep.thumb || ep.thumb.includes('unsplash.com')) {
        ep.thumb = url;
        (ep as any).thumbnail_url = url;
        (ep as any).cover_image = url;
      }
    }
  }

  function updateSceneVideoUrl(epId: string, sceneIndex: number, url: string) {
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex) as any;
      if (scene) scene.videoUrl = url;
    }
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep) {
      if (ep.scenes) {
        const scene = ep.scenes.find((s: any) => s.index === sceneIndex) as any;
        if (scene) scene.videoUrl = url;
      }
      // if (sceneIndex === 1 || !ep.thumb || ep.thumb.includes('unsplash.com')) {
      //   ep.thumb = url;
      //   (ep as any).thumbnail_url = url;
      //   (ep as any).cover_image = url;
      // }
    }
  }

  function updateSceneAssets(epId: string, sceneIndex: number, assets: { voiceoverUrl?: string; bgmUrl?: string; captionsData?: any[]; voiceDurationUs?: number; voiceDurationMs?: number; [key: string]: any }) {
    if (activeScript.value?.scenes) {
      const scene = activeScript.value.scenes.find(s => s.index === sceneIndex) as any;
      if (scene) {
        if (assets.voiceoverUrl) scene.voiceoverUrl = assets.voiceoverUrl;
        if (assets.bgmUrl) scene.bgmUrl = assets.bgmUrl;
        if (assets.captionsData) scene.captionsData = assets.captionsData;
        if (assets.voiceDurationUs) scene.voiceDurationUs = assets.voiceDurationUs;
        if (assets.voiceDurationMs) scene.voiceDurationMs = assets.voiceDurationMs;
      }
    }
    const ep = episodesList.value.find(e => e.id === epId);
    if (ep?.scenes) {
      const scene = ep.scenes.find((s: any) => s.index === sceneIndex) as any;
      if (scene) {
        if (assets.voiceoverUrl) scene.voiceoverUrl = assets.voiceoverUrl;
        if (assets.bgmUrl) scene.bgmUrl = assets.bgmUrl;
        if (assets.captionsData) scene.captionsData = assets.captionsData;
        if (assets.voiceDurationUs) scene.voiceDurationUs = assets.voiceDurationUs;
        if (assets.voiceDurationMs) scene.voiceDurationMs = assets.voiceDurationMs;
      }
    }
  }

  // ─── Auto-save Episode Scenes to Server ────────────────────────────────────
  async function saveEpisodeScenes(seriesId: string, epId: string) {
    const ep = episodesList.value.find(e => e.id === epId);
    const scenes = ep?.scenes || activeScript.value?.scenes || [];
    if (!scenes.length) return;
    const thumbUrl = ep?.thumb || (ep as any)?.thumbnail_url || (scenes[0]?.storyboardFrameUrl || (scenes[0] as any)?.imageUrl);
    try {
      await http.put(`/series/${seriesId}/episodes/${epId}`, {
        scenes,
        title: ep?.title,
        synopsis: ep?.synopsis,
        thumbnail_url: thumbUrl,
        cover_image: thumbUrl,
        languageTracks: ep?.languageTracks || [],
      });
    } catch (err) {
      console.warn('[saveEpisodeScenes] Failed to auto-save episode scenes:', err);
    }
  }

  // ─── Language Track Mutations ─────────────────────────────────────────────────
  const LANGUAGE_DEFAULTS: Record<string, { label: string; voiceId: string }> = {
    'vi-VN': { label: 'Tiếng Việt', voiceId: 'Kore' },
    'en-US': { label: 'English', voiceId: 'Puck' },
    'zh-CN': { label: '中文', voiceId: 'Charon' },
    'ja-JP': { label: '日本語', voiceId: 'Aoede' },
    'ko-KR': { label: '한국어', voiceId: 'Fenrir' },
  };

  function ensureLanguageTrack(epId: string, langCode: string): LanguageTrack {
    const ep = episodesList.value.find(e => e.id === epId);
    if (!ep) throw new Error(`Episode ${epId} not found`);
    if (!ep.languageTracks) ep.languageTracks = [];
    let track = ep.languageTracks.find(t => t.languageCode === langCode);
    if (!track) {
      const def = LANGUAGE_DEFAULTS[langCode] || { label: langCode, voiceId: 'Puck' };
      track = { languageCode: langCode, languageLabel: def.label, voiceId: def.voiceId, sceneVoiceovers: {}, sceneCaptions: {} };
      ep.languageTracks.push(track);
    }
    return track;
  }

  function updateLanguageTrackVoiceover(epId: string, langCode: string, sceneIndex: number, url: string) {
    const track = ensureLanguageTrack(epId, langCode);
    track.sceneVoiceovers[sceneIndex] = url;
    updateSceneAssets(epId, sceneIndex, { voiceoverUrl: url });
  }

  function updateLanguageTrackCaptions(epId: string, langCode: string, sceneIndex: number, cues: CaptionCue[]) {
    const track = ensureLanguageTrack(epId, langCode);
    track.sceneCaptions[sceneIndex] = cues;
    updateSceneAssets(epId, sceneIndex, { captionsData: cues });
  }

  function getLanguageTracks(epId: string): LanguageTrack[] {
    return episodesList.value.find(e => e.id === epId)?.languageTracks || [];
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

  async function updateCharacter(charId: string, updates: Partial<CharacterItem>) {
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
    updateCharacter,
    updateCharacterAvatar,
    updateSceneStoryboard,
    updateSceneVideoUrl,
    updateSceneAssets,
    saveEpisodeScenes,
    saveCharacterAvatars,
    updateLanguageTrackVoiceover,
    updateLanguageTrackCaptions,
    getLanguageTracks,
    activeLanguageCode,
    setActiveLanguage,
    LANGUAGE_DEFAULTS,
  };
});
