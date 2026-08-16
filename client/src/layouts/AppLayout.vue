<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';
import SeriesWizardModal from '@/components/modals/SeriesWizardModal.vue';
import { Sunny, Moon, User, Lock, SwitchButton } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isDark } = storeToRefs(authStore);

const isWizardOpen = ref(false);
const searchQuery = ref('');

function toggleTheme() {
  authStore.toggleDark();
  authStore.updatePreferences({ theme: isDark.value ? 'dark' : 'light' });
}

function goToProfile() {
  router.push('/billing');
}

function goToChangePassword() {
  router.push('/auth/forgot-password');
}

function handleLogout() {
  authStore.logout();
  router.push('/auth/login');
}

const navItems = computed(() => [
  { label: t('nav.series') || 'Projects', icon: 'fa-solid fa-layer-group', href: '/dashboard' },
  { label: t('editor.assetLibrary') || 'Assets', icon: 'fa-solid fa-cube', href: '/assets' },
  { label: t('nav.analytics') || 'Analytics', icon: 'fa-solid fa-chart-line', href: '/analytics' },
  { label: t('settings.title') || 'Settings', icon: 'fa-solid fa-gear', href: '/settings' },
]);

function isNavActive(itemHref: string) {
  if (itemHref === '/dashboard') {
    return route.path === '/dashboard' || route.path.startsWith('/projects');
  }
  return route.path.startsWith(itemHref);
}

function handleWizardCreated(id: string) {
  router.push(`/projects/${id}`);
}
</script>

