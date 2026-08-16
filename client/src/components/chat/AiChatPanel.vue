<template>
  <div class="ai-chat-panel flex flex-col h-full bg-[var(--el-bg-color)] border-l border-[var(--el-border-color-lighter)] shadow-lg w-80 min-w-[320px]">
    <!-- Header -->
    <div class="p-3 border-b border-[var(--el-border-color-lighter)] flex items-center justify-between bg-[var(--el-bg-color-overlay)]">
      <div class="flex items-center gap-2">
        <el-icon class="text-primary text-lg"><Cpu /></el-icon>
        <span class="font-bold text-sm text-[var(--el-text-color-primary)]">{{ $t('chat.title') }}</span>
      </div>

      <div class="flex items-center gap-2">
        <el-tooltip :content="'Budget: $' + chatStore.costGuardrails.currentSpendUsd + ' / $' + chatStore.costGuardrails.maxBudgetUsd" placement="left">
          <el-tag size="small" type="success" effect="plain" class="font-mono">
            ${{ chatStore.costGuardrails.currentSpendUsd }} / ${{ chatStore.costGuardrails.maxBudgetUsd }}
          </el-tag>
        </el-tooltip>
        <el-button circle size="small" text @click="$emit('close')">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- Message History -->
    <div class="flex-1 overflow-hidden p-3 bg-[var(--el-fill-color-blank)]">
      <el-scrollbar ref="scrollbarRef" class="h-full pr-1">
        <div class="flex flex-col gap-3">
          <div
            v-for="msg in chatStore.messages"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-1 text-[10px] text-[var(--el-text-color-secondary)] mb-1">
              <span>{{ msg.role === 'user' ? $t('chat.userRole') : $t('chat.aiRole') }}</span>
              <span>•</span>
              <span>{{ formatTime(msg.timestamp) }}</span>
            </div>

            <el-card
              shadow="never"
              body-style="padding: 10px 14px;"
              class="max-w-[90%] border-none shadow-xs rounded-xl"
              :class="msg.role === 'user' ? 'bg-[var(--el-color-primary-light-9)] text-[var(--el-text-color-primary)]' : 'bg-[var(--el-bg-color-overlay)] border border-[var(--el-border-color-lighter)]'"
            >
              <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>

              <!-- Attachments if any -->
              <div v-if="msg.attachments && msg.attachments.length > 0" class="mt-2 pt-2 border-t border-[var(--el-border-color-lighter)] flex flex-wrap gap-1">
                <el-tag v-for="(att, i) in msg.attachments" :key="i" size="small" type="info">
                  {{ att }}
                </el-tag>
              </div>

              <!-- Executed commands summary -->
              <div v-if="msg.commands && msg.commands.length > 0" class="mt-2 pt-2 border-t border-[var(--el-border-color-lighter)]">
                <el-tag size="small" type="success" effect="dark" class="flex items-center gap-1">
                  <el-icon><Check /></el-icon>
                  {{ $t('chat.executedCommands', { count: msg.commands.length }) }}
                </el-tag>
              </div>
            </el-card>
          </div>

          <!-- Thinking state -->
          <div v-if="chatStore.isThinking" class="flex flex-col items-start">
            <div class="text-[10px] text-[var(--el-text-color-secondary)] mb-1">{{ $t('chat.aiRole') }}</div>
            <el-card shadow="never" body-style="padding: 8px 12px;" class="bg-[var(--el-bg-color-overlay)] border-none">
              <div class="flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>{{ $t('chat.thinkingState') }}</span>
              </div>
            </el-card>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- Suggestion Chips -->
    <div class="px-3 border-t border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color-overlay)]">
      <SuggestionChips :suggestions="chatStore.suggestions" @select="handleSuggestionSelect" />
    </div>

    <!-- Multimodal Input -->
    <MultimodalInput @send="handleSendMessage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { Cpu, Close, Check, Loading } from '@element-plus/icons-vue';
import { useChatStore } from '@/stores/chatStore';
import SuggestionChips from './SuggestionChips.vue';
import MultimodalInput from './MultimodalInput.vue';

defineEmits<{
  (e: 'close'): void;
}>();

const chatStore = useChatStore();
const scrollbarRef = ref();

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = async () => {
  await nextTick();
  if (scrollbarRef.value) {
    scrollbarRef.value.setScrollTop(999999);
  }
};

const handleSendMessage = async (payload: { content: string; attachments: string[] }) => {
  await chatStore.sendMessage(payload.content, payload.attachments);
  scrollToBottom();
};

const handleSuggestionSelect = (text: string) => {
  handleSendMessage({ content: text, attachments: [] });
};

onMounted(() => {
  chatStore.fetchCostGuardrails();
  chatStore.fetchSuggestions();
  scrollToBottom();
});
</script>

<style scoped>
.ai-chat-panel {
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.05);
}
</style>
