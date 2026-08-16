<script setup lang="ts">
import { computed } from 'vue';
import { useMediaPanelStore, type Tab } from '@/composables/useMediaPanelStore';
import TabBar from './TabBar.vue';
import { Separator } from '@/components/ui/separator';
import PanelUploads from './PanelUploads.vue';
import PanelImages from './PanelImages.vue';
import PanelVideos from './PanelVideos.vue';
import PanelMusic from './PanelMusic.vue';
import PanelVoiceovers from './PanelVoiceovers.vue';
import PanelSFX from './PanelSFX.vue';
import PanelText from './PanelText.vue';
import PanelCaptions from './PanelCaptions.vue';
import PanelTransitions from './PanelTransitions.vue';
import PanelEffects from './PanelEffects.vue';
import PanelElements from './PanelElements.vue';

const { state: mediaState } = useMediaPanelStore();

const viewMap: Record<Tab, any> = {
  uploads: PanelUploads,
  images: PanelImages,
  videos: PanelVideos,
  music: PanelMusic,
  voiceovers: PanelVoiceovers,
  sfx: PanelSFX,
  text: PanelText,
  captions: PanelCaptions,
  transitions: PanelTransitions,
  effects: PanelEffects,
  elements: PanelElements,
};

const activeComponent = computed(() => {
  return viewMap[mediaState.value.activeTab];
});
</script>

<template>
  <div class="h-full flex flex-col bg-card rounded-sm overflow-hidden w-full border-r">
    <div class="flex-none">
      <TabBar />
    </div>
    <Separator orientation="horizontal" />
    <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
      <component :is="activeComponent" />
    </div>
  </div>
</template>
