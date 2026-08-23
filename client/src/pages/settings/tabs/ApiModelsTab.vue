<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const { t } = useI18n();
const isSaving = ref(false);

function handleSave() {
  isSaving.value = true;
  emit('save');
  setTimeout(() => {
    isSaving.value = false;
  }, 600);
}

// Flow Cookie Add Dialog State
const isAddFlowModalOpen = ref(false);
const newFlowEmail = ref('');
const newFlowCookie = ref('');
const isSubmittingFlow = ref(false);

// Flow Token Update Dialog State
const isUpdateFlowModalOpen = ref(false);
const updatingFlowAccount = ref<any>(null);
const updateFlowCookie = ref('');
const isUpdatingFlow = ref(false);

function openUpdateFlowTokenModal(acc: any) {
  updatingFlowAccount.value = acc;
  updateFlowCookie.value = '';
  isUpdateFlowModalOpen.value = true;
}

function extractFlowCookieToken(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/__Secure-next-auth\.session-token=([^;]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

async function handleUpdateFlowToken() {
  const cookie = extractFlowCookieToken(updateFlowCookie.value);
  if (!cookie || !updatingFlowAccount.value) {
    toast.error(t('toast.enterFlowCredentials', 'Please enter a valid session cookie or token'));
    return;
  }
  isUpdatingFlow.value = true;
  try {
    const res: any = await http.put(`/admin/flow-accounts/${updatingFlowAccount.value.id}`, {
      email: updatingFlowAccount.value.email,
      cookie,
    });
    if (res?.success || res?.account) {
      updateFlowCookie.value = '';
      isUpdateFlowModalOpen.value = false;
      toast.success(t('toast.flowTokenUpdated', 'Flow account token refreshed successfully!'));
      if (updatingFlowAccount.value) {
        updatingFlowAccount.value.status = 'ACTIVE';
        updatingFlowAccount.value.lastSyncedAt = new Date().toISOString();
      }
    } else {
      toast.error(res?.message || 'Failed to update account token');
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || err?.message || 'Update failed');
  } finally {
    isUpdatingFlow.value = false;
  }
}

async function handleAddFlowAccount() {
  const cookie = extractFlowCookieToken(newFlowCookie.value);
  if (!newFlowEmail.value || !cookie) {
    toast.error(t('toast.enterFlowCredentials', 'Please enter both email and session token/cookie'));
    return;
  }
  isSubmittingFlow.value = true;
  try {
    const res: any = await http.post('/admin/flow-accounts', {
      email: newFlowEmail.value,
      cookie,
      sessionToken: cookie,
      model: 'Veo-3',
    });
    if (res?.data) {
      if (!props.config.flowAccounts) props.config.flowAccounts = [];
      props.config.flowAccounts.push({
        id: res.data.id || `flow_${Date.now()}`,
        email: newFlowEmail.value,
        credits: res.data.credits_remaining || 100,
        status: res.data.status || 'ACTIVE',
        model: 'Veo-3',
        lastSyncedAt: new Date().toISOString(),
      });
      newFlowEmail.value = '';
      newFlowCookie.value = '';
      isAddFlowModalOpen.value = false;
      toast.success(t('toast.flowAccountAdded', 'Flow Google Account added successfully!'));
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to add flow account');
  } finally {
    isSubmittingFlow.value = false;
  }
}

async function removeFlowAccount(id: string) {
  try {
    await http.delete(`/admin/flow-accounts/${id}`);
    props.config.flowAccounts = props.config.flowAccounts.filter((a: any) => a.id !== id);
    toast.success(t('toast.flowAccountRemoved', 'Flow account removed from pool'));
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to delete flow account');
  }
}

function handleCaptchaMethodChange(val: string) {
  if (val === 'yescaptcha' && !props.config.captcha.baseUrl) {
    props.config.captcha.baseUrl = 'https://api.yescaptcha.com';
  } else if (val === 'capsolver' && !props.config.captcha.baseUrl) {
    props.config.captcha.baseUrl = 'https://api.capsolver.com';
  } else if (val === 'ezcaptcha' && !props.config.captcha.baseUrl) {
    props.config.captcha.baseUrl = 'https://api.ez-captcha.com';
  } else if (val === 'capmonster' && !props.config.captcha.baseUrl) {
    props.config.captcha.baseUrl = 'https://api.capmonster.cloud';
  } else if (val === '2captcha' && !props.config.captcha.baseUrl) {
    props.config.captcha.baseUrl = 'https://2captcha.com';
  }
}
</script>

<template>
  <div class="space-y-10">
    <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)] flex items-center gap-2">
          <i class="fa-solid fa-brain text-emerald-500"></i>
          API & AI Pipeline Models Configuration
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          Configure multi-modal Gemini & Veo neural models, session pools, CAPTCHA bypass, task credit consumption, and media search engines
        </p>
      </div>
      <el-button type="primary" round size="small" :loading="isSaving" @click="handleSave">
        Save AI Infrastructure
      </el-button>
    </div>

    <!-- Gemini AI Models Selector -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="pb-3 border-b border-[var(--el-border-color)] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-base">
            <i class="fa-solid fa-brain"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.geminiModels') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Multi-Modal AI Pipeline Engines & SOTA Models</p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">1. Text Generation Model</label>
          <el-select v-model="config.gemini.textModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="gemini-3.7-flash (Recommended)" value="gemini-3.7-flash" />
            <el-option label="gemini-3.7-flash-lite" value="gemini-3.7-flash-lite" />
            <el-option label="gemini-3.6-flash" value="gemini-3.6-flash" />
            <el-option label="gemini-3.6-flash-lite" value="gemini-3.6-flash-lite" />
            <el-option label="gemini-3.5-flash" value="gemini-3.5-flash" />
            <el-option label="gemini-3.5-flash-lite" value="gemini-3.5-flash-lite" />
            <el-option label="gemini-2.5-flash" value="gemini-2.5-flash" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">2. Image / Storyboard Model</label>
          <el-select v-model="config.gemini.imageModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="imagen-3.0-generate-002" value="imagen-3.0-generate-002" />
            <el-option label="imagen-3.0-generate-001" value="imagen-3.0-generate-001" />
            <el-option label="flux-1-schnell" value="flux-1-schnell" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">3. Video Generation Model</label>
          <el-select v-model="config.gemini.videoModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="veo-3.0-generate-001 (Recommended)" value="veo-3.0-generate-001" />
            <el-option label="veo-2-hq" value="veo-2-hq" />
            <el-option label="veo-2-fast" value="veo-2-fast" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">4. Voice Dubbing Model (TTS)</label>
          <el-select v-model="config.gemini.audioModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="gemini-2.5-flash (Native Audio Out)" value="gemini-2.5-flash" />
            <el-option label="elevenlabs-multilingual-v2" value="eleven_multilingual_v2" />
            <el-option label="google-cloud-neural2" value="neural2" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">5. BGM & Music Model</label>
          <el-select v-model="config.gemini.musicModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="music-fx-pro" value="music-fx-pro" />
            <el-option label="suno-v3" value="suno-v3" />
            <el-option label="freesound-ambient-stream" value="freesound-ambient-stream" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">6. Agent Orchestrator Model</label>
          <el-select v-model="config.gemini.agentModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="gemini-3.7-flash (High-Speed Agentic CoT)" value="gemini-3.7-flash" />
            <el-option label="gemini-3.5-flash" value="gemini-3.5-flash" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- Flow / Veo Accounts Pool -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#1a1b23] text-primary border border-[#2d2e3a] flex items-center justify-center text-base">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.flowAccounts') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Google Flow (Veo-3 / Imagen-3) Video Synthesis Account & Cookie Session Pool</p>
          </div>
        </div>
        <el-button type="primary" size="small" round @click="isAddFlowModalOpen = true">
          <i class="fa-solid fa-plus mr-1 text-xs"></i> Add Flow Cookie
        </el-button>
      </div>

      <div v-if="config.flowAccounts && config.flowAccounts.length > 0" class="space-y-2">
        <div
          v-for="acc in config.flowAccounts"
          :key="acc.id"
          class="flex items-center justify-between p-3.5 bg-[var(--el-fill-color-light)] rounded-xl text-xs"
        >
          <div>
            <span class="font-bold text-[var(--el-text-color-primary)]">{{ acc.email }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-primary">{{ acc.credits }} credits</span>
            <el-tag size="small" :type="acc.status === 'ACTIVE' ? 'success' : 'danger'" round effect="plain">{{ acc.status }}</el-tag>
            <el-button type="primary" link size="small" :title="t('settings.updateToken', 'Update Token')" @click="openUpdateFlowTokenModal(acc)">
              <i class="fa-solid fa-key text-xs mr-1"></i> Update Token
            </el-button>
            <el-button type="danger" link size="small" @click="removeFlowAccount(acc.id)">
              <i class="fa-solid fa-trash text-xs"></i>
            </el-button>
          </div>
        </div>
      </div>
      <div v-else class="p-6 text-center text-xs text-[var(--el-text-color-secondary)] border border-dashed border-[var(--el-border-color)] rounded-xl">
        {{ t('settings.noFlowAccounts') }}
      </div>
    </div>

    <!-- CAPTCHA Solver Service -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[var(--el-fill-color)] text-[var(--el-color-primary)] flex items-center justify-center text-base">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">CAPTCHA Solver Service</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Automated Turnstile / reCAPTCHA Solver for Google Flow background session renewal</p>
          </div>
        </div>
        <el-tag size="small" type="primary" effect="plain" round>
          <i class="fa-solid fa-robot mr-1 text-xs"></i> Auto-Bypass for Flow
        </el-tag>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Solver Provider / Method</label>
          <el-select v-model="config.captcha.method" class="w-full" @change="handleCaptchaMethodChange" size="small">
            <el-option label="CapSolver (Recommended)" value="capsolver" />
            <el-option label="YesCaptcha" value="yescaptcha" />
            <el-option label="EzCaptcha" value="ezcaptcha" />
            <el-option label="CapMonster" value="capmonster" />
            <el-option label="2Captcha" value="2captcha" />
            <el-option label="Remote Browser" value="remote_browser" />
            <el-option label="Local Playwright Browser (Free)" value="browser" />
            <el-option label="Local Stealth Browser" value="personal" />
          </el-select>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">API Key / Client Key</label>
          <el-input v-model="config.captcha.apiKey" type="password" show-password placeholder="Enter Captcha API Key" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Base API URL</label>
          <el-input v-model="config.captcha.baseUrl" placeholder="https://api.yescaptcha.com" size="small"/>
        </div>
      </div>
    </div>

    <!-- Credit Deduction Rates Configuration -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="pb-3 border-b border-[var(--el-border-color)] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-base">
            <i class="fa-solid fa-coins"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.creditRates') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Configure exact credits deducted per AI generation task (deducted automatically from user balance)</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">1. Story & Script Master Plan</label>
          <el-input-number v-model="config.creditRates.scriptGeneration" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">2. Character LoRA Anchor</label>
          <el-input-number v-model="config.creditRates.characterAnchors" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">3. Scene Background Image</label>
          <el-input-number v-model="config.creditRates.sceneImage" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">4. Video Generation (Veo-3)</label>
          <el-input-number v-model="config.creditRates.videoGeneration" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">5. Voiceover Synthesis (TTS)</label>
          <el-input-number v-model="config.creditRates.voiceoverTts" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">6. Soundtrack BGM Audio</label>
          <el-input-number v-model="config.creditRates.bgmMusic" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">7. Video Server Render</label>
          <el-input-number v-model="config.creditRates.videoRender" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">8. Dynamic Cliffhanger Hook</label>
          <el-input-number v-model="config.creditRates.cliffhangerHook" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">9. Subtitle Translation</label>
          <el-input-number v-model="config.creditRates.subtitleTranslate" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
      </div>
    </div>

    <!-- Parallel AI Task & Stock Media Engines -->
    <div class="space-y-6">
      <!-- Parallel AI Search & Task MCP -->
      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color)]">
          <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] flex items-center gap-2">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            Parallel Search & Task Engine
          </h3>
        </div>
        <div class="text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Parallel API Key (Task Execution / MCP)</label>
            <el-input v-model="config.parallel.apiKey" type="password" show-password placeholder="Enter Parallel API Key (PARALLEL_API_KEY)" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Parallel MCP Endpoint</label>
            <el-input v-model="config.parallel.endpoint" placeholder="https://search.parallel.ai/mcp" size="small"/>
          </div>
        </div>
      </div>

      <!-- Stock Audio, Media & Grafana Integrations -->
      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color)]">
          <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] flex items-center gap-2">
            <i class="fa-solid fa-music text-cyan-500"></i>
            Stock Audio, Media & Grafana Integrations
          </h3>
        </div>
        <div class="text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Freesound API Key (600K+ Foley SFX Engine)</label>
            <el-input v-model="config.freesound.apiKey" type="password" show-password placeholder="Enter Freesound API Key" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Pixabay API Key (Stock Media & SFX Search)</label>
            <el-input v-model="config.pixabay.apiKey" type="password" show-password placeholder="Enter Pixabay API Key (PIXABAY_API_KEY)" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Pexels Stock Media API Key</label>
            <el-input v-model="config.pexels.apiKey" type="password" show-password placeholder="Enter Pexels API Key" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Grafana Cloud URL / Endpoint</label>
            <el-input v-model="config.grafana.url" placeholder="https://bronzeholly2284.grafana.net" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Grafana API Token</label>
            <el-input v-model="config.grafana.apiKey" type="password" show-password placeholder="Enter Grafana API Token" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">Grafana MCP Endpoint</label>
            <el-input v-model="config.grafana.mcpEndpoint" placeholder="https://mcp.grafana.com/mcp" size="small"/>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Server Config -->
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
        <el-switch v-model="config.email.enabled" size="small"/>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">SMTP Host</label>
          <el-input v-model="config.email.smtpHost" placeholder="smtp.sendgrid.net" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Port</label>
          <el-input v-model.number="config.email.smtpPort" placeholder="587" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Sender Name</label>
          <el-input v-model="config.email.senderName" placeholder="Shine Studio AI" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Sender Email</label>
          <el-input v-model="config.email.senderEmail" placeholder="notifications@shine-studio.ai" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">SMTP Password / API Key</label>
          <el-input v-model="config.email.password" type="password" show-password placeholder="••••••••••••" size="small"/>
        </div>
        <div class="flex items-center gap-3 pt-6">
          <el-switch v-model="config.email.ssl" size="small"/>
          <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">Use SSL / TLS</span>
        </div>
      </div>
    </div>

    <!-- Modals for Flow Accounts -->
    <el-dialog v-model="isAddFlowModalOpen" title="Add Google Flow Account (Veo-3)" width="480px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Google / Flow Email</label>
          <el-input v-model="newFlowEmail" placeholder="user@gmail.com" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Session Cookie / Token</label>
          <el-input v-model="newFlowCookie" type="textarea" :rows="3" placeholder="Paste __Secure-next-auth.session-token or full Cookie header here..." size="small"/>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isAddFlowModalOpen = false">Cancel</el-button>
          <el-button type="primary" round size="small" :loading="isSubmittingFlow" @click="handleAddFlowAccount">Add Account</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="isUpdateFlowModalOpen" title="Update Flow Account Session Token" width="480px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <p class="text-xs text-[var(--el-text-color-secondary)]">
          Account: <strong class="text-[var(--el-text-color-primary)]">{{ updatingFlowAccount?.email }}</strong>
        </p>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">New Session Cookie / Token</label>
          <el-input v-model="updateFlowCookie" type="textarea" :rows="4" placeholder="Paste new __Secure-next-auth.session-token or Cookie header..." size="small"/>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isUpdateFlowModalOpen = false">Cancel</el-button>
          <el-button type="primary" round size="small" :loading="isUpdatingFlow" @click="handleUpdateFlowToken">Update Session Token</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
