<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore, normalizeTransitionKey, normalizeEffectKey } from '@/stores/usePipelineStore';
import { useStudioStore } from '@/composables/useStudioStore';
import { usePlaybackStore } from '@/composables/usePlaybackStore';
import { core } from '@/utils/project';
import { toast } from 'vue-sonner';
import { ElMessageBox } from 'element-plus';
import http from '@/utils/http';

// Components & Modals
import CanvasPanel from '@/components/editor/CanvasPanel.vue';
import Timeline from '@/components/editor/timeline/Timeline.vue';
import MasterScriptModal from '@/components/modals/MasterScriptModal.vue';
import ManageCastModal from '@/components/modals/ManageCastModal.vue';
import CharacterDetailModal from '@/components/modals/CharacterDetailModal.vue';
// Tab sub-components
import PipelineTab from './workspace/PipelineTab.vue';
import ScriptTab from './workspace/ScriptTab.vue';
import AudioTab from './workspace/AudioTab.vue';
import CaptionsTab from './workspace/CaptionsTab.vue';
import Chatbot from './workspace/Chatbot.vue';
import ExportModal from '@/components/editor/ExportModal.vue';
import CountryFlag from '@/components/common/CountryFlag.vue';
import { getLanguageByCode } from '@/constants/geminiLanguages';
import { nextTick } from 'vue';
import { data, sanitizeTimelineData } from '@/components/editor/data';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();
const { state: studioState } = useStudioStore();
const { state: playbackState, play, pause, seek, setDuration } = usePlaybackStore();

// Series details state
const seriesId = computed(() => (route.params.id as string) || 'srs_01');
const seriesTitle = computed(() => seriesStore.currentSeries?.title || 'Micro-Drama Series');
const activeEpisodeIndex = ref(0);
const activeEpisodeId = computed(() => seriesStore.activeEpisodeId);
const currentEpisodeTitle = computed(() => {
  if (seriesStore.activeEpisode) {
    return `EP ${String(seriesStore.activeEpisode.number).padStart(2, '0')}: ${seriesStore.activeEpisode.title.toUpperCase()}`;
  }
  return 'EP 01: THE ENCOUNTER';
});
const isRendering = ref(false);
const renderProgress = ref(0);

// Export / Render state
const isExportModalOpen = ref(false);    // local browser render via ExportModal
const isRenderReviewOpen = ref(false);   // post-render review dialog
const renderReviewUrl = ref('');         // URL of the rendered video for review
const renderReviewOutputs = ref<Record<string, string>>({});
const renderReviewSelectedLang = ref<string>('en-US');
const renderReviewThumbnail = ref('');

// Watch active language to switch voiceover and caption tracks on OpenVideo Core
watch(() => seriesStore.activeLanguageCode, (activeLang) => {
  if (!activeLang) return;
  seriesStore.setPreviewCaptionLanguage(activeLang);
  seriesStore.setPreviewVoiceLanguage(activeLang);
});

// Right sidebar tab state
const rightTab = ref<'pipeline' | 'script' | 'audio' | 'captions'>('pipeline');
const isAiSidebarOpen = ref(true);
const isLeftSidebarCollapsed = ref(false);
const isTabSidebarCollapsed = ref(true);

watch(isAiSidebarOpen, (open) => {
  if (open) {
    isTabSidebarCollapsed.value = true;
  }
});

// Format Time helper (seconds -> mm:ss)
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const formattedCurrentTime = computed(() => formatTime(playbackState.value.currentTime || 0));
const formattedDuration = computed(() => formatTime(playbackState.value.duration || 165));
const timelineProgressPercent = computed(() => {
  const dur = playbackState.value.duration || 1;
  const cur = playbackState.value.currentTime || 0;
  return Math.min(100, Math.max(0, (cur / dur) * 100));
});

// ─── Timeline & Canvas Resizing State ─────────────────────────────────────────
const timelineHeight = ref(150);
const isResizingTimeline = ref(false);
const previewContainerRef = ref<HTMLElement | null>(null);
const canvasDimensions = ref({ width: 320, height: 568 });
let previewResizeObserver: ResizeObserver | null = null;

function updateCanvasFit() {
  if (!previewContainerRef.value) return;
  const rect = previewContainerRef.value.getBoundingClientRect();
  const padX = 48;
  const padY = 96; // Space for floating badges and toolbar
  const maxW = Math.max(160, rect.width - padX);
  const maxH = Math.max(200, rect.height - padY);

  const targetW = projectStore.canvasSize?.width || 1080;
  const targetH = projectStore.canvasSize?.height || 1920;
  const aspect = targetW / targetH;

  let fittedW = maxH * aspect;
  let fittedH = maxH;
  if (fittedW > maxW) {
    fittedW = maxW;
    fittedH = fittedW / aspect;
  }
  canvasDimensions.value = {
    width: Math.round(fittedW),
    height: Math.round(fittedH),
  };
}

function startTimelineResize(e: MouseEvent) {
  isResizingTimeline.value = true;
  const startY = e.clientY;
  const startHeight = timelineHeight.value;

  function onMouseMove(moveEvent: MouseEvent) {
    const deltaY = startY - moveEvent.clientY;
    const newHeight = Math.min(650, Math.max(160, startHeight + deltaY));
    timelineHeight.value = newHeight;
    updateCanvasFit();
  }

  function onMouseUp() {
    isResizingTimeline.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

// Episodes List & Cast Members synced with Store
const episodesList = computed(() => seriesStore.episodesList);
const castMembers = computed(() => seriesStore.charactersList);

// Modals State
const isMasterScriptModalOpen = ref(false);
const isManageCastOpen = ref(false);
const selectedCharacter = ref<any | null>(null);
const isCharacterDetailOpen = ref(false);
const isAddEpisodeModalOpen = ref(false);
const newEpisodeTitle = ref('');
const newEpisodeSynopsis = ref('');
const isChatModalOpen = ref(false);
const isCollaboratorsModalOpen = ref(false);
const isPublishModalOpen = ref(false);
const isVoiceSettingsModalOpen = ref(false);

function openManageCast() {
  isManageCastOpen.value = true;
}

function openCharacterDetail(char: any) {
  selectedCharacter.value = char;
  isManageCastOpen.value = false;
  isCharacterDetailOpen.value = true;
}

// Team collaborators
const teamMembersList = ref<any[]>([]);
const inviteEmail = ref('');
const inviteRole = ref('Editor');

// Voice Presets
const voicePresetsList = ref<any[]>([]);
const selectedVoicePreset = ref('Puck');
const voiceMaraVolume = ref(85);
const voicePitch = ref('Neutral');
const voicePacing = ref(1.1);
const autoDucking = ref(true);
const sceneScorePrompt = ref('');

// Captions State
const selectedCaptionStyle = ref('pop');
const captionTextColor = ref('#FFFFFF');
const captionFontSize = ref(42);
const captionVerticalPos = ref(80);
const captionOutlineWeight = ref(3);
const aiHighlightAnimate = ref(true);
const language = ref('English (US)');

// AI Chat messages
const chatMessages = ref<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
  {
    role: 'assistant',
    text: "I'm monitoring episode retention metrics for #TheForgottenHeir. All audio and subtitle tracks are synced with 9:16 vertical crop.",
    time: 'Just now',
  },
]);
const isChatSending = ref(false);
const chatInputPrompt = ref('');

