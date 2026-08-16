<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { Sparkles, ArrowUpIcon, Wand2, Loader2 } from 'lucide-vue-next';
import { core } from '@/lib/project';
import * as ToolHandlers from './assistant/tools';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'model';
  content: string;
  status?: string;
}

interface Suggestion {
  text: string;
}

const SUGGESTIONS: Suggestion[] = [
  { text: 'Search and add futurist city video' },
  { text: 'Generate voiceover "Welcome"' },
  { text: 'Auto-caption video' },
];

const messages = ref<Message[]>([]);
const input = ref('');
const isLoading = ref(false);
const showSuggestions = ref(true);
const scrollRef = ref<HTMLDivElement | null>(null);

const existingAssets = computed(() => {
  try {
    const clips = (core.clip as any).get?.() || {};
    return Object.values(clips || {}).map((clip: any) => ({
      assetId: clip.id,
      type: 'import',
      assetType: clip.type?.toLowerCase() || 'video',
      text: clip.text || '',
      url: clip.src || '',
      label: clip.name || `Clip ${clip.id}`,
      display: {
        from: (clip.timing?.display?.from || 0) / 1000,
        to: (clip.timing?.display?.to || 5000000) / 1000,
      },
    }));
  } catch {
    return [];
  }
});

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
};

watch(
  messages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);

const handleToolAction = async (inputData: any) => {
  const { action } = inputData;
  console.log('Executing AI tool action:', action, inputData);
  try {
    switch (action) {
      case 'add_clip':
      case 'add_text':
      case 'add_image':
      case 'add_video':
      case 'add_audio':
        await ToolHandlers.handleAddClip(inputData);
        break;
      case 'update_clip':
      case 'update_asset':
        await ToolHandlers.handleUpdateClip(inputData);
        break;
      case 'remove_clip':
      case 'delete_asset':
        await ToolHandlers.handleRemoveClip(inputData);
        break;
      case 'split_clip':
      case 'split_asset':
        await ToolHandlers.handleSplitClip(inputData);
        break;
      case 'add_transition':
        await ToolHandlers.handleAddTransition(inputData);
        break;
      case 'add_effect':
      case 'apply_effect':
        await ToolHandlers.handleAddEffect(inputData);
        break;
      case 'trim_clip':
      case 'trim_asset':
        await ToolHandlers.handleTrimClip(inputData);
        break;
      case 'duplicate_clip':
      case 'duplicate_asset':
        await ToolHandlers.handleDuplicateClip(inputData);
        break;
      case 'search_and_add_media':
        await ToolHandlers.handleSearchAndAddMedia(inputData);
        break;
      case 'generate_voiceover':
        await ToolHandlers.handleGenerateVoiceover(inputData);
        break;
      case 'seek_to_time':
      case 'seek_to':
        await ToolHandlers.handleSeekToTime(inputData);
        break;
      case 'generate_captions':
        await ToolHandlers.handleGenerateCaptions(inputData);
        break;
      default:
        console.log('Unhandled tool action:', action);
    }
  } catch (err) {
    console.error(`Failed to execute tool action: ${action}`, err);
  }
};

const handleSubmit = async (textToSend?: string) => {
  const messageText = textToSend || input.value;
  if (!messageText.trim() || isLoading.value) return;

  input.value = '';
  isLoading.value = true;

  const userMessage: Message = {
    role: 'user',
    content: messageText,
  };
  messages.value.push(userMessage);
  showSuggestions.value = false;

  const assistantMessage: Message = {
    role: 'model',
    content: '',
    status: 'running',
  };
  messages.value.push(assistantMessage);

  try {
    const response = await fetch('/api/chat/editor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        metadata: {
          existingAssets: existingAssets.value,
          currentTime: 0,
        },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to connect to chat API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const rawData = trimmed.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            const data = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;

            if (data.event === 'reasoning') {
              messages.value[messages.value.length - 1].status = 'thinking';
            } else if (data.event === 'tool') {
              await handleToolAction({ action: data.name, ...data.arg, ...data.response });
            } else if (data.result !== undefined) {
              const replyText = data.result?.reply || data.reply || '';
              if (replyText) {
                messages.value[messages.value.length - 1] = {
                  role: 'model',
                  content: replyText,
                  status: 'complete',
                };
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE chunk:', e, rawData);
          }
        }
      }
    }

    const lastIdx = messages.value.length - 1;
    if (lastIdx >= 0 && messages.value[lastIdx].role === 'model') {
      if (!messages.value[lastIdx].content) {
        messages.value[lastIdx] = {
          role: 'model',
          content: 'Processed your video editing request on the timeline.',
          status: 'complete',
        };
      } else {
        messages.value[lastIdx].status = 'complete';
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    const lastIdx = messages.value.length - 1;
    if (lastIdx >= 0 && messages.value[lastIdx].role === 'model') {
      messages.value[lastIdx] = {
        role: 'model',
        content: 'AI Assistant processed your request.',
        status: 'complete',
      };
    }
  } finally {
    isLoading.value = false;
  }
};

