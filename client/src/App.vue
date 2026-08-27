<script setup lang="ts">
import { onMounted } from 'vue';
import { Toaster } from 'vue-sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { isDark } = storeToRefs(authStore);

onMounted(async () => {
  await authStore.fetchCurrentUser();
});
</script>

<template>
  <el-config-provider namespace="el">
    <RouterView />
    <Toaster position="top-right" rich-colors :theme="isDark ? 'dark' : 'light'"/>
  </el-config-provider>
</template>

<style>
#app {
  color: var(--el-text-color-primary);
}
</style>