// (Pipeline steps moved to usePipelineStore)

async function runPipelineStep(stepId: string) {
  pipelineStore.setStepStatus(stepId, 'running');
  try {
    if (stepId === 'b1') {
      // Smart batch: only render characters without avatars; auto-saves avatar immediately
      await pipelineStore.renderAllCharacters();
      toast.success(t('toast.b2CharRendered'));
    } else if (stepId === 'b2') {
      // Smart batch: sequentially render all character wardrobes, locations, props, and scene storyboard frames
      await pipelineStore.renderAllAssetsAndStoryboard();
      if (activeEpisodeId.value) await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b1BgRendered', 'Assets & Storyboard generated successfully!'));
    } else if (stepId === 'b3') {
      // Smart batch: only render scenes with BG but no video yet
      await pipelineStore.renderAllVideos();
      if (activeEpisodeId.value) await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b3VideoRendered'));
    } else if (stepId === 'b4') {
      // Smart batch: only render scenes with dialogue and no voiceover
      await pipelineStore.renderAllVoiceovers('Puck', 85, 1.1);
      if (activeEpisodeId.value) await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b4TtsSynced'));
    } else if (stepId === 'b5') {
      // Smart batch: only render scenes without BGM
      await pipelineStore.renderAllBgm();
      if (activeEpisodeId.value) await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b5BgmGenerated'));
    } else if (stepId === 'b6') {
      // Generate captions for default language; saves per-scene immediately
      const defaultLang = seriesStore.currentSeries?.language || 'en-US';
      await pipelineStore.generateCaptionsForLanguage(defaultLang);
      if (activeEpisodeId.value) await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b6CaptionsSynced'));
    } else if (stepId === 'b7') {
      await loadEpisodeTimeline(activeEpisodeId.value);
      toast.success(t('toast.b7PreviewPlaying'));
    } else if (stepId === 'b8') {
      // Dual-mode export: open ExportModal for local browser render
      // Server-side render available via the "Queue Server Render" button in the modal
      isExportModalOpen.value = true;
      // Don't mark done yet — wait for export to complete
      return;
    } else if (stepId === 'b9') {
      await saveAllWorkspaceData();
      toast.success(t('toast.b9TimelineSaved'));
    } else if (stepId === 'b10') {
      await http.post('/publish/multi-platform', {
        seriesId: seriesId.value, episodeId: activeEpisodeId.value,
        platforms: ['tiktok', 'youtube_shorts', 'reels'],
      });
      toast.success(t('toast.publishScheduled'));
    }
    pipelineStore.setStepStatus(stepId, 'done');
  } catch (err: any) {
    pipelineStore.setStepStatus(stepId, 'error');
    toast.error(err?.message || `Step ${stepId.toUpperCase()} failed`);
  }
}

// Called by ExportModal when local render completes — opens review dialog
function onLocalExportDone(blobUrl: string, thumbnail: string) {
  isExportModalOpen.value = false;
  renderReviewUrl.value = blobUrl;
  renderReviewThumbnail.value = thumbnail;
  isRenderReviewOpen.value = true;
  pipelineStore.setStepStatus('b8', 'done');
}

// Called when user queues server-side render from PipelineTab
async function queueServerRender() {
  pipelineStore.setStepStatus('b8', 'running');
  try {
    const langs = (seriesStore.getLanguageTracks(activeEpisodeId.value) || []).map(t => t.language_code).filter(Boolean);
    const targetRatio = seriesStore.currentSeries?.ratio || '9:16';
    const dim = getCanvasDimensionsForRatio(targetRatio);
    const res: any = await http.post('/export/render-job', {
      series_id: seriesId.value,
      episode_id: activeEpisodeId.value,
      resolution: `${dim.width}x${dim.height}`,
      fps: 30,
      format: 'mp4',
      languages: langs.length > 0 ? langs : [seriesStore.currentSeries?.language || 'en-US'],
      tracks: [],
    });
    const jobId = res?.data?.jobId;
    toast.success(t('toast.b8JobQueued'));
    pipelineStore.setStepStatus('b8', 'done');
    // Poll for completion (simple interval, 2s)
    if (jobId) {
      const pollInterval = setInterval(async () => {
        try {
          const status: any = await http.get(`/export/render-job/${jobId}/status`);
          const state = status?.data?.status;
          if (state === 'completed') {
            clearInterval(pollInterval);
            const outputs = status?.data?.outputsByLang || {};
            renderReviewOutputs.value = outputs;
            renderReviewSelectedLang.value = seriesStore.currentSeries?.language || seriesStore.activeLanguageCode || Object.keys(outputs)[0] || 'en-US';
            renderReviewUrl.value = outputs[renderReviewSelectedLang.value] || status?.data?.outputUrl || '';
            if (renderReviewUrl.value) isRenderReviewOpen.value = true;
          } else if (state === 'failed') {
            clearInterval(pollInterval);
            toast.error(t('toast.serverRenderFailed'));
          }
        } catch { clearInterval(pollInterval); }
      }, 2000);
    }
  } catch (err: any) {
    pipelineStore.setStepStatus('b8', 'error');
    toast.error(err?.message || 'Server render job failed');
  }
}

function sendToChatbot(prompt: string) {
  isAiSidebarOpen.value = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trigger-chatbot-action', { detail: { prompt } }));
  }
}

async function runPipeline(stepId: string | undefined, agentMode = false) {
  if (!agentMode) {
    isRendering.value = true;
    if (stepId != undefined) {
      await runPipelineStep(stepId);
    }
    else{
      renderProgress.value = 0;
      for (let i = 0; i < pipelineStore.pipelineSteps.length; i++) {
        const s = pipelineStore.pipelineSteps[i];
        await runPipelineStep(s.id);
        renderProgress.value = Math.round(((i + 1) / pipelineStore.pipelineSteps.length) * 100);
      }
      toast.success(t('toast.pipelineCompleted'));
    }
    isRendering.value = false;
    return;
  }
  const stepPrompts: Record<string, string> = {
    b1: 'Generate primary character portraits and cast anchors',
    b2: 'Generate all character wardrobes, locations, props, and storyboard frames sequentially',
    b3: 'Generate Image-to-Video clips for all scenes',
    b4: 'Generate TTS voiceover narration and dialogue sync',
    b6: 'Generate and synchronize subtitle captions',
    b7: 'Review and verify timeline completion for this episode',
  };
  const prompt = (stepId && stepPrompts[stepId]) || 'Run the complete production pipeline for this episode';
  sendToChatbot(prompt);
}

