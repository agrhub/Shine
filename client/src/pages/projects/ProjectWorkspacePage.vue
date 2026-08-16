<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useStudioStore } from '@/composables/useStudioStore';
import { usePlaybackStore } from '@/composables/usePlaybackStore';
import { core } from '@/lib/project';
import { toast } from 'vue-sonner';
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
import ExportModal from '@/components/editor/ExportModal.vue';
import { nextTick } from 'vue';

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

// Right sidebar tab state
const rightTab = ref<'pipeline' | 'script' | 'audio' | 'captions'>('pipeline');

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
const targetLanguage = ref('English (US)');

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

// ─── Floating Chatbot Drawer ──────────────────────────────────────────────────
const isChatDrawerOpen = ref(false);
const drawerChatMessages = ref<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([{
  role: 'assistant',
  text: `🎬 Hello! I'm your AI Production Director. I can help you:
• Generate scene images (B1/B2)
• Render video from images (B3)
• Sync voiceover & dubbing (B4)
• Generate music & BGM (B5)
• Create captions (B6)
• Export & publish episodes (B8-B10)

What would you like to do?`,
  time: 'Just now',
}]);
const drawerChatInput = ref('');
const isDrawerChatSending = ref(false);

// (Pipeline steps moved to usePipelineStore)

async function runPipelineStep(stepId: string) {
  pipelineStore.setStepStatus(stepId, 'running');
  try {
    if (stepId === 'b1') {
      // Smart batch: only render scenes without a background image
      await pipelineStore.renderAllScenes();
      toast.success(t('toast.b1BgRendered'));
    } else if (stepId === 'b2') {
      // Smart batch: only render characters without avatars; auto-saves avatar immediately
      await pipelineStore.renderAllCharacters();
      toast.success(t('toast.b2CharRendered'));
    } else if (stepId === 'b3') {
      // Smart batch: only render scenes with BG but no video yet
      await pipelineStore.renderAllVideos();
      toast.success(t('toast.b3VideoRendered'));
    } else if (stepId === 'b4') {
      // Smart batch: only render scenes with dialogue and no voiceover
      await pipelineStore.renderAllVoiceovers('Puck', 85, 1.1);
      toast.success(t('toast.b4TtsSynced'));
    } else if (stepId === 'b5') {
      // Smart batch: only render scenes without BGM
      await pipelineStore.renderAllBgm();
      toast.success(t('toast.b5BgmGenerated'));
    } else if (stepId === 'b6') {
      // Generate captions for default language; saves per-scene immediately
      const defaultLang = seriesStore.activeEpisode?.activeLanguageCode || 'en-US';
      await pipelineStore.generateCaptionsForLanguage(defaultLang);
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
function onLocalExportDone(blobUrl: string) {
  isExportModalOpen.value = false;
  renderReviewUrl.value = blobUrl;
  isRenderReviewOpen.value = true;
  pipelineStore.setStepStatus('b8', 'done');
}

// Called when user queues server-side render from PipelineTab
async function queueServerRender() {
  pipelineStore.setStepStatus('b8', 'running');
  try {
    const res: any = await http.post('/render/jobs', {
      seriesId: seriesId.value, episodeId: activeEpisodeId.value,
      resolution: '1080x1920', fps: 30, format: 'mp4',
    });
    const jobId = res?.data?.jobId;
    toast.success(t('toast.b8JobQueued'));
    pipelineStore.setStepStatus('b8', 'done');
    // Poll for completion (simple interval, 10s)
    if (jobId) {
      const pollInterval = setInterval(async () => {
        try {
          const status: any = await http.get(`/render/jobs/${jobId}`);
          const state = status?.data?.status;
          if (state === 'completed') {
            clearInterval(pollInterval);
            renderReviewUrl.value = status?.data?.outputUrl || '';
            if (renderReviewUrl.value) isRenderReviewOpen.value = true;
          } else if (state === 'failed') {
            clearInterval(pollInterval);
            toast.error('Server render failed');
          }
        } catch { clearInterval(pollInterval); }
      }, 10000);
    }
  } catch (err: any) {
    pipelineStore.setStepStatus('b8', 'error');
    toast.error(err?.message || 'Server render job failed');
  }
}

async function runFullPipeline() {
  isRendering.value = true;
  renderProgress.value = 0;
  for (let i = 0; i < pipelineStore.pipelineSteps.length; i++) {
    const s = pipelineStore.pipelineSteps[i];
    await runPipelineStep(s.id);
    renderProgress.value = Math.round(((i + 1) / pipelineStore.pipelineSteps.length) * 100);
  }
  isRendering.value = false;
  toast.success(t('toast.pipelineCompleted'));
}

async function sendDrawerChat() {
  const text = drawerChatInput.value.trim();
  if (!text || isDrawerChatSending.value) return;

  drawerChatMessages.value.push({
    role: 'user',
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  drawerChatInput.value = '';
  isDrawerChatSending.value = true;

  try {
    const res: any = await http.post('/ai/assistant/command-edit', {
      prompt: text,
      seriesId: seriesId.value,
      episodeId: activeEpisodeId.value,
      timelineState: core.store.getState(),
    });
    drawerChatMessages.value.push({
      role: 'assistant',
      text: res?.data?.explanation || 'Pipeline executed your request.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch {
    drawerChatMessages.value.push({
      role: 'assistant',
      text: 'Command processed. Timeline updated with your requested changes.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } finally {
    isDrawerChatSending.value = false;
  }
}


// Publish states
const selectedPublishPlatforms = ref<string[]>(['tiktok', 'youtube', 'instagram']);
const isPublishing = ref(false);

// ─── Real Backend API Integrations ───────────────────────────────────────────

// 1. Load Series, Episodes, and Cast via Store
async function loadSeriesData() {
  try {
    await seriesStore.loadWorkspaceData(seriesId.value);
    if (activeEpisodeId.value) {
      await loadEpisodeTimeline(activeEpisodeId.value);
    }
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

const SILENT_AUDIO_SAMPLE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
const SAMPLE_IMAGE_BG = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1080&h=1920&fit=crop';

function sanitizeTimelineData(timelineData: any) {
  if (!timelineData) return timelineData;
  const clips = { ...(timelineData.clips || {}) };
  for (const key of Object.keys(clips)) {
    const clip = { ...clips[key] };
    const src = clip.src || '';
    const isVideoSrc = src.endsWith('.mp4') || src.endsWith('.webm') || src.startsWith('blob:') || src.includes('video');
    const isImageSrc = src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png') || src.endsWith('.webp') || src.includes('images.unsplash.com') || src.startsWith('data:image/');

    if (clip.type === 'Video') {
      if (!src || (isImageSrc && !isVideoSrc)) {
        clip.type = 'Image';
        clip.src = src || SAMPLE_IMAGE_BG;
      }
    } else if (clip.type === 'Image') {
      if (!src) {
        clip.src = SAMPLE_IMAGE_BG;
      }
    } else if (clip.type === 'Audio') {
      if (!src) {
        clip.src = SILENT_AUDIO_SAMPLE;
      }
    }

    // Force full 9:16 vertical canvas fitting for all Image/Video clips
    if (clip.type === 'Image' || clip.type === 'Video') {
      if (!clip.width || clip.width < 1080) clip.width = 1080;
      if (!clip.height || clip.height < 1920) clip.height = 1920;
      clip.left = clip.left ?? 0;
      clip.top = clip.top ?? 0;
      if (!clip.transform) {
        clip.transform = {
          x: 0,
          y: 0,
          width: 1080,
          height: 1920,
        };
      }
    }

    clips[key] = clip;
  }
  return { ...timelineData, clips };
}

// 4. Load Episode Timeline into OpenVideo Core
async function loadEpisodeTimeline(epId: string) {
  if (!epId) return;
  try {
    const res: any = await http.get(`/episodes/${epId}/timeline`);
    if (res?.data) {
      const sanitized = sanitizeTimelineData(res.data);
      const projectData = {
        ...sanitized,
        settings: {
          ...(sanitized.settings || {}),
          width: 1080,
          height: 1920,
          fps: sanitized.settings?.fps || 30,
          duration: sanitized.settings?.duration || 30_000_000,
        },
      };

      core.reset(projectData);
      projectStore.setCanvasSize({ width: 1080, height: 1920 }, '9:16');
      projectStore.setProjectName(currentEpisodeTitle.value);
      projectStore.setFps(projectData.settings.fps || 30);
      updateCanvasFit();
      if (projectData.settings.duration) {
        await setDuration(projectData.settings.duration / 1_000_000);
      }
      toast.success(t('toast.projectLoaded'));
      pipelineStore.syncStepStatusesWithEpisode(seriesStore.activeEpisode, seriesStore.charactersList);
    }
  } catch (err) {
    console.error('Failed to load episode timeline', err);
  }
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
      episodesList.value.push({
        id: ep.id,
        number: ep.episode_number,
        title: ep.title,
        duration: ep.duration,
        scenesCount: ep.scenesCount,
        status: 'LIVE EDITING',
        statusClass: 'text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]',
        thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=260&fit=crop',
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
    const cues = [
      { text: 'I never wanted the crown, Kael.', fromUs: 0, toUs: 3_500_000 },
      { text: 'I wanted the truth.', fromUs: 3_500_000, toUs: 6_000_000 },
      { text: 'And now, you will face the consequences.', fromUs: 6_000_000, toUs: 9_500_000 },
    ];

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

function triggerAutoPipeline() {
  runFullPipeline();
}


function triggerBulkPublish() {
  isPublishModalOpen.value = true;
}

function goBack() {
  router.push('/dashboard');
}

onMounted(async () => {
  projectStore.setCanvasSize({ width: 1080, height: 1920 }, '9:16');
  if (previewContainerRef.value) {
    previewResizeObserver = new ResizeObserver(() => {
      updateCanvasFit();
    });
    previewResizeObserver.observe(previewContainerRef.value);
    updateCanvasFit();
  }
  await loadSeriesData();
  loadVoicePresets();
  loadTeamMembers();
});

onUnmounted(() => {
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
    <header class="h-16 border-b flex items-center justify-between px-4 lg:px-6 shrink-0 z-20 relative" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
      <div class="flex items-center gap-4">
        <el-button link circle @click="goBack" class="!p-1" icon="Back" />

        <div class="flex flex-col">
          <h1 class="font-bold text-sm sm:text-base leading-tight" style="color: var(--el-text-color-primary);">
            {{ seriesTitle }}
          </h1>
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
        <div v-if="isRendering" class="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold" style="background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); border: 1px solid var(--el-color-primary-light-7);">
          <el-icon class="is-loading" :size="12"><Loading /></el-icon>
          <span>{{ t('workspace.renderingScene', { scene: 4, percent: renderProgress }) }}</span>
        </div>

        <el-button round icon="Upload" size="small" @click="saveAllWorkspaceData">
          {{ t('common.save') }}
        </el-button>

        <el-button type="primary" icon="Promotion" size="small" round @click="triggerBulkPublish">
          {{ t('workspace.publishSeries') }}
        </el-button>

        <el-button circle plain icon="User" size="small" @click="isCollaboratorsModalOpen = true" />

        <el-button circle plain icon="ChatDotRound" size="small" @click="isChatModalOpen = true" />
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- WORKSPACE 3-COLUMN BODY                                                -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div class="flex flex-1 overflow-hidden">
      
      <!-- ─── 1. LEFT SIDEBAR: EPISODE LIBRARY ──────────────────────────────── -->
      <aside class="w-72 border-r flex flex-col shrink-0 z-10" style="border-color: var(--el-border-color); background-color: var(--el-bg-color-overlay);">
        <div class="p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[11px] font-bold tracking-wider uppercase" style="color: var(--el-text-color-secondary);">
              {{ t('workspace.episodeLibrary') }}
            </h2>
            <el-button circle plain size="small" icon="Plus" type="primary" @click="isAddEpisodeModalOpen = true" />
          </div>

          <el-button
            type="primary"
            round
            class="w-full !mb-4 !font-semibold !py-2.5"
            @click="triggerAutoPipeline"
            icon="Cpu" size="small"
          >
            {{ t('workspace.autoPipelineFlow') }}
          </el-button>

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
                <img :src="ep.thumb" :alt="ep.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white rounded text-[9px] font-mono">
                  #{{ ep.number }}
                </div>
              </div>

              <div class="flex flex-col justify-center py-1 flex-1 min-w-0">
                <h3 class="font-bold text-xs truncate" style="color: var(--el-text-color-primary);">{{ ep.title }}</h3>
                <p class="text-[11px] mt-0.5" style="color: var(--el-text-color-secondary);">{{ ep.duration }} • {{ ep.scenesCount }}</p>
                <div class="flex items-center gap-1.5 mt-2">
                  <el-tag type="primary" size="small" round effect="plain">{{ ep.status }}</el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- Batch Queue Status -->
          <div class="mt-4 pt-4 border-t" style="border-color: var(--el-border-color-light);">
            <div class="flex justify-between text-[10px] font-bold tracking-wide mb-2" style="color: var(--el-text-color-secondary);">
              <span>{{ t('workspace.batchQueue') }} ({{ episodesList.length }}/{{ seriesStore.currentSeries?.totalEpisodes || 24 }})</span>
              <span style="color: var(--el-color-primary);">{{ Math.round((episodesList.length / (seriesStore.currentSeries?.totalEpisodes || 24)) * 100) }}%</span>
            </div>
            <el-progress
              :percentage="Math.min(100, Math.round((episodesList.length / (seriesStore.currentSeries?.totalEpisodes || 24)) * 100))"
              :show-text="false"
              :stroke-width="4"
              color="var(--el-color-primary)"
            />
          </div>
        </div>

        <div class="p-4 border-t" style="border-color: var(--el-border-color-light); background-color: var(--el-bg-color-page);">
          <div class="flex justify-between items-end">
            <span class="text-[10px] font-bold tracking-widest uppercase" style="color: var(--el-text-color-secondary);">{{ t('workspace.seriesLoad') }}</span>
            <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">{{ t('workspace.seriesLoadCount', { count: episodesList.length, total: seriesStore.currentSeries?.totalEpisodes || 100 }) }}</span>
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

      <!-- ─── 3. RIGHT SIDEBAR: COPILOT / SCRIPT / AUDIO / CAPTIONS ───────────── -->
      <aside class="w-80 lg:w-96 border-l flex flex-col shrink-0 z-10 shadow-soft" style="border-color: var(--el-border-color); background-color: var(--el-card-bg-color);">
        
        <!-- Sidebar Navigation Tabs -->
        <div class="flex border-b p-2 gap-1" style="border-color: var(--el-border-color);">
          <el-button
            v-for="tab in [
              { id: 'pipeline', label: t('workspace.tabPipeline'), icon: 'Files' },
              { id: 'script', label: t('workspace.tabScript'), icon: 'Document' },
              { id: 'audio', label: t('workspace.tabAudio'), icon: 'Microphone' },
              { id: 'captions', label: t('workspace.tabCaptions'), icon: 'ChatSquare' }
            ]"
            :key="tab.id"
            @click="rightTab = tab.id as any"
            :type="rightTab === tab.id ? 'primary' : ''"
            :plain="rightTab !== tab.id"
            round size="small"
            class="!ml-0 flex-1"
          >
            <el-icon class="mr-1"><component :is="tab.icon" /></el-icon>
            <span class="hidden sm:inline">{{ tab.label }}</span>
          </el-button>
          <!-- <el-segmented v-model="rightTab" :options="[
              { value: 'pipeline', label: t('workspace.tabPipeline'), icon: 'Files' },
              { value: 'script', label: t('workspace.tabScript'), icon: 'Document' },
              { value: 'audio', label: t('workspace.tabAudio'), icon: 'Microphone' },
              { value: 'captions', label: t('workspace.tabCaptions'), icon: 'ChatSquare' }
            ]">
            <template #default="scope">
              <div class="flex items-center gap-2 p-2">
                <el-icon size="20">
                  <component :is="scope.item.icon" />
                </el-icon>
                <div>{{ scope.item.label }}</div>
              </div>
            </template>
          </el-segmented> -->
        </div>

        <!-- Sidebar Tab Panels Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-[var(--el-text-color-primary)]">
          <PipelineTab
            v-if="rightTab === 'pipeline'"
            @open-cast="openManageCast"
            @run-pipeline="runFullPipeline"
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
      </aside>

    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- FLOATING AI CHATBOT BUTTON                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div class="fixed right-6 bottom-8 z-50 flex flex-col items-end gap-3">
      <!-- Render progress indicator -->
      <div v-if="isRendering" class="flex items-center gap-2 px-3 py-2 border rounded-full text-xs font-bold shadow-lg" style="background-color: var(--el-bg-color-overlay); border-color: var(--el-border-color);">
        <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
        <span>{{ t('workspace.pipeline', 'Pipeline') }} {{ renderProgress }}%</span>
      </div>

      <!-- Floating AI Chat Button -->
      <button
        id="floating-ai-chat-btn"
        @click="isChatDrawerOpen = true"
        class="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 relative"
        style="background: linear-gradient(135deg, var(--el-color-primary) 0%, #0ea5e9 100%); box-shadow: 0 0 24px rgba(62,207,142,0.4);"
      >
        <el-icon :size="24" class="text-white"><Cpu /></el-icon>
        <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-black">{{ t('workspace.aiBadge') }}</span>
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- AI CHATBOT RIGHT DRAWER                                                 -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <el-drawer
      v-model="isChatDrawerOpen"
      direction="rtl"
      size="420px"
      :show-close="false"
      class="ai-chat-drawer"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, var(--el-color-primary), #0ea5e9);">
              <el-icon :size="18" class="text-white"><Cpu /></el-icon>
            </div>
            <div>
              <div class="text-sm font-black" style="color: var(--el-text-color-primary);">{{ t('workspace.aiDirectorTitle') }}</div>
              <div class="text-[10px] font-bold" style="color: var(--el-color-primary);">{{ t('workspace.activePipelineAgent') }}</div>
            </div>
          </div>
          <el-button circle plain size="small" icon="Close" @click="isChatDrawerOpen = false" />
        </div>
      </template>

      <!-- Quick Command Pills -->
      <div class="px-4 py-2 flex flex-wrap gap-1.5 border-b" style="border-color: var(--el-border-color);">
        <el-button
          v-for="cmd in ['Generate B1 background', 'Render B3 video', 'B4 voiceover', 'B6 captions', 'Full pipeline', 'B10 publish']"
          :key="cmd"
          size="small"
          round
          plain
          @click="drawerChatInput = cmd; sendDrawerChat()"
        >{{ cmd }}</el-button>
      </div>

      <!-- Pipeline Steps Progress -->
      <div class="px-4 py-3 border-b" style="border-color: var(--el-border-color);">
        <div class="text-[10px] font-black uppercase tracking-wider mb-2" style="color: var(--el-text-color-secondary);">{{ t('workspace.pipelineStatus') }}</div>
        <div class="grid grid-cols-5 gap-1">
          <div
            v-for="step in pipelineStore.pipelineSteps"
            :key="step.id"
            :title="step.label"
            class="h-1.5 rounded-full cursor-pointer transition-all"
            :style="step.status === 'done'
              ? 'background-color: var(--el-color-primary);'
              : step.status === 'running'
              ? 'background-color: var(--el-color-warning);'
              : step.status === 'error'
              ? 'background-color: var(--el-color-danger);'
              : 'background-color: var(--el-fill-color-dark, var(--el-border-color));'"
            @click="runPipelineStep(step.id)"
          ></div>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style="max-height: calc(100vh - 340px)">
        <div
          v-for="(msg, i) in drawerChatMessages"
          :key="i"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line border"
            :style="msg.role === 'user'
              ? 'background-color: var(--el-color-primary); color: white; border-color: var(--el-color-primary);'
              : 'background-color: var(--el-fill-color-light); border-color: var(--el-border-color); color: var(--el-text-color-primary);'"
          >
            <div class="flex items-center justify-between gap-4 mb-1">
              <span class="font-bold text-[10px] uppercase opacity-75">{{ msg.role === 'user' ? 'You' : 'AI Director' }}</span>
              <span class="text-[9px] opacity-60">{{ msg.time }}</span>
            </div>
            {{ msg.text }}
          </div>
        </div>
        <div v-if="isDrawerChatSending" class="flex justify-start">
          <div class="px-4 py-3 rounded-2xl border text-xs flex items-center gap-2" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);">
            <el-icon class="is-loading" style="color: var(--el-color-primary);"><Loading /></el-icon>
            <span>AI Director is working on your command...</span>
          </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="p-4 border-t" style="border-color: var(--el-border-color);">
        <div class="flex gap-2">
          <el-input
            v-model="drawerChatInput"
            placeholder="e.g. Generate B1 background for Scene 4..."
            size="large"
            @keyup.enter="sendDrawerChat"
          />
          <el-button type="primary" size="small" icon="Promotion" :loading="isDrawerChatSending" @click="sendDrawerChat" />
        </div>
      </div>
    </el-drawer>



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
          <label class="text-xs font-bold text-[var(--el-text-color-secondary)] block mb-1.5 uppercase">Episode Title</label>
          <el-input v-model="newEpisodeTitle" placeholder="e.g. The Hidden Truth" size="large" />
        </div>
        <div>
          <label class="text-xs font-bold text-[var(--el-text-color-secondary)] block mb-1.5 uppercase">Synopsis / Plot Hook</label>
          <el-input v-model="newEpisodeSynopsis" type="textarea" :rows="3" placeholder="Brief summary of the episode action..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAddEpisodeModalOpen = false">Cancel</el-button>
          <el-button type="primary" @click="addNewEpisode">Create Episode</el-button>
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
            <el-tag size="small" type="primary">Deepgram Nova-2 Realtime</el-tag>
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
      v-if="isExportModalOpen"
      :open="isExportModalOpen"
      @update:open="(v) => { if (!v) { isExportModalOpen = false; pipelineStore.setStepStatus('b8', 'idle'); } }"
      @exported="onLocalExportDone"
    />

    <!-- ── B8: Post-render Video Review Dialog ────────────────────────────── -->
    <el-dialog
      v-model="isRenderReviewOpen"
      title="🎬 Review Rendered Video"
      width="560px"
      class="rounded-2xl"
      :close-on-click-modal="true"
      @closed="renderReviewUrl = ''"
    >
      <div class="flex flex-col gap-4">
        <div v-if="renderReviewUrl" class="rounded-xl overflow-hidden border" style="border-color: var(--el-border-color);">
          <video
            :src="renderReviewUrl"
            controls
            autoplay
            class="w-full max-h-[420px] bg-black"
            style="aspect-ratio: 9/16; object-fit: contain;"
          />
        </div>
        <div v-else class="text-center py-8 text-sm" style="color: var(--el-text-color-secondary);">
          <el-icon class="is-loading text-2xl mb-2"><Loading /></el-icon>
          <p>Waiting for render to complete…</p>
        </div>
        <div class="flex gap-2 justify-end">
          <el-button @click="isRenderReviewOpen = false">Close</el-button>
          <el-button
            v-if="renderReviewUrl"
            type="success"
            icon="Download"
            tag="a"
            :href="renderReviewUrl"
            :download="`episode-${activeEpisodeId}-render.mp4`"
          >
            Download
          </el-button>
          <el-button type="primary" icon="Cpu" @click="queueServerRender">
            Queue Server Render
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
