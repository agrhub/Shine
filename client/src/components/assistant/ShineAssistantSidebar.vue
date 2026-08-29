<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '@/stores/chatStore';
import { storeToRefs } from 'pinia';
import ChatContentRenderer from '@/pages/projects/workspace/ChatContentRenderer.vue';
import {
  RefreshRight,
  Close,
  Microphone,
  Position,
  Cpu,
  Loading,
  ChatDotRound
} from '@element-plus/icons-vue';
import { Sparkles } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';

const route = useRoute();
const chatStore = useChatStore();
const { isSidebarOpen, isThinking, messages, currentSuggestions } = storeToRefs(chatStore);

const inputQuery = ref('');
const scrollContainer = ref<HTMLDivElement | null>(null);
const isListening = ref(false);

// Update page context when route changes
watch(
  () => route.path,
  (newPath) => {
    let context = 'dashboard';
    if (newPath.includes('/project/')) context = 'workspace';
    else if (newPath.includes('/assets')) context = 'assets';
    else if (newPath.includes('/analytics')) context = 'analytics';
    else if (newPath.includes('/settings') || newPath.includes('/billing')) context = 'settings';

    const seriesId = (route.params.id as string) || undefined;
    chatStore.setPageContext(context, seriesId);
  },
  { immediate: true }
);

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

watch(
  () => messages.value.length,
  () => {
    scrollToBottom();
  }
);

async function handleSendMessage(textOverride?: string) {
  const query = textOverride || inputQuery.value;
  if (!query.trim() || isThinking.value) return;

  inputQuery.value = '';
  await chatStore.sendMessage(query);
  scrollToBottom();
}

function handleSuggestionClick(text: string) {
  handleSendMessage(text);
}

function handleReset() {
  chatStore.resetConversation();
}

function handleClose() {
  chatStore.closeSidebar();
}

