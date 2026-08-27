<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { storeToRefs } from 'pinia';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';
import { Moon, Sunny } from '@element-plus/icons-vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isDark } = storeToRefs(authStore);

function toggleDarkMode() {
  authStore.updatePreferences({ theme: isDark.value ? 'dark' : 'light' });
}

const headerNavLinks = [
  { key: 'nav.engine', href: '/#engine' },
  { key: 'nav.gallery', href: '/#gallery' },
  { key: 'nav.pricing', href: '/#pricing' },
];

function handleNavClick(href: string, e?: Event) {
  if (href.startsWith('/#')) {
    e?.preventDefault();
    const hash = href.replace('/', '');
    if (route.path === '/') {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', href);
        return;
      }
    }
    router.push(href);
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)] selection:bg-[#72e3ad] selection:text-[#0f0f11]">
    <!-- Navigation -->
    <header id="public-header" class="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[var(--el-bg-color-page)]/80 backdrop-blur-md border-b border-[var(--el-border-color)]/60">
      <div class="flex items-center space-x-8">
        <router-link to="/" class="flex items-center gap-2 text-xl font-bold font-heading tracking-tight text-[var(--el-text-color-primary)]">
          <img src="/logo.png" alt="Shine Logo" class="h-7 w-auto object-contain" />
          <span>SHINE</span>
        </router-link>
        <div class="hidden md:flex space-x-6 text-[11px] font-medium uppercase tracking-widest text-[var(--el-text-color-secondary)]">
          <a
            v-for="link in headerNavLinks"
            :key="link.href"
            :href="link.href"
            class="nav-link-shine relative py-1 hover:text-[var(--el-text-color-primary)] transition-colors cursor-pointer"
            @click="(e: MouseEvent) => handleNavClick(link.href, e)"
          >
            {{ t(link.key) }}
          </a>
        </div>
      </div>

      <!-- Right Controls -->
      <div class="flex items-center space-x-4">
        <!-- Live Engine Indicator -->
        <div class="hidden md:flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-[var(--el-text-color-secondary)] mr-2">
          <span class="w-2 h-2 bg-[#72e3ad] rounded-full animate-pulse-dot"></span>
          <span>{{ t('home.liveEngine') }}</span>
        </div>

        <!-- Dark/Light Theme Switch -->
        <el-switch
          v-model="isDark"
          :active-icon="Moon"
          :inactive-icon="Sunny"
          inline-prompt
          @change="toggleDarkMode"
        />

        <!-- Language Select -->
        <LanguageSelect />

        <!-- Launch / Start Button -->
        <router-link to="/dashboard">
          <button class="bg-[#72e3ad] text-[#0f0f11] px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-sm">
            {{ t('home.startBtn') }}
          </button>
        </router-link>
      </div>
    </header>

    <!-- Main Content Slot -->
    <main class="flex-1 w-full">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-[var(--el-bg-color)] border-t border-[var(--el-border-color)] pt-24 pb-12 px-6">
      <div class="container mx-auto max-w-[1440px]">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          <!-- Brand Column -->
          <div class="md:col-span-4 space-y-4">
            <div class="flex items-center gap-2.5">
              <img src="/logo.png" alt="Shine Logo" class="h-6 w-auto object-contain" />
              <span class="text-2xl font-bold font-heading tracking-tight text-[#72e3ad]">SHINE</span>
            </div>
            <p class="text-sm text-[var(--el-text-color-secondary)] max-w-xs leading-relaxed">
              {{ t('footer.tagline') || 'The future of short-form storytelling. Create, produce, and distribute vertical cinema with AI.' }}
            </p>
          </div>

          <!-- Product Links -->
          <div class="md:col-span-2">
            <h4 class="text-[10px] font-bold uppercase tracking-widest mb-6 text-[#72e3ad]/70 dark:text-[#72e3ad]/60">{{ t('footer.product') }}</h4>
            <ul class="space-y-3 text-sm text-[var(--el-text-color-secondary)]">
              <li><a href="/#engine" @click="handleNavClick('/#engine', $event)" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.capabilities') || t('nav.engine') }}</a></li>
              <li><a href="/#pricing" @click="handleNavClick('/#pricing', $event)" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.pricing') }}</a></li>
              <li><a href="/#gallery" @click="handleNavClick('/#gallery', $event)" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.showcase') || t('nav.gallery') }}</a></li>
            </ul>
          </div>

          <!-- Resources Links -->
          <div class="md:col-span-2">
            <h4 class="text-[10px] font-bold uppercase tracking-widest mb-6 text-[#72e3ad]/70 dark:text-[#72e3ad]/60">{{ t('footer.resources') }}</h4>
            <ul class="space-y-3 text-sm text-[var(--el-text-color-secondary)]">
              <li><a href="#" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.blog') }}</a></li>
              <li><a href="#" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.helpCenter') }}</a></li>
              <li><a href="#" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.apiDocs') }}</a></li>
            </ul>
          </div>

          <!-- Company Links -->
          <div class="md:col-span-2">
            <h4 class="text-[10px] font-bold uppercase tracking-widest mb-6 text-[#72e3ad]/70 dark:text-[#72e3ad]/60">{{ t('footer.company') }}</h4>
            <ul class="space-y-3 text-sm text-[var(--el-text-color-secondary)]">
              <li><router-link to="/manual" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.about') }}</router-link></li>
              <li><a href="#" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.careers') }}</a></li>
              <li><router-link to="/privacy" class="hover:text-[#72e3ad] transition-colors">{{ t('footer.legal') }}</router-link></li>
            </ul>
          </div>

          <!-- Social Links -->
          <div class="md:col-span-2 flex flex-col justify-end md:items-end">
            <div class="flex space-x-4 text-lg text-[var(--el-text-color-secondary)]">
              <a href="#" aria-label="Twitter" class="w-8 h-8 rounded-full bg-[var(--el-border-color)]/30 flex items-center justify-center font-bold text-xs hover:bg-[#72e3ad] hover:text-[#0f0f11] transition-all">𝕏</a>
              <a href="#" aria-label="Instagram" class="w-8 h-8 rounded-full bg-[var(--el-border-color)]/30 flex items-center justify-center font-bold text-xs hover:bg-[#72e3ad] hover:text-[#0f0f11] transition-all">📷</a>
              <a href="#" aria-label="LinkedIn" class="w-8 h-8 rounded-full bg-[var(--el-border-color)]/30 flex items-center justify-center font-bold text-xs hover:bg-[#72e3ad] hover:text-[#0f0f11] transition-all">🔗</a>
            </div>
          </div>
        </div>

        <!-- Copyright & Legal -->
        <div class="pt-8 border-t border-[var(--el-border-color)] flex flex-col md:flex-row justify-between items-center text-[10px] text-[var(--el-text-color-secondary)] uppercase tracking-widest">
          <p>{{ t('home.copyrightText') }}</p>
          <div class="flex space-x-6 mt-4 md:mt-0">
            <router-link to="/privacy" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.privacy') }}</router-link>
            <router-link to="/terms" class="hover:text-[#72e3ad] transition-colors">{{ t('nav.terms') }}</router-link>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
