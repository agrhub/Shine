<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { storeToRefs } from 'pinia';
import {
  Sparkles,
  Film,
  Languages,
  Rocket,
  Check,
  Play,
  Wand2,
} from 'lucide-vue-next';

const { t } = useI18n();
const authStore = useAuthStore();
const { isDark } = storeToRefs(authStore);

function handleScroll(targetId: string, e?: Event) {
  e?.preventDefault();
  const el = document.querySelector(targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    history.pushState(null, '', targetId);
  }
}
</script>

<template>
  <div id="home-page" class="overflow-x-hidden font-sans bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)]">
    <!-- Hero Section -->
    <header id="hero" class="relative min-h-[90vh] flex flex-col md:flex-row items-center justify-center pt-32 pb-16 px-6 overflow-hidden">
      <!-- Background Glows -->
      <div class="absolute top-1/4 -left-24 w-96 h-96 bg-[#72e3ad]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div class="absolute bottom-1/4 -right-24 w-96 h-96 bg-[#72e3ad]/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="container mx-auto max-w-[1440px] grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <!-- Hero Text -->
        <div class="md:col-span-6 flex flex-col space-y-8 relative z-10">
          <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#72e3ad]">
            {{ t('home.tagline') }}
          </span>
          <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-heading leading-[0.92] tracking-tighter text-[var(--el-text-color-primary)]">
            {{ t('home.heroTitlePart1') }}<br>{{ t('home.heroTitlePart2') }}<br><span class="text-[#72e3ad]">{{ t('home.heroTitleWithAi') }}</span>
          </h1>
          <p class="text-lg text-[var(--el-text-color-regular)] max-w-lg leading-relaxed">
            {{ t('home.heroSubtitle') }}
          </p>
          <div class="flex flex-wrap items-center gap-4 pt-2">
            <RouterLink
              to="/auth/signup"
              class="inline-flex items-center justify-center bg-[#72e3ad] text-[#0f0f11] px-8 py-4 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all w-fit shadow-[0_0_25px_rgba(114,227,173,0.35)]"
            >
              {{ t('home.launchAgent') }}
            </RouterLink>
            <a
              href="#engine"
              @click="(e) => handleScroll('#engine', e)"
              class="inline-flex items-center justify-center border border-[var(--el-border-color)] text-[var(--el-text-color-primary)] px-8 py-4 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--el-fill-color-light)] transition-all w-fit cursor-pointer"
            >
              {{ t('home.howItWorks') }}
            </a>
          </div>
        </div>

        <!-- Hero Phone Mockup -->
        <div class="md:col-span-6 flex justify-center relative z-10">
          <div class="relative w-full max-w-[320px] aspect-[9/19] bg-black rounded-[3rem] border-[8px] border-[#18181b] shadow-[0_0_80px_rgba(114,227,173,0.18)] ring-1 ring-[var(--el-border-color)] p-3 overflow-hidden group">
            <!-- Notch -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20"></div>

            <div class="relative w-full h-full rounded-[2rem] overflow-hidden bg-black">
              <img
                class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                :src="isDark ? '/images/home/hero-phone.png' : '/images/home/hero-phone-light.png'"
                alt="Vertical 9:16 Cinematic Confrontation"
              />

              <!-- Video UI Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent z-10 flex flex-col justify-end p-6">
                <div class="flex items-center space-x-3 mb-6">
                  <div class="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center bg-white/20 backdrop-blur-md">
                    <Play class="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                  </div>
                  <div class="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div class="h-full bg-[#72e3ad] w-1/3"></div>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="h-3 w-3/4 bg-white/20 rounded-full"></div>
                  <div class="h-3 w-1/2 bg-white/10 rounded-full"></div>
                </div>
              </div>

              <!-- Kinetic Caption Overlay -->
              <div class="absolute top-1/2 left-0 w-full text-center px-4 -translate-y-1/2 z-20 pointer-events-none">
                <span class="text-4xl font-bold font-heading text-[#72e3ad] uppercase tracking-tighter drop-shadow-lg scale-110 -rotate-2 block">
                  {{ t('home.kineticCaption1') }}
                </span>
                <span class="text-4xl font-bold font-heading text-white uppercase tracking-tighter drop-shadow-lg scale-110 rotate-2 block">
                  {{ t('home.kineticCaption2') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Marquee Section -->
    <section class="py-12 border-y border-[var(--el-border-color)] overflow-hidden whitespace-nowrap bg-[var(--el-bg-color)]/40">
      <div class="animate-marquee inline-block">
        <h2 class="text-[12vw] font-bold font-heading text-outline uppercase px-4 opacity-40 select-none">
          Shine AI • Shine AI • Shine AI • Shine AI • 
        </h2>
        <h2 class="text-[12vw] font-bold font-heading text-outline uppercase px-4 opacity-40 select-none">
          Shine AI • Shine AI • Shine AI • Shine AI • 
        </h2>
      </div>
    </section>

    <!-- Intro + Bento Grid Section -->
    <section id="engine" class="py-32 px-6 scroll-mt-20">
      <div class="container mx-auto max-w-[1440px]">
        <!-- Intro Header -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          <div class="lg:col-span-3">
            <span class="text-xs font-bold uppercase tracking-widest text-[#72e3ad]">
              {{ t('home.theShineAgent') }}
            </span>
          </div>
          <div class="lg:col-span-9">
            <h2 class="text-4xl sm:text-5xl md:text-7xl font-bold font-heading leading-tight tracking-tighter mb-8 text-[var(--el-text-color-primary)]" v-html="t('home.introHeading')">
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="space-y-4">
                <p class="text-sm leading-relaxed text-[var(--el-text-color-regular)]">
                  {{ t('home.introCol1') }}
                </p>
              </div>
              <div class="space-y-4">
                <p class="text-sm leading-relaxed text-[var(--el-text-color-regular)]">
                  {{ t('home.introCol2') }}
                </p>
              </div>
              <div class="space-y-4">
                <p class="text-sm leading-relaxed text-[var(--el-text-color-regular)]">
                  {{ t('home.introCol3') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento Grid -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <!-- Card 1: AI Script Agent -->
          <div class="md:col-span-8 bg-[var(--el-card-bg-color)] rounded-2xl p-8 flex flex-col justify-between min-h-[440px] group cursor-pointer border border-[var(--el-border-color)] hover:border-[#72e3ad]/60 transition-all duration-300 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <h3 class="text-3xl font-bold font-heading text-[var(--el-text-color-primary)]">{{ t('home.bento1Title') }}</h3>
                <p class="text-sm text-[var(--el-text-color-regular)] max-w-sm">
                  {{ t('home.bento1Desc') }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-full bg-[#72e3ad]/15 flex items-center justify-center shrink-0">
                <Sparkles class="w-5 h-5 text-[#72e3ad]" />
              </div>
            </div>

            <!-- Skeleton UI: AI Script Agent -->
            <div class="mt-8 flex-1 bg-[var(--el-bg-color)] rounded-xl border border-[var(--el-border-color)] shadow-inner p-6 overflow-hidden relative">
              <div class="space-y-4">
                <div class="flex items-center space-x-3 mb-8">
                  <div class="w-8 h-8 rounded-full bg-[#72e3ad]/20 flex items-center justify-center">
                    <Wand2 class="w-4 h-4 text-[#72e3ad]" />
                  </div>
                  <div class="h-2 w-32 bg-[var(--el-border-color)] rounded-full"></div>
                </div>
                <div class="space-y-3">
                  <div class="h-2 w-full bg-[var(--el-border-color)] rounded-full"></div>
                  <div class="h-2 w-full bg-[var(--el-border-color)] rounded-full"></div>
                  <div class="h-2 w-2/3 bg-[var(--el-border-color)] rounded-full"></div>
                </div>
                <div class="pt-6 border-t border-[var(--el-border-color)]">
                  <div class="flex items-start space-x-4">
                    <div class="w-2 h-2 rounded-full bg-[#72e3ad] mt-1 animate-pulse"></div>
                    <div class="space-y-2 flex-1">
                      <div class="h-2 w-1/4 bg-[var(--el-text-color-primary)]/10 rounded-full"></div>
                      <div class="h-2 w-3/4 bg-[var(--el-border-color)] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Floating generative element -->
              <div class="absolute bottom-4 right-4 bg-[#72e3ad] text-[#0f0f11] px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-md">
                <span class="w-1.5 h-1.5 bg-[#0f0f11] rounded-full animate-pulse-dot"></span>
                {{ t('home.generatingBeats') }}
              </div>
            </div>
          </div>

          <!-- Card 2: Multitrack Editor -->
          <div class="md:col-span-4 bg-[var(--el-card-bg-color)] rounded-2xl p-8 flex flex-col justify-between min-h-[440px] group cursor-pointer border border-[var(--el-border-color)] hover:border-[#72e3ad]/60 transition-all duration-300 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <h3 class="text-2xl font-bold font-heading text-[var(--el-text-color-primary)]">{{ t('home.bento2Title') }}</h3>
                <p class="text-sm text-[var(--el-text-color-regular)]">
                  {{ t('home.bento2Desc') }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-full bg-[var(--el-fill-color-light)] flex items-center justify-center shrink-0">
                <Film class="w-5 h-5 text-[var(--el-text-color-primary)] opacity-60" />
              </div>
            </div>

            <!-- Skeleton UI: Timeline -->
            <div class="mt-8 flex-1 bg-[#0a0a0b] rounded-xl p-4 overflow-hidden shadow-2xl relative border border-[var(--el-border-color)]">
              <div class="space-y-3 h-full flex flex-col justify-center">
                <div class="h-1 w-full bg-white/10 rounded-full mb-4"></div>
                <div class="h-6 w-3/4 bg-[#72e3ad]/20 border border-[#72e3ad]/40 rounded flex items-center px-2">
                  <div class="h-1 w-12 bg-[#72e3ad]/60 rounded-full"></div>
                </div>
                <div class="h-6 w-2/3 bg-blue-500/20 border border-blue-400/40 rounded flex items-center px-2">
                  <div class="h-1 w-8 bg-blue-400/60 rounded-full"></div>
                </div>
                <div class="h-6 w-full bg-white/5 border border-white/10 rounded"></div>
                <div class="h-6 w-1/2 bg-white/5 border border-white/10 rounded"></div>

                <!-- Playhead -->
                <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#72e3ad] z-10">
                  <div class="w-2 h-2 bg-[#72e3ad] rounded-full -ml-[3px] -mt-1 shadow-[0_0_10px_rgba(114,227,173,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Global Dubbing -->
          <div class="md:col-span-4 bg-[var(--el-card-bg-color)] rounded-2xl p-8 flex flex-col justify-between min-h-[440px] group cursor-pointer border border-[var(--el-border-color)] hover:border-[#72e3ad]/60 transition-all duration-300 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <h3 class="text-2xl font-bold font-heading text-[var(--el-text-color-primary)]">{{ t('home.bento3Title') }}</h3>
                <p class="text-sm text-[var(--el-text-color-regular)]">
                  {{ t('home.bento3Desc') }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-full bg-[var(--el-fill-color-light)] flex items-center justify-center shrink-0">
                <Languages class="w-5 h-5 text-[var(--el-text-color-primary)] opacity-60" />
              </div>
            </div>
            <div class="mt-8 flex-1 overflow-hidden rounded-xl border border-[var(--el-border-color)]">
              <img
                class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                :src="isDark ? '/images/home/dubbing-waves.png' : '/images/home/dubbing-waves-light.png'"
                alt="Dynamic Sound Waves"
              />
            </div>
          </div>

          <!-- Card 4: One-Click Publish -->
          <div class="md:col-span-8 bg-[var(--el-card-bg-color)] rounded-2xl p-8 flex flex-col justify-between min-h-[440px] group cursor-pointer border border-[var(--el-border-color)] hover:border-[#72e3ad]/60 transition-all duration-300 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <h3 class="text-3xl font-bold font-heading text-[var(--el-text-color-primary)]">{{ t('home.bento4Title') }}</h3>
                <p class="text-sm text-[var(--el-text-color-regular)]">
                  {{ t('home.bento4Desc') }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-full bg-[var(--el-fill-color-light)] flex items-center justify-center shrink-0">
                <Rocket class="w-5 h-5 text-[var(--el-text-color-primary)] opacity-60" />
              </div>
            </div>
            <div class="mt-8 flex-1 overflow-hidden rounded-xl border border-[var(--el-border-color)] relative">
              <img
                class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-75"
                :src="isDark ? '/images/home/publish-network.png' : '/images/home/publish-network-light.png'"
                alt="Social Distribution Network"
              />
              <div class="absolute inset-0 bg-[#72e3ad]/5 group-hover:bg-transparent transition-colors"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Gallery Slider Section -->
    <section id="gallery" class="py-32 bg-[var(--el-bg-color)] border-y border-[var(--el-border-color)] scroll-mt-20">
      <div class="container mx-auto max-w-[1440px] px-6">
        <div class="flex flex-col md:flex-row justify-between items-end mb-16">
          <div class="max-w-2xl">
            <span class="text-xs font-bold uppercase tracking-widest text-[#72e3ad] block mb-4">{{ t('home.galleryTag') }}</span>
            <h2 class="text-4xl sm:text-5xl md:text-6xl font-bold font-heading leading-tight tracking-tighter text-[var(--el-text-color-primary)]">
              {{ t('home.galleryHeading') }}
            </h2>
          </div>
          <div class="mt-8 md:mt-0">
            <a
              href="#pricing"
              @click="(e) => handleScroll('#pricing', e)"
              class="text-xs font-bold uppercase tracking-widest border-b border-[#72e3ad] pb-1 text-[#72e3ad] hover:text-[var(--el-text-color-primary)] transition-colors cursor-pointer"
            >
              {{ t('home.viewAllExports') }}
            </a>
          </div>
        </div>

        <div class="flex space-x-6 overflow-x-auto pb-8 scrollbar-hidden">
          <!-- Slide 1 -->
          <div class="flex-none w-[80vw] sm:w-[45vw] md:w-[28vw] aspect-square relative group overflow-hidden rounded-xl bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)]">
            <img
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :src="isDark ? '/images/home/gallery-urban-noir.png' : '/images/home/gallery-urban-noir-light.png'"
              alt="Urban Noir Series"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
              <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#72e3ad]">{{ t('home.urbanNoirTitle') }}</span>
              <div class="flex items-center space-x-2 text-sm font-medium">
                <span>🎵</span>
                <span>{{ t('home.tikTokPremiere') }}</span>
              </div>
              <div class="mt-4 flex space-x-4 text-[10px] text-white/70">
                <span>2.4M {{ t('home.viewsText') }}</span>
                <span>180K {{ t('home.likesText') }}</span>
              </div>
            </div>
          </div>

          <!-- Slide 2 -->
          <div class="flex-none w-[80vw] sm:w-[45vw] md:w-[28vw] aspect-square relative group overflow-hidden rounded-xl bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)]">
            <img
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :src="isDark ? '/images/home/gallery-character-study.png' : '/images/home/gallery-character-study-light.png'"
              alt="Character Study"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
              <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#72e3ad]">{{ t('home.characterStudyTitle') }}</span>
              <div class="flex items-center space-x-2 text-sm font-medium">
                <span>📸</span>
                <span>{{ t('home.reelsCampaign') }}</span>
              </div>
              <div class="mt-4 flex space-x-4 text-[10px] text-white/70">
                <span>890K {{ t('home.viewsText') }}</span>
                <span>42K {{ t('home.sharesText') }}</span>
              </div>
            </div>
          </div>

          <!-- Slide 3 -->
          <div class="flex-none w-[80vw] sm:w-[45vw] md:w-[28vw] aspect-square relative group overflow-hidden rounded-xl bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)]">
            <img
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :src="isDark ? '/images/home/gallery-frontier-saga.png' : '/images/home/gallery-frontier-saga-light.png'"
              alt="Frontier Saga"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
              <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#72e3ad]">{{ t('home.frontierSagaTitle') }}</span>
              <div class="flex items-center space-x-2 text-sm font-medium">
                <span>▶️</span>
                <span>{{ t('home.shortsLaunch') }}</span>
              </div>
              <div class="mt-4 flex space-x-4 text-[10px] text-white/70">
                <span>1.1M {{ t('home.viewsText') }}</span>
                <span>95K {{ t('home.subsText') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-32 px-6 bg-[var(--el-bg-color-page)] scroll-mt-20">
      <div class="container mx-auto max-w-[1440px]">
        <div class="text-center mb-24">
          <span class="text-xs font-bold uppercase tracking-widest text-[#72e3ad] block mb-4">{{ t('nav.pricing') }}</span>
          <h2 class="text-5xl sm:text-6xl md:text-8xl font-bold font-heading tracking-tighter text-[var(--el-text-color-primary)]" v-html="t('home.pricingHeading')">
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Tier 1: Creator -->
          <div class="p-10 border border-[var(--el-border-color)] bg-[var(--el-card-bg-color)] rounded-2xl flex flex-col hover:border-[#72e3ad]/50 transition-colors shadow-sm">
            <h3 class="text-2xl font-bold font-heading mb-2 text-[var(--el-text-color-primary)]">{{ t('home.creatorPlan') }}</h3>
            <div class="text-4xl font-bold font-heading mb-8 text-[var(--el-text-color-primary)]">
              $19<span class="text-sm text-[var(--el-text-color-secondary)] font-normal">{{ t('home.perMonth') }}</span>
            </div>
            <ul class="space-y-4 mb-12 flex-grow">
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planCreatorFeat1') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planCreatorFeat2') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planCreatorFeat3') }}</span>
              </li>
            </ul>
            <RouterLink
              to="/auth/signup"
              class="block w-full py-4 border border-[var(--el-border-color)] rounded-lg text-center text-xs font-bold uppercase tracking-widest hover:bg-[#72e3ad] hover:text-[#0f0f11] hover:border-[#72e3ad] transition-all text-[var(--el-text-color-primary)]"
            >
              {{ t('home.getStartedBtn') }}
            </RouterLink>
          </div>

          <!-- Tier 2: Studio (Recommended) -->
          <div class="p-10 border-2 border-[#72e3ad] bg-[var(--el-card-bg-color)] rounded-2xl flex flex-col relative shadow-[0_0_40px_rgba(114,227,173,0.15)]">
            <span class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#72e3ad] text-[#0f0f11] px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-sm">
              {{ t('home.recommended') }}
            </span>
            <h3 class="text-2xl font-bold font-heading mb-2 text-[var(--el-text-color-primary)]">{{ t('home.studioPlan') }}</h3>
            <div class="text-4xl font-bold font-heading mb-8 text-[var(--el-text-color-primary)]">
              $49<span class="text-sm text-[var(--el-text-color-secondary)] font-normal">{{ t('home.perMonth') }}</span>
            </div>
            <ul class="space-y-4 mb-12 flex-grow">
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planStudioFeat1') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planStudioFeat2') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planStudioFeat3') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planStudioFeat4') }}</span>
              </li>
            </ul>
            <RouterLink
              to="/auth/signup"
              class="block w-full py-4 bg-[#72e3ad] text-[#0f0f11] rounded-lg text-center text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-md"
            >
              {{ t('home.getStartedBtn') }}
            </RouterLink>
          </div>

          <!-- Tier 3: Enterprise -->
          <div class="p-10 border border-[var(--el-border-color)] bg-[var(--el-card-bg-color)] rounded-2xl flex flex-col hover:border-[#72e3ad]/50 transition-colors shadow-sm">
            <h3 class="text-2xl font-bold font-heading mb-2 text-[var(--el-text-color-primary)]">{{ t('home.enterprise') }}</h3>
            <div class="text-4xl font-bold font-heading mb-8 text-[var(--el-text-color-primary)]">
              {{ t('home.customPrice') }}
            </div>
            <ul class="space-y-4 mb-12 flex-grow">
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planEntFeat1') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planEntFeat2') }}</span>
              </li>
              <li class="flex items-center space-x-3 text-sm text-[var(--el-text-color-regular)]">
                <Check class="w-4 h-4 text-[#72e3ad] shrink-0" />
                <span>{{ t('home.planEntFeat3') }}</span>
              </li>
            </ul>
            <RouterLink
              to="/contact"
              class="block w-full py-4 border border-[var(--el-border-color)] rounded-lg text-center text-xs font-bold uppercase tracking-widest hover:bg-[#72e3ad] hover:text-[#0f0f11] hover:border-[#72e3ad] transition-all text-[var(--el-text-color-primary)]"
            >
              {{ t('home.contactSalesBtn') }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
