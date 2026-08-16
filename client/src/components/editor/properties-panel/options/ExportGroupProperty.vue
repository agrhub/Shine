<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Popover from '@/components/ui/popover/Popover.vue';
import PopoverContent from '@/components/ui/popover/PopoverContent.vue';
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import Switch from '@/components/ui/switch/Switch.vue';
import Input from '@/components/ui/input/Input.vue';
import Button from '@/components/ui/button/Button.vue';
import Select from '@/components/ui/select/Select.vue';
import SelectContent from '@/components/ui/select/SelectContent.vue';
import SelectItem from '@/components/ui/select/SelectItem.vue';
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue';
import SelectValue from '@/components/ui/select/SelectValue.vue';
import { Settings, Video } from 'lucide-vue-next';
import { useStudioStore } from '~/composables/useStudioStore';
import ExportModal from '@/components/editor/ExportModal.vue';

// Option Definitions from ExportModal.vue
const VIDEO_CODECS = [
  { value: 'avc1.640033', label: 'H.264 (AVC)' },
  { value: 'hvc1.1.6.L153.B0', label: 'H.265 (HEVC)' },
  { value: 'vp09.00.51.08', label: 'VP9' },
];

const AUDIO_CODECS = [
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'Opus' },
  { value: 'mp3', label: 'MP3' },
  { value: 'flac', label: 'FLAC' },
];

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4', codecs: ['avc1.640033', 'hvc1.1.6.L153.B0', 'vp09.00.51.08'] },
  { value: 'webm', label: 'WebM', codecs: ['vp09.00.51.08'] },
  { value: 'mkv', label: 'MKV', codecs: ['avc1.640033', 'hvc1.1.6.L153.B0', 'vp09.00.51.08'] },
  { value: 'mov', label: 'MOV', codecs: ['avc1.640033', 'hvc1.1.6.L153.B0'] },
];

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'flac', label: 'FLAC' },
  { value: 'ogg', label: 'OGG' },
];

const FRAME_RATES = [
  { value: '23.976', label: '23.976 fps (Film)' },
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps (PAL)' },
  { value: '29.97', label: '29.97 fps (NTSC)' },
  { value: '30', label: '30 fps' },
  { value: '50', label: '50 fps' },
  { value: '59.94', label: '59.94 fps (NTSC)' },
  { value: '60', label: '60 fps' },
];

const SAMPLE_RATES = [
  { value: '44100', label: '44.1 kHz' },
  { value: '48000', label: '48 kHz' },
];

interface ResolutionPreset {
  value: string;
  label: string;
  badge: string;
  bitrate: number;
  fps: number;
  codec: string;
  format: string;
}

const RESOLUTION_GROUPS: { group: string; items: ResolutionPreset[] }[] = [
  {
    group: 'Standard',
    items: [
      { value: '1280x720', label: 'HD', badge: '720p', bitrate: 7_000_000, fps: 30, codec: 'avc1.640033', format: 'mp4' },
      { value: '1920x1080', label: 'Full HD', badge: '1080p', bitrate: 12_000_000, fps: 30, codec: 'avc1.640033', format: 'mp4' },
      { value: '2560x1440', label: '2K Quad HD', badge: '1440p', bitrate: 24_000_000, fps: 30, codec: 'vp09.00.51.08', format: 'mp4' },
      { value: '3840x2160', label: '4K Ultra HD', badge: '2160p', bitrate: 64_000_000, fps: 30, codec: 'vp09.00.51.08', format: 'mp4' },
    ],
  },
  {
    group: 'Social Media',
    items: [
      { value: '1080x1920', label: 'YouTube Shorts', badge: '1080p', bitrate: 12_000_000, fps: 30, codec: 'avc1.640033', format: 'mp4' },
      { value: '3840x2160', label: 'YouTube 4K', badge: '2160p', bitrate: 64_000_000, fps: 30, codec: 'vp09.00.51.08', format: 'mp4' },
      { value: '1080x1920', label: 'Instagram Reels', badge: '1080p', bitrate: 12_000_000, fps: 30, codec: 'avc1.640033', format: 'mp4' },
      { value: '1080x1920', label: 'TikTok', badge: '1080p', bitrate: 12_000_000, fps: 30, codec: 'avc1.640033', format: 'mp4' },
    ],
  },
  {
    group: 'Web',
    items: [
      { value: '1280x720', label: 'HD', badge: '720p', bitrate: 5_000_000, fps: 30, codec: 'vp09.00.51.08', format: 'webm' },
    ],
  },
];

