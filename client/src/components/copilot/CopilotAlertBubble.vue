<template>
  <div class="copilot-alerts-overlay absolute inset-0 pointer-events-none z-30 overflow-hidden">
    <div
      v-for="alert in alerts"
      :key="alert.id"
      class="copilot-bubble pointer-events-auto absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2"
      :style="{ left: alert.canvasPosition.x + 'px', top: alert.canvasPosition.y + 'px' }"
    >
      <el-alert
        :title="$t('copilot.alertTitle')"
        :type="alert.severity === 'warning' ? 'warning' : 'info'"
        show-icon
        class="border border-[var(--el-border-color)] shadow-md rounded-lg max-w-xs"
        @close="dismissAlert(alert.id)"
      >
        <template #default>
          <div class="flex flex-col gap-1 mt-1">
            <span class="text-xs font-medium">{{ $t(alert.message) }}</span>
            <div v-if="alert.suggestedAction" class="flex items-center gap-2 mt-1">
              <el-button
                size="small"
                type="warning"
                plain
                circle
                :icon="MagicStick"
                @click="applyFix(alert)"
              />
              <span class="text-[10px] text-[var(--el-text-color-secondary)]">{{ alert.suggestedAction }}</span>
            </div>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MagicStick } from '@element-plus/icons-vue';
import type { CopilotAlert } from '@/types/api';
import http from '@/utils/http';
import { useChatStore } from '@/stores/chatStore';

const alerts = ref<CopilotAlert[]>([
  {
    id: 'cp-001',
    severity: 'warning',
    message: 'copilot.clipTooShort',
    canvasPosition: { x: 140, y: 70 },
    code: 'CLIP_TOO_SHORT',
    suggestedAction: 'Extend clip duration',
  },
]);

const chatStore = useChatStore();

const dismissAlert = (id: string) => {
  alerts.value = alerts.value.filter((a) => a.id !== id);
};

const applyFix = (alert: CopilotAlert) => {
  chatStore.sendMessage(`Fix timeline issue: ${alert.suggestedAction || alert.code}`);
  dismissAlert(alert.id);
};

onMounted(async () => {
  try {
    const res = (await http.post('/ai/copilot/analyze', { timelineState: {} })) as any;
    if (res.data?.data?.alerts) {
      alerts.value = res.data.data.alerts;
    }
  } catch (e) {
    // Keep initial alert
  }
});
</script>

<style scoped>
.copilot-bubble {
  animation: copilot-pulse 3s infinite ease-in-out;
}
@keyframes copilot-pulse {
  0%, 100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
}
</style>
