<template>
  <div v-if="panelStore.isShortcutsModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs select-none">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <h3 class="text-sm font-semibold">Keyboard Shortcuts</h3>
        <button @click="panelStore.setShortcutsModalOpen(false)" class="text-muted-foreground hover:text-foreground">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-2">
        <div v-for="shortcut in shortcuts" :key="shortcut.key" class="flex justify-between items-center py-1.5 border-b border-border/40">
          <span class="text-muted-foreground">{{ shortcut.description }}</span>
          <kbd class="px-2 py-1 rounded bg-muted border border-border font-mono text-[10px] font-semibold">
            {{ shortcut.key }}
          </kbd>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { usePanelStore } from '@/stores/usePanelStore';

const panelStore = usePanelStore();

const shortcuts = [
  { key: 'Space', description: 'Play / Pause Video' },
  { key: 'Delete / Backspace', description: 'Delete Selected Clip' },
  { key: 'Ctrl + Z', description: 'Undo Action' },
  { key: 'Ctrl + Y', description: 'Redo Action' },
  { key: 'Shift + ?', description: 'Show Shortcuts Modal' },
];
</script>
