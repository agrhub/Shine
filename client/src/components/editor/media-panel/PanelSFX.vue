<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { Log } from '@openvideo/engine-pixi';
import { Search, Loader2, Play, Pause, Plus } from 'lucide-vue-next';
import { core } from '@/utils/project';

interface SoundEffect {
  id: string;
  type: string;
  src: string;
  thumbnailUrl: string;
  duration?: number;
  tags: string[];
  title: string | null;
  description: string;
  name: string;
}

const playingId = ref<string | null>(null);
const searchQuery = ref('');
const searchResults = ref<SoundEffect[]>([]);
const isLoading = ref(false);
const currentAudio = ref<HTMLAudioElement | null>(null);

const fetchSFX = async (query: string) => {
  isLoading.value = true;
  try {
    const response = await fetch('/api/audio/sfx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 20,
        page: 1,
        query: query ? { keys: [query] } : {},
      }),
    });
    const data = await response.json();
    if (data.soundEffects) {
      searchResults.value = data.soundEffects;
    } else {
      // Sample fallback list matching H2 screenshot
      searchResults.value = [
        { id: '1', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'Rain on umbrella binaural sound', description: '', name: 'Rain on umbrella binaural sound' },
        { id: '2', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'China EAS Alarm CN', description: '', name: 'China EAS Alarm CN' },
        { id: '3', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'Mountain forest winter amb trees cre', description: '', name: 'Mountain forest winter amb trees cre' },
        { id: '4', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'Female Ghostly Breath 2 (Vol 001)', description: '', name: 'Female Ghostly Breath 2 (Vol 001)' },
        { id: '5', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'a car whizzing by - type 01', description: '', name: 'a car whizzing by - type 01' },
        { id: '6', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'Psychedelic Trance - Continue Bass F', description: '', name: 'Psychedelic Trance - Continue Bass F' },
        { id: '7', type: 'sfx', src: '', thumbnailUrl: '', tags: [], title: 'Water Dripping on Water.aif', description: '', name: 'Water Dripping on Water.aif' },
      ];
    }
  } catch (error) {
    console.error('Failed to fetch SFX:', error);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = useDebounceFn((query: string) => {
  fetchSFX(query);
}, 500);

watch(searchQuery, (newVal) => {
  debouncedFetch(newVal);
});

onMounted(() => {
  fetchSFX('');
});

const togglePlay = (item: SoundEffect) => {
  if (playingId.value === item.id) {
    currentAudio.value?.pause();
    playingId.value = null;
    return;
  }
  if (currentAudio.value) {
    currentAudio.value.pause();
  }
  if (!item.src) return;
  const audio = new window.Audio(item.src);
  audio.play();
  playingId.value = item.id;
  currentAudio.value = audio;
  audio.onended = () => {
    playingId.value = null;
  };
};

const handleAddAudio = async (item: SoundEffect) => {
  if (!item.src) return;

  try {
    await core.clip.add({
      type: 'Audio',
      src: item.src,
      name: item.name || item.title || 'Sound Effect',
    });
  } catch (error) {
    Log.error('Failed to add audio:', error);
  }
};

function formatTime(sec?: number) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>

<template>
  <div class="h-full flex flex-col p-4 text-xs">
    <!-- Search Bar -->
    <div class="relative mb-3">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search sound effects..."
        class="w-full h-8 pl-8 pr-3 bg-secondary/50 border border-border/40 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <!-- List of SFX Items -->
    <div class="flex-1 overflow-y-auto min-h-0 space-y-2">
      <div v-if="isLoading && searchResults.length === 0" class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-muted-foreground" :size="24" />
      </div>

      <div
        v-for="item in searchResults"
        :key="item.id"
        class="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/60 hover:bg-accent/40 transition-colors group cursor-pointer"
        @click="handleAddAudio(item)"
      >
        <!-- Play / Pause Button -->
        <button
          type="button"
          class="size-7 rounded-full bg-secondary hover:bg-primary/20 hover:text-primary flex items-center justify-center shrink-0 transition-colors"
          @click.stop="togglePlay(item)"
        >
          <Pause v-if="playingId === item.id" class="size-3 text-primary fill-primary" />
          <Play v-else class="size-3 text-muted-foreground fill-muted-foreground ml-0.5" />
        </button>

        <!-- Title & Duration -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-foreground truncate text-xs">{{ item.title || item.name }}</p>
          <p class="text-[10px] text-muted-foreground mt-0.5">{{ formatTime(item.duration) }}</p>
        </div>

        <!-- Plus Action Button -->
        <button
          type="button"
          class="size-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="handleAddAudio(item)"
        >
          <Plus class="size-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
