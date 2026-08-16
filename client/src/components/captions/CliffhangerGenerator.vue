<template>
  <div class="cliffhanger-generator p-4 rounded-xl bg-surface border border-outline-variant text-on-surface">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {{ $t('cliffhanger.title') }}
      </h3>
      <el-tag size="small" type="warning" effect="dark">{{ $t('cliffhanger.badge') }}</el-tag>
    </div>

    <el-form label-position="top" size="small">
      <!-- Transition Type Select -->
      <el-form-item :label="$t('cliffhanger.transitionType')">
        <el-select v-model="transitionType" class="w-full">
          <el-option label="Glitch Effect (GLSL Shader)" value="glitch" />
          <el-option label="Flash Impact (GLSL Shader)" value="flash" />
        </el-select>
      </el-form-item>

      <!-- Zoom Keyframe Toggle -->
      <el-form-item :label="$t('cliffhanger.zoomKeyframe')">
        <el-switch v-model="zoomKeyframe" />
      </el-form-item>

      <!-- CTA Text Input -->
      <el-form-item :label="$t('cliffhanger.ctaText')">
        <el-input v-model="ctaText" placeholder="SUBMIT YOUR VOTE FOR EPISODE 2" />
      </el-form-item>

      <!-- Progress bar -->
      <el-progress
        v-if="captionStore.generatingCliffhanger"
        :percentage="captionStore.cliffhangerProgress"
        :stroke-width="8"
        class="mb-4"
        status="warning"
      />

      <!-- Generate Button -->
      <el-button
        type="warning"
        class="w-full"
        :loading="captionStore.generatingCliffhanger"
        @click="generateCliffhanger"
      >
        {{ $t('cliffhanger.generateBtn') }}
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElNotification } from 'element-plus';
import { useCaptionStore } from '@/stores/captionStore';

const { t } = useI18n();
const captionStore = useCaptionStore();
const route = useRoute();

const transitionType = ref<'glitch' | 'flash'>('glitch');
const zoomKeyframe = ref(true);
const ctaText = ref('SUBMIT YOUR VOTE FOR EPISODE 2');

async function generateCliffhanger() {
  const epId = (route.params.episodeId as string) || 'episode-001';
  const res = await captionStore.generateCliffhanger(epId, transitionType.value, zoomKeyframe.value, ctaText.value);
  if (res) {

    ElNotification({
      title: t('cliffhanger.title'),
      message: t('toast.cliffhangerGenerated'),
      type: 'success',
    });
  }
}
</script>

<style scoped>
.cliffhanger-generator {
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
}
</style>
