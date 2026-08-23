<script setup lang="ts">
import { computed } from 'vue';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Scissors,
  Copy,
  Trash2,
  Magnet,
  ZoomOut,
  ZoomIn,
  Camera,
} from 'lucide-vue-next';
import { Slider } from '@/components/ui/slider';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-vue';
import { EditableTimecode } from '@/components/ui/editable-timecode';
import { useSeriesStore } from '@/stores/useSeriesStore';
import CountryFlag from '@/components/common/CountryFlag.vue';
import {
  GEMINI_SPEECH_LANGUAGES,
  getMainLanguageForCountry,
  getLanguageByCode,
} from '@/constants/geminiLanguages';

const props = defineProps<{
  zoomLevel: number;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSplit?: () => void;
}>();

const emit = defineEmits<{
  (e: 'update:zoomLevel', value: number): void;
}>();

const seriesStore = useSeriesStore();
const mainLang = computed(() => getMainLanguageForCountry(seriesStore.currentSeries?.country));
const currentLangCode = computed(() => seriesStore.activeLanguageCode || mainLang.value.code);

const availableLanguages = computed(() => {
  const tracks = seriesStore.getLanguageTracks(seriesStore.activeEpisodeId);
  const codes = new Set<string>();
  if (mainLang.value?.code) codes.add(mainLang.value.code);
  tracks.forEach(t => { if (t.languageCode) codes.add(t.languageCode); });
  // Add common presets
  ['vi-VN', 'en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'th-TH'].forEach(c => codes.add(c));
  return Array.from(codes).map(c => getLanguageByCode(c));
});

function selectTimelineLanguage(langCode: string) {
  seriesStore.setActiveLanguage(langCode);
}

const { state: playbackState, toggle, seek: playbackSeek } = usePlaybackStore();

const currentTime = computed(() => playbackState.value.currentTime);
const duration = computed(() => playbackState.value.duration);
const isPlaying = computed(() => playbackState.value.isPlaying);

const handleZoomIn = () => {
  emit('update:zoomLevel', Math.min(3.5, props.zoomLevel + 0.15));
};

const handleZoomOut = () => {
  emit('update:zoomLevel', Math.max(0.15, props.zoomLevel - 0.15));
};

const handleZoomSliderChange = (values: number[] | undefined) => {
  if (values && values.length > 0) {
    emit('update:zoomLevel', values[0] as number);
  }
};

// Simple time formatter for fallback
const formatTimeCode = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const DEFAULT_FPS = 30;
</script>

<template>
  <div class="flex items-center justify-between px-2 py-1 border-b h-10">
    <div class="flex items-center gap-1">
      <TooltipProvider :delay-duration="500">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onSplit">
              <Scissors class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split element (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onDuplicate">
              <Copy class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="onDelete">
              <Trash2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete element (Delete)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Magnet class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto snapping</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Camera class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Snapshot frame</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex items-center gap-0">
      <TooltipProvider :delay-duration="500">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              class="size-7"
              variant="ghost"
              size="icon"
              @click="playbackSeek(0)"
            >
              <IconPlayerSkipBack class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" @click="toggle">
              <IconPlayerPauseFilled v-if="isPlaying" class="size-5" />
              <IconPlayerPlayFilled v-else class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isPlaying ? 'Pause (Space)' : 'Play (Space)' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              class="size-7"
              variant="ghost"
              size="icon"
              @click="playbackSeek(duration)"
            >
              <IconPlayerSkipForward class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End of Timeline</TooltipContent>
        </Tooltip>

        <!-- Time Display -->
        <div class="flex flex-row items-center justify-center px-2">
          <EditableTimecode
            :time="currentTime"
            :duration="duration"
            format="MM:SS"
            :fps="DEFAULT_FPS"
            class="text-center"
            @time-change="playbackSeek"
          />
          <div class="text-xs text-muted-foreground px-2">/</div>
          <div class="text-xs text-muted-foreground text-center">
            {{ formatTimeCode(duration) }}
          </div>
        </div>
      </TooltipProvider>
    </div>

    <div class="flex items-center gap-3">
      <!-- Timeline Language Track Preview Switcher -->
      <div class="flex items-center">
        <el-dropdown trigger="click" @command="selectTimelineLanguage">
          <button
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold hover:bg-muted transition-colors border shadow-xs cursor-pointer"
            style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light); color: var(--el-text-color-primary);"
            :title="`Preview Language (${getLanguageByCode(currentLangCode).nativeName})`"
          >
            <CountryFlag :code="getLanguageByCode(currentLangCode).countryCode" :flag="getLanguageByCode(currentLangCode).flag" size="small" />
            <span class="text-[11px] font-bold">{{ getLanguageByCode(currentLangCode).countryCode.toUpperCase() }}</span>
            <span class="text-[10px] opacity-70 hidden sm:inline">{{ getLanguageByCode(currentLangCode).nativeName }}</span>
            <el-icon :size="10" class="opacity-60 ml-0.5"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu class="max-h-64 overflow-y-auto">
              <el-dropdown-item
                v-for="l in availableLanguages"
                :key="l.code"
                :command="l.code"
                :class="{ '!font-bold !bg-primary/10': l.code === currentLangCode }"
              >
                <div class="flex items-center justify-between gap-3 w-full">
                  <div class="flex items-center gap-2">
                    <CountryFlag :code="l.countryCode" :flag="l.flag" size="small" />
                    <span>{{ l.nativeName }}</span>
                  </div>
                  <el-tag v-if="l.code === mainLang?.code" size="small" type="success" effect="plain" class="!text-[9px]">
                    Main
                  </el-tag>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- Zoom Controls -->
      <div class="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" class="size-6 text-muted-foreground" @click="handleZoomOut">
          —
        </Button>
        <span class="text-xs font-mono text-muted-foreground w-12 text-center select-none">
          {{ Math.round(zoomLevel * 100) }}%
        </span>
        <Button variant="ghost" size="icon" class="size-6 text-muted-foreground" @click="handleZoomIn">
          +
        </Button>
      </div>
    </div>
  </div>
</template>
