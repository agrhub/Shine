<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';
import { Moon, Sunny } from '@element-plus/icons-vue';

const { t } = useI18n();
const authStore = useAuthStore();

const isDark = computed({
  get: () => (authStore.user?.theme || localStorage.getItem('shine_theme') || 'dark') === 'dark',
  set: (val: boolean) => {
    const nextTheme = val ? 'dark' : 'light';
    authStore.updatePreferences({ theme: nextTheme });
  }
});

function toggleDarkMode(val: string | number | boolean) {
  const isEnabled = Boolean(val);
  const nextTheme = isEnabled ? 'dark' : 'light';
  authStore.updatePreferences({ theme: nextTheme });
}

const headerNavLinks = [
  { key: 'nav.studio', href: '#' },
  { key: 'nav.director', href: '#' },
  { key: 'nav.pricing', href: '#' },
  { key: 'nav.showcase', href: '#' },
];

const footerColumns = [
  {
    titleKey: 'footer.product',
    links: [
      { key: 'nav.capabilities', href: '#' },
      { key: 'nav.pricing', href: '#' },
      { key: 'nav.marketplace', href: '#' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { key: 'nav.about', href: '/manual' },
      { key: 'nav.careers', href: '#' },
      { key: 'nav.press', href: '#' },
    ],
  },
  {
    titleKey: 'footer.resources',
    links: [
      { key: 'nav.blog', href: '#' },
      { key: 'nav.helpCenter', href: '#' },
      { key: 'nav.apiDocs', href: '#' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { key: 'nav.privacy', href: '/privacy' },
      { key: 'nav.terms', href: '/terms' },
      { key: 'nav.contactSales', href: '/contact' },
    ],
  },
];
</script>

<template>
  <el-container class="min-h-screen flex flex-col font-['Outfit',sans-serif]">
    <!-- Element Plus Header -->
    <el-header id="public-header" height="72px" class="sticky top-0 z-50 border-b border-[#bbcabe]/30 bg-[var(--el-bg-color-page)]/90 backdrop-blur-md px-0">
      <div class="flex justify-between items-center px-8 h-full max-w-[1440px] mx-auto w-full">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2.5">
          <el-image src="/logo.png" alt="Shine Logo" fit="contain" class="h-9 w-auto" />
          <el-text class="!text-2xl uppercase tracking-tight">{{ t('footer.appName') }}</el-text>
        </router-link>

        <!-- Nav Links -->
        <div class="hidden md:flex items-center gap-8 text-sm font-medium">
          <el-link
            v-for="link in headerNavLinks"
            :key="link.key"
            :href="link.href"
            :underline="false"
            class="!text-[var(--el-text-color-regular)] hover:!text-[var(--el-color-primary)] font-medium"
          >
            {{ t(link.key) }}
          </el-link>
        </div>

        <!-- Right Controls: Dark Mode Switch, Language, Login, Get Started Button -->
        <div class="flex items-center gap-4">
          <el-switch
            v-model="isDark"
            :active-icon="Moon"
            :inactive-icon="Sunny"
            inline-prompt
            @change="toggleDarkMode"
          />
          <LanguageSelect />

          <!-- <router-link to="/auth/login" class="hidden md:block">
            <el-button link class="!text-xs !font-bold uppercase tracking-widest !text-[var(--el-text-color-regular)] hover:!text-[var(--el-color-primary)]">
              {{ t('nav.signIn') }}
            </el-button>
          </router-link> -->

          <router-link to="/dashboard">
            <el-button
              type="primary"
              round
              class="!bg-primary !text-on-primary !border-none !px-6 !py-2.5 !font-bold text-xs uppercase tracking-widest hover:!opacity-90 shadow-sm"
            >
              {{ t('nav.getStarted') }}
            </el-button>
          </router-link>
        </div>
      </div>
    </el-header>

    <!-- Main Content Slot -->
    <el-main class="flex-1 p-0">
      <router-view />
    </el-main>

    <!-- Element Plus Footer -->
    <el-footer height="auto" class="w-full py-12 bg-[var(--el-border-color-lighter)] border-t border-[#bbcabe]/40 text-[var(--el-text-color-secondary)] px-0">
      <div class="flex flex-col md:flex-row justify-between items-start px-8 gap-8 max-w-[1440px] mx-auto w-full">
        <div class="max-w-xs space-y-3">
          <div class="flex items-center gap-2">
            <el-image src="https://lh3.googleusercontent.com/aida/AP1WRLuaPtDuN3RWNymo7PB6mSlvEnyP2qs9JFRcDj0AGUuHbhLQwknZMuhIFOuajtbm-xZlfZtubTtlsvS5ZabEAbxIVk1FT1Hew3MHLZGbJ6tJUNwO_EKDci4aN-7I_QJW9VCsiJQv1O_-Dd7eRqMS4s1J3cZjanzelx-9tA5Hrdt8EMVqpGUfi84wgkV4621eqn2b-x0tJ92n6ZFTXlWXnlRxdsEBDPeGokVZ-sWcF3FmGwBF0xwECoPvr_k" alt="Shine Logo" fit="contain" class="h-6 w-auto grayscale opacity-80" />
            <el-text class="!font-black !text-lg !text-[var(--el-text-color-primary)] uppercase tracking-tight">Shine</el-text>
          </div>
          <el-text class="!text-xs !text-[var(--el-text-color-regular)] block leading-relaxed">
            Empowering creators with enterprise-grade AI for vertical micro-dramas.
          </el-text>
        </div>

        <!-- 4 Footer Link Columns -->
        <el-row :gutter="32" class="w-full md:w-auto">
          <el-col v-for="col in footerColumns" :key="col.titleKey" :span="6" :xs="12" class="flex flex-col gap-3">
            <el-text class="!font-bold !text-[var(--el-text-color-primary)] uppercase tracking-widest mb-1 block">{{ t(col.titleKey) }}</el-text>
            <router-link
              v-for="link in col.links"
              :key="link.key"
              :to="link.href"
            >
              <el-link :underline="false" class="!text-xs !text-[var(--el-text-color-regular)] hover:!text-[var(--el-text-color-primary)]">
                {{ t(link.key) }}
              </el-link>
            </router-link>
          </el-col>
        </el-row>
      </div>

      <div class="px-8 max-w-[1440px] mx-auto mt-12 pt-6 border-t border-[#bbcabe]/40 flex flex-col md:flex-row justify-between items-center gap-4 text-xs w-full">
        <el-text class="!text-xs uppercase tracking-wider text-[var(--el-text-color-secondary)]">© 2026 Shine Intelligence. Enterprise-grade AI Cinema.</el-text>
        <div class="flex gap-4">
          <div aria-label="Twitter" class="w-7 h-7 rounded-full bg-[#bbcabe]/30 flex items-center justify-center font-bold text-xs hover:bg-primary hover:text-on-primary transition-colors cursor-pointer">𝕏</div>
          <div aria-label="LinkedIn" class="w-7 h-7 rounded-full bg-[#bbcabe]/30 flex items-center justify-center font-bold text-xs hover:bg-primary hover:text-on-primary transition-colors cursor-pointer">🔗</div>
          <div aria-label="Instagram" class="w-7 h-7 rounded-full bg-[#bbcabe]/30 flex items-center justify-center font-bold text-xs hover:bg-primary hover:text-on-primary transition-colors cursor-pointer">📷</div>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>
