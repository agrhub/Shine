<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Picture,
  VideoCamera,
  Microphone,
  Check,
  Close,
  Loading,
  RefreshRight,
  VideoPlay,
  Film,
  User,
  Location,
  Box,
} from '@element-plus/icons-vue';

interface ToolCallItem {
  id?: string;
  name: string;
  args: any;
  status: 'running' | 'success' | 'error';
  result?: any;
  retries?: number;
}

const props = defineProps<{
  toolCalls: ToolCallItem[];
}>();

const emit = defineEmits<{
  (e: 'retry', prompt: string): void;
}>();

const { t } = useI18n();

// Video Preview Modal
const videoModalVisible = ref(false);
const activeVideoSrc = ref('');
const activeVideoTitle = ref('');

function openVideo(src: string, title = 'Video Preview') {
  activeVideoSrc.value = src;
  activeVideoTitle.value = title;
  videoModalVisible.value = true;
}

// Media type classifier
function getAssetType(tc: ToolCallItem | string): 'image' | 'video' | 'audio' | 'general' {
  const name = typeof tc === 'string' ? tc : tc.name;
  const data = typeof tc === 'object' ? (tc.result?.data || tc.result || {}) : {};
  if (data.video_url || data.videoUrl || data.renderedVideoUrl || ['generate_scene_video', 'render_episode_video'].includes(name)) {
    return 'video';
  }
  if (data.voiceover_url || data.audioUrl || data.voiceoverUrl || ['generate_scene_voiceover', 'generate_audio_bgm'].includes(name)) {
    return 'audio';
  }
  if (data.image_url || data.avatar || data.imageUrl || data.avatarUrl || data.storyboard_frame_url || data.storyboardFrameUrl || ['generate_character_asset', 'generate_location_asset', 'generate_prop_asset', 'generate_scene_storyboard', 'generate_wardrobe_variants'].includes(name)) {
    return 'image';
  }
  return 'general';
}

function getAssetIcon(name: string) {
  if (name.includes('character') || name.includes('wardrobe')) return User;
  if (name.includes('location')) return Location;
  if (name.includes('prop')) return Box;
  if (name.includes('storyboard')) return Picture;
  if (name.includes('video')) return VideoCamera;
  if (name.includes('voiceover') || name.includes('audio')) return Microphone;
  return Film;
}

function getAssetTitle(tc: ToolCallItem): string {
  const args = tc.args || {};
  if (tc.name === 'generate_character_asset' || tc.name === 'generate_wardrobe_variants') {
    const cName = args.character_name || args.characterName || 'Unknown';
    const vId = args.variant_id || args.variantId;
    return `${t('chatbot.character', 'Character')}: ${cName}${vId ? ` (${vId})` : ''}`;
  }
  if (tc.name === 'generate_location_asset') {
    return `${t('chatbot.location', 'Location')}: ${args.location_name || args.locationName || 'Scene Location'}`;
  }
  if (tc.name === 'generate_prop_asset') {
    return `${t('chatbot.prop', 'Prop')}: ${args.prop_name || args.propName || 'Narrative Prop'}`;
  }
  if (tc.name === 'generate_scene_storyboard') {
    return `${t('chatbot.storyboard', 'Storyboard')}: ${t('chatbot.scene', 'Scene')} #${args.scene_index ?? args.sceneIndex ?? 1}`;
  }
  if (tc.name === 'generate_scene_video') {
    return `${t('chatbot.videoClip', 'Video AI')}: ${t('chatbot.scene', 'Scene')} #${args.scene_index ?? args.sceneIndex ?? 1}`;
  }
  if (tc.name === 'generate_scene_voiceover') {
    return `${t('chatbot.voiceover', 'Voiceover TTS')}: ${t('chatbot.scene', 'Scene')} #${args.scene_index ?? args.sceneIndex ?? 1}`;
  }
  if (tc.name === 'render_episode_video') {
    return t('chatbot.fullEpisodeRender', 'Full 9:16 Episode Video Render');
  }
  return tc.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getMediaUrl(tc: ToolCallItem): string | null {
  const data = tc.result?.data || tc.result || {};
  let url = (
    data.image_url ||
    data.avatar ||
    data.storyboard_frame_url ||
    data.video_url ||
    data.voiceover_url ||
    data.imageUrl ||
    data.avatarUrl ||
    data.storyboardFrameUrl ||
    data.videoUrl ||
    data.renderedVideoUrl ||
    data.audioUrl ||
    data.voiceoverUrl ||
    data.url ||
    data.thumbnail ||
    null
  );
  if (url && typeof url === 'string') {
    url = url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/api\/)/, '$1');
  }
  return url;
}

