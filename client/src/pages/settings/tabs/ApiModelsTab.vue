<script setup lang="ts">
import { ref, computed } from 'vue';
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

const uniqueFlowAccounts = computed(() => {
  const list = props.config?.flowAccounts || [];
  const map = new Map<string, any>();
  for (const acc of list) {
    const emailKey = (acc.email || '').trim().toLowerCase();
    if (!emailKey) continue;
    const existing = map.get(emailKey);
    if (!existing || new Date(acc.lastSyncedAt || 0).getTime() > new Date(existing.lastSyncedAt || 0).getTime()) {
      map.set(emailKey, acc);
    }
  }
  return Array.from(map.values());
});

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

function extractFlowCookieToken(rawInput: string): string {
  if (!rawInput) return '';
  let str = String(rawInput).trim();
  str = str.replace(/^(Set-Cookie|Cookie):\s*/i, '');

  const priorityKeys = [
    '__Secure-next-auth.session-token',
    '__Host-next-auth.session-token',
    'next-auth.session-token',
    '__Secure-1PSID',
    '__Secure-3PSID',
    'sessionToken',
    'session_token',
    'session-token',
    'token',
    'session',
  ];

  for (const key of priorityKeys) {
    const escapedKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = str.match(new RegExp(`(?:^|[;\\s,])${escapedKey}=([^;\\r\\n,]+)`, 'i'));
    if (match && match[1]) {
      try { return decodeURIComponent(match[1].trim()); } catch { return match[1].trim(); }
    }
  }

  const firstPairMatch = str.match(/^([a-zA-Z0-9_\-\.]+)=([^;\\r\\n,]+)/);
  if (firstPairMatch && firstPairMatch[2]) {
    try { return decodeURIComponent(firstPairMatch[2].trim()); } catch { return firstPairMatch[2].trim(); }
  }

  if (str.includes(';')) {
    const parts = str.split(';').map(p => p.trim());
    for (const part of parts) {
      if (part && !/^(Path|Domain|Expires|Max-Age|HttpOnly|Secure|SameSite)=?/i.test(part)) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          const val = part.substring(eqIdx + 1).trim();
          try { return decodeURIComponent(val); } catch { return val; }
        }
        try { return decodeURIComponent(part); } catch { return part; }
      }
    }
  }

  return str;
}

