<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { Right } from '@element-plus/icons-vue';

const { t } = useI18n();

const pricingPlans = [
  {
    nameKey: 'home.free',
    price: '$0',
    subtitleKey: 'home.planFreeSub',
    ctaKey: 'home.selectPlan',
    highlight: false,
    features: ['100 AI credits', '720p watermarked', 'Community support'],
  },
  {
    nameKey: 'home.creatorPro',
    price: '$29',
    subtitleKey: 'home.planProSub',
    ctaKey: 'home.selectPlan',
    highlight: false,
    features: ['1,500 credits', '1080p HD export', '3 dubbing languages'],
  },
  {
    nameKey: 'home.studioTeam',
    price: '$149',
    subtitleKey: 'home.planStudioSub',
    ctaKey: 'home.selectPlan',
    highlight: true,
    badge: 'MOST POPULAR',
    features: ['10,000 credits', '4K export', '5-editor co-editing'],
  },
  {
    nameKey: 'home.enterprise',
    price: '$499',
    subtitleKey: 'home.planEnterpriseSub',
    ctaKey: 'home.heroCtaPrimary',
    highlight: false,
    features: ['Custom credits', 'Custom LoRAs', 'Dedicated clusters'],
  },
];

const testimonials = [
  {
    quoteKey: 'home.elenaQuote',
    nameKey: 'home.elenaVoss',
    roleKey: 'home.executiveProducer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9rLKQQAuKxsYmQKh5NlU54TX64Ubr0GsNvIUE9xIrCc_mdgTdCtvqIpOafPV755eXp9odraHTopQrz91-R6Ga3dPU5SUJKc7kIlb8YkiyZDAsx1lLcryqysZgGHv1Tgwu5FKE5F4amfP92lgTijdM-0yNIOHdt8iht2dEu8SzK9RQ86tklsXvu_VYhZQsbQ-EpFuvN07afWCzCtQ6fzRJfSbnFCaLtSGZ8yzKT__25914uewpmYEo3A',
  },
  {
    quoteKey: 'home.marcusQuote',
    nameKey: 'home.marcusTrent',
    roleKey: 'home.independentFilmmaker',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwUzFvWUKdGwY3DNu3u5mtHCBYmNKwZdhePIFwLomAL7lWvJlPbP3uFt1WwZT8pa5TjgMTSpbwfaMzHb7UmuPu0q1_T6YHf1uYsIoebcMJxUBVdycQ0FFe5AVE9nyjA0XxycJUIJp6G3Zl-D6JxCCRPerlxw5DuAWSGN3TSozPaXhBAYaq71WU_iqnPVWOOMmWI-3v4qEpLNMZTQeTUlvwGaoN30mg7-mc6Jg1Xno9OVFlHNVQuKsgUA',
  },
];
</script>

