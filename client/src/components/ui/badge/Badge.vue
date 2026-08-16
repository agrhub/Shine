<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    class?: string;
  }>(),
  {
    variant: 'default',
    class: '',
  }
);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    case 'outline':
      return 'text-foreground border border-input hover:bg-accent hover:text-accent-foreground';
    case 'destructive':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/80';
    default:
      return 'bg-primary text-primary-foreground hover:bg-primary/80';
  }
});
</script>

<template>
  <div
    :class="[
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      variantClasses,
      props.class,
    ]"
  >
    <slot />
  </div>
</template>
