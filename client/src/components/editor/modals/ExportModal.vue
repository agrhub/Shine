<template>
  <div v-if="panelStore.isExportModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5 text-xs select-none">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <h3 class="text-sm font-semibold">Export Video</h3>
        <button @click="panelStore.setExportModalOpen(false)" class="text-muted-foreground hover:text-foreground">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Export settings -->
      <div class="space-y-4">
        <div>
          <label class="text-muted-foreground mb-1 block">Resolution</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="res in ['720p', '1080p', '4K']"
              :key="res"
              @click="resolution = res"
              class="py-2 rounded border border-border text-center font-medium"
              :class="resolution === res ? 'bg-primary text-primary-foreground' : 'bg-muted/30 hover:bg-muted'"
            >
              {{ res }}
            </button>
          </div>
        </div>

        <div>
          <label class="text-muted-foreground mb-1 block">Format</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="fmt in ['MP4', 'WebM']"
              :key="fmt"
              @click="format = fmt"
              class="py-2 rounded border border-border text-center font-medium"
              :class="format === fmt ? 'bg-primary text-primary-foreground' : 'bg-muted/30 hover:bg-muted'"
            >
              {{ fmt }}
            </button>
          </div>
        </div>

        <div v-if="isExporting" class="space-y-2 pt-2">
          <div class="flex justify-between font-medium">
            <span>Rendering Video...</span>
            <span>{{ Math.round(progress) }}%</span>
          </div>
          <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${progress}%` }" />
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          @click="panelStore.setExportModalOpen(false)"
          class="px-4 py-2 rounded-md border border-border hover:bg-accent font-medium"
        >
          Cancel
        </button>
        <button
          @click="startExport"
          :disabled="isExporting"
          class="px-5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Download class="w-3.5 h-3.5" />
          {{ isExporting ? 'Exporting...' : 'Start Export' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { X, Download } from 'lucide-vue-next';
import { usePanelStore } from '@/stores/usePanelStore';

const panelStore = usePanelStore();
const resolution = ref('1080p');
const format = ref('MP4');
const isExporting = ref(false);
const progress = ref(0);

function startExport() {
  isExporting.value = true;
  progress.value = 0;

  const interval = setInterval(() => {
    progress.value += 10;
    if (progress.value >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        isExporting.value = false;
        panelStore.setExportModalOpen(false);
      }, 500);
    }
  }, 300);
}
</script>
