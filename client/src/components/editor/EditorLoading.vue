<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
</script>

<template>
  <div class="h-screen w-screen bg-background flex items-center justify-center flex-col gap-4">
    <Loader2 class="w-12 h-12 animate-spin text-primary" />
    <div class="text-muted-foreground text-sm">{{ $t('editor.initializing') }}</div>
  </div>
</template>