function getRetryPrompt(tc: ToolCallItem): string {
  const args = tc.args || {};
  if (tc.name === 'generate_character_asset') {
    return `Regenerate character asset for "${args.characterName}" with high fidelity`;
  }
  if (tc.name === 'generate_location_asset') {
    return `Regenerate location asset for "${args.locationName}"`;
  }
  if (tc.name === 'generate_scene_storyboard') {
    return `Regenerate storyboard frame for Scene #${args.sceneIndex ?? 1}`;
  }
  if (tc.name === 'generate_scene_video') {
    return `Regenerate video clip for Scene #${args.sceneIndex ?? 1}`;
  }
  if (tc.name === 'generate_scene_voiceover') {
    return `Regenerate voiceover TTS audio for Scene #${args.sceneIndex ?? 1}`;
  }
  return `Retry ${tc.name}`;
}

const displayedToolCalls = computed(() => {
  return (props.toolCalls || []).filter((tc) => {
    const mediaTools = [
      'generate_character_asset',
      'generate_wardrobe_variants',
      'generate_location_asset',
      'generate_prop_asset',
      'generate_scene_storyboard',
      'generate_scene_video',
      'generate_scene_voiceover',
      'render_episode_video',
    ];
    return mediaTools.includes(tc.name) || Boolean(getMediaUrl(tc));
  });
});
</script>

