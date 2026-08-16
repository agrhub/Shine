<template>
  <div class="karaoke-preview-panel p-4 rounded-xl bg-surface border border-outline-variant text-on-surface">
    <!-- Style Presets Grid -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {{ $t('caption.presetsTitle') }}
        </h3>
        <el-tag size="small" type="success" effect="dark">{{ $t('caption.autoSyncOn') }}</el-tag>
      </div>

      <div class="grid grid-cols-4 gap-3">
        <el-card
          v-for="p in presetOptions"
          :key="p.id"
          class="preset-card cursor-pointer border border-slate-700 bg-slate-800 text-center"
          :class="{ 'is-selected': activePreset === p.id }"
          shadow="hover"
          @click="selectPreset(p.id)"
        >
          <div class="text-lg font-black tracking-wider uppercase text-emerald-400 mb-1">
            {{ p.label }}
          </div>
          <div class="text-[10px] text-on-surface-variant">{{ p.desc }}</div>
        </el-card>
      </div>
    </div>

    <!-- Design Customization Form -->
    <el-form label-position="top" size="small" class="grid grid-cols-2 gap-4">
      <div>
        <el-form-item :label="$t('caption.textColor')">
          <el-color-picker v-model="textColor" show-alpha />
        </el-form-item>

        <el-form-item :label="`${$t('caption.fontSize')}: ${fontSize}px`">
          <el-slider v-model="fontSize" :min="20" :max="64" />
        </el-form-item>
      </div>

      <div>
        <el-form-item :label="`${$t('caption.verticalPosition')}: ${verticalPos}%`">
          <el-slider v-model="verticalPos" :min="10" :max="90" />
        </el-form-item>

        <el-form-item :label="`${$t('caption.outlineWeight')}: ${outlineWeight}px`">
          <el-slider v-model="outlineWeight" :min="0" :max="8" />
        </el-form-item>
      </div>
    </el-form>

    <!-- Smart Toggles -->
    <div class="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
      <div>
        <div class="font-bold text-xs text-slate-200">{{ $t('caption.aiHighlight') }}</div>
        <div class="text-[10px] text-on-surface-variant">{{ $t('caption.aiHighlightDesc') }}</div>
      </div>
      <el-switch v-model="autoHighlight" />
    </div>

    <!-- Apply Button -->
    <el-button
      type="primary"
      class="mt-4 w-full"
      :loading="loading"
      @click="applyStyle"
    >
      {{ $t('caption.applyToSeries') }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCaptionStore } from '@/stores/captionStore';

const { t } = useI18n();
const captionStore = useCaptionStore();
const route = useRoute();

const activePreset = ref<'pop' | 'bounce' | 'fade' | 'slide'>('pop');
const textColor = ref('#FFFFFF');
const fontSize = ref(42);
const verticalPos = ref(80);
const outlineWeight = ref(3);
const autoHighlight = ref(true);
const loading = ref(false);

const presetOptions = computed(() => [
  { id: 'pop' as const, label: t('caption.presetPop'), desc: 'Dynamic Pop-up' },
  { id: 'bounce' as const, label: t('caption.presetBounce'), desc: 'Rhythm Bounce' },
  { id: 'fade' as const, label: t('caption.presetFade'), desc: 'Smooth Dissolve' },
  { id: 'slide' as const, label: t('caption.presetSlide'), desc: 'Kinetic Slide' },
]);

function selectPreset(id: 'pop' | 'bounce' | 'fade' | 'slide') {
  activePreset.value = id;
}

async function applyStyle() {
  loading.value = true;
  try {
    const epId = (route.params.episodeId as string) || 'episode-001';
    await captionStore.applyKaraokeStyle(epId, {
      preset: activePreset.value,
      textColor: textColor.value,
      fontSizePx: fontSize.value,
      verticalPosPct: verticalPos.value,
      outlineWeightPx: outlineWeight.value,
      autoHighlight: autoHighlight.value,
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.karaoke-preview-panel {
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
}

.preset-card.is-selected {
  border: 2px solid var(--el-color-primary) !important;
  background-color: #222431 !important;
}
</style>
