<script setup lang="ts">
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';

type Alignment = 'left' | 'center' | 'right';

defineProps<{
  value: Alignment;
}>();

const emit = defineEmits<{
  (e: 'change', val: Alignment): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Alignment
    </label>
    <div class="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        class="size-7"
        :class="value === 'left' ? 'bg-primary text-primary-foreground' : ''"
        @click="emit('change', 'left')"
      >
        <AlignLeft class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        class="size-7"
        :class="value === 'center' ? 'bg-primary text-primary-foreground' : ''"
        @click="emit('change', 'center')"
      >
        <AlignCenter class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        class="size-7"
        :class="value === 'right' ? 'bg-primary text-primary-foreground' : ''"
        @click="emit('change', 'right')"
      >
        <AlignRight class="size-4" />
      </Button>
    </div>
  </div>
</template>
