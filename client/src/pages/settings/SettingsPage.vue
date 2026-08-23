<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

import ProfileTab from './tabs/ProfileTab.vue';
import BillingTab from './tabs/BillingTab.vue';
import TeamTab from './tabs/TeamTab.vue';
import AssetHostingTab from './tabs/AssetHostingTab.vue';
import ApiModelsTab from './tabs/ApiModelsTab.vue';
import RenderClusterTab from './tabs/RenderClusterTab.vue';
import ObservabilityTab from './tabs/ObservabilityTab.vue';
import UserDirectoryTab from './tabs/UserDirectoryTab.vue';
import PlatformsTab from './tabs/PlatformsTab.vue';
import LegalTab from './tabs/LegalTab.vue';

const { t } = useI18n();
const authStore = useAuthStore();

const activeTab = ref<'profile' | 'billing' | 'hosting' | 'api' | 'platforms' | 'cluster' | 'observability' | 'users' | 'compliance' | 'privacy'>('profile');

// ─── Studio Admin Infrastructure Shared State ─────────────────────────────────
const studioConfig = ref({
  s3: {
    bucketName: '',
    region: '',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    accountId: '',
    publicDomain: '',
    provider: 'gcs',
    enabled: true,
  },
  gcs: {
    bucketName: 'shine-studio-media',
    projectId: '',
    keyFilename: '',
    publicDomain: '',
    enabled: true,
  },
  cloudRun: {
    renderUrl: '',
    serviceName: 'shine-render-worker',
    region: 'us-central1',
  },
  pubsub: {
    topicRender: 'shine-render-jobs',
    subscriptionRender: 'shine-render-sub',
  },
  email: {
    smtpHost: '',
    smtpPort: 465,
    ssl: true,
    senderEmail: '',
    senderName: '',
    password: '',
    enabled: false,
  },
  flowAccounts: [] as Array<{ id: string; email: string; status: string; credits: number; model: string; lastSyncedAt?: string }>,
  gemini: {
    textModel: '',
    imageModel: '',
    videoModel: '',
    audioModel: '',
    musicModel: '',
    agentModel: '',
    temperature: 0.7,
    maxTokens: 8192,
    enableThinking: true,
  },
  creditRates: {
    scriptGeneration: 15,
    characterAnchors: 10,
    sceneImage: 15,
    videoGeneration: 50,
    voiceoverTts: 10,
    bgmMusic: 10,
    videoRender: 30,
    cliffhangerHook: 5,
    subtitleTranslate: 5,
  },
  parallel: {
    apiKey: '',
    concurrency: 8,
    endpoint: 'https://search.parallel.ai/mcp',
  },
  grafana: {
    url: 'https://bronzeholly2284.grafana.net',
    mcpEndpoint: 'https://mcp.grafana.com/mcp',
    apiKey: '',
    dashboardUid: 'shine-system-overview',
  },
  pexels: {
    url: 'https://api.pexels.com',
    apiKey: '',
  },
  pixabay: {
    url: 'https://pixabay.com/api/',
    apiKey: '',
  },
  freesound: {
    url: 'https://freesound.org/apiv2/',
    apiKey: '',
  },
  deepgram: {
    url: 'https://api.deepgram.com/v1',
    apiKey: '',
    model: 'nova-3',
  },
  elevenlabs: {
    url: 'https://api.elevenlabs.io',
    apiKey: '',
    model: 'eleven_multilingual_v2',
  },
  captcha: {
    method: 'yescaptcha',
    apiKey: '',
    baseUrl: 'https://api.yescaptcha.com',
  },
  notifications: {
    slackWebhook: '',
    discordWebhook: '',
    emailAlerts: true,
  },
});

async function loadStudioConfig() {
  try {
    const res: any = await http.get('/admin/studio-config');
    if (res?.data) studioConfig.value = { ...studioConfig.value, ...res.data };
  } catch (err) {
    console.error('Failed to load studio config', err);
  }
}

async function saveStudioConfig() {
  try {
    await http.patch('/admin/studio-config', studioConfig.value);
    toast.success(t('toast.studioConfigSaved', 'Studio configuration saved successfully!'));
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to save studio configuration');
  }
}

onMounted(() => {
  loadStudioConfig();
});
</script>

