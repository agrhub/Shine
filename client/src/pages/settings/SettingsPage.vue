<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const { t } = useI18n();
const authStore = useAuthStore();

const activeTab = ref<'profile' | 'billing' | 'team' | 'render' | 'hosting' | 'api' | 'compliance' | 'privacy'>('profile');

// ─── Profile State ────────────────────────────────────────────────────────────
const fullName = ref('');
const emailAddress = ref('');
const avatarUrl = ref('');
const avatarInputRef = ref<HTMLInputElement | null>(null);
const is2FAEnabled = ref(false);
const isSaving = ref(false);

// Password Change State
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isUpdatingPassword = ref(false);

// API Key & Integrations
const apiKey = ref('');
const apiKeyHidden = ref(true);
const daysRotated = ref(12);

const integrations = ref([
  { id: 'youtube', name: 'YouTube Shorts', icon: 'fa-brands fa-youtube', connected: false, channel: '' },
  { id: 'facebook', name: 'Facebook Reels', icon: 'fa-brands fa-facebook', connected: true, channel: '@ShineStudioHQ' },
  { id: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok', connected: true, channel: '@shinestudio_ai' },
]);

function triggerAvatarUpload() {
  avatarInputRef.value?.click();
}

function handleAvatarFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.error(t('toast.uploadImageFile'));
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvt) => {
    const base64 = loadEvt.target?.result as string;
    avatarUrl.value = base64;
    toast.success(t('settings.avatarUpdated'));
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  avatarUrl.value = '';
}

function toggleIntegration(item: any) {
  item.connected = !item.connected;
  toast.success(`${item.name}: ${item.connected ? t('settings.connected') : 'Disconnected'}`);
}

function copyApiKey() {
  navigator.clipboard.writeText(apiKey.value);
  toast.success(t('settings.copied'));
}