async function handleUpdateFlowToken() {
  const cookie = extractFlowCookieToken(updateFlowCookie.value);
  if (!cookie || !updatingFlowAccount.value) {
    toast.warning(t('toast.enterFlowCredentials', 'Please enter a valid session cookie or token'));
    toast.error(t('toast.enterFlowCredentials', 'Please enter a valid session cookie or token'));
    return;
  }
  isUpdatingFlow.value = true;
  try {
    const res: any = await http.put(`/admin/flow-accounts/${updatingFlowAccount.value.id}`, {
      email: updatingFlowAccount.value.email,
      cookie,
    });
    updateFlowCookie.value = '';
    isUpdateFlowModalOpen.value = false;
    toast.success(t('toast.flowTokenUpdated', 'Flow account token refreshed successfully!'));
    if (updatingFlowAccount.value) {
      updatingFlowAccount.value.status = 'ACTIVE';
      updatingFlowAccount.value.lastSyncedAt = new Date().toISOString();
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Update failed';
    toast.error(msg);
  } finally {
    isUpdatingFlow.value = false;
  }
}

async function handleAddFlowAccount() {
  const cookie = extractFlowCookieToken(newFlowCookie.value);
  const email = newFlowEmail.value.trim();
  if (!email || !cookie) {
    toast.error(t('toast.enterFlowCredentials', 'Please enter both email and session token/cookie'));
    return;
  }
  isSubmittingFlow.value = true;
  try {
    const res: any = await http.post('/admin/flow-accounts', {
      email,
      cookie,
      sessionToken: cookie,
      model: 'Veo-3',
    });
    const accData = res?.data || res?.account || res;
    if (!props.config.flowAccounts) props.config.flowAccounts = [];
    const newEntry = {
      id: accData?.id || `flow_${email.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      email,
      credits: accData?.credits_remaining !== undefined ? accData.credits_remaining : (accData?.credits || 100),
      status: accData?.status || 'ACTIVE',
      model: 'Veo-3',
      lastSyncedAt: new Date().toISOString(),
    };

    const existingIdx = props.config.flowAccounts.findIndex(
      (a: any) => (a.email || '').trim().toLowerCase() === email.toLowerCase() || a.id === newEntry.id
    );

    if (existingIdx !== -1) {
      props.config.flowAccounts[existingIdx] = newEntry;
    } else {
      props.config.flowAccounts.push(newEntry);
    }

    newFlowEmail.value = '';
    newFlowCookie.value = '';
    isAddFlowModalOpen.value = false;
    toast.success(t('toast.flowAccountAdded', 'Flow Google Account added successfully!'));
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to add flow account';
    toast.error(msg);
  } finally {
    isSubmittingFlow.value = false;
  }
}

async function removeFlowAccount(id: string, email?: string) {
  try {
    await http.delete(`/admin/flow-accounts/${id}`);
    if (props.config.flowAccounts) {
      props.config.flowAccounts = props.config.flowAccounts.filter(
        (a: any) => a.id !== id && (!email || (a.email || '').trim().toLowerCase() !== email.toLowerCase())
      );
    }
    toast.success(t('toast.flowAccountRemoved', 'Flow account removed from pool'));
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Failed to delete flow account';
    toast.error(msg);
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
          <el-icon class="text-emerald-500"><Cpu /></el-icon>
          {{ t('settings.apiModelsConfigTitle') }}
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          {{ t('settings.apiModelsConfigDesc') }}
        </p>
      </div>
      <el-button type="primary" round size="small" :loading="isSaving" @click="handleSave">
        {{ t('settings.saveAiInfrastructure') }}
      </el-button>
    </div>

    <!-- Gemini AI Models Selector -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="pb-3 border-b border-[var(--el-border-color)] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-base">
            <el-icon><Cpu /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.geminiModels') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.multiModalPipelineDesc') }}</p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelTextGen') }}</label>
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
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelImageGen') }}</label>
          <el-select v-model="config.gemini.imageModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="imagen-3.0-generate-002" value="imagen-3.0-generate-002" />
            <el-option label="imagen-3.0-generate-001" value="imagen-3.0-generate-001" />
            <el-option label="flux-1-schnell" value="flux-1-schnell" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelVideoGen') }}</label>
          <el-select v-model="config.gemini.videoModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="veo-3.0-generate-001 (Recommended)" value="veo-3.0-generate-001" />
            <el-option label="veo-2-hq" value="veo-2-hq" />
            <el-option label="veo-2-fast" value="veo-2-fast" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelVoiceDub') }}</label>
          <el-select v-model="config.gemini.audioModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="gemini-2.5-flash (Native Audio Out)" value="gemini-2.5-flash" />
            <el-option label="elevenlabs-multilingual-v2" value="eleven_multilingual_v2" />
            <el-option label="google-cloud-neural2" value="neural2" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelBgm') }}</label>
          <el-select v-model="config.gemini.musicModel" filterable allow-create default-first-option class="w-full" size="small">
            <el-option label="music-fx-pro" value="music-fx-pro" />
            <el-option label="suno-v3" value="suno-v3" />
            <el-option label="freesound-ambient-stream" value="freesound-ambient-stream" />
          </el-select>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.modelOrchestrator') }}</label>
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
            <el-icon><Files /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.flowAccounts') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.flowAccountSessionPool') }}</p>
          </div>
        </div>
        <el-button type="primary" size="small" round @click="isAddFlowModalOpen = true">
          <el-icon class="mr-1 text-xs"><Plus /></el-icon> {{ t('settings.addAccountBtn') }}
        </el-button>
      </div>

      <div v-if="uniqueFlowAccounts && uniqueFlowAccounts.length > 0" class="space-y-2">
        <div
          v-for="acc in uniqueFlowAccounts"
          :key="acc.id || acc.email"
          class="flex items-center justify-between p-3.5 bg-[var(--el-fill-color-light)] rounded-xl text-xs"
        >
          <div>
            <span class="font-bold text-[var(--el-text-color-primary)]">{{ acc.email }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-primary">{{ acc.credits }} {{ t('settings.creditsLabel') }}</span>
            <el-tag size="small" :type="acc.status === 'ACTIVE' ? 'success' : 'danger'" round effect="plain">{{ acc.status }}</el-tag>
            <el-button type="primary" link size="small" :title="t('settings.updateToken', 'Update Token')" @click="openUpdateFlowTokenModal(acc)">
              <el-icon class="text-xs mr-1"><Key /></el-icon> {{ t('settings.updateToken') }}
            </el-button>
            <el-button type="danger" link size="small" @click="removeFlowAccount(acc.id, acc.email)">
              <el-icon class="text-xs"><Delete /></el-icon>
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
            <el-icon><Lock /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.captchaSolverService') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.captchaSolverDesc') }}</p>
          </div>
        </div>
        <el-tag size="small" type="primary" effect="plain" round>
          <el-icon class="mr-1 text-xs"><Service /></el-icon> {{ t('settings.autoBypassFlow') }}
        </el-tag>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.solverProviderMethod') }}</label>
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
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.solverApiKey') }}</label>
          <el-input v-model="config.captcha.apiKey" type="password" show-password placeholder="Enter Captcha API Key" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.solverBaseUrl') }}</label>
          <el-input v-model="config.captcha.baseUrl" placeholder="https://api.yescaptcha.com" size="small"/>
        </div>
      </div>
    </div>

    <!-- Credit Deduction Rates Configuration -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="pb-3 border-b border-[var(--el-border-color)] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-base">
            <el-icon><Coin /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.creditRates') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.costConfigDesc') }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskMasterPlan') }}</label>
          <el-input-number v-model="config.creditRates.scriptGeneration" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskCharacterLora') }}</label>
          <el-input-number v-model="config.creditRates.characterAnchors" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskSceneBackground') }}</label>
          <el-input-number v-model="config.creditRates.sceneImage" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskVideoGen') }}</label>
          <el-input-number v-model="config.creditRates.videoGeneration" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskVoiceover') }}</label>
          <el-input-number v-model="config.creditRates.voiceoverTts" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskBgmAudio') }}</label>
          <el-input-number v-model="config.creditRates.bgmMusic" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskVideoRender') }}</label>
          <el-input-number v-model="config.creditRates.videoRender" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskCliffhanger') }}</label>
          <el-input-number v-model="config.creditRates.cliffhangerHook" :min="1" :max="1000" class="w-full" size="small"/>
        </div>
        <div>
          <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.taskSubtitleTrans') }}</label>
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
            <el-icon class="text-amber-500"><Lightning /></el-icon>
            {{ t('settings.parallelEngineTitle') }}
          </h3>
        </div>
        <div class="text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.parallelApiKey') }}</label>
            <el-input v-model="config.parallel.apiKey" type="password" show-password placeholder="Enter Parallel API Key (PARALLEL_API_KEY)" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.parallelMcpEndpoint') }}</label>
            <el-input v-model="config.parallel.endpoint" placeholder="https://search.parallel.ai/mcp" size="small"/>
          </div>
        </div>
      </div>

      <!-- Stock Audio, Media & Grafana Integrations -->
      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color)]">
          <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)] flex items-center gap-2">
            <el-icon class="text-cyan-500"><Headset /></el-icon>
            {{ t('settings.stockMediaTitle') }}
          </h3>
        </div>
        <div class="text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.freesoundApiKey') }}</label>
            <el-input v-model="config.freesound.apiKey" type="password" show-password placeholder="Enter Freesound API Key" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.pixabayApiKey') }}</label>
            <el-input v-model="config.pixabay.apiKey" type="password" show-password placeholder="Enter Pixabay API Key (PIXABAY_API_KEY)" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.pexelsApiKey') }}</label>
            <el-input v-model="config.pexels.apiKey" type="password" show-password placeholder="Enter Pexels API Key" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.grafanaCloudUrl') }}</label>
            <el-input v-model="config.grafana.url" placeholder="https://bronzeholly2284.grafana.net" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.grafanaApiToken') }}</label>
            <el-input v-model="config.grafana.apiKey" type="password" show-password placeholder="Enter Grafana API Token" size="small"/>
          </div>
          <div>
            <label class="text-[var(--el-text-color-secondary)] block mb-1 font-semibold">{{ t('settings.grafanaMcpEndpoint') }}</label>
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
            <el-icon><Message /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.emailServer') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.smtpTitle') }}</p>
          </div>
        </div>
        <el-switch v-model="config.email.enabled" size="small"/>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.smtpHost') }}</label>
          <el-input v-model="config.email.smtpHost" placeholder="smtp.sendgrid.net" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.smtpPort') }}</label>
          <el-input v-model.number="config.email.smtpPort" placeholder="587" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.senderName') }}</label>
          <el-input v-model="config.email.senderName" placeholder="Shine Studio AI" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.senderEmail') }}</label>
          <el-input v-model="config.email.senderEmail" placeholder="notifications@shine-studio.ai" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.smtpPassKey') }}</label>
          <el-input v-model="config.email.password" type="password" show-password placeholder="••••••••••••" size="small"/>
        </div>
        <div class="flex items-center gap-3 pt-6">
          <el-switch v-model="config.email.ssl" size="small"/>
          <span class="text-xs font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.useSslTls') }}</span>
        </div>
      </div>
    </div>

    <!-- Modals for Flow Accounts -->
    <el-dialog v-model="isAddFlowModalOpen" title="Add Google Flow Account (Veo-3)" width="480px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.flowEmail') }}</label>
          <el-input v-model="newFlowEmail" placeholder="user@gmail.com" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.flowCookieToken') }}</label>
          <el-input v-model="newFlowCookie" type="textarea" :rows="3" placeholder="Paste __Secure-next-auth.session-token or full Cookie header here..." size="small"/>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isAddFlowModalOpen = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" round size="small" :loading="isSubmittingFlow" @click="handleAddFlowAccount">{{ t('settings.addAccountBtn') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="isUpdateFlowModalOpen" title="Update Flow Account Session Token" width="480px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <p class="text-xs text-[var(--el-text-color-secondary)]">
          Account: <strong class="text-[var(--el-text-color-primary)]">{{ updatingFlowAccount?.email }}</strong>
        </p>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">{{ t('settings.flowCookieToken') }}</label>
          <el-input v-model="updateFlowCookie" type="textarea" :rows="4" placeholder="Paste new __Secure-next-auth.session-token or Cookie header..." size="small"/>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isUpdateFlowModalOpen = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" round size="small" :loading="isUpdatingFlow" @click="handleUpdateFlowToken">{{ t('settings.updateToken') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
