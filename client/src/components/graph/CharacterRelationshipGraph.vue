<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'character-select', characterName: string): void;
}>();

const selectedChar = ref<string>('Mara Vance');

const characters = ref([
  { id: 'c1', charName: 'Mara Vance', role: 'Protagonist', cx: 200, cy: 150, r: 28 },
  { id: 'c2', charName: 'Kaelen Voss', role: 'Antagonist', cx: 380, cy: 100, r: 24 },
  { id: 'c3', charName: 'Dr. Thorne', role: 'Ally', cx: 350, cy: 230, r: 22 },
  { id: 'c4', charName: 'Echo-7', role: 'AI Companion', cx: 120, cy: 220, r: 20 },
]);

const relations = ref([
  { from: 'c1', to: 'c2', type: 'Rivalry', color: '#ef4444' },
  { from: 'c1', to: 'c3', type: 'Alliance', color: '#10b981' },
  { from: 'c1', to: 'c4', type: 'Bonded', color: '#3b82f6' },
  { from: 'c2', to: 'c3', type: 'Suspicion', color: '#f59e0b' },
]);

const handleCharClick = (char: typeof characters.value[0]) => {
  selectedChar.value = char.charName;
  ElMessage.info(`${t('timeline.clipInspector')}: ${char.charName} (${char.role})`);
  emit('character-select', char.charName);
};
</script>

<template>
  <div class="character-relationship-graph relative w-full h-full bg-surface border border-[var(--el-border-color-light)] rounded-lg overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="p-3 border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color-overlay)] flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[var(--el-text-color-primary)]">👥 {{ $t('graph.characterTitle') }}</span>
        <el-tag size="small" type="warning" class="!font-mono text-[10px]">{{ $t('graph.forceDirected') }}</el-tag>
      </div>
      <el-tag size="small" type="info" class="!font-mono">{{ selectedChar }}</el-tag>
    </div>

    <!-- SVG Graph -->
    <div class="flex-1 relative p-4 flex items-center justify-center min-h-[280px]">
      <svg class="w-full h-full min-w-[500px] min-h-[260px]" viewBox="0 0 500 300">
        <!-- Links -->
        <g class="links">
          <line
            v-for="(rel, idx) in relations"
            :key="idx"
            :x1="characters.find(c => c.id === rel.from)?.cx"
            :y1="characters.find(c => c.id === rel.from)?.cy"
            :x2="characters.find(c => c.id === rel.to)?.cx"
            :y2="characters.find(c => c.id === rel.to)?.cy"
            :stroke="rel.color"
            stroke-width="1.5"
            stroke-dasharray="3 3"
            opacity="0.7"
          />
        </g>

        <!-- Character Nodes -->
        <g v-for="char in characters" :key="char.id" class="node cursor-pointer" @click="handleCharClick(char)">
          <circle
            :cx="char.cx"
            :cy="char.cy"
            :r="char.r"
            :fill="selectedChar === char.charName ? 'var(--el-bg-color-overlay)' : '#14151d'"
            :stroke="selectedChar === char.charName ? '#ffffff' : 'var(--el-border-color)'"
            :stroke-width="selectedChar === char.charName ? 2.5 : 1"
            class="transition-all hover:stroke-white"
          />
          <text :x="char.cx" :y="char.cy + 3.5" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="600">
            {{ char.charName }}
          </text>
          <text :x="char.cx" :y="char.cy + char.r + 14" text-anchor="middle" fill="#64748b" font-size="9" font-family="sans-serif">
            {{ char.role }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.character-relationship-graph {
  user-select: none;
}
</style>