const RESOLUTION_PRESETS = RESOLUTION_GROUPS.flatMap((g) => g.items);

const isExportModalOpen = ref(false);
const selectedPresetLabel = ref<string | null>(null);
const isPresetPopoverOpen = ref(false);
const isCustomConfigOpen = ref(false);
const autoStartExport = ref(false);

// Custom configurations state
const includeVideo = ref(true);
const videoCodec = ref('avc1.640033');
const quality = ref('12000000');
const format = ref('mp4');
const fps = ref('30');
const resolution = ref('Full HD');

const includeAudio = ref(true);
const audioCodec = ref('aac');
const audioSampleRate = ref('48000');

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);
const maxDuration = computed(() => (studio.value as any)?.getMaxDuration() || 0);
const durationSec = computed(() => maxDuration.value / 1e6);

const durationStr = computed(() => {
  const min = Math.floor(durationSec.value / 60)
    .toString()
    .padStart(2, '0');
  const sec = Math.floor(durationSec.value % 60)
    .toString()
    .padStart(2, '0');
  return `${min}:${sec}`;
});

// Handle format compatibility auto-switch inside custom view
watch(includeVideo, (newVal) => {
  if (!newVal && format.value === 'mp4') {
    format.value = 'mp3';
  } else if (newVal && ['mp3', 'wav', 'flac', 'ogg'].includes(format.value)) {
    format.value = 'mp4';
  }
});

watch([format, includeVideo], () => {
  if (includeVideo.value) {
    const f = VIDEO_FORMATS.find((x) => x.value === format.value);
    if (f && !f.codecs.includes(videoCodec.value)) videoCodec.value = f.codecs[0];
  }
  if (format.value === 'webm') {
    if (!['opus', 'vorbis'].includes(audioCodec.value)) audioCodec.value = 'opus';
  } else {
    if (['opus', 'vorbis'].includes(audioCodec.value)) audioCodec.value = 'aac';
  }
});

watch([resolution, includeVideo], () => {
  if (!includeVideo.value) return;
  const preset = RESOLUTION_PRESETS.find((r) => r.label === resolution.value);
  if (!preset) return;
  quality.value = String(preset.bitrate);
  const height = Number(preset.value.split('x')[1]);
  if (height > 1080) {
    videoCodec.value = 'vp09.00.51.08';
    if (format.value === 'mov') format.value = 'mp4';
  }
});

const selectPreset = (presetName: string) => {
  selectedPresetLabel.value = presetName;
  const preset = RESOLUTION_PRESETS.find((r) => r.label === presetName);
  if (preset) {
    resolution.value = preset.label;
    quality.value = String(preset.bitrate);
    fps.value = String(preset.fps);
    videoCodec.value = preset.codec;
    format.value = preset.format;
    includeVideo.value = true;
  }
};

const selectCustom = () => {
  selectedPresetLabel.value = 'Custom';
  isCustomConfigOpen.value = true;
};

const activePreset = computed(() => {
  if (selectedPresetLabel.value === 'Custom') return { label: 'Custom', badge: 'Custom Export' };
  return RESOLUTION_PRESETS.find((r) => r.label === selectedPresetLabel.value);
});

const customSettingsPayload = computed(() => {
  if (selectedPresetLabel.value !== 'Custom') return undefined;
  return {
    includeVideo: includeVideo.value,
    videoCodec: videoCodec.value,
    quality: quality.value,
    format: format.value,
    fps: fps.value,
    resolution: resolution.value,
    includeAudio: includeAudio.value,
    audioCodec: audioCodec.value,
    audioSampleRate: audioSampleRate.value,
  };
});

const calculateFileSize = (bitrate: number, duration: number) => {
  const bytes = (bitrate * duration) / 8;
  const mb = bytes / (1000 * 1000);
  return `${mb.toFixed(2)} MB`;
};

