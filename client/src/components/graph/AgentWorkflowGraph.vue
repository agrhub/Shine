<script setup lang="ts">
import { ref } from 'vue';

const agents = ref([
  { id: 'a1', nameKey: 'DirectorAgent', step: '01', status: 'completed', latency: '120ms' },
  { id: 'a2', nameKey: 'StorySkeletonAgent', step: '02', status: 'completed', latency: '450ms' },
  { id: 'a3', nameKey: 'ScriptAgent', step: '03', status: 'active', latency: '890ms' },
  { id: 'a4', nameKey: 'SupervisionAgent', step: '04', status: 'pending', latency: '-' },
]);

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'active':
      return 'primary';
    case 'pending':
      return 'info';
    default:
      return 'info';
  }
};
</script>

<template>
  <div class="agent-workflow-graph relative w-full h-full bg-surface border border-[var(--el-border-color-light)] rounded-lg overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="p-3 border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color-overlay)] flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[var(--el-text-color-primary)]">🤖 {{ $t('graph.agentTitle') }}</span>
        <el-tag size="small" type="primary" class="!font-mono text-[10px]">{{ $t('graph.pipelineDag') }}</el-tag>
      </div>
      <el-tag size="small" type="success" class="!font-mono">{{ $t('graph.pipelineStatus') }}</el-tag>
    </div>

    <!-- Agent Step Flow -->
    <div class="flex-1 p-4 flex flex-col justify-center gap-3">
      <div v-for="agent in agents" :key="agent.id" class="agent-node flex items-center gap-3 bg-[var(--el-bg-color-overlay)] p-2.5 rounded-md border border-[var(--el-border-color-light)]">
        <div class="w-7 h-7 rounded-full bg-surface-container border border-[var(--el-border-color)] flex items-center justify-center font-mono text-xs font-bold text-primary">
          {{ agent.step }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">{{ agent.nameKey }}</span>
            <el-tag size="small" :type="getStatusBadge(agent.status)" class="!font-mono text-[10px]">
              {{ agent.status.toUpperCase() }}
            </el-tag>
          </div>
          <p class="text-[10px] text-[var(--el-text-color-secondary)] font-mono mt-0.5">{{ $t('graph.latency') }} {{ agent.latency }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-workflow-graph {
  user-select: none;
}
</style>
