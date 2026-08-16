<template>
  <div class="multimodal-input-wrapper flex flex-col gap-2 p-3 bg-[var(--el-bg-color-overlay)] border-t border-[var(--el-border-color-lighter)]">
    <!-- Attachment Previews -->
    <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 mb-1">
      <el-tag
        v-for="(file, idx) in attachments"
        :key="idx"
        closable
        size="small"
        type="info"
        @close="removeAttachment(idx)"
      >
        <el-icon class="mr-1"><Document /></el-icon>
        {{ file }}
      </el-tag>
    </div>

    <!-- Drag & Drop Dropzone / Input Area -->
    <div
      class="drag-drop-zone relative rounded-md border border-dashed border-[var(--el-border-color)] p-2 transition-colors flex items-center gap-2"
      :class="{ 'border-primary bg-[var(--el-color-primary-light-9)]': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <el-input
        v-model="text"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }"
        :placeholder="$t('chat.inputPlaceholder')"
        class="flex-1 border-none shadow-none"
        @keydown.enter.prevent="handleSend"
      />

      <div class="flex items-center gap-1">
        <el-tooltip :content="isRecording ? 'Listening...' : 'Voice Input'" placement="top">
          <el-button
            circle
            size="small"
            :type="isRecording ? 'danger' : 'default'"
            @click="toggleVoiceRecord"
          >
            <el-icon><Microphone /></el-icon>
          </el-button>
        </el-tooltip>

        <el-upload
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          accept="image/*,.pdf,.doc,.docx"
        >
          <template #trigger>
            <el-button circle size="small">
              <el-icon><Paperclip /></el-icon>
            </el-button>
          </template>
        </el-upload>

        <el-button
          type="primary"
          circle
          size="small"
          :disabled="!text.trim() && attachments.length === 0"
          @click="handleSend"
        >
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Microphone, Paperclip, Promotion, Document } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const text = ref('');
const attachments = ref<string[]>([]);
const isDragging = ref(false);
const isRecording = ref(false);

const emit = defineEmits<{
  (e: 'send', payload: { content: string; attachments: string[] }): void;
}>();

const handleSend = () => {
  if (!text.value.trim() && attachments.value.length === 0) return;
  emit('send', {
    content: text.value,
    attachments: [...attachments.value],
  });
  text.value = '';
  attachments.value = [];
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer?.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      attachments.value.push(e.dataTransfer.files[i].name);
    }
    ElMessage.success('Attachment added successfully');
  }
};

const handleFileChange = (uploadFile: any) => {
  if (uploadFile?.name) {
    attachments.value.push(uploadFile.name);
    ElMessage.success(`Attached ${uploadFile.name}`);
  }
};

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1);
};

const toggleVoiceRecord = () => {
  isRecording.value = !isRecording.value;
  if (isRecording.value) {
    ElMessage.info('Voice recording started...');
    setTimeout(() => {
      text.value += ' Add a cliffhanger transition at 00:10';
      isRecording.value = false;
      ElMessage.success('Voice transcribed');
    }, 2500);
  }
};
</script>

<style scoped>
.drag-drop-zone {
  background: var(--el-fill-color-blank);
}
</style>