<template>
  <div id="app-layout" class="bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)] font-sans antialiased min-h-screen flex overflow-hidden selection:bg-[var(--el-color-primary)] selection:text-[var(--el-text-color-primary)] w-full">
    <!-- Left Sidebar -->
    <aside class="w-[280px] lg:w-[300px] bg-[var(--el-bg-color)] border-r border-[var(--el-border-color)] flex flex-col relative z-20 shrink-0 h-screen justify-between">
      <div>
        <!-- Logo & Studio Tag -->
        <div class="pt-8 pb-7 px-8">
          <div class="flex items-center gap-3 mb-1">
            <span class="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--el-text-color-secondary)]">Studio</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--el-color-primary)] ring-4 ring-[var(--el-color-primary)]/20"></span>
          </div>
          <router-link to="/dashboard" class="text-3xl font-semibold tracking-tight hover:opacity-90 transition-opacity text-[var(--el-text-color-primary)]">
            Shine.
          </router-link>
        </div>

        <!-- Navigation items -->
        <nav class="px-5 space-y-1.5">
          <router-link
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative font-medium text-sm"
            :class="isNavActive(item.href)
              ? 'bg-[var(--el-card-bg-color)] shadow-sm border border-[var(--el-border-color)] text-[var(--el-text-color-primary)]'
              : 'text-[var(--el-text-color-secondary)] hover:bg-[var(--el-card-bg-color)]/60 hover:text-[var(--el-text-color-primary)]'"
          >
            <span
              v-if="isNavActive(item.href)"
              class="absolute left-0 top-1/2 -translate-y-1/2 -ml-5 w-1.5 h-7 bg-[var(--el-color-primary)] rounded-r-full"
            ></span>
            <i :class="[item.icon, isNavActive(item.href) ? 'text-[var(--el-text-color-regular)]' : 'text-[var(--el-text-color-secondary)]', 'w-5 text-center text-base']"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
      </div>

      <!-- Footer: Launch New Series -->
      <div class="p-6">
        <el-button
          id="launch-new-series-btn"
          type="primary"
          round
          size="large"
          class="!w-full !h-12 !font-semibold !rounded-2xl"
          @click="isWizardOpen = true"
        >
          <span>{{ t('dashboard.newSeriesBtn') }}</span>
          <i class="fa-solid fa-arrow-right -rotate-45 text-sm ml-2"></i>
        </el-button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
      <!-- Top Header -->
      <header class="h-20 px-8 lg:px-10 flex items-center justify-between shrink-0 border-b border-[var(--el-border-color)]/40 bg-[var(--el-bg-color-page)]/80 backdrop-blur-sm z-10">
        <div class="relative w-full max-w-[360px]">
          <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--el-text-color-secondary)] text-sm"></i>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('dashboard.searchPlaceholder')"
            class="w-full bg-transparent pl-11 pr-4 py-2.5 text-sm outline-none text-[var(--el-text-color-primary)] placeholder:text-[var(--el-text-color-secondary)] border-b border-[var(--el-border-color)] focus:border-[var(--el-color-primary)] transition-colors font-sans"
          />
        </div>

        <div class="flex items-center gap-3">
          <LanguageSelect />

          <!-- Theme Toggle Button -->
          <button
            @click="toggleTheme"
            class="w-10 h-10 rounded-full bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] flex items-center justify-center text-[var(--el-text-color-regular)] hover:text-[var(--el-text-color-primary)] transition-colors shadow-soft hover:shadow cursor-pointer"
            :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <el-icon :size="16"><Sunny v-if="!isDark" /><Moon v-else /></el-icon>
          </button>

          <!-- Notifications button -->
          <button
            class="w-10 h-10 rounded-full bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] flex items-center justify-center text-[var(--el-text-color-regular)] hover:text-[var(--el-text-color-primary)] transition-colors shadow-soft hover:shadow cursor-pointer"
            title="Notifications"
          >
            <i class="fa-regular fa-bell"></i>
          </button>

          <!-- Profile avatar with Popover Menu -->
          <el-popover
            placement="bottom-end"
            :width="220"
            trigger="click"
            popper-class="!p-0 !rounded-2xl !border-[var(--el-border-color)] !bg-[var(--el-card-bg-color)] shadow-lg"
          >
            <template #reference>
              <div class="relative cursor-pointer select-none">
                <img
                  :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces'"
                  alt="avatar"
                  class="w-10 h-10 rounded-full object-cover ring-1 ring-[var(--el-border-color)] shadow-soft hover:ring-[var(--el-color-primary)] transition-all"
                />
              </div>
            </template>

            <div class="p-4 border-b border-[var(--el-border-color)] flex items-center gap-3">
              <img
                :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces'"
                alt="avatar"
                class="w-10 h-10 rounded-full object-cover ring-1 ring-[var(--el-border-color)]"
              />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[var(--el-text-color-primary)] truncate">{{ authStore.user?.name || 'Creator' }}</p>
                <p class="text-xs text-[var(--el-text-color-secondary)] truncate">{{ authStore.user?.email || 'creator@shine.studio' }}</p>
              </div>
            </div>

            <div class="p-2 space-y-1">
              <button
                @click="goToProfile"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-[var(--el-text-color-regular)] hover:text-[var(--el-text-color-primary)] hover:bg-[var(--el-bg-color)] transition-colors cursor-pointer text-left"
              >
                <el-icon :size="16"><User /></el-icon>
                <span>Profile</span>
              </button>

              <button
                @click="goToChangePassword"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-[var(--el-text-color-regular)] hover:text-[var(--el-text-color-primary)] hover:bg-[var(--el-bg-color)] transition-colors cursor-pointer text-left"
              >
                <el-icon :size="16"><Lock /></el-icon>
                <span>Change Password</span>
              </button>

              <div class="my-1 border-t border-[var(--el-border-color)]"></div>

              <button
                @click="handleLogout"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left font-medium"
              >
                <el-icon :size="16"><SwitchButton /></el-icon>
                <span>Logout</span>
              </button>
            </div>
          </el-popover>
        </div>
      </header>

      <!-- Main View Container -->
      <div class="flex-1 overflow-y-auto flex flex-col min-h-0">
        <router-view />
      </div>
    </main>

    <!-- Series Wizard Modal -->
    <SeriesWizardModal v-model="isWizardOpen" @created="handleWizardCreated" />
  </div>
</template>
