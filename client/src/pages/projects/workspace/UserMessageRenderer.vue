<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Document, ArrowDown, ArrowUp } from '@element-plus/icons-vue';

const props = defineProps<{
  content: string;
}>();

const { t } = useI18n();
const isExpanded = ref(false);

interface ParsedUserMessage {
  instructionText: string;
  hasJsonPayload: boolean;
  formattedJson: string | null;
  isLongText: boolean;
  shortSnippet: string;
}

const parsed = computed<ParsedUserMessage>(() => {
  const raw = (props.content || '').trim();

  // Pattern 1: Wizard instruction wrapper: Refine the current master plan with user instruction: "..." ... Current plan: {...}
  const wizardPromptMatch = raw.match(/user instruction:\s*"([^"]+)"[\s\S]*?(?:Current plan:\s*(\{[\s\S]*\}))/i);
  if (wizardPromptMatch) {
    const instructionText = wizardPromptMatch[1].trim();
    let formattedJson = wizardPromptMatch[2].trim();
    try {
      const parsedObj = JSON.parse(formattedJson);
      formattedJson = JSON.stringify(parsedObj, null, 2);
    } catch {}

    return {
      instructionText,
      hasJsonPayload: true,
      formattedJson,
      isLongText: false,
      shortSnippet: instructionText,
    };
  }

  // Pattern 2: Generic text with embedded JSON block
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[0].length > 50) {
    let textWithoutJson = raw.replace(jsonMatch[0], '').trim();
    let formattedJson = jsonMatch[0].trim();
    try {
      const parsedObj = JSON.parse(formattedJson);
      formattedJson = JSON.stringify(parsedObj, null, 2);
    } catch {}

    const instructionText = textWithoutJson || raw.slice(0, 80) + '...';

    return {
      instructionText,
      hasJsonPayload: true,
      formattedJson,
      isLongText: instructionText.length > 250,
      shortSnippet: instructionText.slice(0, 200),
    };
  }

  // Pattern 3: Regular text (check if long for collapsible preview)
  const isLong = raw.length > 280;
  return {
    instructionText: raw,
    hasJsonPayload: false,
    formattedJson: null,
    isLongText: isLong,
    shortSnippet: isLong ? raw.slice(0, 220) + '...' : raw,
  };
});
</script>

<template>
  <div class="user-message-renderer flex flex-col gap-1.5">
    <!-- Main User Instruction Text -->
    <div class="font-medium whitespace-pre-wrap leading-relaxed">
      <span>{{ isExpanded || !parsed.isLongText ? parsed.instructionText : parsed.shortSnippet }}</span>
      <button
        v-if="parsed.isLongText"
        type="button"
        @click="isExpanded = !isExpanded"
        class="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-bold text-sky-200 hover:text-white underline"
      >
        <span>{{ isExpanded ? t('common.showLess', 'Show less') : t('common.showMore', 'Show more') }}</span>
        <el-icon :size="10"><component :is="isExpanded ? ArrowUp : ArrowDown" /></el-icon>
      </button>
    </div>

    <!-- Collapsible Attached JSON Data Payload -->
    <details
      v-if="parsed.hasJsonPayload && parsed.formattedJson"
      class="w-full mt-1.5 group select-none text-[11px]"
    >
      <summary class="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer bg-black/20 hover:bg-black/30 border border-white/10 list-none transition-all">
        <div class="flex items-center gap-1.5 font-bold text-white/90">
          <el-icon :size="12"><Document /></el-icon>
          <span>{{ t('chatbot.attachedDataPayload', 'Attached Plan Data (JSON)') }}</span>
        </div>
        <div class="flex items-center gap-1 text-[10px] text-white/70">
          <span class="group-open:hidden">▼ {{ t('common.show', 'Show') }}</span>
          <span class="hidden group-open:inline">▲ {{ t('common.hide', 'Hide') }}</span>
        </div>
      </summary>

      <div class="mt-1 p-2 rounded-lg bg-black/40 border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
        <pre class="text-[10px] font-mono text-emerald-300 leading-tight whitespace-pre-wrap break-all">{{ parsed.formattedJson }}</pre>
      </div>
    </details>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
</style>