// Optional browser Speech-to-Text integration
function toggleSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    ElMessage.warning('Speech recognition is not supported in this browser.');
    return;
  }

  if (isListening.value) {
    isListening.value = false;
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening.value = true;
      ElMessage.info('Listening for voice input...');
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      inputQuery.value = speechResult;
      isListening.value = false;
    };

    recognition.onerror = (err: any) => {
      console.warn('[SpeechRecognition] Error:', err);
      isListening.value = false;
    };

    recognition.onend = () => {
      isListening.value = false;
    };

    recognition.start();
  } catch (err: any) {
    console.error('Speech recognition failed to start:', err);
    isListening.value = false;
  }
}

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <!-- Dedicated Right Sidebar Container -->
  <aside
    v-show="isSidebarOpen"
    id="shine-dedicated-assistant-sidebar"
    class="w-[340px] md:w-[380px] lg:w-[420px] bg-[#0c1015]/95 backdrop-blur-xl border-l border-[var(--el-border-color)] flex flex-col h-screen shrink-0 z-30 transition-all duration-300 ease-in-out select-none shadow-2xl relative"
  >
    <!-- Header -->
    <div class="h-16 px-5 border-b border-[var(--el-border-color)]/60 flex items-center justify-between bg-[var(--el-bg-color-page)]/40 shrink-0">
      <!-- Title & Gemini Status -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
          <el-icon :size="18"><Cpu /></el-icon>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-[var(--el-text-color-primary)] tracking-tight">Shine Assistant</span>
            <span class="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">v2.0</span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-[11px] font-medium text-emerald-400/90">Gemini Active</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1">
        <button
          @click="handleReset"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)] hover:bg-[var(--el-fill-color-light)] transition-colors cursor-pointer"
          title="Reset Conversation"
        >
          <el-icon :size="15"><RefreshRight /></el-icon>
        </button>
        <button
          @click="handleClose"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)] hover:bg-[var(--el-fill-color-light)] transition-colors cursor-pointer"
          title="Close Assistant"
        >
          <el-icon :size="15"><Close /></el-icon>
        </button>
      </div>
    </div>

    <!-- Messages / Content Scrollable Area -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 select-text">
      <!-- Welcome Hero (shown when starting or reset) -->
      <div v-if="messages.length <= 1" class="py-6 flex flex-col items-center text-center px-2 select-none">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600/30 via-teal-500/20 to-blue-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg ring-4 ring-emerald-500/10">
          <el-icon :size="30"><Sparkles /></el-icon>
        </div>
        <h3 class="text-base font-semibold text-[var(--el-text-color-primary)] mb-1">
          Welcome to Shine Assistant
        </h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] max-w-[280px] leading-relaxed mb-6">
          I can help you analyze storylines, generate character anchors, breakdown scenes, or interact with production tools.
        </p>

        <!-- Contextual Suggestion Pills -->
        <div class="w-full space-y-2 text-left">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-[var(--el-text-color-secondary)] px-1 flex items-center justify-between">
            <span>Contextual Actions</span>
            <span class="text-emerald-400 lowercase font-normal">#{{ chatStore.currentPageContext }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <button
              v-for="(sug, idx) in currentSuggestions"
              :key="idx"
              @click="handleSuggestionClick(sug.text)"
              class="w-full text-left px-3.5 py-2.5 rounded-xl border border-[var(--el-border-color)] bg-[var(--el-bg-color)]/60 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-xs text-[var(--el-text-color-regular)] hover:text-emerald-300 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-between group"
            >
              <span class="truncate mr-2">{{ sug.text }}</span>
              <span v-if="sug.category" class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--el-fill-color-light)] text-[var(--el-text-color-secondary)] group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors shrink-0">
                {{ sug.category }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Messages List -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex flex-col gap-1.5"
        :class="msg.role === 'user' ? 'items-end' : 'items-start'"
      >
        <!-- Role Label -->
        <div class="text-[11px] text-[var(--el-text-color-secondary)] px-1 flex items-center gap-1.5">
          <span v-if="msg.role === 'assistant'" class="font-medium text-emerald-400 flex items-center gap-1">
            <el-icon :size="12"><Cpu /></el-icon> Shine Copilot
          </span>
          <span v-else class="font-medium text-[var(--el-text-color-regular)]">You</span>
        </div>

        <!-- Message Bubble -->
        <div
          class="max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed"
          :class="msg.role === 'user'
            ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
            : 'bg-[var(--el-bg-color)] border border-[var(--el-border-color)] text-[var(--el-text-color-primary)] rounded-tl-sm shadow-soft'"
        >
          <div v-if="msg.role === 'user'" class="whitespace-pre-wrap">{{ msg.content }}</div>
          <ChatContentRenderer v-else :content="msg.content" />
        </div>
      </div>

      <!-- Thinking Indicator -->
      <div v-if="isThinking" class="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 w-fit animate-pulse">
        <el-icon class="animate-spin" :size="14"><Loading /></el-icon>
        <span>Shine AI is processing instructions...</span>
      </div>
    </div>

    <!-- Bottom Input Area -->
    <div class="p-3.5 border-t border-[var(--el-border-color)]/60 bg-[var(--el-bg-color-page)]/70 shrink-0">
      <form @submit.prevent="handleSendMessage()" class="relative flex items-center">
        <!-- Speech Mic Button -->
        <button
          type="button"
          @click="toggleSpeechRecognition"
          class="absolute left-2.5 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          :class="isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-[var(--el-text-color-secondary)] hover:text-emerald-400 hover:bg-[var(--el-fill-color-light)]'"
          title="Voice Dictation"
        >
          <el-icon :size="16"><Microphone /></el-icon>
        </button>

        <!-- Text Input Box -->
        <input
          v-model="inputQuery"
          type="text"
          :placeholder="`Ask about story, generate assets, navigate tabs...`"
          :disabled="isThinking"
          class="w-full h-11 pl-11 pr-11 text-xs bg-[var(--el-bg-color)] border border-[var(--el-border-color)] rounded-xl text-[var(--el-text-color-primary)] placeholder-[var(--el-text-color-secondary)]/70 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        />

        <!-- Send Button -->
        <button
          type="submit"
          :disabled="!inputQuery.trim() || isThinking"
          class="absolute right-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
          :class="inputQuery.trim() && !isThinking
            ? 'bg-emerald-500 text-white shadow hover:bg-emerald-400'
            : 'text-[var(--el-text-color-secondary)]/40 cursor-not-allowed'"
          title="Send Message"
        >
          <el-icon :size="15"><Position /></el-icon>
        </button>
      </form>
    </div>
  </aside>
</template>

<style scoped>
/* Custom styling for sidebar scrollbars */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}
</style>
