<template>
  <div class="persona-studio p-6 max-w-[1600px] mx-auto text-white">
    <!-- Top Header Bar matching Stitch Mockup workspace-characters-2.png -->
    <div class="studio-header flex items-center justify-between bg-surface-container p-4 rounded-xl border border-outline-variant mb-6">
      <div class="flex items-center gap-4">
        <span class="text-xl font-bold tracking-wider text-white">{{ t('script.brandName') }}</span>
        <div class="flex items-center gap-2 border-l border-outline-variant pl-4">
          <el-tag size="small" type="info" effect="plain">{{ t('script.editor') }}</el-tag>
          <el-tag size="small" type="success" effect="dark">{{ t('persona.characterConsistency') }}</el-tag>
          <el-tag size="small" type="info" effect="plain">{{ t('persona.captions') }}</el-tag>
        </div>
      </div>

      <el-button 
        type="primary" 
        size="default" 
        class="!bg-primary !border-[var(--el-color-primary)] !text-[var(--el-bg-color)] font-bold"
        :loading="isSyncing"
        @click="handleSyncShots"
      >
        <el-icon class="mr-1"><Refresh /></el-icon>
        {{ t('persona.syncAllShots') }}
      </el-button>
    </div>

    <!-- 3-Column Layout: Left Character List + Center Studio + Right Inspector -->
    <el-row :gutter="20">
      <!-- LEFT SIDEBAR: Character Roster (Col 5 / 24) -->
      <el-col :xs="24" :sm="24" :md="5">
        <div class="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-4">
          <!-- Search Characters Input -->
          <el-input 
            v-model="searchQuery" 
            :placeholder="t('persona.searchCharacters')" 
            prefix-icon="Search"
            clearable
          />

          <!-- Character Roster Cards -->
          <div class="space-y-3" v-loading="personaStore.isLoading">
            <div 
              v-for="char in filteredCharacters"
              :key="char.id"
              class="character-card p-3 rounded-xl border transition-all cursor-pointer bg-surface"
              :class="selectedCharacterId === char.id ? 'border-[var(--el-color-primary)] shadow-lg shadow-[var(--el-color-primary)]/10' : 'border-outline-variant hover:border-[var(--el-color-primary)]/50'"
              @click="selectCharacter(char)"
            >
              <div class="flex items-center gap-3 mb-3">
                <img :src="char.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop'" class="w-10 h-10 rounded-lg object-cover border border-[var(--el-color-primary)]" />
                <div>
                  <span class="text-sm font-bold text-white block">{{ char.name }}</span>
                  <span class="text-[9px] text-primary uppercase font-bold tracking-wider">{{ t('persona.lockedVerified') }} ({{ char.meshMatchRate }}%)</span>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-1">
                <div
                  v-for="(anc, aIdx) in (char.anchors || []).slice(0, 4)"
                  :key="aIdx"
                  class="h-8 rounded bg-surface-container border border-outline-variant overflow-hidden"
                >
                  <img v-if="anc.imageUrl" :src="anc.imageUrl" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-[8px] text-primary font-bold">{{ t('persona.locked') }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- New AI Persona Dotted Button -->
          <button 
            class="w-full py-3 border-2 border-dashed border-outline-variant hover:border-[var(--el-color-primary)] rounded-xl text-xs font-bold text-[#a0a5b5] hover:text-primary flex items-center justify-center gap-2 transition-all"
            @click="createNewCharacterDialog = true"
          >
            <el-icon><Plus /></el-icon>
            <span>{{ t('persona.newAiPersona') }}</span>
          </button>
        </div>
      </el-col>

      <!-- CENTER PANEL: Persona Studio Main Area (Col 14 / 24) -->
      <el-col :xs="24" :sm="24" :md="14">
        <div v-if="activeCharacter" class="bg-surface-container border border-outline-variant rounded-xl p-5 mb-6 space-y-6">
          <!-- Persona Title Bar -->
          <div class="flex items-center justify-between border-b border-outline-variant pb-4">
            <div class="flex items-center gap-3">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">{{ activeCharacter.name }}</h3>
              <el-tag size="small" type="info" effect="plain">{{ activeCharacter.role }}</el-tag>
              <el-tag size="small" type="success" effect="dark">{{ t('persona.meshMatch') }}: {{ activeCharacter.meshMatchRate }}%</el-tag>
            </div>
            <el-button 
              type="primary" 
              size="small" 
              plain 
              :loading="personaStore.isExtractingAnchors" 
              @click="handleExtractAnchors"
            >
              <el-icon class="mr-1"><MagicStick /></el-icon>
              Extract 8 AI Facial Anchors
            </el-button>
          </div>

          <!-- Section 1: Facial Consistency Anchors -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs uppercase font-bold text-white tracking-wider">{{ t('persona.facialConsistencyAnchorsTitle') }}</h4>
              <span class="text-xs text-[#a0a5b5] italic">{{ (activeCharacter.anchors || []).length }} / 8 {{ t('persona.slotsUsed') }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <div
                v-for="(anchor, idx) in (activeCharacter.anchors || [])"
                :key="anchor.id || idx"
                class="relative flex flex-col items-center"
              >
                <div class="w-16 h-16 rounded-full border-2 border-[var(--el-color-primary)] overflow-hidden p-0.5 relative bg-surface">
                  <img :src="anchor.imageUrl || activeCharacter.avatarUrl" class="w-full h-full object-cover rounded-full" />
                </div>
                <span class="mt-1 bg-primary text-[var(--el-bg-color)] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase truncate max-w-[80px]">
                  {{ anchor.landmarkType || anchor.name }}
                </span>
              </div>

              <!-- Dotted Add Slot Button if fewer than 8 -->
              <button
                v-if="(activeCharacter.anchors || []).length < 8"
                class="w-16 h-16 rounded-full border-2 border-dashed border-outline-variant hover:border-primary flex items-center justify-center text-primary bg-surface transition-all"
                @click="handleExtractAnchors"
              >
                <el-icon :size="20"><Plus /></el-icon>
              </button>
            </div>
          </div>

          <!-- Section 2: Outfit Continuity & Wardrobe -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h5 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <el-icon class="text-primary"><Goods /></el-icon>
                {{ t('persona.outfitContinuityTitle') }}
              </h5>
              <el-button link class="!text-primary text-xs" @click="openAddOutfitDialog">
                + Add Outfit
              </el-button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="item in (activeCharacter.wardrobe || [])"
                :key="item.id"
                class="bg-surface border border-outline-variant p-4 rounded-xl flex gap-3 items-center justify-between"
              >
                <div class="flex gap-3 items-center">
                  <img :src="item.thumbnailUrl" class="w-16 h-20 object-cover rounded-lg border border-outline-variant" />
                  <div>
                    <span class="text-xs font-bold text-primary block mb-1">{{ item.name }}</span>
                    <el-tag size="small" type="info">{{ item.category }}</el-tag>
                    <div class="flex flex-wrap gap-1 mt-1">
                      <span v-for="tag in item.tags" :key="tag" class="text-[9px] text-[#a0a5b5]">#{{ tag }}</span>
                    </div>
                  </div>
                </div>
                <el-tag size="small" type="success" effect="dark">{{ t('persona.locked') }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-20 bg-surface-container rounded-xl border border-outline-variant text-[#a0a5b5]">
          Select or create a persona to inspect facial consistency anchors.
        </div>
      </el-col>

      <!-- RIGHT SIDEBAR: Generation Mode & Character Strength Inspector (Col 5 / 24) -->
      <el-col :xs="24" :sm="24" :md="5">
        <div class="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col justify-between min-h-[600px]">
          <div class="space-y-6">
            <!-- Generation Mode Toggle -->
            <div>
              <span class="text-xs uppercase font-bold text-[#a0a5b5] tracking-wider block mb-3">{{ t('persona.generationMode') }}</span>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  class="py-2.5 rounded-lg border text-xs font-bold transition-all"
                  :class="genMode === 'hifi' ? 'bg-primary text-[var(--el-bg-color)] border-[var(--el-color-primary)]' : 'bg-surface text-[#a0a5b5] border-outline-variant'"
                  @click="genMode = 'hifi'"
                >
                  {{ t('persona.hifi') }}
                </button>
                <button 
                  class="py-2.5 rounded-lg border text-xs font-bold transition-all"
                  :class="genMode === 'proxy' ? 'bg-primary text-[var(--el-bg-color)] border-[var(--el-color-primary)]' : 'bg-surface text-[#a0a5b5] border-outline-variant'"
                  @click="genMode = 'proxy'"
                >
                  {{ t('persona.proxy') }}
                </button>
              </div>
            </div>

            <!-- Character Strength Sliders -->
            <div class="space-y-4">
              <span class="text-xs uppercase font-bold text-[#a0a5b5] tracking-wider block">{{ t('persona.characterStrength') }}</span>
              
              <div>
                <div class="flex justify-between text-xs text-[#a0a5b5] mb-1">
                  <span>{{ t('persona.faceWeight') }}</span>
                  <span class="text-primary font-bold">95%</span>
                </div>
                <el-progress :percentage="95" color="var(--el-color-primary)" :show-text="false" :stroke-width="6" />
              </div>

              <div>
                <div class="flex justify-between text-xs text-[#a0a5b5] mb-1">
                  <span>{{ t('persona.outfitRigidity') }}</span>
                  <span class="text-primary font-bold">90%</span>
                </div>
                <el-progress :percentage="90" color="var(--el-color-primary)" :show-text="false" :stroke-width="6" />
              </div>
            </div>
          </div>

          <!-- Inspector Action Buttons -->
          <div class="space-y-3">
            <el-button 
              type="primary" 
              size="large" 
              class="w-full !bg-primary !border-[var(--el-color-primary)] !text-[var(--el-bg-color)] font-bold"
              @click="handleSyncShots"
            >
              {{ t('persona.applyStoryboard') }}
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Create Character Dialog -->
    <el-dialog v-model="createNewCharacterDialog" :title="t('persona.createPersona')" width="450px">
      <div class="space-y-3">
        <div>
          <label class="text-xs text-[#a0a5b5] block mb-1">{{ t('persona.characterName') }}</label>
          <el-input v-model="newCharName" placeholder="e.g. Rachel Thorne" />
        </div>
        <div>
          <label class="text-xs text-[#a0a5b5] block mb-1">{{ t('persona.role') }}</label>
          <el-select v-model="newCharRole" class="w-full">
            <el-option label="Protagonist" value="protagonist" />
            <el-option label="Antagonist" value="antagonist" />
            <el-option label="Supporting" value="supporting" />
          </el-select>
        </div>
        <div>
          <label class="text-xs text-[#a0a5b5] block mb-1">{{ t('persona.visualPersonalityDesc') }}</label>
          <el-input v-model="newCharDesc" type="textarea" :rows="3" placeholder="Describe face, hair, clothing style..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="createNewCharacterDialog = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="personaStore.isLoading" @click="handleCreateCharacter">{{ t('persona.createPersona') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Plus, Goods, MagicStick } from '@element-plus/icons-vue';
import { usePersonaStore } from '../../stores/usePersonaStore';
import type { Character } from '@/types/api';
import http from '@/utils/http';

const { t } = useI18n();
const personaStore = usePersonaStore();

const searchQuery = ref('');
const selectedCharacterId = ref('char-mara');
const genMode = ref('hifi');
const isSyncing = ref(false);

const createNewCharacterDialog = ref(false);
const newCharName = ref('');
const newCharRole = ref<'protagonist' | 'antagonist' | 'supporting'>('protagonist');
const newCharDesc = ref('');

const filteredCharacters = computed(() => {
  if (!searchQuery.value.trim()) return personaStore.characters;
  const q = searchQuery.value.toLowerCase();
  return personaStore.characters.filter(c => c.name.toLowerCase().includes(q));
});

const activeCharacter = computed(() => {
  return personaStore.characters.find(c => c.id === selectedCharacterId.value) || personaStore.activeCharacter || personaStore.characters[0] || null;
});

function selectCharacter(char: Character) {
  selectedCharacterId.value = char.id;
  personaStore.setActiveCharacter(char);
}

async function handleExtractAnchors() {
  if (!activeCharacter.value) return;
  await personaStore.extractFacialAnchors(activeCharacter.value.id);
  ElMessage.success('8 facial consistency anchors extracted and locked with LoRA.');
}

async function openAddOutfitDialog() {
  if (!activeCharacter.value) return;
  await personaStore.addWardrobeOutfit(activeCharacter.value.id, {
    name: t('persona.executiveTrenchcoat'),
    category: 'formal',
  });
  ElMessage.success('Wardrobe outfit registered for scene continuity.');
}

async function handleCreateCharacter() {
  if (!newCharName.value.trim()) return;
  await personaStore.createCharacter({
    name: newCharName.value.trim(),
    role: newCharRole.value,
    description: newCharDesc.value.trim(),
  });
  createNewCharacterDialog.value = false;
  newCharName.value = '';
  newCharDesc.value = '';
  ElMessage.success('Persona created successfully!');
}

async function handleSyncShots() {
  isSyncing.value = true;
  try {
    const res = await http.post('/characters/sync-shots', { seriesId: 'series-001' }) as any;
    ElMessage.success(res.data?.message || t('toast.syncShotsSuccess'));
  } finally {
    isSyncing.value = false;
  }
}

onMounted(async () => {
  await personaStore.fetchCharacters();
  if (personaStore.characters.length > 0) {
    selectedCharacterId.value = personaStore.characters[0].id;
  }
});
</script>

<style scoped>
.persona-studio :deep(.el-input__wrapper),
.persona-studio :deep(.el-textarea__inner),
.persona-studio :deep(.el-select__wrapper) {
  background-color: transparent !important;
  box-shadow: 0 0 0 1px var(--el-border-color) inset !important;
  color: inherit !important;
}
</style>
