<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  type: 'compliance' | 'privacy';
}>();

const { t } = useI18n();
</script>

<template>
  <div class="space-y-6">
    <div class="pb-5 border-b border-[var(--el-border-color)]">
      <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
        {{ type === 'compliance' ? t('settings.complianceTerms') : t('settings.privacyPolicy') }}
      </h2>
      <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
        Last updated: August 2026. Standard enterprise usage and copyright licensing terms.
      </p>
    </div>

    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-4 text-[var(--el-text-color-regular)]">
      <template v-if="type === 'compliance'">
        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">1. Commercial AI Generation Rights</h4>
        <p>All video scripts, storyboard frames, and rendered short dramas produced through Shine Studio AI are licensed for commercial distribution on TikTok, Meta Reels, YouTube Shorts, and DramaBox ecosystems without royalties.</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">2. Content Compliance & Ethical Guidelines</h4>
        <p>Users must comply with regional copyright regulations and refrain from generating non-consensual deepfakes, violent content, or infringing intellectual properties.</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">3. Data Retention & Audio Synthesis</h4>
        <p>Voice cloning data and generated character LoRA anchors are stored in private S3/GCS buckets and are never shared across tenant accounts.</p>
      </template>

      <template v-else>
        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">1. Data Collection & Cloud Storage</h4>
        <p>Shine Studio collects essential project scripts, uploaded reference images, and generated audio files solely to facilitate AI rendering pipelines and cloud exports.</p>

        <h4 class="text-sm font-bold text-[var(--el-text-color-primary)]">2. Third-Party AI Processors</h4>
        <p>Prompts and reference media are securely transmitted to verified upstream inference providers (Google Gemini / Vertex AI, Veo 3, Freesound, Pixabay, Pexels) over encrypted TLS 1.3 connections.</p>
      </template>
    </div>
  </div>
</template>
