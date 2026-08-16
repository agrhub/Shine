<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LanguageSelect from '@/components/shared/LanguageSelect.vue';

const { t } = useI18n();

const footerLinks = {
  product: [
    { key: 'nav.manual', href: '/manual' },
    { key: 'nav.contact', href: '/contact' },
  ],
  legal: [
    { key: 'nav.terms', href: '/terms' },
    { key: 'nav.privacy', href: '/privacy' },
  ],
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <!-- Brand Logo & Left Nav -->
        <div class="flex items-center gap-8">
          <router-link to="/" class="flex items-center gap-2.5 font-bold tracking-tight">
            <img src="/logo.png" alt="Shine Logo" class="h-8 w-auto object-contain" />
            <span class="text-lg font-bold text-foreground">{{ t('common.brandName') }}</span>
          </router-link>

          <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
            <router-link to="/" class="text-muted-foreground hover:text-foreground transition-colors">
              {{ t('nav.home') }}
            </router-link>
            <router-link to="/manual" class="text-muted-foreground hover:text-foreground transition-colors">
              {{ t('nav.manual') }}
            </router-link>
            <router-link to="/contact" class="text-muted-foreground hover:text-foreground transition-colors">
              {{ t('nav.contact') }}
            </router-link>
            <router-link to="/terms" class="text-muted-foreground hover:text-foreground transition-colors">
              {{ t('nav.terms') }}
            </router-link>
            <router-link to="/privacy" class="text-muted-foreground hover:text-foreground transition-colors">
              {{ t('nav.privacy') }}
            </router-link>
          </nav>
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-3">
          <LanguageSelect />
          <router-link to="/auth/login">
            <el-button size="small">{{ t('nav.signIn') }}</el-button>
          </router-link>
          <router-link to="/auth/signup">
            <el-button type="primary" size="small">{{ t('nav.getStarted') }}</el-button>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="border-t border-border bg-background text-muted-foreground py-12 px-4">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="space-y-3 md:col-span-2">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <el-icon><VideoCamera /></el-icon>
            </div>
            <span class="font-bold text-foreground">{{ t('common.brandStudio') }}</span>
          </div>
          <p class="text-xs max-w-sm leading-relaxed text-muted-foreground">
            {{ t('footer.tagline') }}
          </p>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">{{ t('footer.product') }}</h4>
          <ul class="space-y-2 text-xs">
            <li v-for="link in footerLinks.product" :key="link.key">
              <router-link :to="link.href" class="hover:text-foreground transition-colors">
                {{ t(link.key) }}
              </router-link>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">{{ t('footer.legal') }}</h4>
          <ul class="space-y-2 text-xs">
            <li v-for="link in footerLinks.legal" :key="link.key">
              <router-link :to="link.href" class="hover:text-foreground transition-colors">
                {{ t(link.key) }}
              </router-link>
            </li>
          </ul>
        </div>
      </div>

      <div class="max-w-7xl mx-auto mt-10 pt-6 border-t border-border/60 text-xs text-center">
        {{ t('footer.copyright') }}
      </div>
    </footer>
  </div>
</template>