function rotateApiKey() {
  apiKey.value = `sh_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  daysRotated.value = 0;
  toast.success(t('settings.keyRotated'));
}

async function handlePasswordChange() {
  if (!newPassword.value) {
    toast.error(t('toast.enterNewPassword'));
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t('toast.passwordsDoNotMatch'));
    return;
  }
  isUpdatingPassword.value = true;
  try {
    await http.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    toast.success(t('settings.passwordUpdated'));
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Failed to change password');
  } finally {
    isUpdatingPassword.value = false;
  }
}

async function handleSaveChanges() {
  isSaving.value = true;
  try {
    const res: any = await http.patch('/auth/profile', {
      name: fullName.value,
      email: emailAddress.value,
      avatar: avatarUrl.value,
      api_key: apiKey.value,
      api_key_rotated_at: new Date(Date.now() - daysRotated.value * 86400000).toISOString(),
      two_factor_enabled: is2FAEnabled.value,
      integrations: integrations.value,
    });
    if (res?.data?.user) {
      authStore.user = { ...authStore.user, ...res.data.user };
      localStorage.setItem('shine_user', JSON.stringify(authStore.user));
    }
    toast.success(t('settings.savedSuccess'));
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Failed to update profile');
  } finally {
    isSaving.value = false;
  }
}

// ─── Billing State ────────────────────────────────────────────────────────────
const billingData = ref({
  tier: 'creator',
  creditBalance: 850,
  creditQuota: 1000,
  monthlyPriceUsd: 29,
});
const usageHistory = ref<any[]>([]);
const isUpgrading = ref(false);

const tiersList = computed(() => [
  { id: 'free', name: t('settings.freeTier'), price: 0, credits: 100, desc: 'Casual testing & learning' },
  { id: 'creator', name: t('settings.creatorPro'), price: 29, credits: 1000, desc: 'High-frequency 9:16 drama generation', popular: true },
  { id: 'studio', name: t('settings.studioTeam'), price: 99, credits: 5000, desc: 'High-throughput cluster & S3 dedicated' },
  { id: 'enterprise', name: t('settings.enterpriseVip'), price: 299, credits: 20000, desc: 'Dedicated GPU clusters & custom models' },
]);

async function loadBilling() {
  try {
    const [tierRes, historyRes]: any = await Promise.all([
      http.get('/billing/tier'),
      http.get('/billing/usage-history'),
    ]);
    if (tierRes?.data) billingData.value = tierRes.data;
    if (historyRes?.data) usageHistory.value = historyRes.data;
  } catch (err) {
    console.error('Failed to fetch billing info', err);
  }
}

async function handleUpgradePlan(tierId: string) {
  isUpgrading.value = true;
  try {
    const res: any = await http.post('/billing/checkout', { tier: tierId });
    if (res?.data?.url) {
      toast.info(t('toast.redirectingCheckout'));
      window.location.href = res.data.url;
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Upgrade failed');
  } finally {
    isUpgrading.value = false;
  }
}

// ─── Team Members State ───────────────────────────────────────────────────────
const teamMembers = ref<any[]>([]);
const isInviteModalOpen = ref(false);
const newMemberEmail = ref('');
const newMemberRole = ref('Editor');

async function loadTeamMembers() {
  try {
    const res: any = await http.get('/admin/team-members');
    if (res?.data) teamMembers.value = res.data;
  } catch (err) {
    console.error('Failed to fetch team members', err);
  }
}

async function inviteTeamMember() {
  if (!newMemberEmail.value) return;
  try {
    const res: any = await http.post('/admin/team-members', {
      email: newMemberEmail.value,
      role: newMemberRole.value,
    });
    if (res?.data) {
      teamMembers.value.push(res.data);
      newMemberEmail.value = '';
      isInviteModalOpen.value = false;
      toast.success(t('toast.teamMemberInvited'));
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to invite member');
  }
}

async function removeTeamMember(id: string) {
  try {
    await http.delete(`/admin/team-members/${id}`);
    teamMembers.value = teamMembers.value.filter(m => m.id !== id);
    toast.success(t('toast.memberRemoved'));
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to remove member');
  }
}

// ─── Studio Admin Infrastructure State ─────────────────────────────────────────
const studioConfig = ref({
  s3: {
    bucketName: '',
    region: '',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    accountId: '',
    publicDomain: '',
    provider: '',
    enabled: false,
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
    textModel: 'gemini-2.0-flash-exp',
    imageModel: 'imagen-3.0-generate-002',
    videoModel: 'veo-2.0-generate-001',
    audioModel: 'nova-3',
    musicModel: 'lyria-music-v1',
    agentModel: 'gemini-2.0-pro-exp',
    temperature: 0.7,
    maxTokens: 8192,
    enableThinking: true,
  },
  parallel: {
    apiKey: '',
    concurrency: 8,
    endpoint: 'https://api.parallel.ai/v1',
  },
  clickhouse: {
    host: '',
    port: 8443,
    user: 'default',
    password: '',
    database: 'microcine',
  },
  grafana: {
    url: '',
    mcpEndpoint: 'https://mcp.grafana.com/mcp',
    apiKey: '',
  },
  pexels: {
    url: 'https://api.pexels.com',
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
  ibmConfluent: {
    bootstrapServers: '',
    restEndpoint: '',
    apiKey: '',
  },
  replit: {
    apiKey: '',
  },
  notifications: {
    slackWebhook: '',
    discordWebhook: '',
    emailAlerts: true,
  },
});
const isSavingStudioConfig = ref(false);

// Flow Cookie Add Dialog State
const isAddFlowModalOpen = ref(false);
const newFlowEmail = ref('');
const newFlowCookie = ref('');
const newFlowSessionToken = ref('');
const newFlowModel = ref('Veo-2-HQ');
const isSubmittingFlow = ref(false);

async function loadStudioConfig() {
  try {
    const res: any = await http.get('/admin/studio-config');
    if (res?.data) studioConfig.value = { ...studioConfig.value, ...res.data };
  } catch (err) {
    console.error('Failed to load studio config', err);
  }
}

async function saveStudioConfig() {
  isSavingStudioConfig.value = true;
  try {
    await http.patch('/admin/studio-config', studioConfig.value);
    toast.success(t('toast.studioConfigSaved'));
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to save studio configuration');
  } finally {
    isSavingStudioConfig.value = false;
  }
}

async function handleAddFlowAccount() {
  if (!newFlowEmail.value || (!newFlowCookie.value && !newFlowSessionToken.value)) {
    toast.error(t('toast.enterFlowCredentials'));
    return;
  }
  isSubmittingFlow.value = true;
  try {
    const res: any = await http.post('/admin/flow-accounts', {
      email: newFlowEmail.value,
      cookie: newFlowCookie.value,
      sessionToken: newFlowSessionToken.value,
      model: newFlowModel.value,
    });
    if (res?.data) {
      studioConfig.value.flowAccounts.push({
        id: res.data.id || `flow_${Date.now()}`,
        email: newFlowEmail.value,
        status: 'ACTIVE',
        credits: 100,
        model: newFlowModel.value,
        lastSyncedAt: new Date().toISOString(),
      });
      newFlowEmail.value = '';
      newFlowCookie.value = '';
      newFlowSessionToken.value = '';
      isAddFlowModalOpen.value = false;
      toast.success(t('toast.flowAccountAdded'));
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to add flow account');
  } finally {
    isSubmittingFlow.value = false;
  }
}

async function handleRemoveFlowAccount(id: string) {
  try {
    await http.delete(`/admin/flow-accounts/${id}`);
    studioConfig.value.flowAccounts = studioConfig.value.flowAccounts.filter(a => a.id !== id);
    toast.success(t('toast.flowAccountRemoved'));
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to remove flow account');
  }
}

// ─── Legal Terms & Privacy Data ───────────────────────────────────────────────
const termsSections = [
  { titleKey: 'terms.sec1Title', bodyKey: 'terms.sec1Body' },
  { titleKey: 'terms.sec2Title', bodyKey: 'terms.sec2Body' },
  { titleKey: 'terms.sec3Title', bodyKey: 'terms.sec3Body' },
  { titleKey: 'terms.sec4Title', bodyKey: 'terms.sec4Body' },
  { titleKey: 'terms.sec5Title', bodyKey: 'terms.sec5Body' },
];

const privacySections = [
  { titleKey: 'privacy.sec1Title', bodyKey: 'privacy.sec1Body' },
  { titleKey: 'privacy.sec2Title', bodyKey: 'privacy.sec2Body' },
  { titleKey: 'privacy.sec3Title', bodyKey: 'privacy.sec3Body' },
  { titleKey: 'privacy.sec4Title', bodyKey: 'privacy.sec4Body' },
];

// ─── Initial Load ─────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res: any = await http.get('/auth/me');
    if (res?.data?.user) {
      const u = res.data.user;
      authStore.user = { ...authStore.user, ...u };
      fullName.value = u.name || '';
      emailAddress.value = u.email || '';
      avatarUrl.value = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=faces';
      if (u.api_key) apiKey.value = u.api_key;
      if (u.two_factor_enabled !== undefined) is2FAEnabled.value = !!u.two_factor_enabled;
      if (u.integrations && u.integrations.length) integrations.value = u.integrations;
      if (u.api_key_rotated_at) {
        const diffMs = Date.now() - new Date(u.api_key_rotated_at).getTime();
        daysRotated.value = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }
  } catch {
    if (authStore.user) {
      fullName.value = authStore.user.name || 'Tan Do';
      emailAddress.value = authStore.user.email || 'dmtan90@gmail.com';
      avatarUrl.value = authStore.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=faces';
    }
  }
}

onMounted(() => {
  loadProfile();
  loadBilling();
  loadTeamMembers();
  loadStudioConfig();
});
</script>

<template>
  <div class="h-full flex-1 flex overflow-hidden font-sans">
    <!-- Secondary Settings Nav -->
    <div class="w-64 border-r border-[var(--el-border-color)]/60 p-6 space-y-6 overflow-y-auto shrink-0 bg-[var(--el-bg-color)]">
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
          <el-button
            @click="activeTab = 'team'"
            :type="activeTab === 'team' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-users mr-2 text-xs"></i>
            <span>{{ t('settings.teamMembers') }}</span>
          </el-button>
        </nav>
      </div>

      <!-- Studio (Admin) Group -->
      <div class="space-y-3 pt-4 border-t border-[var(--el-border-color)]/40">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-[var(--el-text-color-secondary)]">
          {{ t('settings.studio') }}
        </h3>
        <nav class="space-y-1.5">
          <el-button
            @click="activeTab = 'render'"
            :type="activeTab === 'render' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-sliders mr-2 text-xs"></i>
            <span>{{ t('settings.renderPresets') }}</span>
          </el-button>
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
            <i class="fa-solid fa-brain mr-2 text-xs"></i>
            <span>{{ t('settings.apiIntegrations') }}</span>
          </el-button>
        </nav>
      </div>

      <!-- Legal Group -->
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
            <span>{{ t('settings.complianceLogs') }}</span>
          </el-button>
          <el-button
            @click="activeTab = 'privacy'"
            :type="activeTab === 'privacy' ? 'primary' : ''"
            round
            class="w-full !justify-start !ml-0"
          >
            <i class="fa-solid fa-shield-halved mr-2 text-xs"></i>
            <span>{{ t('settings.privacyPolicy') }}</span>
          </el-button>
        </nav>
      </div>
    </div>

    <!-- Settings Content Area -->
    <div class="flex-1 overflow-y-auto p-8 lg:p-12 bg-[var(--el-bg-color-page)]">
      <div class="max-w-4xl space-y-12 pb-16">
        
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 1: PROFILE SETTINGS                                                -->
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'profile'" class="space-y-10">
          <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
                {{ t('settings.profileSettings') }}
              </h2>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                {{ t('settings.profileSubtitle') }}
              </p>
            </div>
            <el-button
              type="primary"
              round
              :loading="isSaving"
              @click="handleSaveChanges"
            >
              {{ t('settings.saveChanges') }}
            </el-button>
          </div>

          <!-- Avatar Section -->
          <section class="space-y-4">
            <div class="flex items-center gap-5 p-5 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
              <div class="relative group cursor-pointer" @click="triggerAvatarUpload">
                <img
                  :src="avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=faces'"
                  alt="avatar"
                  class="w-16 h-16 rounded-full object-cover ring-2 ring-[var(--el-color-primary)] shadow-soft"
                />
                <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i class="fa-solid fa-camera text-white text-sm"></i>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-[var(--el-text-color-primary)]">
                  {{ t('settings.avatar') }}
                </h4>
                <div class="flex items-center gap-2">
                  <el-button size="small" type="primary" round @click="triggerAvatarUpload">
                    <i class="fa-solid fa-upload mr-1.5 text-xs"></i>
                    {{ t('settings.uploadAvatar') }}
                  </el-button>
                  <el-button v-if="avatarUrl" size="small" round type="danger" link @click="removeAvatar">
                    {{ t('settings.removeAvatar') }}
                  </el-button>
                </div>
              </div>
              <input ref="avatarInputRef" type="file" accept="image/*" class="hidden" @change="handleAvatarFileChange" />
            </div>

            <!-- Profile Info Inputs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-[var(--el-text-color-secondary)]">
                  {{ t('settings.fullName') }}
                </label>
                <el-input v-model="fullName" size="large" placeholder="Your Name" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-[var(--el-text-color-secondary)]">
                  {{ t('settings.emailAddress') }}
                </label>
                <el-input v-model="emailAddress" size="large" type="email" placeholder="your@email.com" />
              </div>
            </div>
          </section>

          <!-- Connected Platform Channels -->
          <section class="space-y-4 pt-2">
            <div class="pb-3 border-b border-[var(--el-border-color)]">
              <h3 class="text-base font-semibold text-[var(--el-text-color-primary)]">
                {{ t('settings.connectedPlatforms') }}
              </h3>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                {{ t('settings.connectedPlatformsSubtitle') }}
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="item in integrations"
                :key="item.id"
                class="p-5 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft flex flex-col justify-between space-y-4"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[var(--el-fill-color-light)] border border-[var(--el-border-color)] flex items-center justify-center text-lg text-[var(--el-text-color-primary)]">
                    <i :class="item.icon"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ item.name }}</h4>
                    <span :class="['text-[11px] font-bold', item.connected ? 'text-[var(--el-color-primary)]' : 'text-[var(--el-text-color-secondary)]']">
                      {{ item.connected ? (item.channel || t('settings.connected')) : t('settings.connect') }}
                    </span>
                  </div>
                </div>
                <el-button
                  size="small"
                  round
                  :type="item.connected ? 'default' : 'primary'"
                  @click="toggleIntegration(item)"
                >
                  {{ item.connected ? 'Disconnect' : 'Connect Channel' }}
                </el-button>
              </div>
            </div>
          </section>

          <!-- Change Password Section -->
          <section class="space-y-4 pt-2">
            <div class="pb-3 border-b border-[var(--el-border-color)]">
              <h3 class="text-base font-semibold text-[var(--el-text-color-primary)]">
                {{ t('settings.password') }}
              </h3>
            </div>
            <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.currentPassword') }}</label>
                  <el-input v-model="currentPassword" type="password" show-password placeholder="••••••••" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.newPassword') }}</label>
                  <el-input v-model="newPassword" type="password" show-password placeholder="New password" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.confirmPassword') }}</label>
                  <el-input v-model="confirmPassword" type="password" show-password placeholder="Confirm password" />
                </div>
              </div>
              <div class="flex justify-end">
                <el-button type="primary" round :loading="isUpdatingPassword" @click="handlePasswordChange">
                  {{ t('settings.updatePassword') }}
                </el-button>
              </div>
            </div>
          </section>

          <!-- 2FA Security Section -->
          <section class="space-y-4 pt-2">
            <div class="flex items-center justify-between p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-[var(--el-color-primary)]/10 flex items-center justify-center text-[var(--el-color-primary)]">
                  <i class="fa-solid fa-shield-halved text-xl"></i>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-[var(--el-text-color-primary)]">
                    {{ t('settings.twoFactorAuth') }}
                  </h4>
                  <p class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                    {{ t('settings.twoFactorDesc') }}
                  </p>
                </div>
              </div>
              <el-switch v-model="is2FAEnabled" size="large" @change="(val) => toast.info(val ? t('toast.twoFactorEnabled') : t('toast.twoFactorDisabled'))" />
            </div>
          </section>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 2: BILLING & PLAN                                                  -->
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'billing'" class="space-y-10">
          <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
                {{ t('billing.title') }}
              </h2>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                Manage your active AI processing tier, quota usage and invoices.
              </p>
            </div>
            <el-tag type="success" size="large" effect="dark" class="!rounded-xl font-bold uppercase">
              Current: {{ billingData.tier }}
            </el-tag>
          </div>

          <!-- Current Balance Card -->
          <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span class="text-xs text-[var(--el-text-color-secondary)] font-bold uppercase tracking-wider">{{ t('settings.aiQuotaBalance') }}</span>
              <h3 class="text-3xl font-extrabold text-[var(--el-color-primary)] mt-1">
                {{ billingData.creditBalance }} / {{ billingData.creditQuota }} Credits
              </h3>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                Resets on the 1st of every month automatically.
              </p>
            </div>
            <div class="w-full md:w-64 space-y-2">
              <div class="flex justify-between text-xs text-[var(--el-text-color-secondary)] font-semibold">
                <span>Usage</span>
                <span>{{ Math.round((billingData.creditBalance / billingData.creditQuota) * 100) }}% {{ t('settings.percentAvailable') }}</span>
              </div>
              <el-progress :percentage="Math.round((billingData.creditBalance / billingData.creditQuota) * 100)" :stroke-width="10" :show-text="false" color="var(--el-color-primary)" />
            </div>
          </div>

          <!-- Upgrade Tier Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div
              v-for="plan in tiersList"
              :key="plan.id"
              :class="[
                'p-6 bg-[var(--el-card-bg-color)] border rounded-2xl shadow-soft flex flex-col justify-between relative',
                billingData.tier === plan.id ? 'border-2 border-[var(--el-color-primary)]' : 'border-[var(--el-border-color)]'
              ]"
            >
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <h4 class="font-bold text-sm text-[var(--el-text-color-primary)]">{{ plan.name }}</h4>
                  <el-tag v-if="plan.popular" size="small" type="warning" effect="dark">{{ t('settings.popular') }}</el-tag>
                </div>
                <div>
                  <span class="text-2xl font-black text-[var(--el-text-color-primary)]">${{ plan.price }}</span>
                  <span class="text-xs text-[var(--el-text-color-secondary)]"> / month</span>
                </div>
                <p class="text-xs text-[var(--el-text-color-secondary)]">{{ plan.desc }}</p>
                <div class="text-xs font-semibold text-[var(--el-color-primary)]">
                  ⚡ {{ plan.credits.toLocaleString() }} AI credits
                </div>
              </div>

              <div class="mt-6">
                <el-button
                  v-if="billingData.tier === plan.id"
                  disabled
                  round
                  class="w-full"
                >
                  Active Plan
                </el-button>
                <el-button
                  v-else
                  type="primary"
                  round
                  :loading="isUpgrading"
                  class="w-full"
                  @click="handleUpgradePlan(plan.id)"
                >
                  Upgrade
                </el-button>
              </div>
            </div>
          </div>

          <!-- Credit Usage History -->
          <div class="space-y-4">
            <h3 class="text-base font-semibold text-[var(--el-text-color-primary)]">
              {{ t('settings.creditUsageHistory') }}
            </h3>
            <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl overflow-hidden shadow-soft">
              <el-table :data="usageHistory" style="width: 100%">
                <el-table-column prop="date" label="Date" width="160" />
                <el-table-column prop="type" label="Activity" width="180" />
                <el-table-column prop="detail" label="Details" />
                <el-table-column prop="credits" label="Credits" width="120">
                  <template #default="{ row }">
                    <span :class="row.credits > 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'">
                      {{ row.credits > 0 ? `+${row.credits}` : row.credits }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Status" width="110">
                  <template #default="{ row }">
                    <el-tag size="small" type="success">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 3: TEAM MEMBERS                                                    -->
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'team'" class="space-y-8">
          <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
                {{ t('settings.teamMembers') }}
              </h2>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                Collaborate and share micro-drama projects across your studio crew.
              </p>
            </div>
            <el-button type="primary" round @click="isInviteModalOpen = true">
              <i class="fa-solid fa-user-plus mr-1.5 text-xs"></i>
              {{ t('settings.inviteMember') }}
            </el-button>
          </div>

          <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl overflow-hidden shadow-soft">
            <el-table :data="teamMembers" style="width: 100%">
              <el-table-column label="Member" min-width="240">
                <template #default="{ row }">
                  <div class="flex items-center gap-3">
                    <img :src="row.avatar" class="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--el-border-color)]" />
                    <div>
                      <p class="text-xs font-semibold text-[var(--el-text-color-primary)]">{{ row.name }}</p>
                      <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ row.email }}</p>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="role" label="Role" width="130">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'Owner' ? 'warning' : 'primary'" size="small">{{ row.role }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sharedProjectsCount" label="Shared Projects" width="150" />
              <el-table-column prop="joinedAt" label="Joined" width="130" />
              <el-table-column label="Action" width="100" align="right">
                <template #default="{ row }">
                  <el-button v-if="row.role !== 'Owner'" type="danger" link size="small" @click="removeTeamMember(row.id)">
                    Remove
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 4: STUDIO INFRASTRUCTURE (RENDER PRESETS / S3 / API & AI)         -->
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'render' || activeTab === 'hosting' || activeTab === 'api'" class="space-y-10">
          <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
                {{ t('settings.adminStudioTitle') }}
              </h2>
              <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                {{ t('settings.adminStudioDesc') }}
              </p>
            </div>
            <el-button type="primary" round :loading="isSavingStudioConfig" @click="saveStudioConfig">
              Save Studio Infrastructure
            </el-button>
          </div>

          <!-- S3 / B2 Cloud Storage Config -->
          <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-base">
                  <i class="fa-solid fa-box-archive"></i>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.s3Storage') }} (S3 / Backblaze B2)</h3>
                  <p class="text-[11px] text-[var(--el-text-color-secondary)]">Provider: {{ studioConfig.s3.provider.toUpperCase() }}</p>
                </div>
              </div>
              <el-switch v-model="studioConfig.s3.enabled" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Bucket Name</label>
                <el-input v-model="studioConfig.s3.bucketName" placeholder="microcine" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Region</label>
                <el-input v-model="studioConfig.s3.region" placeholder="us-east-005" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">S3 Endpoint</label>
                <el-input v-model="studioConfig.s3.endpoint" placeholder="https://s3.us-east-005.backblazeb2.com" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Access Key ID</label>
                <el-input v-model="studioConfig.s3.accessKeyId" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Secret Access Key</label>
                <el-input v-model="studioConfig.s3.secretAccessKey" type="password" show-password />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Public Domain CDN</label>
                <el-input v-model="studioConfig.s3.publicDomain" placeholder="https://cdn.microcine.io" />
              </div>
            </div>
          </div>

          <!-- Email Server Config (Host, Port, SSL, Email, Password, Name) -->
          <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-base">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.emailServer') }}</h3>
                  <p class="text-[11px] text-[var(--el-text-color-secondary)]">SMTP / SendGrid Email Notifications & Password Resets</p>
                </div>
              </div>
              <el-switch v-model="studioConfig.email.enabled" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">SMTP Host</label>
                <el-input v-model="studioConfig.email.smtpHost" placeholder="smtp.sendgrid.net" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Port</label>
                <el-input v-model.number="studioConfig.email.smtpPort" placeholder="587" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Sender Name</label>
                <el-input v-model="studioConfig.email.senderName" placeholder="Shine Studio AI" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Sender Email</label>
                <el-input v-model="studioConfig.email.senderEmail" placeholder="notifications@shine-studio.ai" />
              </div>
              <div>
                <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">SMTP Password / API Key</label>
                <el-input v-model="studioConfig.email.password" type="password" show-password placeholder="••••••••••••" />
              </div>
              <div class="flex items-center gap-3 pt-6">
                <el-switch v-model="studioConfig.email.ssl" />
                <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">Use SSL / TLS</span>
              </div>
            </div>
          </div>

          <!-- Flow / Veo Accounts Pool with Add Cookie Modal -->
          <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#1a1b23] text-primary border border-[#2d2e3a] flex items-center justify-center text-base">
                  <i class="fa-solid fa-layer-group"></i>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.flowAccounts') }}</h3>
                  <p class="text-[11px] text-[var(--el-text-color-secondary)]">Google Veo-2 Video Synthesis Account & Cookie Session Pool</p>
                </div>
              </div>
              <el-button type="primary" size="small" round @click="isAddFlowModalOpen = true">
                <i class="fa-solid fa-plus mr-1 text-xs"></i> Add Flow Cookie
              </el-button>
            </div>
            
            <div v-if="studioConfig.flowAccounts && studioConfig.flowAccounts.length > 0" class="space-y-2">
              <div
                v-for="acc in studioConfig.flowAccounts"
                :key="acc.id"
                class="flex items-center justify-between p-3.5 bg-[var(--el-fill-color-light)] rounded-xl text-xs"
              >
                <div>
                  <span class="font-bold text-[var(--el-text-color-primary)]">{{ acc.email }}</span>
                  <span class="ml-2 text-[var(--el-text-color-secondary)]">({{ acc.model }})</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-primary">{{ acc.credits }} credits</span>
                  <el-tag size="small" :type="acc.status === 'ACTIVE' ? 'success' : 'info'">{{ acc.status }}</el-tag>
                  <el-button type="danger" link size="small" @click="handleRemoveFlowAccount(acc.id)">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                  </el-button>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-[var(--el-text-color-secondary)] py-2">
              No Flow accounts in pool. Click "Add Flow Cookie" to connect a Veo account.
            </div>
          </div>

          <!-- Comprehensive Gemini AI Models (Text, Image, Video, Audio, Music, Agent) -->
          <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
            <div class="pb-3 border-b border-[var(--el-border-color)] flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-base">
                <i class="fa-solid fa-brain"></i>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.geminiModels') }}</h3>
                <p class="text-[11px] text-[var(--el-text-color-secondary)]">Multi-Modal AI Pipeline Engines</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">1. Text Generation Model</label>
                <el-input v-model="studioConfig.gemini.textModel" placeholder="gemini-2.0-flash-exp" />
              </div>
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">2. Image / Storyboard Model</label>
                <el-input v-model="studioConfig.gemini.imageModel" placeholder="imagen-3.0-generate-002" />
              </div>
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">3. Video Generation Model</label>
                <el-input v-model="studioConfig.gemini.videoModel" placeholder="veo-2.0-generate-001" />
              </div>
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">4. Audio / Voice Model</label>
                <el-input v-model="studioConfig.gemini.audioModel" placeholder="nova-3" />
              </div>
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">5. Background Music Model</label>
                <el-input v-model="studioConfig.gemini.musicModel" placeholder="lyria-music-v1" />
              </div>
              <div>
                <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">6. Deep Reasoning Agent Model</label>
                <el-input v-model="studioConfig.gemini.agentModel" placeholder="gemini-2.0-pro-exp" />
              </div>
            </div>
          </div>

          <!-- Parallel, ClickHouse, Grafana & Pexels Providers (.env mapped) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Parallel & ClickHouse -->
            <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
              <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] flex items-center gap-2">
                <i class="fa-solid fa-bolt text-amber-500"></i>
                Parallel Concurrency & ClickHouse
              </h3>
              <div class="space-y-3 text-xs">
                <div>
                  <div class="flex justify-between font-semibold mb-1">
                    <span class="text-[var(--el-text-color-secondary)]">Concurrency Workers</span>
                    <span class="text-primary font-bold">{{ studioConfig.parallel.concurrency }} Parallel</span>
                  </div>
                  <el-slider v-model="studioConfig.parallel.concurrency" :min="1" :max="32" />
                </div>
                <div>
                  <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Parallel API Key</label>
                  <el-input v-model="studioConfig.parallel.apiKey" type="password" show-password />
                </div>
                <div class="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">ClickHouse Host</label>
                    <el-input v-model="studioConfig.clickhouse.host" />
                  </div>
                  <div>
                    <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">ClickHouse DB</label>
                    <el-input v-model="studioConfig.clickhouse.database" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Grafana, Pexels & Deepgram -->
            <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
              <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] flex items-center gap-2">
                <i class="fa-solid fa-chart-line text-cyan-500"></i>
                Grafana, Pexels & Audio Providers
              </h3>
              <div class="space-y-3 text-xs">
                <div>
                  <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Grafana Endpoint</label>
                  <el-input v-model="studioConfig.grafana.url" />
                </div>
                <div>
                  <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Pexels Stock Media API Key</label>
                  <el-input v-model="studioConfig.pexels.apiKey" type="password" show-password />
                </div>
                <div>
                  <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Deepgram Voice API Key</label>
                  <el-input v-model="studioConfig.deepgram.apiKey" type="password" show-password />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 5: LEGAL & PRIVACY (LOADED FROM TERMS.VUE & PRIVACY.VUE CONTENT)  -->
        <!-- ═══════════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'compliance' || activeTab === 'privacy'" class="space-y-8">
          <div class="pb-5 border-b border-[var(--el-border-color)]">
            <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)]">
              {{ activeTab === 'compliance' ? t('terms.title') : t('privacy.title') }}
            </h2>
            <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
              {{ activeTab === 'compliance' ? t('terms.lastUpdated') : t('privacy.lastUpdated') }}
            </p>
          </div>

          <!-- Compliance / Terms Sections -->
          <div v-if="activeTab === 'compliance'" class="space-y-4">
            <el-card
              v-for="sec in termsSections"
              :key="sec.titleKey"
              shadow="never"
              class="border border-[var(--el-border-color)] bg-[var(--el-card-bg-color)] p-2 rounded-2xl shadow-soft"
            >
              <h3 class="font-bold text-sm text-[var(--el-text-color-primary)] mb-2">{{ t(sec.titleKey) }}</h3>
              <p class="text-xs text-[var(--el-text-color-regular)] leading-relaxed">{{ t(sec.bodyKey) }}</p>
            </el-card>
          </div>

          <!-- Privacy Policy Sections -->
          <div v-else class="space-y-4">
            <el-card
              v-for="sec in privacySections"
              :key="sec.titleKey"
              shadow="never"
              class="border border-[var(--el-border-color)] bg-[var(--el-card-bg-color)] p-2 rounded-2xl shadow-soft"
            >
              <h3 class="font-bold text-sm text-[var(--el-text-color-primary)] mb-2">{{ t(sec.titleKey) }}</h3>
              <p class="text-xs text-[var(--el-text-color-regular)] leading-relaxed">{{ t(sec.bodyKey) }}</p>
            </el-card>
          </div>
        </div>

      </div>
    </div>

    <!-- Invite Member Dialog -->
    <el-dialog v-model="isInviteModalOpen" title="Invite Crew Member" width="440px">
      <div class="space-y-4 py-2">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Email Address</label>
          <el-input v-model="newMemberEmail" placeholder="crew@studio.ai" />
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Workspace Role</label>
          <el-select v-model="newMemberRole" class="w-full">
            <el-option label="Editor (Can edit scripts & generate videos)" value="Editor" />
            <el-option label="Viewer (Read-only access)" value="Viewer" />
            <el-option label="Admin (Full studio management)" value="Admin" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isInviteModalOpen = false">Cancel</el-button>
          <el-button type="primary" @click="inviteTeamMember">Invite</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Add Flow Account Cookie Dialog -->
    <el-dialog v-model="isAddFlowModalOpen" title="Add Flow / Veo Cookie & Account" width="480px">
      <div class="space-y-4 py-2">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Google / Flow Email</label>
          <el-input v-model="newFlowEmail" placeholder="user@pinhole-labs.google" />
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Veo Model Tier</label>
          <el-select v-model="newFlowModel" class="w-full">
            <el-option label="Veo-2-HQ (High Quality 9:16)" value="Veo-2-HQ" />
            <el-option label="Veo-2-Fast (Draft 9:16)" value="Veo-2-Fast" />
          </el-select>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Session Cookie / Token</label>
          <el-input v-model="newFlowCookie" type="textarea" :rows="3" placeholder="Paste __Secure-1PSID / session cookie here..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAddFlowModalOpen = false">Cancel</el-button>
          <el-button type="primary" :loading="isSubmittingFlow" @click="handleAddFlowAccount">Connect Cookie</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.shadow-soft {
  box-shadow: 0 1px 2px rgba(23, 23, 23, 0.04);
}
</style>
