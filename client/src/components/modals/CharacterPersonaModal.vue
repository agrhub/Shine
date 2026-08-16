<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { User, Lock } from '@element-plus/icons-vue';

const props = defineProps<{
  modelValue: boolean;
  characterName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();

const activeChar = computed(() => {
  if (props.characterName) {
    const found = seriesStore.charactersList.find(c => c.name.toLowerCase().includes(props.characterName!.toLowerCase()));
    if (found) return found;
  }
  return seriesStore.charactersList[0] || {
    id: 'char_default',
    name: props.characterName || 'Mara (Protagonist)',
    role: 'Protagonist',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
    description: 'Female lead character with high-fidelity facial anchors.',
  };
});

const facialAnchors = [
  { label: 'Front View (Neutral)', status: 'Locked 99.2%', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop' },
  { label: 'Side Profile (Lighting Rim)', status: 'Locked 98.4%', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=300&fit=crop' },
];
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    @update:model-value="val => emit('update:modelValue', val)"
    title="Character Persona Studio"
    width="700px"
    class="!rounded-2xl border !bg-[var(--el-bg-color-page)]"
    align-center
    destroy-on-close
  >
    <template #header>
      <div class="flex items-center justify-between pb-2 border-b" style="border-color: var(--el-border-color);">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background-color: var(--el-color-primary);">
            <el-icon><User /></el-icon>
          </div>
          <div>
            <h3 class="text-lg font-bold" style="color: var(--el-text-color-primary);">Persona Studio — {{ activeChar.name }}</h3>
            <p class="text-xs" style="color: var(--el-text-color-secondary);">Facial Consistency Anchors & Outfit Continuity</p>
          </div>
        </div>

        <el-tag type="success" effect="plain" round class="font-bold">LORA VERIFIED</el-tag>
      </div>
    </template>

    <div class="py-4 space-y-6">
      <div class="p-4 rounded-xl flex items-center justify-between border" style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);">
        <div class="flex items-center gap-3">
          <el-avatar :src="activeChar.avatar || undefined" :size="56" />
          <div>
            <h4 class="font-bold text-base" style="color: var(--el-text-color-primary);">{{ activeChar.name }} ({{ activeChar.role || 'Lead' }})</h4>
            <p class="text-xs" style="color: var(--el-text-color-secondary);">{{ activeChar.description || 'High-Fidelity Neural Facial Rig' }}</p>
          </div>
        </div>
        <el-button type="primary" size="small" round icon="Lock" class="!font-bold">
          Lock Outfit Continuity
        </el-button>
      </div>

      <div class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider" style="color: var(--el-text-color-primary);">Facial Consistency Anchors</h4>
        <el-row :gutter="16">
          <el-col v-for="anchor in facialAnchors" :key="anchor.label" :span="12">
            <el-card shadow="hover" class="!rounded-xl border" style="border-color: var(--el-border-color-light); background-color: var(--el-card-bg-color);">
              <div class="h-40 rounded-lg overflow-hidden mb-3">
                <el-image :src="anchor.img" fit="cover" class="w-full h-full" />
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold" style="color: var(--el-text-color-primary);">{{ anchor.label }}</span>
                <el-tag size="small" type="success" effect="plain" round>{{ anchor.status }}</el-tag>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <el-button type="primary" round class="!font-bold" @click="emit('update:modelValue', false)">
          Close
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
