<script setup lang="ts">
import { Plus, Minus } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';

interface SectionHeaderProps {
  title: string;
  hasContent: boolean;
}

const props = defineProps<SectionHeaderProps>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'remove'): void;
}>();
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <span class="text-xs font-semibold text-foreground">{{ title }}</span>
    <Button
      variant="ghost"
      size="icon"
      class="size-6 text-muted-foreground"
      @click="hasContent ? emit('remove') : emit('add')"
    >
      <Minus v-if="hasContent" class="size-4" />
      <Plus v-else class="size-4" />
    </Button>
  </div>
</template>
