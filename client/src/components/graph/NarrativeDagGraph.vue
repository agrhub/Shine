<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'node-click', nodeId: string): void;
}>();

const selectedNodeId = ref<string>('node-1');

const nodes = ref([
  { id: 'node-1', nodeTitle: 'Ep 1: The Alleyway Encounter', status: 'completed', x: 80, y: 150 },
  { id: 'node-2', nodeTitle: 'Branch A: Hack Signal Core', status: 'active', x: 280, y: 80 },
  { id: 'node-3', nodeTitle: 'Branch B: Infiltrate Rain Club', status: 'pending', x: 280, y: 220 },
  { id: 'node-4', nodeTitle: 'Ep 2: Encrypted Signals', status: 'pending', x: 500, y: 150 },
]);

const edges = ref([
  { from: 'node-1', to: 'node-2', edgeTag: 'Choice: Tech' },
  { from: 'node-1', to: 'node-3', edgeTag: 'Choice: Stealth' },
  { from: 'node-2', to: 'node-4', edgeTag: 'Branch Merge' },
  { from: 'node-3', to: 'node-4', edgeTag: 'Branch Merge' },
]);

const handleNodeClick = (nodeId: string) => {
  selectedNodeId.value = nodeId;
  const node = nodes.value.find((n) => n.id === nodeId);
  if (node) {
    ElMessage.success(`${t('graph.narrativeTab')}: ${node.nodeTitle}`);
    emit('node-click', nodeId);
  }
};
</script>

<template>
  <div class="narrative-dag-graph relative w-full h-full bg-surface border border-[var(--el-border-color-light)] rounded-lg overflow-hidden flex flex-col">
    <!-- Header Toolbar -->
    <div class="p-3 border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color-overlay)] flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[var(--el-text-color-primary)]">🌿 {{ $t('graph.narrativeTitle') }}</span>
        <el-tag size="small" type="info" class="!font-mono text-[10px]">{{ $t('graph.antvEngine') }}</el-tag>
      </div>
      <div class="flex items-center gap-2">
        <el-tag size="small" type="success" class="!font-mono">{{ $t('graph.activeNodes') }}</el-tag>
      </div>
    </div>

    <!-- Graph Canvas Area -->
    <div class="flex-1 relative overflow-auto p-4 flex items-center justify-center min-h-[300px]">
      <svg class="w-full h-full min-w-[650px] min-h-[280px]" viewBox="0 0 650 300">
        <!-- Edges -->
        <g class="edges">
          <path
            v-for="(edge, idx) in edges"
            :key="idx"
            :d="`M ${nodes.find(n => n.id === edge.from)?.x! + 140} ${nodes.find(n => n.id === edge.from)?.y! + 25} C ${nodes.find(n => n.id === edge.from)?.x! + 190} ${nodes.find(n => n.id === edge.from)?.y! + 25}, ${nodes.find(n => n.id === edge.to)?.x! - 30} ${nodes.find(n => n.id === edge.to)?.y! + 25}, ${nodes.find(n => n.id === edge.to)?.x!} ${nodes.find(n => n.id === edge.to)?.y! + 25}`"
            stroke="var(--el-border-color)"
            stroke-width="2"
            fill="none"
            stroke-dasharray="4 2"
          />
        </g>

        <!-- Nodes -->
        <g v-for="node in nodes" :key="node.id" class="node group cursor-pointer" @click="handleNodeClick(node.id)">
          <rect
            :x="node.x"
            :y="node.y"
            width="160"
            height="50"
            rx="6"
            :fill="selectedNodeId === node.id ? 'var(--el-bg-color-overlay)' : '#181920'"
            :stroke="selectedNodeId === node.id ? '#ffffff' : 'var(--el-border-color)'"
            :stroke-width="selectedNodeId === node.id ? 2 : 1"
            class="transition-all hover:stroke-white"
          />
          <text :x="node.x + 12" :y="node.y + 24" fill="#e2e8f0" font-size="11" font-weight="600">
            {{ node.nodeTitle.length > 20 ? node.nodeTitle.substring(0, 20) + '...' : node.nodeTitle }}
          </text>
          <text :x="node.x + 12" :y="node.y + 40" fill="#64748b" font-size="9" font-family="monospace">
            STATUS: {{ node.status.toUpperCase() }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.narrative-dag-graph {
  user-select: none;
}
</style>
