<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';
import { EditPen, Operation, Moon, Sunny } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const authStore = useAuthStore();
const { isDark } = storeToRefs(authStore);

function toggleDarkMode() {
  authStore.updatePreferences({ theme: isDark.value ? 'dark' : 'light' });
}
</script>

<template>
  <div id="auth-layout" class="min-h-screen flex bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)] font-['Outfit',sans-serif]">
    <!-- Left Column: Unified Brand Panel -->
    <div class="hidden lg:flex flex-col justify-between w-1/2 p-8 md:p-12 bg-[var(--el-bg-color)] border-r border-[var(--el-border-color)] relative overflow-hidden">
      <!-- Decorative Glow -->
      <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/4 pointer-events-none"></div>

      <!-- Top Logo & Controls -->
      <div class="relative z-10 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2.5">
          <img src="/logo.png" alt="Shine Logo" class="h-9 w-auto object-contain" />
          <span class="text-3xl font-black tracking-tighter text-[var(--el-text-color-primary)]">Shine</span>
        </router-link>
        <div class="flex items-center gap-3">
          <el-switch
            v-model="isDark"
            :active-icon="Moon"
            :inactive-icon="Sunny"
            inline-prompt
            @change="toggleDarkMode"
          />
          <LanguageSelect />
        </div>
      </div>

      <!-- Value Proposition Hero -->
      <div class="relative z-10 max-w-lg my-auto">
        <h1 class="text-4xl md:text-5xl font-extrabold text-[var(--el-text-color-primary)] mb-4 leading-tight">
          {{ t('auth.heroTitle') }}
        </h1>
        <p class="text-base text-[var(--el-text-color-regular)] mb-10">
          {{ t('auth.heroSubtitle') }}
        </p>

        <!-- Feature Bullets -->
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              <el-icon :size="20"><EditPen /></el-icon>
            </div>
            <div>
              <h3 class="text-base font-semibold text-[var(--el-text-color-primary)] mb-0.5">{{ t('auth.feat1Title') }}</h3>
              <p class="text-sm text-[var(--el-text-color-secondary)]">{{ t('auth.feat1Desc') }}</p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              <el-icon :size="20"><Operation /></el-icon>
            </div>
            <div>
              <h3 class="text-base font-semibold text-[var(--el-text-color-primary)] mb-0.5">{{ t('auth.feat2Title') }}</h3>
              <p class="text-sm text-[var(--el-text-color-secondary)]">{{ t('auth.feat2Desc') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="relative z-10 text-xs text-[var(--el-text-color-secondary)]">
        {{ t('auth.copyright') }}
      </div>
    </div>

    <!-- Right Column: Form Container (<router-view />) -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto bg-[var(--el-bg-color-page)]">
      <div class="w-full max-w-md">
        <!-- Mobile Logo & Controls -->
        <div class="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-[var(--el-border-color)]">
          <router-link to="/" class="flex items-center gap-2">
            <span class="text-2xl font-black tracking-tighter text-[var(--el-text-color-primary)]">Shine</span>
          </router-link>
          <div class="flex items-center gap-3">
            <el-switch
              v-model="isDark"
              :active-icon="Moon"
              :inactive-icon="Sunny"
              inline-prompt
              @change="toggleDarkMode"
            />
            <LanguageSelect />
          </div>
        </div>

        <router-view />
      </div>
    </div>
  </div>
</template>
