<template>
  <div class="suggestion-chips-container py-2 overflow-x-auto whitespace-nowrap">
    <div class="flex items-center gap-2">
      <span class="text-xs text-[var(--el-text-color-secondary)] font-medium flex items-center gap-1">
        <el-icon><Opportunity /></el-icon>
        {{ $t('chat.suggestionsTitle') }}
      </span>
      <el-button
        v-for="(suggestion, index) in suggestions"
        :key="index"
        size="small"
        round
        plain
        type="primary"
        class="chip-button"
        @click="$emit('select', suggestion)"
      >
        {{ suggestion }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Opportunity } from '@element-plus/icons-vue';

defineProps<{
  suggestions: string[];
}>();

defineEmits<{
  (e: 'select', text: string): void;
}>();
</script>

<style scoped>
.suggestion-chips-container::-webkit-scrollbar {
  height: 4px;
}
.suggestion-chips-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}
.chip-button {
  transition: all 0.2s ease;
}
</style>
