<script setup lang="ts">
import { ref, watch } from 'vue';
import Input from '@/components/ui/input/Input.vue';
import { useProjectStore } from '@/stores/useProjectStore';
import { toast } from 'vue-sonner';

const projectStore = useProjectStore();
const title = ref(projectStore.projectName || 'Untitled video');

watch(() => projectStore.projectName, (newVal) => {
  title.value = newVal;
});

function handleTitleChange(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  title.value = val;
  projectStore.setProjectName(val);
}

function handleCopyLink() {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Project link copied!');
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 pb-2">
    <!-- Top Header: Share Button -->
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <!-- Split Share Button -->
        <div class="flex items-center bg-white text-black hover:bg-white/90 h-7 border border-white/20 select-none overflow-hidden shrink-0">
          <button
            @click="handleCopyLink"
            class="px-3 h-full text-xs font-semibold hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-center"
          >
            Share
          </button>
        </div>
      </div>
    </div>

    <!-- Project Name & History Row -->
    <div class="flex items-center gap-2">
      <Input
        :model-value="title"
        @input="handleTitleChange"
        class="flex-1 h-7 text-xs bg-secondary border"
        placeholder="Untitled video"
      />
    </div>
  </div>
</template>
