<script setup lang="ts">
import { IconFlipHorizontal, IconFlipVertical } from '@tabler/icons-vue';
import Toggle from '@/components/ui/toggle/Toggle.vue';
import Button from '@/components/ui/button/Button.vue';

export interface FlipValues {
  x: boolean;
  y: boolean;
}

const props = defineProps<{
  value: FlipValues;
}>();

const emit = defineEmits<{
  (e: 'change', val: FlipValues): void;
}>();
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Flip</span>
      <Button
        variant="ghost"
        size="icon"
        class="size-5 text-muted-foreground hover:text-foreground"
      >
        <span class="text-base leading-none">+</span>
      </Button>
    </div>

    <div class="py-1 flex flex-col">
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Flip</span>
        <div class="flex items-center gap-2 w-[160px]">
          <Toggle
            :pressed="value.x"
            @update:pressed="emit('change', { ...value, x: $event })"
            variant="outline"
            size="sm"
            class="flex-1 h-7 text-xs bg-secondary border"
          >
            <IconFlipHorizontal class="size-3.5 mr-1" />
            <span>X</span>
          </Toggle>
          <Toggle
            :pressed="value.y"
            @update:pressed="emit('change', { ...value, y: $event })"
            variant="outline"
            size="sm"
            class="flex-1 h-7 text-xs bg-secondary border"
          >
            <IconFlipVertical class="size-3.5 mr-1" />
            <span>Y</span>
          </Toggle>
        </div>
      </div>
    </div>
  </div>
</template>
