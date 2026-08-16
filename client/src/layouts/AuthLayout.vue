<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';
import { EditPen, Operation } from '@element-plus/icons-vue';

const { t } = useI18n();
</script>

<template>
  <div id="auth-layout" class="min-h-screen flex bg-[#fcf9f8] dark:bg-surface text-[#1c1b1b] dark:text-[#f3f0ef] font-['Outfit',sans-serif]">
    <!-- Left Column: Unified Light Mint Brand Panel (Image 2 Design) -->
    <div class="hidden lg:flex flex-col justify-between w-1/2 p-8 md:p-12 bg-[#f6f3f2] dark:bg-surface-container border-r border-[#bbcabe]/30 relative overflow-hidden">
      <!-- Decorative Glow -->
      <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/4 pointer-events-none"></div>

      <!-- Top Logo & Lang Switcher -->
      <div class="relative z-10 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2.5">
          <img src="/logo.png" alt="Shine Logo" class="h-9 w-auto object-contain" />
          <span class="text-3xl font-black tracking-tighter text-[#1c1b1b] dark:text-white">Shine</span>
        </router-link>
        <LanguageSelect />
      </div>

      <!-- Value Proposition Hero -->
      <div class="relative z-10 max-w-lg my-auto">
        <h1 class="text-4xl md:text-5xl font-extrabold text-[#1c1b1b] dark:text-white mb-4 leading-tight">
          Start shipping vertical drama in minutes
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-300 mb-10">
          Join 10,000+ creators using AI to automate the boring parts of storytelling.
        </p>

        <!-- Feature Bullets -->
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-on-primary-container dark:text-primary">
              <el-icon :size="20"><EditPen /></el-icon>
            </div>
            <div>
              <h3 class="text-base font-semibold text-[#1c1b1b] dark:text-white mb-0.5">AI Scene Synthesis</h3>
              <p class="text-sm text-gray-500 dark:text-on-surface-variant">Go from script beat to assembly instantly.</p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-on-primary-container dark:text-primary">
              <el-icon :size="20"><Operation /></el-icon>
            </div>
            <div>
              <h3 class="text-base font-semibold text-[#1c1b1b] dark:text-white mb-0.5">Professional Timeline</h3>
              <p class="text-sm text-gray-500 dark:text-on-surface-variant">Built specifically for 9:16 mobile storytelling.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="relative z-10 text-xs text-gray-500 dark:text-on-surface-variant">
        © 2024 Shine Intelligence. Enterprise Video AI.
      </div>
    </div>

    <!-- Right Column: Form Container (<router-view />) -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
      <div class="w-full max-w-md">
        <!-- Mobile Logo -->
        <div class="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-[#bbcabe]/30">
          <router-link to="/" class="flex items-center gap-2">
            <span class="text-2xl font-black tracking-tighter text-[#1c1b1b] dark:text-white">Shine</span>
          </router-link>
          <LanguageSelect />
        </div>

        <router-view />
      </div>
    </div>
  </div>
</template>