const displayFileSize = computed(() => {
  if (selectedPresetLabel.value === 'Custom') {
    return calculateFileSize(Number(quality.value), durationSec.value);
  }
  if (activePreset.value && 'bitrate' in activePreset.value) {
    return calculateFileSize((activePreset.value as any).bitrate, durationSec.value);
  }
  return 'N/A';
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Export</span>
      <Popover :open="isPresetPopoverOpen" @update:open="isPresetPopoverOpen = $event">
        <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="size-5 text-muted-foreground hover:text-foreground"
          >
            <span class="text-base leading-none">+</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-56 p-2 bg-card border border-white/10 shadow-xl" align="end">
          <ScrollArea class="h-64">
            <div class="flex flex-col gap-3 p-1">
              <div v-for="group in RESOLUTION_GROUPS" :key="group.group" class="flex flex-col gap-1">
                <span class="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {{ group.group }}
                </span>
                <button
                  v-for="item in group.items"
                  :key="item.label"
                  @click="selectPreset(item.label); isPresetPopoverOpen = false"
                  class="flex items-center justify-between w-full px-2 py-1.5 text-left text-xs rounded hover:bg-white/5 transition-colors cursor-pointer text-foreground"
                >
                  <span>{{ item.label }}</span>
                  <span class="text-[10px] text-muted-foreground">{{ item.badge }}</span>
                </button>
              </div>
              <!-- Add Custom Option -->
              <div class="flex flex-col gap-1 border-t border-white/10 pt-2 mt-1">
                <button
                  @click="selectCustom(); isPresetPopoverOpen = false"
                  class="flex items-center justify-between w-full px-2 py-1.5 text-left text-xs hover:bg-white/5 transition-colors cursor-pointer text-foreground font-semibold"
                >
                  <span>Custom</span>
                  <span class="text-[10px] text-muted-foreground">Custom Export</span>
                </button>
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>

    <div v-if="activePreset" class="flex flex-col gap-2 mt-1.5">
      <!-- Selected Preset Badge -->
      <div class="flex items-center justify-between bg-secondary border px-3 py-1.5">
        <div class="flex items-center gap-2">
          <Video class="size-4 text-blue-500 shrink-0" />
          <span class="text-xs font-medium text-foreground">
            {{ selectedPresetLabel === "Custom"
              ? "Custom Export"
              : `${activePreset.label} · ${(activePreset as any).badge}` }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <Popover :open="isCustomConfigOpen" @update:open="isCustomConfigOpen = $event">
            <PopoverTrigger as-child>
              <button
                class="text-muted-foreground hover:text-white transition-colors cursor-pointer"
                title="Edit export settings"
              >
                <Settings class="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              class="w-72 p-4 bg-card border border-white/10 shadow-xl flex flex-col gap-3 z-[100]"
              align="end"
            >
              <span class="text-xs font-semibold text-foreground border-b border-white/10 pb-1.5">
                Export Settings
              </span>
              <div class="py-1 flex flex-col gap-2">
                <!-- Include Video Switch -->
                <div class="flex items-center justify-between py-1 gap-4">
                  <span class="text-xs text-muted-foreground">Video</span>
                  <Switch
                    v-model:checked="includeVideo"
                    @update:checked="selectedPresetLabel = 'Custom'"
                  />
                </div>

                <template v-if="includeVideo">
                  <!-- Resolution -->
                  <div class="flex items-center justify-between py-1 gap-4">
                    <span class="text-xs text-muted-foreground">Resolution</span>
                    <Select
                      :model-value="String(resolution)"
                      @update:model-value="resolution = String($event); selectedPresetLabel = 'Custom'"
                    >
                      <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent class="z-[110]">
                        <SelectItem value="HD" class="text-xs">720p</SelectItem>
                        <SelectItem value="Full HD" class="text-xs">1080p</SelectItem>
                        <SelectItem value="2K Quad HD" class="text-xs">1440p</SelectItem>
                        <SelectItem value="4K Ultra HD" class="text-xs">2160p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Video Codec -->
                  <div class="flex items-center justify-between py-1 gap-4">
                    <span class="text-xs text-muted-foreground">Codec</span>
                    <Select
                      :model-value="String(videoCodec)"
                      @update:model-value="videoCodec = String($event); selectedPresetLabel = 'Custom'"
                    >
                      <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent class="z-[110]">
                        <SelectItem v-for="c in VIDEO_CODECS" :key="c.value" :value="c.value" class="text-xs">
                          {{ c.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Bitrate -->
                  <div class="flex items-center justify-between py-1 gap-4">
                    <span class="text-xs text-muted-foreground">Bitrate (Mbps)</span>
                    <Input
                      type="number"
                      :min="1"
                      :max="200"
                      :model-value="Math.round(Number(quality) / 1_000_000)"
                      @input="quality = String(Number(($event.target as HTMLInputElement).value) * 1_000_000); selectedPresetLabel = 'Custom'"
                      class="w-[160px] h-7 text-xs bg-secondary border"
                    />
                  </div>
                </template>

                <!-- Include Audio Switch -->
                <div class="flex items-center justify-between py-1 gap-4">
                  <span class="text-xs text-muted-foreground">Audio</span>
                  <Switch
                    v-model:checked="includeAudio"
                    @update:checked="selectedPresetLabel = 'Custom'"
                  />
                </div>

                <template v-if="includeAudio">
                  <!-- Audio Codec -->
                  <div class="flex items-center justify-between py-1 gap-4">
                    <span class="text-xs text-muted-foreground">Audio Codec</span>
                    <Select
                      :model-value="String(audioCodec)"
                      @update:model-value="audioCodec = String($event); selectedPresetLabel = 'Custom'"
                    >
                      <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent class="z-[110]">
                        <SelectItem v-for="c in AUDIO_CODECS" :key="c.value" :value="c.value" class="text-xs">
                          {{ c.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Audio Sample Rate -->
                  <div class="flex items-center justify-between py-1 gap-4">
                    <span class="text-xs text-muted-foreground">Sample Rate</span>
                    <Select
                      :model-value="String(audioSampleRate)"
                      @update:model-value="audioSampleRate = String($event); selectedPresetLabel = 'Custom'"
                    >
                      <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent class="z-[110]">
                        <SelectItem v-for="sr in SAMPLE_RATES" :key="sr.value" :value="sr.value" class="text-xs">
                          {{ sr.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </template>

                <!-- Format -->
                <div class="flex items-center justify-between py-1 gap-4">
                  <span class="text-xs text-muted-foreground">Format</span>
                  <Select
                    :model-value="String(format)"
                    @update:model-value="format = String($event); selectedPresetLabel = 'Custom'"
                  >
                    <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="z-[110]">
                      <SelectItem v-for="f in (includeVideo ? VIDEO_FORMATS : AUDIO_FORMATS)" :key="f.value" :value="f.value" class="text-xs">
                        {{ f.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Frame Rate -->
                <div v-if="includeVideo" class="flex items-center justify-between py-1 gap-4">
                  <span class="text-xs text-muted-foreground">Frame Rate</span>
                  <Select
                    :model-value="String(fps)"
                    @update:model-value="fps = String($event); selectedPresetLabel = 'Custom'"
                  >
                    <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="z-[110]">
                      <SelectItem v-for="fr in FRAME_RATES" :key="fr.value" :value="fr.value" class="text-xs">
                        {{ fr.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <button
            @click="selectedPresetLabel = null"
            class="text-muted-foreground hover:text-white transition-colors cursor-pointer"
            title="Remove configuration"
          >
            <span class="text-sm">✕</span>
          </button>
        </div>
      </div>

      <!-- Export Button -->
      <Button
        @click="autoStartExport = true; isExportModalOpen = true"
        class="w-full h-7 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-xs cursor-pointer transition-colors"
      >
        Export
      </Button>

      <!-- Metadata -->
      <div class="flex items-center justify-between text-[10px] text-muted-foreground px-1 mt-0.5">
        <span>Duration {{ durationStr }}</span>
        <span>File size {{ displayFileSize }}</span>
      </div>
    </div>

    <ExportModal
      :open="isExportModalOpen"
      @update:open="isExportModalOpen = $event; if (!$event) autoStartExport = false"
      :initial-preset-label="selectedPresetLabel !== 'Custom' ? selectedPresetLabel || undefined : undefined"
      :auto-start="autoStartExport"
      :custom-settings="customSettingsPayload"
    />
  </div>
</template>