<template>
  <div class="h-full flex-1 flex overflow-hidden font-sans">
    <!-- Left Sticky Sidebar Settings Navigation -->
    <aside class="w-64 border-r border-[var(--el-border-color)] bg-[var(--el-bg-color)] flex flex-col p-6 space-y-6 flex-shrink-0 select-none overflow-y-auto">
      <div class="space-y-1">
        <h1 class="text-xl font-bold tracking-tight text-[var(--el-text-color-primary)]">
          {{ t('settings.settingsTitle') }}
        </h1>
        <p class="text-xs text-[var(--el-text-color-secondary)]">
          {{ t('settings.settingsDesc') }}
        </p>
      </div>

      <!-- Account Group -->
      <div class="space-y-3">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-[var(--el-text-color-secondary)]">
          {{ t('settings.account') }}
        </h3>
        <nav class="space-y-1.5">
          <el-button
            @click="activeTab = 'profile'"
            :type="activeTab === 'profile' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-user mr-2 text-xs"></i>
            <span>{{ t('settings.profileSettings') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'billing'"
            :type="activeTab === 'billing' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-credit-card mr-2 text-xs"></i>
            <span>{{ t('settings.billingPlan') }}</span>
          </el-button>
          <!-- <el-button
            @click="activeTab = 'team'"
            :type="activeTab === 'team' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-users mr-2 text-xs"></i>
            <span>{{ t('settings.teamMembers') }}</span>
          </el-button> -->
        </nav>
      </div>

      <!-- Studio (Admin) Group — Only visible to Studio Admin -->
      <div v-if="authStore.isAdmin" class="space-y-3 pt-4 border-t border-[var(--el-border-color)]/40">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-[var(--el-text-color-secondary)]">
          {{ t('settings.studio') }}
        </h3>
        <nav class="space-y-1.5">
          <el-button
            @click="activeTab = 'hosting'"
            :type="activeTab === 'hosting' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-database mr-2 text-xs"></i>
            <span>{{ t('settings.assetHosting') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'api'"
            :type="activeTab === 'api' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-globe mr-2 text-xs"></i>
            <span>{{ t('settings.apiAiModels') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'platforms'"
            :type="activeTab === 'platforms' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-share-nodes mr-2 text-xs"></i>
            <span>{{ t('settings.platformIntegrations') || 'Platforms & SSO' }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'cluster'"
            :type="activeTab === 'cluster' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-microchip mr-2 text-xs"></i>
            <span>{{ t('settings.renderCluster') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'observability'"
            :type="activeTab === 'observability' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-chart-line mr-2 text-xs"></i>
            <span>{{ t('settings.observabilityTraces') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'users'"
            :type="activeTab === 'users' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-user-shield mr-2 text-xs"></i>
            <span>{{ t('settings.userDirectory') }}</span>
          </el-button>
        </nav>
      </div>

      <!-- Legal & Info -->
      <div class="space-y-3 pt-4 border-t border-[var(--el-border-color)]/40">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-[var(--el-text-color-secondary)]">
          {{ t('settings.legal') }}
        </h3>
        <nav class="space-y-1.5">
          <el-button
            @click="activeTab = 'compliance'"
            :type="activeTab === 'compliance' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-file-contract mr-2 text-xs"></i>
            <span>{{ t('settings.complianceTerms') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'privacy'"
            :type="activeTab === 'privacy' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-user-lock mr-2 text-xs"></i>
            <span>{{ t('settings.privacyPolicy') }}</span>
          </el-button>
        </nav>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto p-10 bg-[var(--el-bg-color-page)]">
      <div class="max-w-5xl mx-auto pb-16">
        <!-- TAB 1: Profile Settings -->
        <ProfileTab v-if="activeTab === 'profile'" />

        <!-- TAB 2: Billing & Plan -->
        <BillingTab v-else-if="activeTab === 'billing'" />

        <!-- TAB 3: Team Members -->
        <!-- <TeamTab v-else-if="activeTab === 'team'" /> -->

        <!-- TAB 4: Asset Hosting (S3 / GCS / R2 / B2) -->
        <AssetHostingTab
          v-else-if="activeTab === 'hosting'"
          :config="studioConfig"
          @save="saveStudioConfig"
        />

        <!-- TAB 5: API & AI Models -->
        <ApiModelsTab
          v-else-if="activeTab === 'api'"
          :config="studioConfig"
          @save="saveStudioConfig"
        />

        <!-- TAB 6: Platform Integrations & SSO -->
        <PlatformsTab v-else-if="activeTab === 'platforms'" />

        <!-- TAB 7: Render Cluster & GPUs -->
        <RenderClusterTab
          v-else-if="activeTab === 'cluster'"
          :config="studioConfig"
          @save="saveStudioConfig"
        />

        <!-- TAB 8: Observability & Traces -->
        <ObservabilityTab
          v-else-if="activeTab === 'observability'"
          :config="studioConfig"
        />

        <!-- TAB 9: User Directory & Roles -->
        <UserDirectoryTab v-else-if="activeTab === 'users'" />

        <!-- TAB 10: Legal (Terms / Privacy) -->
        <LegalTab
          v-else-if="activeTab === 'compliance' || activeTab === 'privacy'"
          :type="activeTab"
        />
      </div>
    </main>
  </div>
</template>
