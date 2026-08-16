<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGeneratedStore } from '@/stores/useGeneratedStore';
import { core } from '@/lib/project';
import { Log } from '@openvideo/engine-pixi';
import AudioItem from './AudioItem.vue';
import VoiceoverChatPanel from './VoiceoverChatPanel.vue';
import { IconMicrophone } from '@tabler/icons-vue';

const generatedStore = useGeneratedStore();
const playingId = ref<string | null>(null);

const voiceovers = computed(() => generatedStore.voiceovers);

const handleAddAudio = async (url: string, name: string) => {
  try {
    await core.clip.add({
      type: 'Audio',
      src: url,
      name: name,
    });
  } catch (error) {
    Log.error('Failed to add audio:', error);
  }
};
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex-1 overflow-y-auto">
      <div v-if="voiceovers.length === 0" class="flex flex-col items-center justify-center h-full p-4 gap-4">
        <IconMicrophone
          class="size-7 text-muted-foreground"
          stroke="1.5"
        />
        <div class="flex flex-col gap-2 text-center">
          <p class="font-semibold text-white">No Voiceover Assets</p>
          <p class="text-sm text-muted-foreground max-w-xs">
            Start building your collection by clicking the generate button
            in the chat panel.
          </p>
        </div>
      </div>

      <div v-else class="flex flex-col gap-4 p-4">
        <div class="grid grid-cols-2 gap-2">
          <AudioItem
            v-for="item in voiceovers"
            :key="item.id"
            :item="item"
            :playing-id="playingId"
            @add="handleAddAudio"
            @update:playing-id="playingId = $event"
          />
        </div>
      </div>
    </div>
    <div class="h-2 bg-background" />
    <div class="h-48">
      <VoiceoverChatPanel />
    </div>
  </div>
</template>