<template>
  <div id="home-page" class="bg-[var(--el-bg-color-page)] text-[var(--el-text-color-primary)] font-['Outfit',sans-serif] min-h-screen">
    <!-- Hero Section -->
    <main class="pt-32 pb-16 px-8 max-w-[1440px] mx-auto overflow-hidden">
      <el-row :gutter="48" class="items-center">
        <!-- Hero Left -->
        <el-col :xs="24" :lg="12" class="flex flex-col gap-6 relative z-10">
          <div class="text-xs text-[var(--el-text-color-regular)] uppercase tracking-[0.2em] mb-2 flex items-center gap-2 font-semibold">
            <span class="material-symbols-outlined text-[18px] text-primary">videocam</span>
            <span>{{ t('home.engineBadge') }}</span>
          </div>

          <h1 class="text-5xl lg:text-6xl font-black text-[var(--el-text-color-primary)] leading-[1.1] tracking-tight">
            {{ t('home.heroTitleMain') }} <span class="text-primary">VERTICAL</span> DRAMA
          </h1>

          <el-text class="!text-base !text-[var(--el-text-color-regular)] max-w-md leading-relaxed block">
            {{ t('home.heroSubtitle') }}
          </el-text>

          <div class="mt-4 flex items-center gap-4">
            <RouterLink to="/auth/signup">
              <el-button
                id="hero-cta-primary"
                type="primary"
                size="large"
                round
                class="!bg-primary !text-on-primary !border-none !px-8 !py-4 !h-14 !font-bold text-sm hover:!opacity-90 shadow-md"
              >
                <span>{{ t('home.startGenerating') }}</span>
                <el-icon class="ml-2"><Right /></el-icon>
              </el-button>
            </RouterLink>
          </div>
        </el-col>

        <!-- Hero Right Rotating Vertical Poster Frame -->
        <el-col :xs="24" :lg="12" class="mt-8 lg:mt-0">
          <div class="relative h-[600px] lg:h-[720px] w-full max-w-[450px] mx-auto lg:ml-auto rounded-3xl overflow-hidden shadow-2xl border border-[var(--el-border-color-light)] transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ease-out">
            <el-image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuumcbvsEaY-2MsD9sPtVSbACJazwM1eQXeUwG2-7Pm1299gNqBN3qhfTaOCwuehhW-1G8f9zjWSf9BOO81IS8OaF2EPbM-HAptAsld5nCRrUHFDNDsh1cSDygYMT768r1UzME4Qzk310kZm_DrJm1M5uwElOPOhjZTFrRbFliHAkbzSOo7fXrazdmH7YaKEtSUZKC-f_so_AoEAy75KIu7AQLc7GTCQOAfHzDdu7dYTh1nICNlXKc6Q"
              alt="Cinematic Frame"
              fit="cover"
              lazy
              class="absolute inset-0 w-full h-full"
            />
            <div class="absolute inset-x-0 bottom-0 p-6 bg-black/75 flex flex-col justify-end text-white">
              <div class="flex items-center justify-between mb-4">
                <el-tag type="success" effect="dark" round class="!bg-primary !text-on-primary !border-none font-bold">
                  {{ t('home.renderingStatus') }}
                </el-tag>
                <span class="font-mono text-xs text-white">00:00:12:04</span>
              </div>
              <div class="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                <div class="h-full bg-primary w-[45%]"></div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </main>

    <!-- Marquee Ticker -->
    <div class="w-full bg-[var(--el-border-color-lighter)] border-y border-[#bbcabe]/30 py-6 overflow-hidden flex flex-col justify-between relative">
      <div class="flex justify-around items-center max-w-[1440px] mx-auto text-3xl md:text-4xl font-black uppercase tracking-wider text-[var(--el-text-color-primary)]/80 whitespace-nowrap opacity-60">
        <span>{{ t('home.ticker1') }}</span>
        <span>•</span>
        <span>{{ t('home.ticker2') }}</span>
        <span>•</span>
        <span>{{ t('home.ticker3') }}</span>
        <span>•</span>
        <span>{{ t('home.ticker4') }}</span>
      </div>
      <div class="flex justify-between px-8 py-2 border-t border-[#bbcabe]/20 mt-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--el-text-color-regular)]">
        <span>{{ t('home.serverCapacity') }}</span>
        <div class="flex items-center gap-2 text-primary">
          <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>{{ t('home.liveStatus') }}</span>
        </div>
      </div>
    </div>

    <!-- Studio Playground Bento Grid Section -->
    <section class="py-24 px-8 max-w-[1440px] mx-auto">
      <div class="max-w-2xl mb-12">
        <h2 class="text-4xl font-bold text-[var(--el-text-color-primary)] mb-4">{{ t('home.playgroundTitle') }}</h2>
        <el-text class="!text-base !text-[var(--el-text-color-regular)] block">{{ t('home.exploreSubtitle') }}</el-text>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">
        <!-- Card 1 -->
        <el-card shadow="hover" body-class="!p-0" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] group md:col-span-1 md:row-span-2 relative overflow-hidden">
          <el-image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCncWI3f72AGleGiHr901wO2HhDny3_92_3Jwaf_iweLjzWQBT8Dhu6n_w865Du9u8QtI2EqDNPJD4LBOJbUhhPuYjUWUMq0YwhkwEC7XK9zqiP7N1_yxfy12Svz59SanOt3OaemiWr1qxS320zYjJAzF9wtk5lAwfqGjGQHg1BZoJhXA8E7STrBNmBLgcPeG0k03_b9iz31P5W6KFWZDpco36NKrC3SiMAAp9h1S00fqOCTXndvD42cQ"
            alt="Cyberpunk Alley"
            fit="cover"
            lazy
            class="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-black/60 opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div class="absolute bottom-6 left-6 right-6">
            <el-tag type="info" effect="dark" round class="!bg-black/60 !border-white/10 text-white uppercase tracking-wider font-semibold">
              {{ t('home.cyberpunkAlley') }}
            </el-tag>
          </div>
        </el-card>

        <!-- Card 2 -->
        <el-card shadow="hover" body-class="!p-0" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] group md:col-span-1 md:row-span-1 relative overflow-hidden">
          <el-image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIkSH_KwcTXbzTsnIQatGSTMawl9_hPLwFD5089A9KOLjdfynryYyGvnTU-gMKtkV2Eonr4k7kEaIsIGNfNgUrgV-PXrsqsCj50d9HUHkhh05ta_yeqYTW2WpgMSi1xy5GDyOKZ02DAa7PF7_Yw-C66OMMHSDT1v34b3dLh6D2C6vJIQrgVs-iztqNhKbvxDX8N_iYMoQ2StnU5XfRSNbEMP5KlSILZPVaAv89rg3v7KlAuX_IQ4_3Sw"
            alt="Character Focus"
            fit="cover"
            lazy
            class="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-black/60 opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div class="absolute bottom-6 left-6 right-6">
            <el-tag type="info" effect="dark" round class="!bg-black/60 !border-white/10 text-white uppercase tracking-wider font-semibold">
              {{ t('home.characterFocus') }}
            </el-tag>
          </div>
        </el-card>

        <!-- Card 3 -->
        <el-card shadow="hover" body-class="!p-0" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] group md:col-span-1 md:row-span-2 relative overflow-hidden">
          <el-image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDb3-GtsSXaCBQWebZXEXnNwgUQKmjRcaAHiIu4L2aJbYNJMYT7ypvxrKUGbPjarIE0CRgTC3JyZ93sar15JT_dG9mJcWXbv6F5-uEdnAw-Yi-wODnfLvgNiDdpEztRo43Vl4tDuacVf5quAkdYTjh-uP4vi_NV5T1hiDGE7edwKtGuSFQGT59dqiK-q3nmJLRcrTat76rbyB__Ju7PwXA7odKUJYkrrXxWOsSPjM2pw7Q5i4NN6ttw2g"
            alt="Tech Lab"
            fit="cover"
            lazy
            class="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-black/60 opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div class="absolute bottom-6 left-6 right-6">
            <el-tag type="info" effect="dark" round class="!bg-black/60 !border-white/10 text-white uppercase tracking-wider font-semibold">
              {{ t('home.techLab') }}
            </el-tag>
          </div>
        </el-card>

        <!-- Card 4 (Generator Ring) -->
        <el-card shadow="hover" class="hidden md:flex !rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-border-color-lighter)] items-center justify-center p-8 text-center md:col-span-1 md:row-span-1 relative">
          <div class="w-16 h-16 rounded-full border-2 border-[var(--el-color-primary)] border-t-transparent animate-spin mb-4"></div>
          <div class="absolute bottom-6 left-6 right-6 z-10 text-center">
            <el-tag type="success" effect="plain" round class="!bg-primary/10 !text-on-primary-container !border-none font-bold uppercase tracking-wider">
              {{ t('home.generatingScene') }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </section>

    <!-- AI Director Feature Section -->
    <section class="py-24 bg-[var(--el-border-color-lighter)] border-t border-[#bbcabe]/30 relative overflow-hidden">
      <div class="max-w-[1440px] mx-auto px-8">
        <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 relative z-10">
          <h2 class="text-5xl font-black tracking-tight text-[var(--el-text-color-primary)]">
            AI <span class="text-primary">DIRECTOR</span>
          </h2>
          <el-text class="!text-right !text-[var(--el-text-color-regular)] !text-base max-w-sm block">
            {{ t('home.directorSubtitle') }}
          </el-text>
        </div>

        <el-row :gutter="24" class="relative z-10">
          <!-- Feature 1 -->
          <el-col :xs="24" :md="8">
            <el-card shadow="hover" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] hover:border-[var(--el-color-primary)]/50 transition-colors group p-4">
              <div class="w-full h-48 bg-[var(--el-border-color-lighter)] rounded-xl mb-6 flex items-center justify-center overflow-hidden relative">
                <span class="material-symbols-outlined text-[48px] text-[var(--el-text-color-regular)] group-hover:text-primary transition-colors group-hover:scale-110 duration-500">edit_document</span>
              </div>
              <h3 class="text-xl font-bold text-[var(--el-text-color-primary)] mb-3">{{ t('home.promptToFrameTitle') }}</h3>
              <el-text class="!text-sm !text-[var(--el-text-color-regular)] block">{{ t('home.promptToFrameDesc') }}</el-text>
            </el-card>
          </el-col>

          <!-- Feature 2 -->
          <el-col :xs="24" :md="8">
            <el-card shadow="hover" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] hover:border-[var(--el-color-primary)]/50 transition-colors group p-4">
              <div class="w-full h-48 bg-[var(--el-border-color-lighter)] rounded-xl mb-6 flex items-center justify-center overflow-hidden relative">
                <span class="material-symbols-outlined text-[48px] text-[var(--el-text-color-regular)] group-hover:text-primary transition-colors group-hover:scale-110 duration-500">animation</span>
              </div>
              <h3 class="text-xl font-bold text-[var(--el-text-color-primary)] mb-3">{{ t('home.sceneContinuityTitle') }}</h3>
              <el-text class="!text-sm !text-[var(--el-text-color-regular)] block">{{ t('home.sceneContinuityDesc') }}</el-text>
            </el-card>
          </el-col>

          <!-- Feature 3 -->
          <el-col :xs="24" :md="8">
            <el-card shadow="hover" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] hover:border-[var(--el-color-primary)]/50 transition-colors group p-4">
              <div class="w-full h-48 bg-[var(--el-border-color-lighter)] rounded-xl mb-6 flex items-center justify-center overflow-hidden relative">
                <span class="material-symbols-outlined text-[48px] text-[var(--el-text-color-regular)] group-hover:text-primary transition-colors group-hover:scale-110 duration-500">graphic_eq</span>
              </div>
              <h3 class="text-xl font-bold text-[var(--el-text-color-primary)] mb-3">{{ t('home.audioReactiveTitle') }}</h3>
              <el-text class="!text-sm !text-[var(--el-text-color-regular)] block">{{ t('home.audioReactiveDesc') }}</el-text>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </section>

    <!-- Choose Your Plan Section -->
    <section class="py-24 px-8 max-w-[1440px] mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-[var(--el-text-color-primary)] mb-4 uppercase tracking-tight">{{ t('home.pricingTitle') }}</h2>
        <el-text class="!text-base !text-[var(--el-text-color-regular)] block">{{ t('home.pricingSubtitle') }}</el-text>
      </div>

      <el-row :gutter="24" class="items-center">
        <el-col
          v-for="plan in pricingPlans"
          :key="plan.nameKey"
          :xs="24"
          :sm="12"
          :lg="6"
        >
          <el-card
            shadow="hover"
            class="!rounded-[2rem] border flex flex-col h-full transition-all relative !bg-[var(--el-card-bg-color)]"
            :class="plan.highlight ? 'border-2 !border-[var(--el-color-primary)] shadow-xl transform lg:-translate-y-4' : 'border-[var(--el-border-color-light)]'"
          >
            <!-- Floating Most Popular Badge -->
            <div v-if="plan.badge" class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              {{ plan.badge }}
            </div>

            <div class="mb-8" :class="plan.badge ? 'mt-2' : ''">
              <h3 class="text-xl font-bold text-[var(--el-text-color-primary)]">{{ t(plan.nameKey) }}</h3>
              <el-text class="!text-sm !text-[var(--el-text-color-regular)] mt-2 block">{{ t(plan.subtitleKey) }}</el-text>
            </div>

            <div class="mb-8">
              <span class="text-4xl font-bold text-[var(--el-text-color-primary)]">{{ plan.price }}</span>
              <el-text class="!text-sm !text-[var(--el-text-color-regular)]">{{ t('home.perMonth') }}</el-text>
            </div>

            <ul class="flex flex-col gap-4 mb-8 flex-grow">
              <li v-for="feat in plan.features" :key="feat" class="flex items-center gap-3 text-sm text-[var(--el-text-color-regular)]">
                <span class="material-symbols-outlined text-[18px] text-primary">check</span>
                <span>{{ feat }}</span>
              </li>
            </ul>

            <RouterLink to="/auth/signup" class="w-full block">
              <el-button
                round
                class="w-full !py-3 !font-bold text-sm"
                :type="plan.highlight ? 'primary' : 'default'"
                :class="plan.highlight ? '!bg-primary !text-on-primary !border-none hover:!opacity-90' : '!border-[var(--el-border-color)] !text-[var(--el-text-color-primary)]'"
              >
                {{ t(plan.ctaKey) }}
              </el-button>
            </RouterLink>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- Loved by Creators Section (Testimonials) -->
    <section class="py-24 bg-[var(--el-border-color-lighter)] border-t border-[#bbcabe]/30">
      <div class="max-w-[1440px] mx-auto px-8">
        <h2 class="text-4xl font-black text-[var(--el-text-color-primary)] mb-12 uppercase tracking-tight">{{ t('home.lovedByCreators') }}</h2>

        <el-row :gutter="32">
          <el-col v-for="item in testimonials" :key="item.nameKey" :xs="24" :md="12">
            <el-card shadow="hover" class="!rounded-2xl border border-[var(--el-border-color-light)] !bg-[var(--el-card-bg-color)] space-y-6 shadow-sm p-4">
              <el-text class="!text-base !text-[var(--el-text-color-regular)] italic leading-relaxed block">
                "{{ t(item.quoteKey) }}"
              </el-text>
              <div class="flex items-center gap-4 pt-4">
                <el-avatar :src="item.avatar" :size="48" />
                <div>
                  <h4 class="font-bold text-sm text-[var(--el-text-color-primary)]">{{ t(item.nameKey) }}</h4>
                  <el-text class="!text-xs !text-[var(--el-text-color-regular)] block">{{ t(item.roleKey) }}</el-text>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </section>

    <!-- Vibrant Mint Green Final CTA Banner -->
    <section class="py-32 bg-primary relative overflow-hidden flex flex-col items-center justify-center text-center px-8">
      <h2 class="text-5xl lg:text-6xl font-black text-on-primary mb-6 max-w-3xl uppercase tracking-tighter leading-none">
        {{ t('home.finalCtaTitle') }}
      </h2>
      <el-text class="!text-base !text-on-primary/80 max-w-xl mb-10 font-medium block">
        {{ t('home.finalCtaSubtitle') }}
      </el-text>
      <RouterLink to="/auth/signup">
        <el-button
          type="info"
          size="large"
          round
          class="!bg-[#1c1b1b] !text-white !px-10 !py-4 !h-14 !font-bold text-sm uppercase tracking-wider hover:!bg-[#313030] shadow-lg border-none"
        >
          {{ t('home.finalCtaBtn') }}
        </el-button>
      </RouterLink>
    </section>
  </div>
</template>
