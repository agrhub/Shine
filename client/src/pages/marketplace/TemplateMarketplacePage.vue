<template>
  <div class="template-marketplace bg-surface text-on-surface min-h-screen p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold text-on-surface flex items-center gap-2">
          <el-icon class="text-primary"><Shop /></el-icon>
          Creator Template Marketplace
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          Discover pre-built micro-drama series outlines, prompt presets, and viral storytelling templates
        </p>
      </div>
    </div>

    <!-- Filter Bar -->
    <el-card shadow="never" class="bg-surface-container border-outline-variant mb-6">
      <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div class="flex flex-1 gap-4 w-full sm:w-auto">
          <el-input
            v-model="searchQuery"
            placeholder="Search templates by title or genre..."
            clearable
            style="max-width: 320px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select v-model="selectedGenre" placeholder="All Genres" style="width: 160px">
            <el-option label="All Genres" value="" />
            <el-option label="Romance & CEO" value="Romance" />
            <el-option label="Urban Revenge" value="Revenge" />
            <el-option label="Sci-Fi & Cyber" value="Sci-Fi" />
            <el-option label="Thriller" value="Thriller" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- Templates Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <el-card
        v-for="tmpl in filteredTemplates"
        :key="tmpl.id"
        shadow="never"
        class="bg-surface-container border-outline-variant flex flex-col justify-between"
      >
        <div>
          <div class="relative rounded-lg overflow-hidden mb-4">
            <img :src="tmpl.previewUrl" :alt="tmpl.title" class="w-full h-44 object-cover" />
            <div class="absolute top-2 right-2">
              <el-tag type="success" effect="dark" size="small">{{ tmpl.genre }}</el-tag>
            </div>
          </div>

          <h3 class="font-bold text-lg text-on-surface mb-1">{{ tmpl.title }}</h3>
          <p class="text-xs text-on-surface-variant mb-3 line-clamp-2">{{ tmpl.description }}</p>

          <div class="flex items-center justify-between text-xs text-on-surface-variant mb-4">
            <span>By {{ tmpl.author }}</span>
            <div class="flex items-center gap-1 text-amber-400">
              <el-icon><Star /></el-icon>
              <span>{{ tmpl.rating }}</span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-outline-variant flex items-center justify-between">
          <span class="text-base font-extrabold text-primary">
            {{ tmpl.price === 0 ? 'Free' : `${tmpl.price} Credits` }}
          </span>
          <el-button type="primary" size="small" @click="handlePurchase(tmpl)">
            Use Template
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Pagination -->
    <div class="flex justify-end">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredTemplates.length"
        layout="prev, pager, next"
        background
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import http from '@/utils/http';
import { ElMessage } from 'element-plus';
import { Shop, Search, Star } from '@element-plus/icons-vue';

const searchQuery = ref('');
const selectedGenre = ref('');
const currentPage = ref(1);
const pageSize = ref(6);

const templates = ref([
  {
    id: 'tmpl-001',
    title: 'The Billionaire Heir Concealed',
    genre: 'Romance',
    description: '100-episode structure with 20 high-retention cliffhangers and dual POV arcs.',
    previewUrl: 'https://picsum.photos/seed/tmpl1/400/300',
    price: 50,
    author: 'Studio Zero',
    rating: 4.9,
    downloadsCount: 1420,
  },
  {
    id: 'tmpl-002',
    title: 'Revenge of the Abandoned Daughter',
    genre: 'Revenge',
    description: 'Fast-paced urban revenge layout optimized for TikTok 9:16 portrait video.',
    previewUrl: 'https://picsum.photos/seed/tmpl2/400/300',
    price: 0,
    author: 'DramaVerse',
    rating: 4.8,
    downloadsCount: 2890,
  },
  {
    id: 'tmpl-003',
    title: 'Cyberpunk Neon Assassin',
    genre: 'Sci-Fi',
    description: 'Vustudio visual prompts, dark synthwave audio track presets, and camera motion cues.',
    previewUrl: 'https://picsum.photos/seed/tmpl3/400/300',
    price: 100,
    author: 'CyberLab',
    rating: 4.95,
    downloadsCount: 820,
  },
]);

const filteredTemplates = computed(() => {
  return templates.value.filter((t) => {
    const matchesQuery = t.title.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesGenre = !selectedGenre.value || t.genre === selectedGenre.value;
    return matchesQuery && matchesGenre;
  });
});

async function fetchTemplates() {
  try {
    const res = await http.get('/marketplace/templates');
    if (res.data && res.data.data) {
      templates.value = res.data.data;
    }
  } catch (err) {
    console.error('Failed to fetch templates', err);
  }
}

async function handlePurchase(tmpl: any) {
  try {
    await http.post(`/marketplace/templates/${tmpl.id}/purchase`);
    ElMessage.success(`Unlocked "${tmpl.title}" template!`);
  } catch (err) {
    console.error('Purchase failed', err);
    ElMessage.error('Failed to unlock template');
  }
}

onMounted(() => {
  fetchTemplates();
});
</script>

<style scoped>
.template-marketplace :deep(.el-card) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}
</style>
