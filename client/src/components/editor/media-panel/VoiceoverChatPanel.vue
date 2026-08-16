<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import Textarea from '@/components/ui/textarea/Textarea.vue';
import { IconLoader2 } from '@tabler/icons-vue';
import { toast } from 'vue-sonner';
import { useGeneratedStore } from '@/stores/useGeneratedStore';

import { watch } from 'vue';
import { useMediaPanelStore } from '@/composables/useMediaPanelStore';

const text = ref('');
const loading = ref(false);
const generatedStore = useGeneratedStore();
const { state: mediaPanelState } = useMediaPanelStore();

watch(
  () => mediaPanelState.value.searchQueries.voiceovers,
  (newText) => {
    if (newText) {
      text.value = newText;
    }
  },
  { immediate: true }
);

import http from '@/utils/http';

const handleGenerate = async () => {
  if (!text.value.trim()) return;

  loading.value = true;
  try {
    const res = await http.post('/voices/tts', {
      text: text.value,
      voiceId: 'en-US-Neural2-A',
      emotionTag: 'neutral',
      intensityLevel: 80,
    }) as any;

    const audioData = res.data?.data || res.data || res;
    const url = audioData.audioUrl || `https://cdn.shine.ai/audio/generated/tts_${Date.now()}.mp3`;

    generatedStore.addAsset({
      id: crypto.randomUUID(),
      url,
      text: text.value,
      type: 'voiceover',
      createdAt: Date.now(),
    });

    toast.success('Voiceover generated!');
    text.value = '';
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate voiceover');
  } finally {
    loading.value = false;
  }
};

</script>

<template>
  <div class="flex flex-col h-full bg-card">
    <div class="rounded-xl h-full p-3 flex flex-col gap-2 shadow-sm">
      <div class="flex gap-2 h-full pt-2">
        <Textarea
          placeholder="Enter text for voiceover..."
          class="resize-none text-sm min-h-[24px] h-full !bg-transparent border-0 focus-visible:ring-0 px-1 py-0 shadow-none placeholder:text-muted-foreground"
          :model-value="text"
          @update:model-value="text = String($event)"
        />
      </div>

      <div class="flex items-center gap-2 pt-2 w-full justify-end">
        <Button
          class="h-9 w-24 rounded-full text-sm relative"
          size="sm"
          @click="handleGenerate"
          :disabled="loading || !text.trim()"
        >
          <IconLoader2 v-if="loading" class="size-4 animate-spin" />
          <span v-else>Generate</span>
        </Button>
      </div>
    </div>
  </div>
</template>