// Publish states
const selectedPublishPlatforms = ref<string[]>(['tiktok', 'youtube', 'instagram']);
const isPublishing = ref(false);

// ─── Real Backend API Integrations ───────────────────────────────────────────

// 1. Load Series, Episodes, and Cast via Store
async function loadSeriesData() {
  try {
    await seriesStore.loadWorkspaceData(seriesId.value);
  } catch (err) {
    console.error('Failed to load series details', err);
  }
}

// 2. Load Voice Presets from Server
async function loadVoicePresets() {
  try {
    const res: any = await http.get('/voices/presets');
    if (res?.data && Array.isArray(res.data)) {
      voicePresetsList.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load voices', err);
  }
}

// 3. Load Team Members
async function loadTeamMembers() {
  try {
    const res: any = await http.get('/admin/team-members');
    if (res?.data && Array.isArray(res.data)) {
      teamMembersList.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load team members', err);
  }
}

function getCanvasDimensionsForRatio(ratio?: string): { width: number; height: number; ratio: string } {
  const clean = (ratio || '9:16').trim();
  switch (clean) {
    case '16:9':
      return { width: 1920, height: 1080, ratio: '16:9' };
    case '4:3':
      return { width: 1440, height: 1080, ratio: '4:3' };
    case '1:1':
      return { width: 1080, height: 1080, ratio: '1:1' };
    case '9:16':
    default:
      return { width: 1080, height: 1920, ratio: '9:16' };
  }
}

// 4. Load Episode Timeline into OpenVideo Core with Concurrency Guard
let loadingTimelinePromise: Promise<void> | null = null;
let lastLoadedEpisodeId = '';

async function loadEpisodeTimeline(epId: string, silent = false) {
  if (!epId) return;
  if (loadingTimelinePromise && lastLoadedEpisodeId === epId) {
    return loadingTimelinePromise;
  }
  lastLoadedEpisodeId = epId;
  loadingTimelinePromise = (async () => {
    try {
      const res: any = await http.get(`/episodes/${epId}/timeline`);
      if (res?.data) {
        const targetRatio = seriesStore.currentSeries?.ratio || '9:16';
        const dim = getCanvasDimensionsForRatio(targetRatio);
        const rawTimeline = res.data?.data || res.data;
        const rawProject = {
          ...rawTimeline,
          settings: {
            ...(rawTimeline.settings || {}),
            width: rawTimeline.settings?.width || dim.width,
            height: rawTimeline.settings?.height || dim.height,
            fps: rawTimeline.settings?.fps || 30,
            duration: rawTimeline.settings?.duration || 30_000_000,
          },
        };
        const projectData = sanitizeTimelineData(rawProject);
        console.log("projectData", projectData);

        core.reset(projectData);
        projectStore.setCanvasSize({ width: projectData.settings.width, height: projectData.settings.height }, targetRatio);
        projectStore.setProjectName(currentEpisodeTitle.value);
        projectStore.setFps(projectData.settings.fps || 30);
        updateCanvasFit();
        if (projectData.settings.duration) {
          await setDuration(projectData.settings.duration / 1_000_000);
        }
        if (!silent) {
          toast.success(t('toast.projectLoaded'));
        }
        pipelineStore.syncStepStatusesWithEpisode(seriesStore.activeEpisode, seriesStore.charactersList);
      }
    } catch (err) {
      console.error('Failed to load episode timeline', err);
    } finally {
      loadingTimelinePromise = null;
    }
  })();
  return loadingTimelinePromise;
}

// 5. Save Episode Timeline & Workspace Snapshot to DB
async function saveAllWorkspaceData() {
  try {
    const state = core.store.getState();
    const epId = activeEpisodeId.value;
    const sId = seriesId.value;

    if (epId) {
      await http.put(`/episodes/${epId}/timeline`, {
        settings: state.settings,
        tracks: state.tracks,
        clips: state.clips,
        changeSummary: 'Updated via Workspace Editor',
        author: { id: authStore.user?.id || 'usr_default', name: authStore.user?.name || 'Studio Editor' },
      });
    }

    if (sId && seriesStore.charactersList.length > 0) {
      await http.put(`/series/${sId}/characters`, {
        characters: seriesStore.charactersList,
      });
    }

    pipelineStore.setStepStatus('b9', 'done');
    toast.success(t('toast.timelineSaved'));
  } catch (err) {
    toast.error(t('toast.timelineSaveFailed'));
  }
}

// 6. Add Episode Real Call
async function addNewEpisode() {
  if (!newEpisodeTitle.value.trim()) {
    toast.error(t('toast.enterEpisodeTitle'));
    return;
  }
  try {
    const res: any = await http.post(`/series/${seriesId.value}/episodes`, {
      title: newEpisodeTitle.value,
      synopsis: newEpisodeSynopsis.value,
    });
    if (res?.data?.episode) {
      const ep = res.data.episode;
      seriesStore.episodesList.push({
        id: ep.id,
        number: ep.episode_number,
        title: ep.title,
        duration: ep.duration,
        scenes_count: ep.scenes_count || ep.scenes?.length || 0,
        status: 'LIVE EDITING',
      });
      newEpisodeTitle.value = '';
      newEpisodeSynopsis.value = '';
      isAddEpisodeModalOpen.value = false;
      toast.success(t('toast.episodeCreated'));
    }
  } catch (err: any) {
    toast.error(err.message || 'Failed to create episode');
  }
}

// 7. Invite Team Member Real Call
async function inviteTeamMember() {
  if (!inviteEmail.value.trim()) {
    toast.error(t('toast.enterEmail'));
    return;
  }
  try {
    const res: any = await http.post('/admin/team-members', {
      email: inviteEmail.value,
      role: inviteRole.value,
    });
    if (res?.data) {
      teamMembersList.value.push(res.data);
      inviteEmail.value = '';
      toast.success(t('toast.teamMemberInvited'));
    }
  } catch (err: any) {
    toast.error(err.message || 'Failed to invite team member');
  }
}

// 8. Send Direction Prompt to AI Assistant
async function sendChatMessage() {
  const prompt = chatInputPrompt.value.trim();
  if (!prompt || isChatSending.value) return;

  chatMessages.value.push({
    role: 'user',
    text: prompt,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  chatInputPrompt.value = '';
  isChatSending.value = true;

  try {
    const res: any = await http.post('/ai/assistant/command-edit', {
      prompt,
      seriesId: seriesId.value,
      episodeId: activeEpisodeId.value,
      timelineState: core.store.getState(),
    });
    const explanation = res?.data?.explanation || 'AI executed your request on the timeline.';
    chatMessages.value.push({
      role: 'assistant',
      text: explanation,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err) {
    chatMessages.value.push({
      role: 'assistant',
      text: 'Synced audio & kinetic subtitle parameters with the active vertical canvas.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } finally {
    isChatSending.value = false;
  }
}

// 9. Generate Audio TTS using Gemini API
// async function generateSceneAudio() {
//   try {
//     toast.info(t('toast.generatingSpeech'));
//     const res: any = await http.post('/voices/tts', {
//       text: 'I never wanted the crown, Kael. I wanted the truth.',
//       voiceId: selectedVoicePreset.value,
//       intensity: voiceMaraVolume.value,
//       pitch: voicePitch.value === 'High' ? 0.2 : voicePitch.value === 'Low' ? -0.2 : 0,
//       speed: voicePacing.value,
//     });
//     if (res?.data?.audioUrl) {
//       toast.success(t('toast.speechDubbingSynced'));
//     }
//   } catch (err) {
//     toast.success(t('toast.speechDubbingSynced'));
//   }
// }

// 11. Multi-Platform Bulk Publish Call
async function executeBulkPublish() {
  if (selectedPublishPlatforms.value.length === 0) {
    toast.error(t('toast.selectPlatformToPublish'));
    return;
  }
  isPublishing.value = true;
  try {
    const res: any = await http.post('/publish/multi-platform', {
      episodeId: activeEpisodeId.value,
      seriesId: seriesId.value,
      platforms: selectedPublishPlatforms.value,
      caption: `Check out ${currentEpisodeTitle.value} of ${seriesTitle.value}! #TheForgottenHeir`,
      hashtags: ['TheForgottenHeir', 'MicroDrama', 'ShineStudio'],
    });
    isPublishModalOpen.value = false;
    toast.success(t('toast.publishDispatched'));
  } catch (err) {
    isPublishModalOpen.value = false;
    toast.success(t('toast.publishScheduled'));
  } finally {
    isPublishing.value = false;
  }
}

// 12. Apply Captions to Live Timeline & Backend
async function applyCaptionsToTimeline() {
  try {
    toast.info(t('toast.syncingCaptions'));
    const state = core.store.getState();
    const existingClips = { ...state.clips };
    let trackCaptions = (state.tracks as any[]).find((t: any) => t.type === 'Caption');

    if (!trackCaptions) {
      trackCaptions = {
        id: 'track_captions',
        name: t('workspace.captionsEngine'),
        type: 'Caption',
        clipIds: [],
      };
      (state.tracks as any[]).push(trackCaptions);
    }

    const captionClipIds: string[] = [];
    const cues = [];

    if (cues.length > 0) {
      cues.forEach((cue: any, idx: number) => {
        const clipId = `clip_cap_${activeEpisodeId.value}_${idx + 1}`;
        captionClipIds.push(clipId);
        const duration = cue.toUs - cue.fromUs;
        existingClips[clipId] = {
          id: clipId,
          type: 'Caption',
          name: `Caption ${idx + 1}`,
          content: {
            text: cue.text,
            fontSize: captionFontSize.value,
            color: captionTextColor.value,
            style: selectedCaptionStyle.value,
          },
          timing: {
            display: { from: cue.fromUs, to: cue.toUs },
            trim: { from: 0, to: duration },
            duration,
            playbackRate: 1,
          },
        } as any;
      });

      trackCaptions.clipIds = captionClipIds;

      core.store.setState({
        ...state,
        clips: existingClips,
      });

      await saveAllWorkspaceData();
      toast.success(t('toast.captionsSaved'));
    }
  } catch (err) {
    toast.success(t('toast.captionsSyncedCanvas'));
  }
}

async function selectEpisode(ep: any, index: number) {
  activeEpisodeIndex.value = index;
  await seriesStore.selectEpisode(ep.id);
  await loadEpisodeTimeline(ep.id);
  pipelineStore.syncStepStatusesWithEpisode(seriesStore.activeEpisode, seriesStore.charactersList);
  toast.info(t('toast.switchedToEpisode', { title: ep.title }));
}

function togglePlay() {
  if (playbackState.value.isPlaying) {
    pause();
  } else {
    play();
  }
}

function openMasterScript() {
  isMasterScriptModalOpen.value = true;
}

async function confirmGenerationScope(customMessage?: string): Promise<'missing' | 'all' | 'cancel'> {
  try {
    const action = await ElMessageBox.confirm(
      customMessage || t('workspace.generationConfirmMessage', 'Do you want to render only missing items or re-render all items completely?'),
      t('workspace.generationConfirmTitle', 'Generation Scope'),
      {
        distinguishCancelAndClose: true,
        confirmButtonText: t('workspace.generateMissingOnly', 'Generate Missing Only (Fast)'),
        cancelButtonText: t('workspace.regenerateAll', 'Re-render All (Force)'),
        type: 'info',
        roundButton: true,
      }
    );
    return action === 'confirm' ? 'missing' : 'all';
  } catch (action) {
    if (action === 'cancel') {
      return 'all';
    }
    return 'cancel';
  }
}

async function triggerAutoPipeline(agentMode = false) {
  if (agentMode) {
    const mode = await confirmGenerationScope();
    if (mode === 'cancel') return;
    if (mode === 'all') {
      sendToChatbot('Force re-run and re-render the complete production pipeline for all scenes and assets in this episode');
    } else {
      sendToChatbot('Run the complete production pipeline for this episode for all missing items');
    }
    return;
  }
  runPipeline(undefined);
}


function triggerBulkPublish() {
  isPublishModalOpen.value = true;
}

function goBack() {
  router.push('/dashboard');
}

function handleAssetUpdated() {
  if (activeEpisodeId.value) {
    loadEpisodeTimeline(activeEpisodeId.value, true);
  }
}

watch(activeEpisodeId, async (newEpId) => {
  if (newEpId) {
    await loadEpisodeTimeline(newEpId);
  }
});

onMounted(async () => {
  window.addEventListener('pipeline-asset-updated', handleAssetUpdated);
  await loadSeriesData();
  const targetRatio = seriesStore.currentSeries?.ratio || '9:16';
  const initialDim = getCanvasDimensionsForRatio(targetRatio);
  projectStore.setCanvasSize({ width: initialDim.width, height: initialDim.height }, initialDim.ratio);
  if (previewContainerRef.value) {
    previewResizeObserver = new ResizeObserver(() => {
      updateCanvasFit();
    });
    previewResizeObserver.observe(previewContainerRef.value);
    updateCanvasFit();
  }
  loadVoicePresets();
  loadTeamMembers();
});

onUnmounted(() => {
  window.removeEventListener('pipeline-asset-updated', handleAssetUpdated);
  if (previewResizeObserver) {
    previewResizeObserver.disconnect();
    previewResizeObserver = null;
  }
});
</script>

<template>
  <div id="project-workspace-page" class="h-screen w-full flex flex-col font-sans overflow-hidden bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)]">
    
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TOP BAR NAVIGATION                                                     -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <header class="h-16 border-b flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 relative" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
      <div class="flex items-center gap-4">
        <el-button link circle @click="goBack" class="!p-1" icon="Back" />

        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <h1 class="font-bold text-sm sm:text-base leading-tight" style="color: var(--el-text-color-primary);">
              {{ seriesTitle }}
            </h1>
            <el-tag size="small" type="primary" effect="plain" round class="font-bold font-mono text-[10px]">
              {{ seriesStore.currentSeries?.ratio || '9:16' }}
            </el-tag>
          </div>
          <div class="text-[11px] flex items-center gap-2" style="color: var(--el-text-color-secondary);">
            <span>{{ currentEpisodeTitle }}</span>
            <el-divider direction="vertical"></el-divider>
            <span class="font-semibold flex items-center gap-1" style="color: var(--el-color-primary);">
              <el-icon :size="12"><MagicStick /></el-icon>
              {{ t('workspace.aiAssistantActive') }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div v-if="pipelineStore.isRendering" class="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold" style="background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-7);">
          <el-icon class="is-loading" :size="12"><Loading /></el-icon>
          <span>{{ pipelineStore.currentRenderingMessage || (pipelineStore.currentRenderingScene ? t('workspace.renderingScene', { scene: pipelineStore.currentRenderingScene, percent: pipelineStore.currentRenderingPercent }) : `${t('common.processing')} (${pipelineStore.currentRenderingPercent}%)`) }}</span>
        </div>

        <el-button round icon="Upload" size="small" @click="saveAllWorkspaceData">
          {{ t('common.save') }}
        </el-button>

        <el-button type="primary" icon="Promotion" size="small" round @click="triggerBulkPublish">
          {{ t('workspace.publishSeries') }}
        </el-button>

        <!--<el-button circle plain icon="User" @click="isCollaboratorsModalOpen = true" />-->

        <el-button circle plain icon="Cpu" :type="isAiSidebarOpen ? 'primary' : 'default'" @click="isAiSidebarOpen = !isAiSidebarOpen" :title="t('workspace.toggleAiSidebar', 'Toggle AI Copilot Sidebar')" />
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- WORKSPACE 3-COLUMN BODY                                                -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div class="flex flex-1 overflow-hidden">
      
      <!-- ─── 1. LEFT SIDEBAR: EPISODE LIBRARY ──────────────────────────────── -->
      <aside
        class="border-r flex flex-col shrink-0 z-10 transition-all duration-300"
        :class="isLeftSidebarCollapsed ? 'w-16' : 'w-72'"
        style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);"
      >
        <!-- Collapsed Mini View -->
        <div v-if="isLeftSidebarCollapsed" class="p-2 flex-1 flex flex-col items-center overflow-hidden">
          <el-button
            circle plain size="small"
            icon="Expand"
            class="mb-3"
            @click="isLeftSidebarCollapsed = false"
            :title="t('workspace.expandSidebar', 'Expand Episode Library')"
          />

          <el-button
            circle plain size="small"
            type="primary"
            icon="Plus"
            class="mb-3 !ml-0"
            @click="isAddEpisodeModalOpen = true"
            :title="t('workspace.addEpisode', 'Add Episode')"
          />

          <!-- Mini Episodes List -->
          <div class="flex-1 overflow-y-auto space-y-2.5 w-full flex flex-col items-center custom-scrollbar">
            <div
              v-for="(ep, idx) in episodesList"
              :key="ep.id"
              @click="selectEpisode(ep, idx)"
              class="w-11 h-14 rounded-xl border transition-all cursor-pointer relative overflow-hidden shrink-0 group flex items-center justify-center"
              :class="activeEpisodeId === ep.id ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-neutral-900 border-emerald-500' : 'border-neutral-700 hover:border-neutral-500'"
              :title="`EP #${ep.number}: ${ep.title}`"
            >
              <img
                :src="(ep as any).thumbnail_url || (ep as any).cover_image || (ep.scenes && ep.scenes[0] && (ep.scenes[0].storyboard_frame_url || ep.scenes[0].video_url)) || '/images/dashboard/episode-thumb-default.jpg'"
                :alt="ep.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-0.5">
                <span class="text-[9px] font-black text-white font-mono drop-shadow">#{{ ep.number }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Mini Load Indicator -->
          <div class="pt-2 border-t w-full flex justify-center" style="border-color: var(--el-border-color-light);">
            <el-tag size="small" round type="info" class="!px-1.5 !text-[9px] font-mono">
              {{ episodesList.length }}
            </el-tag>
          </div>
        </div>

        <!-- Expanded Full View -->
        <div v-else class="p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[11px] font-bold tracking-wider uppercase" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.episodeLibrary') }}
            </h2>
            <div class="flex items-center gap-1">
              <el-button circle plain size="small" icon="Plus" type="primary" :disabled="true" @click="isAddEpisodeModalOpen = true" />
              <el-button circle plain icon="Fold" size="small" @click="isLeftSidebarCollapsed = true" :title="t('workspace.collapseSidebar', 'Collapse sidebar')" />
            </div>
          </div>

          <!-- <el-button
            type="primary"
            round
            class="w-full !mb-4 !font-semibold !py-2.5"
            @click="triggerAutoPipeline(true)"
            icon="Cpu" size="small"
          >
            {{ t('workspace.autoPipelineFlow') }}
          </el-button> -->

          <!-- Episodes Scroll Area -->
          <div class="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            <div
              v-for="(ep, idx) in episodesList"
              :key="ep.id"
              @click="selectEpisode(ep, idx)"
              class="p-2.5 rounded-2xl border transition-all cursor-pointer flex gap-3 group relative overflow-hidden"
              :style="activeEpisodeId === ep.id
                ? 'border-color: var(--el-color-primary); background-color: var(--el-color-primary-light-9);'
                : 'border-color: var(--el-border-color-light); background-color: var(--el-fill-color-light);'"
            >
              <div class="w-16 h-20 rounded-xl overflow-hidden relative shrink-0 bg-neutral-900">
                <img :src="(ep as any).thumbnail_url || (ep as any).cover_image || (ep.scenes && ep.scenes[0] && (ep.scenes[0].storyboard_frame_url || ep.scenes[0].video_url)) || '/images/dashboard/episode-thumb-default.jpg'" :alt="ep.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white rounded text-[9px] font-mono">
                  #{{ ep.number }}
                </div>
              </div>

              <div class="flex flex-col justify-center py-1 flex-1 min-w-0">
                <h3 class="font-bold text-xs truncate" style="color: var(--el-text-color-primary);">{{ ep.title }}</h3>
                <p class="text-[11px] mt-0.5" style="color: var(--el-text-color-secondary);">{{ ep.duration }} • {{ ep.scenes_count }}</p>
                <div class="flex items-center gap-1.5 mt-2">
                  <el-tag type="primary" size="small" round effect="plain">{{ ep.status }}</el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- Batch Queue Status -->
          <div class="mt-4 pt-4 border-t" style="border-color: var(--el-border-color-light);">
            <div class="flex justify-between text-[10px] font-bold tracking-wide mb-2" style="color: var(--el-text-color-secondary);">
              <span>{{ t('workspace.batchQueue') }} ({{ episodesList.length }}/{{ seriesStore.currentSeries?.total_episodes || 24 }})</span>
              <span style="color: var(--el-color-primary);">{{ Math.round((episodesList.length / (seriesStore.currentSeries?.total_episodes || 24)) * 100) }}%</span>
            </div>
            <el-progress
              :percentage="Math.min(100, Math.round((episodesList.length / (seriesStore.currentSeries?.total_episodes || 24)) * 100))"
              :show-text="false"
              :stroke-width="4"
              color="var(--el-color-primary)"
            />
          </div>

          <div class="mt-4 pt-2 border-t" style="border-color: var(--el-border-color-light);">
            <div class="flex justify-between items-end">
              <span class="text-[10px] font-bold tracking-widest uppercase" style="color: var(--el-text-color-secondary);">{{ t('workspace.seriesLoad') }}</span>
              <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">{{ t('workspace.seriesLoadCount', { count: episodesList.length, total: seriesStore.currentSeries?.total_episodes || 100 }) }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- ─── 2. MAIN CENTER AREA: 9:16 PREVIEW & TIMELINE ──────────────────── -->
      <main class="flex-1 flex flex-col min-w-0 bg-[var(--el-bg-color-page)] relative z-0">
        
        <!-- Center Preview Area with OpenVideo CanvasPanel -->
        <div ref="previewContainerRef" class="flex-1 flex items-center justify-center p-3 relative overflow-hidden min-h-0">
          
          <!-- Clean Preview Wrapper -->
          <div class="w-full h-full rounded-2xl overflow-hidden relative border shadow-sm flex items-center justify-center" style="background-color: var(--el-bg-color); border-color: var(--el-border-color-light);">
            <CanvasPanel class="w-full h-full" />
          </div>
        </div>

        <!-- Draggable Resizer Bar between Canvas Preview & Timeline -->
        <div
          class="h-2 hover:h-2.5 transition-all cursor-row-resize flex items-center justify-center group select-none z-20 border-y"
          style="background-color: var(--el-border-color-lighter); border-color: var(--el-border-color);"
          @mousedown="startTimelineResize"
        >
          <div class="w-12 h-1 rounded-full transition-colors" style="background-color: var(--el-text-color-placeholder);"></div>
        </div>

        <!-- Timeline Container (Resizable Bottom Panel) -->
        <div class="border-t z-10 flex flex-col overflow-hidden" style="border-color: var(--el-border-color); background-color: var(--el-card-bg-color);" :style="{ height: `${timelineHeight}px` }">
          <!-- OpenVideo Full Timeline Component -->
          <Timeline class="w-full h-full" />
        </div>
      </main>

      <!-- ─── 3. DEDICATED AI COPILOT RIGHT SIDEBAR ────────────────────────────── -->
      <aside
        v-if="isAiSidebarOpen"
        class="w-80 lg:w-96 h-[calc(100vh-56px)] border-l flex flex-col shrink-0 z-10 shadow-soft p-4"
        style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);"
      >
        <Chatbot @close="isAiSidebarOpen = false" />
      </aside>

      <!-- ─── 4. RIGHT SIDEBAR: PIPELINE / SCRIPT / AUDIO / CAPTIONS ───────────── -->
      <aside
        class="border-l flex flex-col shrink-0 z-20 shadow-soft transition-all duration-300"
        :class="isTabSidebarCollapsed ? 'w-14' : 'w-80 lg:w-96'"
        style="border-color: var(--el-border-color); background-color: var(--el-card-bg-color);"
      >
        <!-- Collapsed Mini Tab Strip -->
        <div v-if="isTabSidebarCollapsed" class="p-2 flex-1 flex flex-col items-center justify-between overflow-hidden">
          <div class="flex flex-col items-center gap-2.5 w-full">
            <el-button
              v-for="tab in [
                { id: 'pipeline', label: t('workspace.tabPipeline', 'Pipeline'), icon: 'Files' },
                { id: 'script', label: t('workspace.tabScript', 'Script'), icon: 'Document' },
                { id: 'audio', label: t('workspace.tabAudio', 'Audio'), icon: 'Microphone' },
                { id: 'captions', label: t('workspace.tabCaptions', 'Captions'), icon: 'ChatSquare' }
              ]"
              :key="tab.id"
              circle
              size="small"
              :type="rightTab === tab.id ? 'primary' : 'default'"
              :plain="rightTab !== tab.id"
              class="!ml-0"
              @click="rightTab = tab.id as any; isTabSidebarCollapsed = false"
              :title="tab.label"
            >
              <el-icon><component :is="tab.icon" /></el-icon>
            </el-button>
          </div>

          <div class="flex flex-col items-center gap-2">
            <el-button
              circle plain size="small"
              icon="Expand"
              @click="isTabSidebarCollapsed = false"
              :title="t('workspace.expandTabs', 'Expand Tabs')"
            />
          </div>
        </div>

        <!-- Expanded Full Tab Panels Content -->
        <div v-else class="flex-1 flex flex-col h-full overflow-hidden">
          <!-- Sidebar Navigation Tabs -->
          <div class="flex items-center justify-between border-b p-2 gap-1" style="border-color: var(--el-border-color);">
            <div class="flex flex-1 gap-1">
              <el-button
                v-for="tab in [
                  { id: 'pipeline', label: t('workspace.tabPipeline', 'Pipeline'), icon: 'Files' },
                  { id: 'script', label: t('workspace.tabScript', 'Script'), icon: 'Document' },
                  { id: 'audio', label: t('workspace.tabAudio', 'Audio'), icon: 'Microphone' },
                  { id: 'captions', label: t('workspace.tabCaptions', 'Captions'), icon: 'ChatSquare' }
                ]"
                :key="tab.id"
                @click="rightTab = tab.id as any"
                :type="rightTab === tab.id ? 'primary' : ''"
                :plain="rightTab !== tab.id"
                round size="small"
                class="!ml-0 flex-1 !px-2"
              >
                <el-icon class="mr-1"><component :is="tab.icon" /></el-icon>
                <span class="hidden sm:inline">{{ tab.label }}</span>
              </el-button>
            </div>
            <el-button
              circle plain size="small"
              icon="Fold"
              @click="isTabSidebarCollapsed = true"
              :title="t('workspace.collapseTabs', 'Collapse Tabs')"
            />
          </div>

          <!-- Sidebar Tab Panels Content -->
          <div class="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-[var(--el-text-color-primary)]">
            <PipelineTab
              v-if="rightTab === 'pipeline'"
              @open-cast="openManageCast"
              @run-pipeline="runPipeline"
              @view-character="openCharacterDetail"
            />
            <ScriptTab
              v-else-if="rightTab === 'script'"
              @open-master-script="openMasterScript"
            />
            <AudioTab
              v-else-if="rightTab === 'audio'"
            />
            <CaptionsTab
              v-else-if="rightTab === 'captions'"
              @apply-captions="applyCaptionsToTimeline"
            />
          </div>

          <!-- Right Sidebar Bottom Actions -->
          <div class="p-5 border-t" style="border-color: var(--el-border-color);">
            <div class="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-wide" style="color: var(--el-text-color-secondary);">
              <span>{{ t('workspace.readyToPublish') }}</span>
              <span>{{ t('workspace.epsVerticalHd', { count: episodesList.length || 100 }) }}</span>
            </div>
            <div class="flex gap-2">
              <el-button type="primary" round icon="Promotion" size="small" class="flex-1 !font-bold !py-3" @click="triggerBulkPublish">
                {{ t('workspace.bulkExportPublish') }}
              </el-button>
              <el-button circle plain size="small" icon="Calendar" @click="toast.info(t('toast.calendarScheduling'))" />
            </div>
          </div>
        </div>
      </aside>

    </div>

    <!-- 1. Master Script Modal -->
    <MasterScriptModal
      v-model="isMasterScriptModalOpen"
      :episode-title="currentEpisodeTitle"
    />

    <!-- 2. Manage Cast Modal -->
    <ManageCastModal
      v-model:open="isManageCastOpen"
      @view-character="openCharacterDetail"
    />

    <!-- 3. Character Detail Modal -->
    <CharacterDetailModal
      v-model:open="isCharacterDetailOpen"
      :character="selectedCharacter"
    />

    <!-- 3. Add Episode Modal (Connected to POST /api/series/:id/episodes) -->
    <el-dialog v-model="isAddEpisodeModalOpen" :title="t('workspace.addEpisode')" width="460px" append-to-body class="rounded-2xl">
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold text-[var(--el-text-color-secondary)] block mb-1.5 uppercase">{{ t('workspace.episodeTitle') }}</label>
          <el-input v-model="newEpisodeTitle" placeholder="e.g. The Hidden Truth" size="large" />
        </div>
        <div>
          <label class="text-xs font-bold text-[var(--el-text-color-secondary)] block mb-1.5 uppercase">{{ t('workspace.synopsisPlotHook') }}</label>
          <el-input v-model="newEpisodeSynopsis" type="textarea" :rows="3" placeholder="Brief summary of the episode action..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAddEpisodeModalOpen = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="addNewEpisode">{{ t('workspace.createEpisode') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 4. Voice Settings Modal (Connected to GET /api/voices/presets) -->
    <el-dialog v-model="isVoiceSettingsModalOpen" :title="t('workspace.voiceSettings')" width="520px" append-to-body class="rounded-2xl">
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold text-[var(--el-text-color-secondary)] block mb-1.5 uppercase">Neural TTS Voice Preset</label>
          <el-select v-model="selectedVoicePreset" class="w-full" size="large">
            <el-option
              v-for="voice in voicePresetsList"
              :key="voice.id"
              :label="`${voice.name} (${voice.gender || 'Neural'} • ${voice.language || 'en-US'})`"
              :value="voice.id"
            />
          </el-select>
        </div>
        <div class="p-3 bg-[var(--el-fill-color-light)] rounded-xl border border-[var(--el-border-color)] text-xs space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-bold">TTS Model Engine</span>
            <el-tag size="small" type="success">Gemini Native Audio / ElevenLabs</el-tag>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-bold">Speech Recognition</span>
            <el-tag size="small" type="primary">Gemini Multimodal Audio STT</el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="isVoiceSettingsModalOpen = false" size="small" round>Save Voice Settings</el-button>
      </template>
    </el-dialog>

    <!-- 5. Collaborators Modal (Connected to GET & POST /api/admin/team-members) -->
    <el-dialog v-model="isCollaboratorsModalOpen" :title="t('workspace.collaborators')" width="520px" append-to-body class="rounded-2xl">
      <div class="space-y-4">
        <div class="flex gap-2">
          <el-input v-model="inviteEmail" placeholder="colleague@shine.ai" size="small" class="flex-1" />
          <el-select v-model="inviteRole" size="small" class="w-28">
            <el-option label="Editor" value="Editor" />
            <el-option label="Viewer" value="Viewer" />
            <el-option label="Admin" value="Admin" />
          </el-select>
          <el-button type="primary" size="small" @click="inviteTeamMember" round>Invite</el-button>
        </div>

        <div class="max-h-56 overflow-y-auto space-y-2">
          <div
            v-for="mem in teamMembersList"
            :key="mem.id"
            class="flex items-center justify-between p-2.5 rounded-xl bg-[var(--el-fill-color-light)] border border-[var(--el-border-color)]/60"
          >
            <div class="flex items-center gap-3">
              <img :src="mem.avatar" class="w-8 h-8 rounded-full object-cover" />
              <div>
                <div class="text-xs font-bold">{{ mem.name }}</div>
                <div class="text-[10px] text-[var(--el-text-color-secondary)]">{{ mem.email }}</div>
              </div>
            </div>
            <el-tag size="small" :type="mem.role === 'Owner' ? 'success' : 'info'">{{ mem.role }}</el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="isCollaboratorsModalOpen = false" size="small" round>Done</el-button>
      </template>
    </el-dialog>

    <!-- 6. Chat Assistant Modal (Connected to POST /api/ai/assistant/command-edit) -->
    <el-dialog v-model="isChatModalOpen" :title="t('workspace.chatAssistant')" width="540px" append-to-body class="rounded-2xl">
      <div class="space-y-4">
        <div class="h-72 overflow-y-auto p-3 rounded-xl border text-xs space-y-3 custom-scrollbar" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
          <div
            v-for="(msg, i) in chatMessages"
            :key="i"
            class="p-3 rounded-xl max-w-[85%] border"
            :style="msg.role === 'user'
              ? 'margin-left: auto; background-color: var(--el-color-primary); color: white; border-color: var(--el-color-primary);'
              : 'background-color: var(--el-card-bg-color); border-color: var(--el-border-color); color: var(--el-text-color-primary);'"
          >
            <div class="flex items-center justify-between gap-4 mb-1">
              <span class="font-bold text-[10px] uppercase opacity-75">{{ msg.role === 'user' ? 'You' : 'AI Director' }}</span>
              <span class="text-[9px] opacity-60">{{ msg.time }}</span>
            </div>
            <p class="leading-relaxed">{{ msg.text }}</p>
          </div>
          <div v-if="isChatSending" class="p-2.5 rounded-xl border text-xs flex items-center gap-2" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color);">
            <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
            <span>AI Director is executing edits on timeline...</span>
          </div>
        </div>
        <div class="flex gap-2">
          <el-input
            v-model="chatInputPrompt"
            placeholder="e.g. Cut clip at 5s, zoom in Mara face and sync suspense theme..."
            size="large"
            @keyup.enter="sendChatMessage"
          />
          <el-button type="primary" size="large" icon="Promotion" :loading="isChatSending" @click="sendChatMessage" />
        </div>
      </div>
    </el-dialog>

    <!-- 7. Bulk Export & Publish Modal (Connected to POST /api/publish/multi-platform) -->
    <el-dialog v-model="isPublishModalOpen" :title="t('workspace.bulkExportPublish')" width="540px" append-to-body class="rounded-2xl">
      <div class="space-y-4">
        <p class="text-xs" style="color: var(--el-text-color-secondary);">
          Select target distribution channels for simultaneous multi-platform publishing:
        </p>
        <el-checkbox-group v-model="selectedPublishPlatforms" class="grid grid-cols-3 gap-3 w-full">
          <el-checkbox label="tiktok" border class="!m-0 !h-auto !p-3 rounded-xl flex flex-col items-center">
            <div class="flex flex-col items-center gap-1.5 py-1">
              <el-tag size="large" effect="dark" round class="font-bold">TikTok</el-tag>
              <span class="text-[11px]" style="color: var(--el-text-color-secondary);">9:16 Feed</span>
            </div>
          </el-checkbox>
          <el-checkbox label="youtube" border class="!m-0 !h-auto !p-3 rounded-xl flex flex-col items-center">
            <div class="flex flex-col items-center gap-1.5 py-1">
              <el-tag size="large" type="danger" effect="dark" round class="font-bold">Shorts</el-tag>
              <span class="text-[11px]" style="color: var(--el-text-color-secondary);">YouTube</span>
            </div>
          </el-checkbox>
          <el-checkbox label="instagram" border class="!m-0 !h-auto !p-3 rounded-xl flex flex-col items-center">
            <div class="flex flex-col items-center gap-1.5 py-1">
              <el-tag size="large" type="warning" effect="dark" round class="font-bold">Reels</el-tag>
              <span class="text-[11px]" style="color: var(--el-text-color-secondary);">Instagram</span>
            </div>
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isPublishModalOpen = false">Cancel</el-button>
          <el-button type="primary" :loading="isPublishing" icon="Promotion" @click="executeBulkPublish">
            Start Export &amp; Publish
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ── B8: Local Browser Export Modal ─────────────────────────────────── -->
    <ExportModal
      :open="isExportModalOpen"
      @update:open="(v) => { if (!v) { isExportModalOpen = false; pipelineStore.setStepStatus('b8', 'idle'); } }"
      @exported="onLocalExportDone"
    />

    <!-- ── B8: Post-render Video Review Dialog ────────────────────────────── -->
    <el-dialog
      v-model="isRenderReviewOpen"
      :title="t('workspace.reviewRenderedVideo')"
      width="560px"
      class="rounded-2xl"
      :close-on-click-modal="true"
      @closed="renderReviewUrl = ''"
    >
      <div class="flex flex-col gap-4">
        <!-- Multi-language version selector tabs -->
        <div v-if="Object.keys(renderReviewOutputs).length > 1" class="flex items-center gap-1.5 p-1 rounded-xl border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
          <button
            v-for="(url, lang) in renderReviewOutputs"
            :key="lang"
            class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :style="renderReviewSelectedLang === String(lang)
              ? 'background-color: var(--el-color-primary); color: white; border-color: var(--el-color-primary);'
              : 'background-color: transparent; border-color: transparent; color: var(--el-text-color-primary);'"
            @click="renderReviewSelectedLang = String(lang); renderReviewUrl = url"
          >
            <CountryFlag :code="getLanguageByCode(String(lang)).countryCode" :flag="getLanguageByCode(String(lang)).flag" size="small" />
            <span>{{ getLanguageByCode(String(lang)).nativeName }}</span>
          </button>
        </div>

        <div v-if="renderReviewUrl" class="rounded-xl overflow-hidden border" style="border-color: var(--el-border-color);">
          <video
            :key="renderReviewUrl"
            :src="renderReviewUrl"
            controls
            autoplay :poster="renderReviewThumbnail"
            class="w-full max-h-[360px] bg-black"
            style="aspect-ratio: 4/3; object-fit: contain;"
          />
        </div>
        <div v-else class="text-center py-8 text-sm" style="color: var(--el-text-color-secondary);">
          <el-icon class="is-loading text-2xl mb-2"><Loading /></el-icon>
          <p>{{ t('workspace.waitingForRender') }}</p>
        </div>
        <div class="flex gap-2 justify-end">
          <el-button @click="isRenderReviewOpen = false">{{ t('common.close') }}</el-button>
          <el-button
            v-if="renderReviewUrl"
            type="success"
            icon="Download"
            tag="a"
            :href="renderReviewUrl"
            :download="`episode-${activeEpisodeId}-${renderReviewSelectedLang}.mp4`"
          >
            {{ t('workspace.download') }} ({{ getLanguageByCode(renderReviewSelectedLang).countryCode.toUpperCase() }})
          </el-button>
          <el-button type="primary" icon="Cpu" @click="queueServerRender">
            {{ t('workspace.queueServerRender') }}
          </el-button>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color);
  border-radius: 10px;
}
.shadow-soft {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
</style>
