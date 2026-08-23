import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/http';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { getVisualStyleById } from '@/constants/visualStyles';
import { toast } from 'vue-sonner';
import i18n from '@/i18n';
import { core } from '@/utils/project';
import { generateCaptionClips } from '@/utils/caption-generator';

import { normalizeTransitionKey } from '@/constants/transitions';
import { normalizeEffectKey } from '@/constants/effects';
export { normalizeTransitionKey, normalizeEffectKey };

export type StepStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  icon: string;
  status: StepStatus;
}

export interface SceneRenderStatus {
  sceneIndex: number;
  bgStatus: StepStatus;
  endFrameStatus?: StepStatus;
  videoStatus: StepStatus;
  voiceoverStatus: StepStatus;
  bgmStatus: StepStatus;
  captionStatus: StepStatus;
  storyboardUrl?: string;
  endFrameUrl?: string;
  videoUrl?: string;
  voiceoverUrl?: string;
  bgmUrl?: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral' | string;
  language?: string;
  description?: string;
  audioSampleUrl?: string;
}

export const usePipelineStore = defineStore('pipeline', () => {
  const seriesStore = useSeriesStore();

  // ─── Voice Presets Catalog ────────────────────────────────────────────────
  const voicePresets = ref<VoicePreset[]>([]);
  const isVoicePresetsLoading = ref(false);

  async function fetchVoicePresets(force = false) {
    if (voicePresets.value.length > 0 && !force) {
      return voicePresets.value;
    }
    isVoicePresetsLoading.value = true;
    try {
      const res: any = await http.get('/voices/presets');
      const list = res?.data || res;
      if (Array.isArray(list)) {
        voicePresets.value = list;
      }
    } catch (e) {
      console.warn('Failed to load voice presets from API', e);
    } finally {
      isVoicePresetsLoading.value = false;
    }
    return voicePresets.value;
  }

  // ─── 10-Step Pipeline ─────────────────────────────────────────────────────
  const pipelineSteps = ref<PipelineStep[]>([
    { id: 'b1', label: 'Cast Render', icon: 'UserFilled', status: 'idle' },
    { id: 'b2', label: 'Assets & Storyboard', icon: 'Picture', status: 'idle' },
    { id: 'b3', label: 'Storyboard to Video', icon: 'Film', status: 'idle' },
    // { id: 'b4', label: 'Voiceover TTS (B4)', icon: 'Microphone', status: 'idle' },
    // { id: 'b5', label: 'AI Music & BGM (B5)', icon: 'Headset', status: 'idle' },
    // { id: 'b6', label: 'AI Captions (B6)', icon: 'ChatSquare', status: 'idle' },
    { id: 'b7', label: 'Preview Video', icon: 'VideoPlay', status: 'idle' },
    { id: 'b8', label: 'Export Video', icon: 'Cpu', status: 'idle' },
    // { id: 'b9', label: 'Upload Episode', icon: 'Upload', status: 'idle' },
    // { id: 'b10', label: 'Publish', icon: 'Promotion', status: 'idle' },
  ]);

  // ─── Per-Scene Render Status ───────────────────────────────────────────────
  const sceneRenderStatuses = ref<Map<number, SceneRenderStatus>>(new Map());

  // ─── Per-Character Render Status ──────────────────────────────────────────
  const characterRenderStatuses = ref<Map<string, 'idle' | 'running' | 'done' | 'error'>>(new Map());

  // ─── Global Active Rendering State ─────────────────────────────────────────
  const isRendering = ref(false);
  const currentRenderingMessage = ref('');
  const currentRenderingPercent = ref(0);
  const currentRenderingScene = ref<number | null>(null);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const doneStepsCount = computed(() => pipelineSteps.value.filter(s => s.status === 'done').length);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function setStepStatus(id: string, status: StepStatus) {
    const step = pipelineSteps.value.find(s => s.id === id);
    if (step) step.status = status;
  }

  function getSceneStatus(sceneIndex: number): SceneRenderStatus {
    if (!sceneRenderStatuses.value.has(sceneIndex)) {
      sceneRenderStatuses.value.set(sceneIndex, {
        sceneIndex,
        bgStatus: 'idle',
        videoStatus: 'idle',
        voiceoverStatus: 'idle',
        bgmStatus: 'idle',
        captionStatus: 'idle',
      });
    }
    return sceneRenderStatuses.value.get(sceneIndex)!;
  }

  function updateSceneStatus(sceneIndex: number, patch: Partial<SceneRenderStatus>) {
    const current = getSceneStatus(sceneIndex);
    sceneRenderStatuses.value.set(sceneIndex, { ...current, ...patch });
  }

  function getCharStatus(charId: string) {
    return characterRenderStatuses.value.get(charId) || 'idle';
  }

  // Sync step statuses with current active episode data
  function syncStepStatusesWithEpisode(episode: any, characters?: any[]) {
    if (!episode) return;
    const scenes = episode.scenes || [];
    if (!scenes.length) return;

    const langTracks = episode.languageTracks || [];
    const activeLang = seriesStore.activeLanguageCode || 'vi-VN';
    const track = langTracks.find((t: any) => t.languageCode === activeLang) || langTracks[0];

    const allHaveBg = scenes.every((s: any) => s.storyboardFrameUrl);
    const allHaveVideo = scenes.every((s: any) => s.videoUrl);
    const allHaveVoiceover = scenes.every((s: any) => s.voiceoverUrl || track?.sceneVoiceovers?.[s.index]);
    const allHaveBgm = scenes.every((s: any) => s.bgmUrl);
    const allHaveCaptions = scenes.every((s: any) => s.captionsData?.length || track?.sceneCaptions?.[s.index]?.length);

    const chars = (Array.isArray(characters) && characters.length > 0) ? characters : (seriesStore.charactersList || []);
    const allCharsDone = chars.length > 0 && chars.every((c: any) => c.avatar || c.avatarUrl);

    setStepStatus('b1', allCharsDone ? 'done' : 'idle');
    setStepStatus('b2', allHaveBg ? 'done' : 'idle');
    setStepStatus('b3', allHaveVideo ? 'done' : 'idle');
    setStepStatus('b4', allHaveVoiceover ? 'done' : 'idle');
    setStepStatus('b5', allHaveBgm ? 'done' : 'idle');
    setStepStatus('b6', allHaveCaptions ? 'done' : 'idle');

    scenes.forEach((s: any) => {
      const voiceSrc = track?.sceneVoiceovers?.[s.index] || s.voiceoverUrl;
      const capData = track?.sceneCaptions?.[s.index] || s.captionsData;
      updateSceneStatus(s.index, {
        bgStatus: s.storyboardFrameUrl ? 'done' : 'idle',
        videoStatus: s.videoUrl ? 'done' : 'idle',
        voiceoverStatus: voiceSrc ? 'done' : 'idle',
        bgmStatus: s.bgmUrl ? 'done' : 'idle',
        captionStatus: (capData && capData.length > 0) ? 'done' : 'idle',
        storyboardUrl: s.storyboardFrameUrl,
        videoUrl: s.videoUrl,
        voiceoverUrl: voiceSrc,
        bgmUrl: s.bgmUrl,
      });
    });
  }

  // ─── B1: Character Render & Persona Lock ─────────────────────────────────────
  async function renderCharacter(char: any) {
    characterRenderStatuses.value.set(char.id, 'running');
    setStepStatus('b1', 'running');
    isRendering.value = true;
    currentRenderingMessage.value = `Rendering Character: ${char.name || 'Lead'}`;
    currentRenderingPercent.value = 40;

    try {
      const sId = seriesStore.currentSeries?.id;
      const targetAspect = seriesStore.currentSeries?.ratio || '9:16';
      const seriesGenre = seriesStore.currentSeries?.genre || 'micro-drama';
      const currentStyle = seriesStore.currentSeries?.visual_style || 'realistic';
      const styleObj = getVisualStyleById(currentStyle);

      const res: any = await http.post(`/characters/${char.id}/portrait`, {
        seriesId: sId,
        characterId: char.id,
        name: char.name,
        visualTraits: char.visualTraits || char.identity || `${char.name}, role: ${char.role || 'lead'}, ${char.personality || 'intense expression'}, ${seriesGenre}`,
        style: styleObj.promptModifier,
        visualStyle: currentStyle,
        visualStylePrompt: styleObj.promptModifier,
        aspectRatio: targetAspect,
      });

      const url = res?.data?.imageUrl || res?.data?.url;
      if (url) {
        characterRenderStatuses.value.set(char.id, 'done');
        seriesStore.updateCharacterAvatar(char.id, url);
        // Auto-save avatar immediately
        if (sId) await seriesStore.saveCharacterAvatars(sId);
      } else {
        characterRenderStatuses.value.set(char.id, 'done');
      }
      setStepStatus('b1', 'done');
      currentRenderingPercent.value = 100;
    } catch (err) {
      characterRenderStatuses.value.set(char.id, 'error');
      setStepStatus('b1', 'error');
      throw err;
    } finally {
      isRendering.value = false;
    }
  }

  // Smart batch B1: only render character without an avatar
  async function renderAllCharacters() {
    const sId = seriesStore.currentSeries?.id;
    const characters = seriesStore.charactersList || [];
    setStepStatus('b1', 'running');
    isRendering.value = true;
    let hasError = false;
    console.log(`[Pipeline] Rendering ${characters.length} characters...`);
    const toRender = characters.filter(c => !c.avatar && !c.avatarUrl);
    const total = toRender.length || 1;

    for (let i = 0; i < toRender.length; i++) {
      const char = toRender[i];
      currentRenderingMessage.value = `Rendering Character (${i + 1}/${total}): ${char.name}`;
      currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
      try {
        await renderCharacter(char);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b1', hasError ? 'error' : 'done');
    isRendering.value = false;
  }

  // ─── B2: Scene Background & Storyboard Render (With Character Face References) ─
  async function renderScene(sceneIndex: number, sceneData: any) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { bgStatus: 'running' });
    setStepStatus('b2', 'running');
    isRendering.value = true;
    currentRenderingScene.value = sceneIndex;
    currentRenderingMessage.value = `Rendering Scene ${sceneIndex} Background`;
    currentRenderingPercent.value = 35;

    try {
      const sId = seriesStore.currentSeries?.id;
      const currentGenre = seriesStore.currentSeries?.genre || 'cinematic micro-drama';
      const targetAspect = seriesStore.currentSeries?.ratio || '9:16';
      const currentStyle = seriesStore.currentSeries?.visual_style || 'realistic';
      const styleObj = getVisualStyleById(currentStyle);

      const sceneChars = Array.isArray(sceneData.characters) && sceneData.characters.length > 0
        ? sceneData.characters
        : (sceneData.dialogue || []).map((d: any) => d.character).filter(Boolean);

      const res: any = await http.post('/assets/image-generate', {
        seriesId: sId,
        episodeId: epId,
        sceneIndex,
        sceneId: `scene_${String(sceneIndex).padStart(2, '0')}`,
        prompt: sceneData.visualPrompt || sceneData.description || undefined,
        sceneData,
        aspectRatio: targetAspect,
        visualStyle: currentStyle,
        visualStylePrompt: styleObj.promptModifier,
        style: sceneData.lightingMood || styleObj.promptModifier,
        characters: sceneChars,
      });

      const url = res?.data?.imageUrl || res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { bgStatus: 'done', storyboardUrl: url });
        seriesStore.updateSceneStoryboard(epId, sceneIndex, url);
        // Auto-save scene assets immediately
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
      } else {
        updateSceneStatus(sceneIndex, { bgStatus: 'done' });
      }
      currentRenderingPercent.value = 100;
    } catch (err) {
      updateSceneStatus(sceneIndex, { bgStatus: 'error' });
      setStepStatus('b2', 'error');
      throw err;
    } finally {
      isRendering.value = false;
    }
  }

  // Smart batch B2: only render scenes without a background image
  async function renderAllScenes() {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    // Skip scenes that already have a background or video
    const scenes = allScenes.filter((s: any) => !s.storyboardFrameUrl && !s.videoUrl);

    if (allScenes.length === 0) {
      toast.warning(i18n.global.t('toast.noScenesAvailableToRender'));
      return;
    }
    if (scenes.length === 0) {
      toast.info(i18n.global.t('toast.allScenesAlreadyRendered', 'All scenes already have backgrounds'));
      return;
    }

    setStepStatus('b2', 'running');
    isRendering.value = true;
    let hasError = false;
    const total = scenes.length;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      currentRenderingScene.value = scene.index;
      currentRenderingMessage.value = `Rendering Scene ${scene.index} Background (${i + 1}/${total})`;
      currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
      try {
        await renderScene(scene.index, scene);
      } catch {
        hasError = true;
      }
    }

    setStepStatus('b2', hasError ? 'error' : 'done');
    isRendering.value = false;
  }

  // ─── B3: Image-to-Video Render ─────────────────────────────────────────────
  async function renderSceneVideo(sceneIndex: number, scene: any) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { videoStatus: 'running' });
    setStepStatus('b3', 'running');
    isRendering.value = true;
    currentRenderingScene.value = sceneIndex;
    currentRenderingMessage.value = `Rendering Scene ${sceneIndex} Video`;
    currentRenderingPercent.value = 50;

    try {
      const sId = seriesStore.currentSeries?.id;
      const calculatedDuration = Math.min(8, Math.max(4, Number(scene.durationSeconds) || 5));
      const targetMotion = scene.motion || scene.motionIntensity || 'cinematic_motion';
      const targetCamera = scene.cameraMovement || scene.cameraAngle || 'dolly_in';

      const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
      const nextScene = allScenes.find((s: any) => s.index === sceneIndex + 1) as any;
      const nextFrameUrl = nextScene?.storyboardFrameUrl || nextScene?.imageUrl;

      const res: any = await http.post('/assets/video-generate', {
        seriesId: sId,
        startFrameUrl: scene.storyboardFrameUrl || (scene as any).imageUrl,
        endFrameUrl: nextFrameUrl || undefined,
        episodeId: epId,
        sceneId: `scene_${String(sceneIndex).padStart(2, '0')}`,
        duration: calculatedDuration,
        motion: targetMotion,
        cameraMovement: targetCamera,
        prompt: scene.visualPrompt || scene.description || undefined,
        sceneData: scene,
      });

      const url = res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { videoStatus: 'done', videoUrl: url });
        seriesStore.updateSceneVideoUrl(epId, sceneIndex, url);

        // 1. Update Video Clip Properties & Transitions directly on OpenVideo Timeline
        await syncVideoClipToTimeline(sceneIndex, url, calculatedDuration, scene, res?.data);

        // 2. If scene has dialogue, trigger consistent TTS Voiceover & Synchronized Captions
        if (Array.isArray(scene.dialogue) && scene.dialogue.length > 0 && !scene.voiceoverUrl) {
          // const firstChar = scene.dialogue[0]?.character;
          // const matchedCast = (seriesStore.charactersList || []).find((c: any) => c.name?.toLowerCase().trim() === String(firstChar || '').toLowerCase().trim());
          // const defaultVoice = matchedCast?.voiceId || (matchedCast?.gender === 'female' ? 'Aoede' : 'Puck');
          // Non-blocking trigger so UI stays fast
          // renderSceneVoiceover(sceneIndex, scene.dialogue, defaultVoice, 85, 1.1).catch(err => {
          //   console.warn(`[Pipeline] Auto Voiceover for scene ${sceneIndex} notice:`, err?.message);
          // });
        }

        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
      } else {
        updateSceneStatus(sceneIndex, { videoStatus: 'done' });
      }
      setStepStatus('b3', 'done');
      currentRenderingPercent.value = 100;
    } catch (err) {
      updateSceneStatus(sceneIndex, { videoStatus: 'error' });
      setStepStatus('b3', 'error');
      throw err;
    } finally {
      isRendering.value = false;
    }
  }

  // Smart batch B3: only render scenes that have a BG image but no video yet
  async function renderAllVideos() {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    const scenes = allScenes.filter((s: any) => s.storyboardFrameUrl && !s.videoUrl);

    if (scenes.length === 0) {
      toast.info(i18n.global.t('toast.noScenesNeedVideo', 'All scenes already have videos or are missing backgrounds'));
      return;
    }

    setStepStatus('b3', 'running');
    isRendering.value = true;
    let hasError = false;
    const total = scenes.length;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      currentRenderingScene.value = scene.index;
      currentRenderingMessage.value = `Rendering Scene ${scene.index} Video (${i + 1}/${total})`;
      currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
      try {
        await renderSceneVideo(scene.index, scene);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b3', hasError ? 'error' : 'done');
    isRendering.value = false;
  }

  // ─── Scene Voiceover Render ─────────────────────────────────────────────
  async function renderSceneVoiceover(
    sceneIndex: number,
    dialogue: any[],
    voicePreset: string,
    intensity: number,
    speed: number,
    languageCode?: string,
  ) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId || dialogue.length === 0) return;

    updateSceneStatus(sceneIndex, { voiceoverStatus: 'running' });
    setStepStatus('b4', 'running');
    isRendering.value = true;
    currentRenderingScene.value = sceneIndex;
    currentRenderingMessage.value = `Generating Voiceover for Scene ${sceneIndex}`;
    currentRenderingPercent.value = 50;

    try {
      const text = dialogue.map((d: any) => `${d.character}: ${d.line}`).join('\n');
      const res: any = await http.post('/voices/tts', {
        episodeId: epId,
        sceneIndex,
        text,
        voiceId: voicePreset,
        intensity,
        speed,
        dialogue,
        language: languageCode || seriesStore.currentSeries?.country || 'en-US',
      });

      const url = res?.data?.audioUrl || res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { voiceoverStatus: 'done', voiceoverUrl: url });
        if (languageCode) {
          seriesStore.updateLanguageTrackVoiceover(epId, languageCode, sceneIndex, url);
        } else {
          seriesStore.updateSceneAssets(epId, sceneIndex, { voiceoverUrl: url });
        }

        // Sync Voiceover Audio and Captions on OpenVideo Timeline
        const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
        const currentScene = allScenes.find((s: any) => s.index === sceneIndex) || { index: sceneIndex, dialogue };
        await syncSceneVoiceoverAndCaptionsToTimeline(sceneIndex, url, res?.data?.cues || dialogue, currentScene);

        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
      } else {
        updateSceneStatus(sceneIndex, { voiceoverStatus: 'done' });
      }
      setStepStatus('b4', 'done');
      currentRenderingPercent.value = 100;
    } catch (err) {
      updateSceneStatus(sceneIndex, { voiceoverStatus: 'error' });
      setStepStatus('b4', 'error');
      throw err;
    } finally {
      isRendering.value = false;
    }
  }

  // Smart batch B4: render dialogue scenes without voiceover for a given language
  async function renderAllVoiceovers(voicePreset = 'Puck', intensity = 85, speed = 1.1, languageCode?: string) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];

    if (languageCode) {
      // Smart skip: only scenes not yet rendered for this language track
      const tracks = seriesStore.getLanguageTracks(epId);
      const track = tracks.find(t => t.languageCode === languageCode);
      const scenes = allScenes.filter((s: any) =>
        Array.isArray(s.dialogue) && s.dialogue.length > 0
        && !track?.sceneVoiceovers[s.index]
      );
      const trackVoice = track?.voiceId || voicePreset;
      if (scenes.length === 0) {
        toast.info(i18n.global.t('toast.allVoiceoversAlreadyRendered', { lang: languageCode }));
        return;
      }
      setStepStatus('b4', 'running');
      isRendering.value = true;
      let hasError = false;
      const total = scenes.length;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        currentRenderingScene.value = scene.index;
        currentRenderingMessage.value = `Generating Voiceover (${languageCode}) Scene ${scene.index} (${i + 1}/${total})`;
        currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
        try { await renderSceneVoiceover(scene.index, scene.dialogue, trackVoice, intensity, speed, languageCode); }
        catch { hasError = true; }
      }
      setStepStatus('b4', hasError ? 'error' : 'done');
      isRendering.value = false;
    } else {
      // Default: skip scenes already with voiceoverUrl
      const scenes = allScenes.filter((s: any) => Array.isArray(s.dialogue) && s.dialogue.length > 0 && !s.voiceoverUrl);
      if (scenes.length === 0) {
        toast.info(i18n.global.t('toast.allVoiceoversRendered', 'All voiceovers already rendered'));
        return;
      }
      setStepStatus('b4', 'running');
      isRendering.value = true;
      let hasError = false;
      const total = scenes.length;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        currentRenderingScene.value = scene.index;
        currentRenderingMessage.value = `Generating Voiceover Scene ${scene.index} (${i + 1}/${total})`;
        currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
        try { await renderSceneVoiceover(scene.index, scene.dialogue, voicePreset, intensity, speed); }
        catch { hasError = true; }
      }
      setStepStatus('b4', hasError ? 'error' : 'done');
      isRendering.value = false;
    }
  }

  // ─── Scene BGM Render ─────────────────────────────────────────────────────
  async function renderSceneBgm(sceneIndex: number, bgmMood: string, duration: number) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { bgmStatus: 'running' });
    setStepStatus('b5', 'running');
    isRendering.value = true;
    currentRenderingScene.value = sceneIndex;
    currentRenderingMessage.value = `Generating BGM for Scene ${sceneIndex}`;
    currentRenderingPercent.value = 50;

    try {
      const currentGenre = seriesStore.currentSeries?.genre || 'micro_drama_suspense';

      const res: any = await http.post('/assets/music-generate', {
        episodeId: epId,
        sceneIndex,
        prompt: bgmMood || `Cinematic micro-drama score, genre: ${currentGenre}`,
        genre: currentGenre,
        duration: duration || 15,
      });

      const url = res?.data?.audioUrl || res?.data?.musicUrl;
      if (url) {
        updateSceneStatus(sceneIndex, { bgmStatus: 'done', bgmUrl: url });
        seriesStore.updateSceneAssets(epId, sceneIndex, { bgmUrl: url });
        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
      } else {
        updateSceneStatus(sceneIndex, { bgmStatus: 'done' });
      }
      setStepStatus('b5', 'done');
      currentRenderingPercent.value = 100;
    } catch (err) {
      updateSceneStatus(sceneIndex, { bgmStatus: 'error' });
      setStepStatus('b5', 'error');
      throw err;
    } finally {
      isRendering.value = false;
    }
  }

  // Smart batch B5: only render scenes without bgm
  async function renderAllBgm() {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    const scenes = allScenes.filter((s: any) => !s.bgmUrl);

    if (scenes.length === 0) {
      toast.info(i18n.global.t('toast.allBgmRendered', 'All scenes already have BGM'));
      return;
    }

    setStepStatus('b5', 'running');
    isRendering.value = true;
    let hasError = false;
    const total = scenes.length;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      currentRenderingScene.value = scene.index;
      currentRenderingMessage.value = `Generating BGM Scene ${scene.index} (${i + 1}/${total})`;
      currentRenderingPercent.value = Math.round(((i + 1) / total) * 100);
      try {
        await renderSceneBgm(scene.index, scene.bgmMood || 'dramatic cinematic', scene.durationSeconds || 15);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b5', hasError ? 'error' : 'done');
    isRendering.value = false;
  }

  // ─── B6: Caption Generation + Translation per Language ───────────────────────────

  // Generate (and optionally translate) captions for one language; stores cues per-scene
  async function generateCaptionsForLanguage(langCode: string, translateFrom?: string) {
    const epId = seriesStore.activeEpisodeId;
    const sId = seriesStore.currentSeries?.id;
    if (!epId) return;

    const scenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    setStepStatus('b6', 'running');
    isRendering.value = true;
    currentRenderingMessage.value = `Generating Captions (${langCode})`;
    currentRenderingPercent.value = 30;

    const total = scenes.length || 1;
    for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
      const scene = scenes[sIdx];
      currentRenderingScene.value = scene.index;
      currentRenderingMessage.value = `Generating Captions (${langCode}) Scene ${scene.index} (${sIdx + 1}/${total})`;
      currentRenderingPercent.value = Math.round(((sIdx + 1) / total) * 100);
      try {
        const dialogueText = (scene.dialogue || []).map((d: any) => `${d.character}: ${d.line}`).join('\n');
        if (!dialogueText) continue;

        let cues: any[];

        if (translateFrom && translateFrom !== langCode) {
          // Translate from existing track rather than re-generating
          const res: any = await http.post('/captions/translate', {
            episodeId: epId,
            language: langCode,
            text: dialogueText,
          });
          const translated: string = res?.data?.translatedText || dialogueText;
          // Auto-time translated text (fallback timing from scene duration)
          const words = translated.split(' ');
          let timeUs = 0;
          cues = [];
          for (let i = 0; i < words.length; i += 5) {
            const chunk = words.slice(i, i + 5).join(' ');
            const dur = chunk.length * 80000; // ~80ms per char
            cues.push({ id: `cue_${i}`, text: chunk, startMs: timeUs / 1000, endMs: (timeUs + dur) / 1000 });
            timeUs += dur + 200000;
          }
        } else {
          // Auto-generate from scratch
          const res: any = await http.post('/captions/auto-generate', {
            episodeId: epId,
            language: langCode,
            text: dialogueText,
          });
          const rawCues = res?.data?.cues || [];
          cues = rawCues.map((c: any) => ({
            id: c.id,
            text: c.text,
            startMs: c.fromUs ? c.fromUs / 1000 : (c.timing?.display?.from || 0) / 1000,
            endMs: c.toUs ? c.toUs / 1000 : (c.timing?.display?.to || 0) / 1000,
            words: c.words,
          }));
        }

        updateSceneStatus(scene.index, { captionStatus: 'done' });
        seriesStore.updateLanguageTrackCaptions(epId, langCode, scene.index, cues);
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
      } catch (err) {
        console.warn(`[generateCaptionsForLanguage] scene ${scene.index} failed:`, err);
      }
    }

    setStepStatus('b6', 'done');
    isRendering.value = false;
    if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
  }

  // Sync captions (legacy path: flat array of cues with sceneIndex)
  async function syncCaptionsToTimeline(episodeId: string, captionCues: Array<{ sceneIndex: number; startMs: number; endMs: number; text: string }>) {
    const sId = seriesStore.currentSeries?.id;
    const byScene: Record<number, Array<{ startMs: number; endMs: number; text: string }>> = {};
    for (const cue of captionCues) {
      if (!byScene[cue.sceneIndex]) byScene[cue.sceneIndex] = [];
      byScene[cue.sceneIndex].push({ startMs: cue.startMs, endMs: cue.endMs, text: cue.text });
    }
    for (const [idxStr, cues] of Object.entries(byScene)) {
      const idx = Number(idxStr);
      updateSceneStatus(idx, { captionStatus: 'done' });
      seriesStore.updateSceneAssets(episodeId, idx, { captionsData: cues });
    }
    if (sId) await seriesStore.saveEpisodeScenes(sId, episodeId);
  }

  // ─── Timeline Live Sync Helpers ─────────────────────────────────────────────
  async function syncVideoClipToTimeline(sceneIndex: number, videoUrl: string, durationSec: number, scene: any, audioData?: any) {
    try {
      const epId = seriesStore.activeEpisodeId;
      if (!epId) return;
      const state = core.store.getState();
      const clips = { ...(state.clips || {}) };
      const tracks = [ ...(state.tracks || []) ];

      const vClipId = `clip_v_${epId}_s${sceneIndex}`;
      let targetClip: any = clips[vClipId];
      if (!targetClip) {
        targetClip = Object.values(clips).find((c: any) =>
          c.id === vClipId || ((c.type === 'Video' || c.type === 'Image') && (c.name?.includes(`Scene ${sceneIndex}`) || c.label?.includes(`Scene ${sceneIndex}`)))
        );
      }

      const durationUs = Math.round(durationSec * 1_000_000);
      const hasDialogue = Array.isArray(scene.dialogue) && scene.dialogue.length > 0;
      const volume = hasDialogue ? 0 : 1; // Mute camera mic when dedicated TTS dialogue is present

      if (targetClip) {
        targetClip.src = videoUrl;
        targetClip.type = 'Video';
        targetClip.volume = volume;
        const currentFromUs = targetClip.timing?.display?.from ?? (targetClip.display?.from ?? 0);
        targetClip.timing = {
          display: {
            from: currentFromUs,
            to: currentFromUs + durationUs,
          },
          trim: {
            from: 0,
            to: durationUs,
          },
          duration: durationUs,
          playbackRate: 1,
        };
        targetClip.style = targetClip.style || {};
        targetClip.locked = false;
        targetClip.effects = targetClip.effects || [];
        targetClip.animations = targetClip.animations || [];
        targetClip.transform = {
          x: 0,
          y: 0,
          width: 1080,
          height: 1920,
          angle: 0,
          opacity: 1,
          zIndex: 10,
          flip: {
            x: false,
            y: false,
          },
        };

        const effectKey = normalizeEffectKey(scene.videoEffect);
        if (effectKey) {
          targetClip.effects = [
            {
              id: `eff_${targetClip.id}`,
              key: effectKey,
              startTime: 0,
              duration: durationUs,
            },
          ];
        }

        clips[targetClip.id] = { ...targetClip } as any;
      }

      // Add / Update Transition Effect if scene has transitionEffect
      if (sceneIndex > 1) {
        const prevClipId = `clip_v_${epId}_s${sceneIndex - 1}`;
        const transKey = normalizeTransitionKey(scene.transitionEffect);
        if (transKey && clips[prevClipId] && clips[vClipId]) {
          const transClipId = `clip_trans_${epId}_s${sceneIndex - 1}`;
          clips[transClipId] = {
            id: transClipId,
            type: 'Transition',
            name: `Transition: ${transKey}`,
            transitionKey: transKey,
            duration: 1_000_000,
            fromClipId: prevClipId,
            toClipId: vClipId,
          } as any;
        }
      }

      core.store.setState({ ...state, clips, tracks });

      // If backend returned BGM, Voiceover, or Captions directly from video-generate, sync immediately without extra API call!
      if (audioData && (audioData.bgmUrl || audioData.voiceoverUrl || (Array.isArray(audioData.captionsData) && audioData.captionsData.length > 0))) {
        await applySceneAudioDataToTimeline(sceneIndex, audioData, scene);
      } else if (hasDialogue) {
        await separateSceneAudio(sceneIndex, videoUrl, scene.dialogue);
      } else {
        await saveCurrentTimeline(`Scene ${sceneIndex} video clip synced`);
      }
    } catch (e) {
      console.warn('[usePipelineStore] Failed to sync video clip to timeline:', e);
    }
  }

  // ─── Save Timeline Snapshot to Backend DB ─────────────────────────────────
  async function saveCurrentTimeline(changeSummary = 'Pipeline update') {
    try {
      const epId = seriesStore.activeEpisodeId;
      if (!epId) return;
      const state = core.store.getState();
      await http.put(`/episodes/${epId}/timeline`, {
        settings: state.settings,
        tracks: state.tracks,
        clips: state.clips,
        changeSummary,
        clientTimestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('[usePipelineStore] Failed to auto-save timeline snapshot:', e?.message);
    }
  }

  async function syncSceneVoiceoverAndCaptionsToTimeline(
    sceneIndex: number,
    audioUrl: string,
    cues: any[],
    scene: any,
    words?: any[],
    explicitVoiceStartUs?: number,
    explicitVoiceDurationUs?: number
  ) {
    try {
      const epId = seriesStore.activeEpisodeId;
      if (!epId) return;
      const state = core.store.getState();
      const clips = { ...(state.clips || {}) };
      const tracks = [ ...(state.tracks || []) ];

      // Find video clip for this scene to locate starting timestamp
      const vClipId = `clip_v_${epId}_s${sceneIndex}`;
      const vClip: any = clips[vClipId] || Object.values(clips).find((c: any) =>
        c.id === vClipId || ((c.type === 'Video' || c.type === 'Image') && (c.name?.includes(`Scene ${sceneIndex}`) || c.label?.includes(`Scene ${sceneIndex}`)))
      );
      const sceneFromUs = vClip?.timing?.display?.from ?? (vClip?.display?.from ?? 0);
      const sceneDurationUs = vClip?.timing?.duration ?? (vClip?.duration ?? Math.round((scene.durationSeconds || 6) * 1_000_000));

      const rawCues = Array.isArray(cues) && cues.length > 0 ? cues : (scene.dialogue || []);
      if (!audioUrl && rawCues.length === 0) {
        return;
      }

      // Build normalized Deepgram words array
      let wordsList: any[] = [];
      if (Array.isArray(words) && words.length > 0) {
        wordsList = words;
      } else if (Array.isArray(rawCues) && rawCues.length > 0) {
        rawCues.forEach((c: any) => {
          const cueStartSec = (c.fromUs !== undefined && c.fromUs > 100_000)
            ? (c.fromUs / 1_000_000)
            : (c.startMs !== undefined ? c.startMs / 1000 : 0);
          if (Array.isArray(c.words) && c.words.length > 0) {
            c.words.forEach((w: any) => {
              const divisor = (w.from > 20000 || w.to > 20000) ? 1000 : 1;
              wordsList.push({
                word: (w.text || w.word || '').toLowerCase(),
                punctuated_word: w.text || w.word || '',
                start: cueStartSec + (w.from || 0) / divisor / 1000,
                end: cueStartSec + (w.to || ((w.from || 0) + 300)) / divisor / 1000,
                confidence: 0.98,
              });
            });
          } else if (c.text || c.line) {
            const cueDurSec = (c.durationUs && c.durationUs > 100_000)
              ? (c.durationUs / 1_000_000)
              : (c.durationMs ? c.durationMs / 1000 : 2);
            wordsList.push({
              word: (c.text || c.line || '').toLowerCase(),
              punctuated_word: c.text || c.line || '',
              start: cueStartSec,
              end: cueStartSec + cueDurSec,
              confidence: 0.98,
            });
          }
        });
      }

      // Calculate exact dialogue voiceover duration without stretching/repeating
      let voiceStartUs = explicitVoiceStartUs !== undefined && explicitVoiceStartUs >= 0
        ? explicitVoiceStartUs
        : (wordsList.length > 0 ? Math.round(wordsList[0].start * 1_000_000) : 200_000);
      let voiceDurationUs = explicitVoiceDurationUs !== undefined && explicitVoiceDurationUs > 0
        ? explicitVoiceDurationUs
        : (wordsList.length > 0
            ? Math.max(500_000, Math.round((wordsList[wordsList.length - 1].end - wordsList[0].start) * 1_000_000))
            : Math.min(sceneDurationUs - voiceStartUs, 3_000_000));

      voiceDurationUs = Math.min(sceneDurationUs - voiceStartUs, Math.max(100_000, voiceDurationUs));

      // 1. Sync Voiceover Audio Track
      if (audioUrl) {
        let voiceTrack = tracks.find((t: any) => t.id === 'track_voiceover_main' || (t.type === 'Audio' && t.name?.toLowerCase().includes('voice')));
        if (!voiceTrack) {
          voiceTrack = {
            id: 'track_voiceover_main',
            name: '🎙 Voiceover Track',
            type: 'Audio',
            clipIds: [],
          };
          tracks.push(voiceTrack);
        }

        const aClipId = `clip_a_voice_${epId}_s${sceneIndex}`;
        if (!voiceTrack.clipIds.includes(aClipId)) {
          voiceTrack.clipIds.push(aClipId);
        }

        clips[aClipId] = {
          id: aClipId,
          type: 'Audio',
          name: `${rawCues[0]?.character || 'Voice'}: ${rawCues[0]?.text || rawCues[0]?.line || ''}`,
          src: audioUrl,
          timing: {
            display: { from: sceneFromUs + voiceStartUs, to: sceneFromUs + voiceStartUs + voiceDurationUs },
            trim: { from: 0, to: voiceDurationUs },
            duration: voiceDurationUs,
            playbackRate: 1,
          },
          volume: 1,
          style: {},
          locked: false,
          effects: [],
          animations: [],
        } as any;
      }

      // 2. Sync Captions Track
      let captionTrack: any = tracks.find((t: any) => t.id === 'track_captions_main' || t.type === 'Caption' || t.type === 'caption');
      if (!captionTrack) {
        const captionConfig = {
          captions: {
            style: {
              fontSize: 80,
              fontFamily: 'Bangers-Regular',
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
              videoWidth: 1080,
              videoHeight: 1920,
            },
            wordsPerLine: 'multiple',
          },
        };

        captionTrack = {
          id: 'track_captions_main',
          name: '💬 Subtitles / Captions',
          type: 'caption',
          clipIds: [],
          accepts: ['caption'],
          config: captionConfig,
          captions: captionConfig.captions,
        } as any;
        tracks.unshift(captionTrack);
      } else {
        // Move captionTrack to the very top (index 0) if not already there
        const capIdx = tracks.indexOf(captionTrack);
        if (capIdx > 0) {
          tracks.splice(capIdx, 1);
          tracks.unshift(captionTrack);
        }
      }

      const settings = state.settings || { width: 1080, height: 1920 };
      const videoWidth = settings.width || 1080;
      const videoHeight = settings.height || 1920;

      if (wordsList.length > 0) {
        const captionTrackStyle = captionTrack?.config?.captions?.style || {};
        const captionClipsJSON = await generateCaptionClips({
          videoWidth,
          videoHeight,
          words: wordsList,
          fontSize: captionTrackStyle.fontSize || 80,
          fontFamily: captionTrackStyle.fontFamily || 'Inter',
          style: captionTrackStyle,
        });

        captionClipsJSON.forEach((json: any, cIdx: number) => {
          const cClipId = `clip_cap_${epId}_s${sceneIndex}_${cIdx + 1}`;
          if (!captionTrack.clipIds.includes(cClipId)) {
            captionTrack.clipIds.push(cClipId);
          }

          const cueFromUs = json.timing.display.from + sceneFromUs;
          const cueToUs = Math.min(sceneFromUs + sceneDurationUs - 50_000, json.timing.display.to + sceneFromUs);
          const cueDurationUs = cueToUs - cueFromUs;

          const defaultTop = captionTrackStyle.verticalAlign === 'top'
            ? 80
            : captionTrackStyle.verticalAlign === 'center'
              ? Math.round((videoHeight - (json.height || 100)) / 2)
              : videoHeight - 450;

          clips[cClipId] = {
            ...json,
            id: cClipId,
            name: 'Caption',
            mediaId: vClipId,
            metadata: {
              ...json.metadata,
              sourceClipId: vClipId,
            },
            timing: {
              display: { from: cueFromUs, to: cueToUs },
              trim: { from: 0, to: cueDurationUs },
              duration: cueDurationUs,
              playbackRate: 1,
            },
            style: {
              color: '#ffffff',
              align: 'center',
              ...(captionTrackStyle || {}),
            },
            locked: false,
            effects: [],
            animations: [],
            wordsPerLine: '',
            transform: {
              x: json.left ?? Math.round((videoWidth - (json.width || Math.round(videoWidth * 0.88))) / 2),
              y: json.top ?? defaultTop,
              width: json.width ?? Math.round(videoWidth * 0.88),
              height: json.height ?? 100,
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

      core.store.setState({ ...state, clips, tracks });
      await saveCurrentTimeline(`Scene ${sceneIndex} voiceover & captions synced`);
    } catch (e) {
      console.warn('[usePipelineStore] Failed to sync voiceover/captions to timeline:', e);
    }
  }

  // ─── B4 Dubbing: Re-align clip timings after multi-language TTS ──────────────────
  async function reAlignDubbing(langCode: string) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;
    const scenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    try {
      await http.post('/voices/dubbing/re-align', {
        episodeId: epId,
        language: langCode,
        scenes: scenes.map((s: any) => ({ index: s.index, duration: s.durationSeconds || 5 })),
      });
    } catch (err) {
      console.warn('[reAlignDubbing] failed:', err);
    }
  }

  // ─── Apply Scene Audio & Captions directly to OpenVideo Timeline ─────────────
  async function applySceneAudioDataToTimeline(sceneIndex: number, data: any, currentScene: any) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId || !data) return;

    const rawCues = (Array.isArray(data.captionsData) && data.captionsData.length > 0)
      ? data.captionsData
      : (Array.isArray(data.cues) && data.cues.length > 0 ? data.cues : currentScene?.dialogue || []);

    if (data.bgmUrl || data.voiceoverUrl) {
      seriesStore.updateSceneAssets(epId, sceneIndex, {
        bgmUrl: data.bgmUrl,
        voiceoverUrl: data.voiceoverUrl,
        captionsData: rawCues.length > 0 ? rawCues : undefined,
        voiceDurationUs: data.voiceDurationUs || data.durationUs,
      });
    }

    const state = core.store.getState();
    const clips = { ...(state.clips || {}) };
    const tracks = [ ...(state.tracks || []) ];

    const vClipId = `clip_v_${epId}_s${sceneIndex}`;
    const vClip: any = clips[vClipId] || Object.values(clips).find((c: any) =>
      c.id === vClipId || ((c.type === 'Video' || c.type === 'Image') && (c.name?.includes(`Scene ${sceneIndex}`) || c.label?.includes(`Scene ${sceneIndex}`)))
    );
    const sceneFromUs = vClip?.timing?.display?.from ?? (vClip?.display?.from ?? 0);
    const sceneDurationUs = vClip?.timing?.duration ?? (vClip?.duration ?? Math.round((Number((currentScene as any)?.durationSeconds) || 6) * 1_000_000));

    // 1. Sync BGM / Ambient Track
    if (data.bgmUrl) {
      let bgmTrack = tracks.find((t: any) => t.id === 'track_bgm' || t.id === 'track_bgm_main' || (t.type === 'Audio' && t.name?.toLowerCase().includes('bgm')));
      if (!bgmTrack) {
        bgmTrack = {
          id: 'track_bgm',
          name: '🎵 Background Music (BGM)',
          type: 'Audio',
          clipIds: [],
        };
        tracks.push(bgmTrack);
      }

      const bgmClipId = `clip_bgm_${epId}_s${sceneIndex}`;
      if (!bgmTrack.clipIds.includes(bgmClipId)) {
        bgmTrack.clipIds.push(bgmClipId);
      }

      clips[bgmClipId] = {
        id: bgmClipId,
        type: 'Audio',
        name: `BGM Scene ${sceneIndex}`,
        src: data.bgmUrl,
        timing: {
          display: { from: sceneFromUs, to: sceneFromUs + sceneDurationUs },
          trim: { from: 0, to: sceneDurationUs },
          duration: sceneDurationUs,
          playbackRate: 1,
        },
        volume: 0.8,
        style: {},
        locked: false,
        effects: [],
        animations: [],
      } as any;
    }

    core.store.setState({ ...state, clips, tracks });

    // 2. Sync Real TTS Voiceover & Word-Level Captions
    if ((rawCues.length > 0) || (Array.isArray(data?.words) && data.words.length > 0) || data?.voiceoverUrl) {
      await syncSceneVoiceoverAndCaptionsToTimeline(
        sceneIndex,
        data.voiceoverUrl,
        rawCues,
        currentScene,
        data.words,
        data.voiceStartUs,
        data.voiceDurationUs
      );
    } else {
      await saveCurrentTimeline(`Scene ${sceneIndex} BGM and audio synced`);
    }

    // Auto-save immediately
    const sId = seriesStore.currentSeries?.id;
    if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pipeline-asset-updated'));
  }

  // ─── Separate Scene Audio (Extract Vocal vs BGM/Ambient with Timestamps) ───
  async function separateSceneAudio(sceneIndex: number, videoUrl: string, dialogue?: any[]) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId || !videoUrl) return;

    try {
      const allScenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
      const currentScene = allScenes.find((s: any) => s.index === sceneIndex) || { index: sceneIndex, dialogue };
      const rawDialogue = dialogue || currentScene.dialogue || [];

      const res: any = await http.post('/voices/separate-audio', {
        episodeId: epId,
        sceneIndex,
        videoUrl,
        dialogue: rawDialogue,
      });

      const data = res?.data;
      if (data) {
        await applySceneAudioDataToTimeline(sceneIndex, data, currentScene);
      }

      return data;
    } catch (err: any) {
      console.warn(`[separateSceneAudio] scene ${sceneIndex} notice:`, err?.message);
      return null;
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function resetAll() {
    pipelineSteps.value.forEach(s => s.status = 'idle');
    sceneRenderStatuses.value.clear();
    characterRenderStatuses.value.clear();
    isRendering.value = false;
    currentRenderingMessage.value = '';
    currentRenderingPercent.value = 0;
    currentRenderingScene.value = null;
  }

  return {
    voicePresets,
    isVoicePresetsLoading,
    fetchVoicePresets,
    pipelineSteps,
    sceneRenderStatuses,
    characterRenderStatuses,
    isRendering,
    currentRenderingMessage,
    currentRenderingPercent,
    currentRenderingScene,
    doneStepsCount,
    setStepStatus,
    getSceneStatus,
    updateSceneStatus,
    getCharStatus,
    syncStepStatusesWithEpisode,
    renderScene,
    renderAllScenes,
    renderCharacter,
    renderAllCharacters,
    renderSceneVideo,
    renderAllVideos,
    renderSceneVoiceover,
    renderAllVoiceovers,
    renderSceneBgm,
    renderAllBgm,
    syncCaptionsToTimeline,
    generateCaptionsForLanguage,
    reAlignDubbing,
    separateSceneAudio,
    resetAll,
  };
});
