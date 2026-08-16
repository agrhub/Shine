<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import Header from '@/components/editor/Header.vue';
import CanvasPanel from '@/components/editor/CanvasPanel.vue';
import MediaPanel from '@/components/editor/media-panel/MediaPanel.vue';
import Timeline from '@/components/editor/timeline/Timeline.vue';
import RightPanel from '@/components/editor/RightPanel.vue';
import Loading from './Loading.vue';
import WebcodecsUnsupportedModal from './WebcodecsUnsupportedModal.vue';
import FloatingControl from '@/components/editor/floating-controls/FloatingControl.vue';
import { usePanelStore } from '@/stores/usePanelStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { core } from '@/lib/project';
import { Compositor } from '@openvideo/engine-pixi';
import { data } from './data';
import 'vue-color/style.css';

import { useRoute } from 'vue-router';
import http from '@/utils/http';

const route = useRoute();
const panelStore = usePanelStore();
const projectStore = useProjectStore();

const isReady = ref(false);
const isWebCodecsSupported = ref(true);

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
    clips[key] = clip;
  }
  return { ...timelineData, clips };
}

onMounted(async () => {
  projectStore.resetProject();
  core.project.new();

  const episodeId = (route.params.episodeId as string) || (route.query.id as string);
  const seriesId = (route.params.seriesId as string) || 'srs_01';

  if (episodeId) {
    projectStore.projectId = episodeId;
    try {
      const res = await http.get(`/episodes/${episodeId}/timeline`) as any;
      const timelineData = res.data?.data || res.data || res;
      if (timelineData && (timelineData.tracks || timelineData.clips)) {
        setTimeout(() => {
          core.project.import(sanitizeTimelineData(timelineData));
        }, 300);
      } else {
        setTimeout(() => {
          core.project.import(data);
        }, 300);
      }
    } catch (e) {
      console.warn('[Editor] Fallback to default timeline data template:', e);
      setTimeout(() => {
        core.project.import(data);
      }, 300);
    }
  } else {
    setTimeout(() => {
      core.project.import(data);
    }, 300);
  }


  // Check WebCodecs support
  const isSupported = await Compositor.isSupported();
  isWebCodecsSupported.value = isSupported;

  // Clear loading screen for non-editor modes
  if (panelStore.editorMode !== 'editor') {
    isReady.value = true;
  }
});

watch(() => panelStore.editorMode, (mode) => {
  if (mode !== 'editor') {
    isReady.value = true;
  }
});

function handleCanvasReady() {
  isReady.value = true;
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-background overflow-hidden relative">
    <Loading v-if="!isReady" class="absolute inset-0 z-50" />

    <!-- Header Bar -->
    <Header />

    <!-- Editor Main Layout -->
    <div class="flex-1 min-h-0 min-w-0 px-2 pb-2">
      <ResizablePanelGroup
        direction="horizontal"
        class="h-full w-full gap-0"
      >
        <!-- Left Column: Media Panel -->
        <template v-if="panelStore.showLeftPanel">
          <ResizablePanel
            :default-size="24"
            :min-size="15"
            :max-size="35"
            class="relative overflow-visible bg-card min-w-0 border-r"
          >
            <MediaPanel />
          </ResizablePanel>
          <ResizableHandle class="bg-transparent w-1.5" />
        </template>

        <!-- Middle Column: Canvas Preview + Timeline -->
        <ResizablePanel
          :default-size="panelStore.showLeftPanel ? 56 : 76"
          :min-size="35"
          class="min-w-0 min-h-0"
        >
          <ResizablePanelGroup
            direction="vertical"
            class="h-full w-full gap-0"
          >
            <!-- Canvas Preview -->
            <ResizablePanel
              :default-size="panelStore.showTimeline ? 68 : 100"
              :min-size="30"
              :max-size="100"
              class="min-h-0 border-b"
            >
              <CanvasPanel :on-ready="handleCanvasReady" />
            </ResizablePanel>

            <template v-if="panelStore.showTimeline">
              <ResizableHandle class="bg-transparent !h-1.5" />
              <!-- Timeline -->
              <ResizablePanel
                :default-size="32"
                :min-size="15"
                :max-size="70"
                class="min-h-0"
              >
                <Timeline />
              </ResizablePanel>
            </template>
          </ResizablePanelGroup>
        </ResizablePanel>

        <!-- Right Column: AI Copilot Assistant / Clip Properties / Template Config -->
        <template v-if="panelStore.showRightPanel || panelStore.isCopilotVisible">
          <ResizableHandle class="bg-transparent w-1.5" />
          <ResizablePanel
            :default-size="20"
            :min-size="15"
            :max-size="35"
            class="min-w-0 bg-card border-l"
          >
            <RightPanel />
          </ResizablePanel>
        </template>
      </ResizablePanelGroup>
    </div>

    <!-- Floating Controls like Caption / Animation pickers -->
    <FloatingControl />

    <!-- WebCodecs Support Check Modal -->
    <WebcodecsUnsupportedModal :open="!isWebCodecsSupported" />
  </div>
</template>
