<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { toast } from 'vue-sonner';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'select-episode', epId: string): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();

const activeTab = ref<'overview' | 'masterplan' | 'characters' | 'viral'>('overview');

const series = computed(() => seriesStore.currentSeries);
const episodes = computed(() => seriesStore.episodesList);
const characters = computed(() => seriesStore.charactersList);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function copyHashtags() {
  const title = (series.value?.title || 'Series').replace(/\s+/g, '');
  const tags = `#${title} #ShortDrama #TikTokSeries #DramaHay #ReelsViral #ShineAI`;
  navigator.clipboard.writeText(tags);
  toast.success(t('toast.copied', 'Copied viral hashtags to clipboard!'));
}
</script>

<template>
  <el-dialog
    v-model="isOpen"
    width="860px"
    class="rounded-2xl series-masterplan-dialog"
    append-to-body
    :close-on-click-modal="true"
  >
    <template #header>
      <div class="flex items-center justify-between pr-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <el-icon :size="20"><TrendCharts /></el-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold" style="color: var(--el-text-color-primary);">
                {{ series?.title || 'Series Title' }}
              </h2>
              <el-tag size="small" type="success" effect="plain" round class="font-bold uppercase">
                {{ series?.status || 'ACTIVE' }}
              </el-tag>
              <el-tag size="small" type="primary" effect="dark" round class="font-bold">
                9:16 Vertical
              </el-tag>
            </div>
            <p class="text-xs mt-0.5" style="color: var(--el-text-color-secondary);">
              {{ series?.genre || 'Drama' }} • {{ episodes.length || series?.episode_count || 100 }} Episodes • {{ series?.language || 'vi-VN' }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Tabs Navigation -->
      <div class="flex items-center gap-1.5 p-1 rounded-xl border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Series Overview', icon: 'Film' },
            { id: 'masterplan', label: 'Master Plan & Episodes', icon: 'Document' },
            { id: 'characters', label: 'Cast & Characters', icon: 'User' },
            { id: 'viral', label: 'Viral Trend & Hooks', icon: 'TrendCharts' },
          ]"
          :key="tab.id"
          class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
          :style="activeTab === tab.id
            ? 'background-color: var(--el-color-primary); color: #ffffff; border-color: var(--el-color-primary); box-shadow: 0 2px 6px rgba(0,0,0,0.15);'
            : 'background-color: transparent; color: var(--el-text-color-secondary); border-color: transparent;'"
          @click="activeTab = (tab.id as any)"
        >
          <el-icon :size="14"><component :is="tab.icon" /></el-icon>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab 1: Overview -->
      <div v-if="activeTab === 'overview'" class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <!-- Synopsis Box -->
        <div class="p-4 rounded-xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);">
          <div class="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style="color: var(--el-color-primary);">
            <el-icon><Document /></el-icon>
            <span>Synopsis & Core Premise</span>
          </div>
          <p class="text-xs leading-relaxed" style="color: var(--el-text-color-primary);">
            {{ series?.synopsis || 'No synopsis available yet.' }}
          </p>
        </div>

        <!-- Viral Hook & Target Audience -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);">
            <div class="text-xs font-bold uppercase tracking-wider mb-1.5 text-amber-500 flex items-center gap-1.5">
              <el-icon><Lightning /></el-icon>
              <span>Viral Hook / Core Conflict</span>
            </div>
            <p class="text-xs leading-relaxed" style="color: var(--el-text-color-secondary);">
              {{ series?.viral_hook || 'Dynamic conflict escalation with cliffhanger hook calibration on every micro-episode.' }}
            </p>
          </div>

          <div class="p-4 rounded-xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);">
            <div class="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style="color: var(--el-color-primary);">
              <el-icon><UserFilled /></el-icon>
              <span>Target Audience & Tone</span>
            </div>
            <p class="text-xs leading-relaxed" style="color: var(--el-text-color-secondary);">
              {{ series?.target_audience || 'Audience enthusiastic about dramatic, fast-paced vertical short dramas (18-35).' }}
            </p>
          </div>
        </div>

        <!-- Visual Style Prompt -->
        <div class="p-4 rounded-xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);">
          <div class="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style="color: var(--el-color-primary);">
            <el-icon><PictureFilled /></el-icon>
            <span>Visual Style & Aesthetics Prompt</span>
          </div>
          <div class="p-3 rounded-lg font-mono text-[11px] leading-relaxed border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light); color: var(--el-text-color-primary);">
            {{ series?.visual_style_prompt || series?.visual_style || 'Cinematic 9:16 vertical drama, high-contrast rim lighting, photorealistic 8k render, moody atmosphere.' }}
          </div>
        </div>
      </div>

      <!-- Tab 2: Master Plan & Episodes -->
      <div v-else-if="activeTab === 'masterplan'" class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div class="flex items-center justify-between px-1">
          <div class="text-xs font-semibold" style="color: var(--el-text-color-secondary);">
            Showing {{ episodes.length }} planned episodes
          </div>
          <el-tag size="small" type="primary" effect="plain" round class="font-bold">
            Pacing: Fast / Micro-Drama
          </el-tag>
        </div>

        <div class="space-y-2">
          <div
            v-for="ep in episodes"
            :key="ep.id"
            class="p-3.5 rounded-xl border flex items-center justify-between hover:border-primary/50 transition-all cursor-pointer"
            :style="ep.id === seriesStore.activeEpisodeId
              ? 'background-color: var(--el-color-primary-light-9); border-color: var(--el-color-primary);'
              : 'background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);'"
            @click="emit('select-episode', ep.id)"
          >
            <div class="flex items-start gap-3 flex-1 min-w-0 pr-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0" style="background-color: var(--el-fill-color-dark); color: var(--el-text-color-primary);">
                #{{ ep.number }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-xs truncate" style="color: var(--el-text-color-primary);">
                    {{ ep.title }}
                  </h4>
                  <el-tag size="small" :type="ep.status === 'PUBLISHED' ? 'success' : 'info'" effect="plain" round class="text-[10px]">
                    {{ ep.status || 'DRAFT' }}
                  </el-tag>
                  <span v-if="ep.id === seriesStore.activeEpisodeId" class="text-[10px] font-bold text-primary">
                    [ACTIVE]
                  </span>
                </div>
                <p class="text-[11px] mt-1 line-clamp-2" style="color: var(--el-text-color-secondary);">
                  {{ ep.synopsis || ep.conflict_escalation || ep.cliffhanger_hook || 'Episode narrative breakdown & scene progression.' }}
                </p>
                <div v-if="ep.cliffhanger_hook" class="mt-1.5 text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                  <el-icon><Lightning /></el-icon>
                  <span>Hook: {{ ep.cliffhanger_hook }}</span>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex items-center gap-2">
              <span class="text-[10px]" style="color: var(--el-text-color-placeholder);">
                {{ ep.scenes_count || `${ep.scenes?.length || 0} scenes` }}
              </span>
              <el-icon :size="14" style="color: var(--el-text-color-secondary);"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Characters & Cast -->
      <div v-else-if="activeTab === 'characters'" class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="char in characters"
            :key="char.id"
            class="p-3.5 rounded-xl border flex items-start gap-3"
            style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);"
          >
            <el-avatar :src="char.avatar as string" :size="50" fit="cover" class="shrink-0 border" style="border-color: var(--el-border-color);">
              <template #error><el-icon :size="20"><User /></el-icon></template>
            </el-avatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <h4 class="font-bold text-xs truncate" style="color: var(--el-text-color-primary);">{{ char.name }}</h4>
                <el-tag size="small" type="warning" effect="plain" round class="text-[9px]">
                  {{ (char as any).archetype || char.role || 'Protagonist' }}
                </el-tag>
              </div>
              <p class="text-[11px] mt-1 line-clamp-2" style="color: var(--el-text-color-secondary);">
                {{ (char as any).personality || char.traits || char.identity || (char as any).description || 'Core character in the vertical series narrative.' }}
              </p>
            </div>
          </div>
        </div>
        <div v-if="characters.length === 0" class="text-center py-8 text-xs italic" style="color: var(--el-text-color-placeholder);">
          No characters registered yet for this series.
        </div>
      </div>

      <!-- Tab 4: Viral Trends & Social SEO -->
      <div v-else-if="activeTab === 'viral'" class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <!-- Live Hashtags Card -->
        <div class="p-4 rounded-xl border" style="background-color: var(--el-card-bg-color); border-color: var(--el-border-color-light);">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
              <el-icon><TrendCharts /></el-icon>
              <span>Recommended Viral Hashtags</span>
            </div>
            <el-button size="small" plain round icon="DocumentCopy" @click="copyHashtags">
              Copy Tags
            </el-button>
          </div>
          <div class="flex flex-wrap gap-2">
            <el-tag
              v-for="tag in [
                `#${(series?.title || 'Series').replace(/\\s+/g, '')}`,
                '#ShortDrama',
                '#TikTokSeries',
                '#DramaHay',
                '#ReelsViral',
                '#PhimNganKichTinh',
                '#ShineAI',
                '#TopTrending'
              ]"
              :key="tag"
              size="large"
              effect="plain"
              round
              class="font-mono text-xs font-bold"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <!-- Social Distribution Platforms -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl border flex flex-col items-center text-center" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <el-tag size="large" effect="dark" round class="font-bold mb-2">TikTok</el-tag>
            <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">9:16 Vertical Feed</span>
            <span class="text-[10px] mt-1" style="color: var(--el-text-color-secondary);">Optimal duration: 60s - 90s</span>
          </div>

          <div class="p-3.5 rounded-xl border flex flex-col items-center text-center" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <el-tag size="large" type="danger" effect="dark" round class="font-bold mb-2">Shorts</el-tag>
            <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">YouTube Shorts</span>
            <span class="text-[10px] mt-1" style="color: var(--el-text-color-secondary);">High retention loop</span>
          </div>

          <div class="p-3.5 rounded-xl border flex flex-col items-center text-center" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
            <el-tag size="large" type="warning" effect="dark" round class="font-bold mb-2">Reels</el-tag>
            <span class="text-xs font-semibold" style="color: var(--el-text-color-primary);">FB &amp; IG Reels</span>
            <span class="text-[10px] mt-1" style="color: var(--el-text-color-secondary);">Engagement &amp; Comments</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <div class="text-xs" style="color: var(--el-text-color-placeholder);">
          Powered by Shine Micro-Drama Orchestrator
        </div>
        <el-button type="primary" round @click="isOpen = false">
          Close
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.series-masterplan-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}
</style>
