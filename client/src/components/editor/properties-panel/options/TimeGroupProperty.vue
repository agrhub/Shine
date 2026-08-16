<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import { useStudioStore } from '~/composables/useStudioStore';

const trimContent = ref(false);
const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);
const maxDuration = computed(() => (studio.value as any)?.getMaxDuration() || 0);
const durationSec = computed(() => maxDuration.value / 1e6);
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Time</span>
      <Button
        variant="ghost"
        size="icon"
        class="size-5 text-muted-foreground hover:text-foreground"
      >
        <span class="text-base leading-none">+</span>
      </Button>
    </div>

    <div class="py-1 flex flex-col gap-2.5">
      <!-- Length Row -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Length</span>
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium h-7 px-2.5 flex items-center justify-center bg-secondary border text-foreground min-w-[60px] select-none">
            {{ durationSec.toFixed(1) }}s
          </span>
          <div class="h-7 flex items-center border overflow-hidden bg-secondary">
            <button class="h-full px-2.5 text-muted-foreground hover:text-white hover:bg-white/5 text-xs transition-colors border-r cursor-pointer select-none flex items-center justify-center">
              —
            </button>
            <button class="h-full px-2.5 text-muted-foreground hover:text-white hover:bg-white/5 text-xs transition-colors cursor-pointer select-none flex items-center justify-center">
              +
            </button>
          </div>
        </div>
      </div>

      <!-- Trim Content Checkbox -->
      <div class="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id="trim-content"
          v-model="trimContent"
          class="rounded border-white/20 bg-secondary text-primary focus:ring-0 focus:ring-offset-0 size-3.5 cursor-pointer"
        />
        <label
          htmlFor="trim-content"
          class="text-xs text-muted-foreground select-none cursor-pointer"
        >
          Trim content
        </label>
      </div>
    </div>
  </div>
</template>
