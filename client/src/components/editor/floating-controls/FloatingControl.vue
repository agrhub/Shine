<script setup lang="ts">
import { ref } from 'vue';

const floatingControl = ref<string | null>(null);
</script>

<template>
  <div v-if="floatingControl" class="absolute z-50">
    <!-- Floating control popups -->
  </div>
</template>
