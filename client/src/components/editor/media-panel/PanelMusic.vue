<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { Log } from '@openvideo/engine-pixi';
import { Search, Loader2 } from 'lucide-vue-next';
import { IconMusic } from '@tabler/icons-vue';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { core } from '@/utils/project';
import AudioItem from './AudioItem.vue';
import { useMediaPanelStore } from '@/composables/useMediaPanelStore.ts';

interface Music {
  id: string;
  type: string;
  src: string;
  thumbnailUrl: string;
  duration: number;
  tags: string[];
  title: string | null;
  description: string;
  name: string;
}

const playingId = ref<string | null>(null);
const searchQuery = ref('');
const searchResults = ref<Music[]>([]);
const isLoading = ref(false);

const fetchMusic = async (query: string) => {
  isLoading.value = true;
  try {
    const response = await fetch('/api/audio/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 20,
        page: 1,
        query: query ? { keys: [query] } : {},
      }),
    });
    const data = await response.json();
    if (data.musics) {
      searchResults.value = data.musics;
    } else {
      searchResults.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch music:', error);
  } finally {
    isLoading.value = false;
  }
};

const { state: mediaPanelState } = useMediaPanelStore();

const debouncedFetch = useDebounceFn((query: string) => {
  fetchMusic(query);
}, 500);

watch(searchQuery, (newVal) => {
  debouncedFetch(newVal);
});

watch(
  () => mediaPanelState.value.searchQueries.music,
  (newQuery) => {
    if (newQuery !== undefined && searchQuery.value !== newQuery) {
      searchQuery.value = newQuery;
      fetchMusic(newQuery);
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (!searchQuery.value) {
    fetchMusic('');
  }
});

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
  <div class="h-full flex flex-col">
    <div class="p-4">
      <InputGroup>
        <InputGroupAddon class="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
          <Search :size="14" />
        </InputGroupAddon>

        <InputGroupInput
          v-model="searchQuery"
          placeholder="Search stock music..."
          class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </InputGroup>
    </div>

    <div class="flex-1 px-4 overflow-y-auto min-h-0">
      <div v-if="isLoading && searchResults.length === 0" class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-muted-foreground" :size="32" />
      </div>

      <div v-else-if="searchResults.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <IconMusic :size="32" class="opacity-50" />
        <span class="text-sm">No music found</span>
      </div>

      <div v-else class="flex flex-col gap-2">
        <AudioItem
          v-for="item in searchResults"
          :key="item.id"
          :item="{
            id: item.id,
            url: item.src,
            text: item.name,
          }"
          :playingId="playingId"
          @update:playingId="playingId = $event"
          @add="handleAddAudio"
        />
      </div>
    </div>
  </div>
</template>
