<script setup lang="ts">
import Textarea from '@/components/ui/textarea/Textarea.vue';

defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: 'change', val: string): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Content
    </label>
    <Textarea
      :model-value="value"
      @update:model-value="emit('change', String($event))"
      class="resize-none text-sm min-h-[80px] bg-background border border-input focus-visible:ring-1 focus-visible:ring-ring"
      placeholder="Enter text..."
    />
  </div>
</template>
