<template>
  <div class="actor-marketplace bg-surface text-on-surface min-h-screen p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold text-on-surface flex items-center gap-2">
          <el-icon class="text-primary"><User /></el-icon>
          AI Virtual Actor Royalty Marketplace
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          License hyper-consistent 3D/AI persona avatars with zero copyright risk
        </p>
      </div>
    </div>

    <!-- Actors Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <el-card
        v-for="actor in actors"
        :key="actor.id"
        shadow="never"
        class="bg-surface-container border-outline-variant flex flex-col justify-between"
      >
        <div>
          <div class="relative rounded-lg overflow-hidden mb-4">
            <img :src="actor.thumbnailUrl" :alt="actor.name" class="w-full h-56 object-cover" />
            <div class="absolute top-2 left-2">
              <el-tag type="success" effect="dark" size="small">{{ actor.style }}</el-tag>
            </div>
          </div>

          <h3 class="font-bold text-lg text-on-surface mb-1">{{ actor.name }}</h3>
          <p class="text-xs text-on-surface-variant mb-3">{{ actor.gender }} • {{ actor.languages.join(', ') }}</p>

          <div class="flex items-center gap-1 text-amber-400 text-xs mb-4">
            <el-icon><Star /></el-icon>
            <span>{{ actor.rating }} Rating</span>
          </div>
        </div>

        <div class="pt-3 border-t border-outline-variant flex items-center justify-between">
          <div>
            <span class="text-base font-extrabold text-primary">${{ actor.dailyRateUsd }}</span>
            <span class="text-[10px] text-on-surface-variant">/ series</span>
          </div>
          <el-button type="primary" size="small" @click="licenseActor(actor)">
            License Actor
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/utils/http';
import { ElMessage } from 'element-plus';
import { User, Star } from '@element-plus/icons-vue';

const actors = ref([
  {
    id: 'actor-001',
    name: 'Kaelen Vance',
    gender: 'Male',
    style: 'Dominant CEO',
    thumbnailUrl: 'https://picsum.photos/seed/actor1/400/500',
    dailyRateUsd: 15,
    rating: 4.98,
    languages: ['EN', 'ZH', 'VI'],
  },
  {
    id: 'actor-002',
    name: 'Seraphina Lin',
    gender: 'Female',
    style: 'Heiress Protagonist',
    thumbnailUrl: 'https://picsum.photos/seed/actor2/400/500',
    dailyRateUsd: 18,
    rating: 4.95,
    languages: ['EN', 'ZH', 'JP'],
  },
  {
    id: 'actor-003',
    name: 'Marcus Thorne',
    gender: 'Male',
    style: 'Cyber Antagonist',
    thumbnailUrl: 'https://picsum.photos/seed/actor3/400/500',
    dailyRateUsd: 12,
    rating: 4.90,
    languages: ['EN', 'ES', 'FR'],
  },
  {
    id: 'actor-004',
    name: 'Aria Chen',
    gender: 'Female',
    style: 'Secret Agent',
    thumbnailUrl: 'https://picsum.photos/seed/actor4/400/500',
    dailyRateUsd: 20,
    rating: 4.99,
    languages: ['EN', 'ZH', 'VI'],
  },
]);

async function fetchActors() {
  try {
    const res = await http.get('/marketplace/actors');
    if (res.data && res.data.data) {
      actors.value = res.data.data;
    }
  } catch (err) {
    console.error('Failed to fetch actors', err);
  }
}

async function licenseActor(actor: any) {
  try {
    await http.post(`/marketplace/actors/${actor.id}/license`);
    ElMessage.success(`Licensed virtual actor "${actor.name}" for your series!`);
  } catch (err) {
    console.error('Licensing failed', err);
    ElMessage.error('Failed to license actor');
  }
}

onMounted(() => {
  fetchActors();
});
</script>

<style scoped>
.actor-marketplace :deep(.el-card) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}
</style>
