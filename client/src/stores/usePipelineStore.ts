import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/http';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { toast } from 'vue-sonner';
import i18n from '@/i18n';

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
  videoStatus: StepStatus;
  voiceoverStatus: StepStatus;
  bgmStatus: StepStatus;
  captionStatus: StepStatus;
  storyboardUrl?: string;
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
    { id: 'b1', label: 'Scene Background (B1)', icon: 'Picture', status: 'idle' },
    { id: 'b2', label: 'Character Render (B2)', icon: 'UserFilled', status: 'idle' },
    { id: 'b3', label: 'Image-to-Video (B3)', icon: 'Film', status: 'idle' },
    { id: 'b4', label: 'Voiceover TTS (B4)', icon: 'Microphone', status: 'idle' },
    { id: 'b5', label: 'AI Music & BGM (B5)', icon: 'Headset', status: 'idle' },
    { id: 'b6', label: 'AI Captions (B6)', icon: 'ChatSquare', status: 'idle' },
    { id: 'b7', label: 'Timeline Preview (B7)', icon: 'VideoPlay', status: 'idle' },
    { id: 'b8', label: 'Export Render Job (B8)', icon: 'Cpu', status: 'idle' },
    { id: 'b9', label: 'Save Episode (B9)', icon: 'Upload', status: 'idle' },
    { id: 'b10', label: 'Multi-Platform Publish (B10)', icon: 'Promotion', status: 'idle' },
  ]);

  // ─── Per-Scene Render Status ───────────────────────────────────────────────
  const sceneRenderStatuses = ref<Map<number, SceneRenderStatus>>(new Map());

  // ─── Per-Character Render Status ──────────────────────────────────────────
  const characterRenderStatuses = ref<Map<string, 'idle' | 'running' | 'done' | 'error'>>(new Map());

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

  function updateSceneStatus(sceneIndex: number, updates: Partial<SceneRenderStatus>) {
    const current = getSceneStatus(sceneIndex);
    sceneRenderStatuses.value.set(sceneIndex, { ...current, ...updates });
  }

  function getCharStatus(charId: string) {
    return characterRenderStatuses.value.get(charId) || 'idle';
  }

  function syncStepStatusesWithEpisode(episode: any, characters: any[] = []) {
    if (!episode) return;
    const rawScenes = episode.scenes || [];
    const scenes = Array.isArray(rawScenes) ? rawScenes : [];
    const hasScenes = scenes.length > 0;

    // B1: Scene Background — done if all scenes have storyboardFrameUrl or videoUrl
    const allBgDone = hasScenes && scenes.every((s: any) => !!s.storyboardFrameUrl || !!s.videoUrl);
    setStepStatus('b1', allBgDone ? 'done' : hasScenes ? 'idle' : 'idle');

    // B2: Character Render — done if characters in series have avatarUrl
    const allCharsDone = Array.isArray(characters) && characters.length > 0 && characters.every((c: any) => !!c.avatarUrl || !!c.avatar);
    setStepStatus('b2', allCharsDone ? 'done' : 'idle');

    // B3: Image-to-Video — done if all scenes have videoUrl
    const allVideoDone = hasScenes && scenes.every((s: any) => !!s.videoUrl);
    setStepStatus('b3', allVideoDone ? 'done' : 'idle');

    // B4: Voiceover TTS — done if all dialogue scenes have voiceoverUrl
    const dialogueScenes = scenes.filter((s: any) => Array.isArray(s.dialogue) && s.dialogue.length > 0);
    const allVoDone = dialogueScenes.length > 0 && dialogueScenes.every((s: any) => !!s.voiceoverUrl);
    setStepStatus('b4', allVoDone ? 'done' : 'idle');

    // B5: AI Music & BGM — done if scenes have bgmUrl
    const allBgmDone = hasScenes && scenes.some((s: any) => !!s.bgmUrl);
    setStepStatus('b5', allBgmDone ? 'done' : 'idle');

    // B6: AI Captions — done if episode status is beyond DRAFT or dialogue voiceovers are ready
    setStepStatus('b6', allVoDone ? 'done' : 'idle');

    // B7: Timeline Preview — done if episode is loaded into editor
    setStepStatus('b7', 'done');

    // B8: Export Render Job — done if episode status is COMPLETED or READY
    setStepStatus('b8', episode.status === 'COMPLETED' ? 'done' : 'idle');

    // B9: Save Episode
    setStepStatus('b9', episode.id ? 'done' : 'idle');

    // B10: Multi-Platform Publish
    setStepStatus('b10', episode.status === 'PUBLISHED' ? 'done' : 'idle');

    // Sync per-scene statuses
    scenes.forEach((s: any) => {
      sceneRenderStatuses.value.set(s.index, {
        sceneIndex: s.index,
        bgStatus: s.storyboardFrameUrl ? 'done' : 'idle',
        videoStatus: s.videoUrl ? 'done' : 'idle',
        voiceoverStatus: s.voiceoverUrl ? 'done' : 'idle',
        bgmStatus: s.bgmUrl ? 'done' : 'idle',
        captionStatus: s.captionsData?.length ? 'done' : 'idle',
        storyboardUrl: s.storyboardFrameUrl,
        videoUrl: s.videoUrl,
        voiceoverUrl: s.voiceoverUrl,
        bgmUrl: s.bgmUrl,
      });
    });
  }

  // ─── Scene Background Render ──────────────────────────────────────────────
  async function renderScene(sceneIndex: number, sceneData: any) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { bgStatus: 'running' });

    try {
      const res: any = await http.post('/assets/generate', {
        type: 'background',
        episodeId: epId,
        sceneId: `scene_${String(sceneIndex).padStart(2, '0')}`,
        prompt: sceneData.visualPrompt || `${sceneData.heading || sceneData.location} — cinematic micro-drama, vertical 9:16`,
        aspectRatio: seriesStore.currentSeries?.ratio || '9:16',
        style: sceneData.lightingMood || 'cinematic',
      });

      const url = res?.data?.imageUrl || res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { bgStatus: 'done', storyboardUrl: url });
        seriesStore.updateSceneStoryboard(epId, sceneIndex, url);
        // Auto-save scene assets immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
      } else {
        updateSceneStatus(sceneIndex, { bgStatus: 'done' });
      }
    } catch (err) {
      updateSceneStatus(sceneIndex, { bgStatus: 'error' });
      throw err;
    }
  }

  // Smart batch B1: only render scenes without a background image
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

    setStepStatus('b1', 'running');
    let hasError = false;

    for (const scene of scenes) {
      try {
        await renderScene(scene.index, scene);
      } catch {
        hasError = true;
      }
    }

    setStepStatus('b1', hasError ? 'error' : 'done');
  }

  // ─── Character Render ─────────────────────────────────────────────────────
  async function renderCharacter(char: any) {
    characterRenderStatuses.value.set(char.id, 'running');
    setStepStatus('b2', 'running');

    try {
      const res: any = await http.post('/assets/generate', {
        type: 'character',
        characterId: char.id,
        characterName: char.name,
        loraModel: char.loraModel,
        prompt: char.identity || `${char.name}, ${char.role}, high-fidelity portrait, micro-drama`,
        aspectRatio: '1:1',
        style: 'photorealistic',
      });

      const url = res?.data?.imageUrl || res?.data?.url;
      if (url) {
        characterRenderStatuses.value.set(char.id, 'done');
        seriesStore.updateCharacterAvatar(char.id, url);
        // Auto-save avatar immediately — no manual Save needed
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveCharacterAvatars(sId);
      } else {
        characterRenderStatuses.value.set(char.id, 'done');
      }
      setStepStatus('b2', 'done');
    } catch (err) {
      characterRenderStatuses.value.set(char.id, 'error');
      setStepStatus('b2', 'error');
      throw err;
    }
  }

  // Smart batch B2: only render character without an avatar
  async function renderAllCharacters() {
    const sId = seriesStore.currentSeries?.id;
    const characters = seriesStore.charactersList || [];
    setStepStatus('b2', 'running');
    let hasError = false;
    console.log(`[Pipeline] Rendering ${characters.length} characters...`);
    for (const char of characters) {
      if (char.avatar || char.avatarUrl) {
        console.log(`[Pipeline] Character ${char.name} already has an avatar, skipping.`);
        characterRenderStatuses.value.set(char.id, 'done');
        continue;
      }
      try {
        await renderCharacter(char);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b2', hasError ? 'error' : 'done');
  }

  // ─── Scene Voiceover Render ─────────────────────────────────────────────
  // ─── B3: Image-to-Video Render ─────────────────────────────────────────────
  async function renderSceneVideo(sceneIndex: number, scene: any) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { videoStatus: 'running' });
    setStepStatus('b3', 'running');

    try {
      const res: any = await http.post('/assets/video-generate', {
        backgroundImageId: scene.storyboardFrameUrl,
        episodeId: epId,
        sceneId: `scene_${String(sceneIndex).padStart(2, '0')}`,
        duration: scene.durationSeconds || 5,
        motion: 'slow_pan',
        cameraMovement: scene.cameraMovement || 'dolly_in',
        prompt: scene.visualPrompt || undefined,
      });

      const url = res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { videoStatus: 'done', videoUrl: url });
        seriesStore.updateSceneVideoUrl(epId, sceneIndex, url);
        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
      } else {
        updateSceneStatus(sceneIndex, { videoStatus: 'done' });
      }
      setStepStatus('b3', 'done');
    } catch (err) {
      updateSceneStatus(sceneIndex, { videoStatus: 'error' });
      setStepStatus('b3', 'error');
      throw err;
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
    let hasError = false;
    for (const scene of scenes) {
      try {
        await renderSceneVideo(scene.index, scene);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b3', hasError ? 'error' : 'done');
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
        language: languageCode || 'en-US',
      });

      const url = res?.data?.audioUrl || res?.data?.url;
      if (url) {
        updateSceneStatus(sceneIndex, { voiceoverStatus: 'done', voiceoverUrl: url });
        if (languageCode) {
          seriesStore.updateLanguageTrackVoiceover(epId, languageCode, sceneIndex, url);
        } else {
          seriesStore.updateSceneAssets(epId, sceneIndex, { voiceoverUrl: url });
        }
        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
      } else {
        updateSceneStatus(sceneIndex, { voiceoverStatus: 'done' });
      }
      setStepStatus('b4', 'done');
    } catch (err) {
      updateSceneStatus(sceneIndex, { voiceoverStatus: 'error' });
      setStepStatus('b4', 'error');
      throw err;
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
        toast.info(`All voiceovers already rendered for ${languageCode}`);
        return;
      }
      setStepStatus('b4', 'running');
      let hasError = false;
      for (const scene of scenes) {
        try { await renderSceneVoiceover(scene.index, scene.dialogue, trackVoice, intensity, speed, languageCode); }
        catch { hasError = true; }
      }
      setStepStatus('b4', hasError ? 'error' : 'done');
    } else {
      // Default: skip scenes already with voiceoverUrl
      const scenes = allScenes.filter((s: any) => Array.isArray(s.dialogue) && s.dialogue.length > 0 && !s.voiceoverUrl);
      if (scenes.length === 0) {
        toast.info(i18n.global.t('toast.allVoiceoversRendered', 'All voiceovers already rendered'));
        return;
      }
      setStepStatus('b4', 'running');
      let hasError = false;
      for (const scene of scenes) {
        try { await renderSceneVoiceover(scene.index, scene.dialogue, voicePreset, intensity, speed); }
        catch { hasError = true; }
      }
      setStepStatus('b4', hasError ? 'error' : 'done');
    }
  }

  // ─── Scene BGM Render ─────────────────────────────────────────────────────
  async function renderSceneBgm(sceneIndex: number, bgmMood: string, duration: number) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;

    updateSceneStatus(sceneIndex, { bgmStatus: 'running' });
    setStepStatus('b5', 'running');

    try {
      const res: any = await http.post('/assets/music-generate', {
        episodeId: epId,
        sceneIndex,
        prompt: bgmMood || 'dramatic cinematic micro-drama suspense',
        genre: 'micro_drama_suspense',
        duration: duration || 15,
      });

      const url = res?.data?.audioUrl || res?.data?.musicUrl;
      if (url) {
        updateSceneStatus(sceneIndex, { bgmStatus: 'done', bgmUrl: url });
        seriesStore.updateSceneAssets(epId, sceneIndex, { bgmUrl: url });
        // Auto-save immediately
        const sId = seriesStore.currentSeries?.id;
        if (sId) await seriesStore.saveEpisodeScenes(sId, epId);
      } else {
        updateSceneStatus(sceneIndex, { bgmStatus: 'done' });
      }
      setStepStatus('b5', 'done');
    } catch (err) {
      updateSceneStatus(sceneIndex, { bgmStatus: 'error' });
      setStepStatus('b5', 'error');
      throw err;
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
    let hasError = false;
    for (const scene of scenes) {
      try {
        await renderSceneBgm(scene.index, scene.bgmMood || 'dramatic cinematic', scene.durationSeconds || 15);
      } catch {
        hasError = true;
      }
    }
    setStepStatus('b5', hasError ? 'error' : 'done');
  }

  // ─── B6: Caption Generation + Translation per Language ───────────────────────────

  // Generate (and optionally translate) captions for one language; stores cues per-scene
  async function generateCaptionsForLanguage(langCode: string, translateFrom?: string) {
    const epId = seriesStore.activeEpisodeId;
    const sId = seriesStore.currentSeries?.id;
    if (!epId) return;

    const scenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    setStepStatus('b6', 'running');

    for (const scene of scenes) {
      try {
        const dialogueText = (scene.dialogue || []).map((d: any) => `${d.character}: ${d.line}`).join('\n');
        if (!dialogueText) continue;

        let cues: any[];

        if (translateFrom && translateFrom !== langCode) {
          // Translate from existing track rather than re-generating
          const res: any = await http.post('/captions/translate', {
            episodeId: epId,
            targetLanguage: langCode,
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
      } catch (err) {
        console.warn(`[generateCaptionsForLanguage] scene ${scene.index} failed:`, err);
      }
    }

    setStepStatus('b6', 'done');
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

  // ─── B4 Dubbing: Re-align clip timings after multi-language TTS ──────────────────
  async function reAlignDubbing(langCode: string) {
    const epId = seriesStore.activeEpisodeId;
    if (!epId) return;
    const scenes = seriesStore.activeScript?.scenes || seriesStore.activeEpisode?.scenes || [];
    try {
      await http.post('/voices/dubbing/re-align', {
        episodeId: epId,
        targetLanguage: langCode,
        scenes: scenes.map((s: any) => ({ index: s.index, duration: s.durationSeconds || 5 })),
      });
    } catch (err) {
      console.warn('[reAlignDubbing] failed:', err);
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function resetAll() {
    pipelineSteps.value.forEach(s => s.status = 'idle');
    sceneRenderStatuses.value.clear();
    characterRenderStatuses.value.clear();
  }

  return {
    voicePresets,
    isVoicePresetsLoading,
    fetchVoicePresets,
    pipelineSteps,
    sceneRenderStatuses,
    characterRenderStatuses,
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
    resetAll,
  };
});