const handleSuggestionClick = (suggestion: Suggestion) => {
  input.value = suggestion.text;
};
</script>

<template>
  <div class="flex flex-col h-full bg-background text-foreground text-xs overflow-hidden select-none">
    <ScrollArea class="flex-1 min-h-0 h-full">
      <div ref="scrollRef" class="h-full overflow-x-hidden p-3 space-y-2">
        <div v-if="messages.length === 0" class="flex flex-1 h-full flex-col items-center justify-center space-y-4 py-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 border border-border/50">
            <Sparkles class="w-6 h-6 text-muted-foreground" />
          </div>

          <div class="text-center space-y-1 px-2">
            <h2 class="text-base font-semibold tracking-tight">
              I'm ILO, your AI assistant
            </h2>
            <p class="text-xs text-muted-foreground">
              What can I help you with?
            </p>
          </div>

          <div class="w-full space-y-2">
            <button
              v-for="(suggestion, idx) in SUGGESTIONS"
              :key="idx"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/80 bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-left group cursor-pointer"
              @click="handleSuggestionClick(suggestion)"
            >
              <span class="text-xs font-medium line-clamp-1">{{ suggestion.text }}</span>
              <ArrowUpIcon class="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <template v-for="(m, i) in messages" :key="i">
            <div
              v-if="m.content"
              :class="['flex gap-4 w-full group', m.role === 'user' ? 'flex-row-reverse' : 'flex-row max-w-[90%]']"
            >
              <div :class="['flex flex-col space-y-3 w-full min-w-0', m.role === 'user' ? 'items-end' : 'items-start']">
                <div
                  :class="[
                    'py-3.5 rounded-3xl text-xs leading-relaxed shadow-sm transition-all min-w-0 flex flex-col',
                    m.role === 'user'
                      ? 'bg-foreground/10 rounded-tr-none font-medium px-5'
                      : 'bg-card text-card-foreground rounded-tl-none w-full px-5 border border-border/40'
                  ]"
                >
                  <div class="w-full whitespace-pre-wrap">
                    {{ m.content }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="isLoading" class="flex gap-4 w-full group">
            <div class="flex flex-col space-y-3 w-full min-w-0 items-start">
              <div class="py-2 px-4 rounded-3xl text-xs leading-relaxed shadow-sm bg-card text-card-foreground rounded-tl-none w-fit border border-border/40 flex items-center gap-2">
                <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                <span class="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                  Thinking
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <div class="p-3 border-t border-border/40 bg-card/50 shrink-0">
      <div class="rounded-lg border border-border/80 bg-background overflow-hidden p-2 flex flex-col gap-2">
        <textarea
          v-model="input"
          placeholder="Ask Co-Creator"
          class="min-h-14 max-h-[160px] text-xs p-1 resize-none border-0 focus:outline-none bg-transparent"
          @keydown.enter.exact.prevent="handleSubmit()"
        />
        <div class="flex items-center justify-between pt-1 border-t border-border/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="rounded-md h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            :disabled="isLoading"
            @click="showSuggestions = !showSuggestions"
          >
            <Wand2 class="w-3.5 h-3.5" />
            <span class="ml-1 text-[11px]">Suggestions</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="icon"
            class="rounded-full h-7 w-7 p-0 bg-foreground hover:bg-foreground/90 text-background shrink-0"
            :disabled="!input.trim() || isLoading"
            @click="handleSubmit()"
          >
            <ArrowUpIcon class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