<template>
  <div v-if="displayedToolCalls.length > 0" class="asset-live-preview-grid space-y-2 mt-2">
    <!-- Grid of Placeholder / Rendered Asset Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div
        v-for="(tc, idx) in displayedToolCalls"
        :key="idx"
        class="relative rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-300 shadow-sm"
        :class="{
          'bg-[var(--el-fill-color-light)] border-[var(--el-border-color-light)]': tc.status === 'running',
          'bg-[var(--el-fill-color-blank)] border-[var(--el-color-success-light-5)]': tc.status === 'success',
          'bg-[var(--el-color-danger-light-9)] border-[var(--el-color-danger-light-5)]': tc.status === 'error',
        }"
      >
        <!-- Card Top Bar: Icon, Title, Status Tag -->
        <div class="flex items-center justify-between gap-1.5 mb-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <div
              class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-xs"
              :class="tc.status === 'success' ? 'bg-emerald-500 text-white' : (tc.status === 'running' ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white')"
            >
              <el-icon><component :is="getAssetIcon(tc.name)" /></el-icon>
            </div>
            <span class="text-[11px] font-bold truncate text-[var(--el-text-color-primary)]">
              {{ getAssetTitle(tc) }}
            </span>
          </div>

          <el-tag
            size="small"
            round
            class="!text-[9px] !h-4 !px-1.5 shrink-0 !font-mono"
            :type="tc.status === 'success' ? 'success' : (tc.status === 'running' ? 'primary' : 'danger')"
          >
            <span v-if="tc.status === 'running'" class="flex items-center gap-1">
              <el-icon class="animate-spin"><Loading /></el-icon>
              <span>{{ t('chatbot.rendering', 'Rendering...') }}</span>
            </span>
            <span v-else-if="tc.status === 'success'">{{ t('common.ready', 'Ready') }}</span>
            <span v-else>{{ t('common.failed', 'Failed') }}</span>
          </el-tag>
        </div>

        <!-- 1. Running State: Animated Placeholder Shimmer Skeleton -->
        <div v-if="tc.status === 'running'" class="w-full aspect-[16/9] rounded-lg bg-[var(--el-fill-color-dark)] relative overflow-hidden flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--el-border-color)]">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"></div>
          <el-icon class="animate-spin text-xl text-sky-400"><Loading /></el-icon>
          <span class="text-[10px] text-[var(--el-text-color-secondary)] font-medium animate-pulse">
            {{ t('chatbot.generatingMediaAsset', 'Synthesizing AI asset...') }}
          </span>
        </div>

        <!-- 2. Success State: Live Media Preview -->
        <div v-else-if="tc.status === 'success'">
          <!-- Image Asset Preview -->
          <div v-if="getAssetType(tc.name) === 'image' && getMediaUrl(tc)" class="w-full aspect-[16/9] rounded-lg overflow-hidden bg-black/30 relative border border-[var(--el-border-color-lighter)] group">
            <el-image
              :src="getMediaUrl(tc)!"
              fit="cover"
              class="w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
              :preview-src-list="[getMediaUrl(tc)!]"
              loading="lazy"
            />
            <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-mono text-emerald-300 flex items-center gap-1">
              <el-icon><Check /></el-icon>
              <span>{{ t('common.preview') }}</span>
            </div>
          </div>

          <!-- Video Asset Preview -->
          <div v-else-if="getAssetType(tc.name) === 'video' && getMediaUrl(tc)" class="w-full aspect-[16/9] rounded-lg overflow-hidden bg-black relative border border-[var(--el-border-color-lighter)] group flex items-center justify-center cursor-pointer" @click="openVideo(getMediaUrl(tc)!, getAssetTitle(tc))">
            <video :src="getMediaUrl(tc)!" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" preload="metadata"></video>
            <div class="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
              <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <el-icon :size="18"><VideoPlay /></el-icon>
              </div>
            </div>
            <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">{{ t('common.verticalVideo') }}</span>
          </div>

          <!-- Audio Asset Preview -->
          <div v-else-if="getAssetType(tc.name) === 'audio' && getMediaUrl(tc)" class="p-2 rounded-lg bg-[var(--el-fill-color-dark)] border flex flex-col gap-1.5">
            <audio controls class="w-full h-6" :src="getMediaUrl(tc)!"></audio>
            <span class="text-[9px] text-[var(--el-text-color-secondary)] truncate">
              {{ tc.args?.dialogue || tc.args?.text || 'Voiceover dialogue track' }}
            </span>
          </div>

          <!-- General message details -->
          <div v-else class="text-[10px] text-[var(--el-text-color-secondary)] leading-tight p-1.5 bg-[var(--el-fill-color-dark)] rounded-lg">
            {{ tc.result?.message || t('common.completedSuccessfully', 'Execution completed') }}
          </div>
        </div>

        <!-- 3. Error State: Failure Message & Retry Button -->
        <div v-else-if="tc.status === 'error'" class="p-2 rounded-lg bg-[var(--el-color-danger-light-8)] border border-[var(--el-color-danger-light-5)] flex flex-col gap-2">
          <div class="text-[10px] text-[var(--el-color-danger)] font-medium leading-tight">
            {{ tc.result?.message || tc.result?.error || t('common.failed', 'Failed to generate asset') }}
          </div>
          <el-button
            size="small"
            type="danger"
            plain
            round
            icon="RefreshRight"
            class="!text-[10px] !h-5 self-start"
            @click="emit('retry', getRetryPrompt(tc))"
          >
            {{ t('common.retry', 'Retry') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Video Lightbox Dialog Modal -->
    <el-dialog
      v-model="videoModalVisible"
      :title="activeVideoTitle"
      width="400px"
      align-center
      append-to-body
      destroy-on-close
      class="video-preview-dialog"
    >
      <div class="aspect-[9/16] w-full max-h-[70vh] bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-2xl">
        <video
          v-if="activeVideoSrc"
          :src="activeVideoSrc"
          controls
          autoplay
          class="w-full h-full object-contain"
        ></video>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
.animate-shimmer {
  animation: shimmer 1.8s infinite;
}
</style>
