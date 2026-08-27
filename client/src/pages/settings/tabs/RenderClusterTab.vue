<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const { t } = useI18n();

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const clusterMetrics = ref({
  activeGpuInstances: 0,
  gpuLoadPercentage: 0,
  activeJobsCount: 0,
  queuedJobsCount: 0,
  completedJobsCount: 0,
  failedJobsCount: 0,
  monthlySpendUsd: 0.00,
  monthlyBudgetCap: 50.00,
  serviceName: 'shine-render-worker',
  region: 'us-central1',
  status: 'ONLINE',
});

const workerNodes = ref<any[]>([]);
const renderJobs = ref<any[]>([]);
const isTestingBatchRender = ref(false);
const autoRefresh = ref(true);
const batchRenderProgress = ref<{ jobId: string; episodeId: string; status: string; progressPercent: number; outputUrl?: string } | null>(null);

let pollTimer: any = null;

async function loadClusterMetrics() {
  try {
    const res: any = await http.get('/admin/render-cluster');
    if (res?.data) {
      clusterMetrics.value = {
        activeGpuInstances: res.data.activeInstances || 0,
        gpuLoadPercentage: res.data.gpuLoadPct || 0,
        activeJobsCount: res.data.activeJobsCount || 0,
        queuedJobsCount: res.data.queuedJobsCount || 0,
        completedJobsCount: res.data.completedJobsCount || 0,
        failedJobsCount: res.data.failedJobsCount || 0,
        monthlySpendUsd: res.data.monthlyCostUsd || 0.0,
        monthlyBudgetCap: res.data.monthlyBudgetCap || 50.0,
        serviceName: res.data.serviceName || 'shine-render-worker',
        region: res.data.region || 'us-central1',
        status: res.data.status || 'ONLINE',
      };
      if (Array.isArray(res.data.workers)) {
        workerNodes.value = res.data.workers;
      }
    }
  } catch (err) {
    console.error('Failed to load cluster metrics', err);
  }
}

async function loadWorkerNodes() {
  try {
    const res: any = await http.get('/admin/workers');
    if (Array.isArray(res?.data)) {
      workerNodes.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load worker nodes', err);
  }
}

async function loadRenderJobs() {
  try {
    const res: any = await http.get('/admin/render-jobs?limit=25');
    if (Array.isArray(res?.data)) {
      renderJobs.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load render jobs', err);
  }
}

async function refreshAll() {
  await Promise.all([
    loadClusterMetrics(),
    loadWorkerNodes(),
    loadRenderJobs(),
  ]);
}

async function handleTestBatchRender() {
  isTestingBatchRender.value = true;
  batchRenderProgress.value = { jobId: 'initializing', episodeId: 'ep-001', status: 'queued', progressPercent: 5 };
  try {
    const res: any = await http.post('/export/batch', {
      seriesId: 'series_demo',
      episodeIds: ['ep-001', 'ep-002'],
      outputFormat: 'mp4',
    });
    toast.success(res?.message || 'Batch render dispatched to Cloud Run / PubSub');

    // Connect to SSE stream
    const eventSource = new EventSource('/api/v1/export/render/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progressPercent !== undefined) {
          batchRenderProgress.value = data;
          if (data.status === 'completed') {
            toast.success(t('toast.allAssetsAlreadyRendered'));
            eventSource.close();
            isTestingBatchRender.value = false;
            refreshAll();
          }
        }
      } catch {}
    };
    eventSource.onerror = () => {
      eventSource.close();
      isTestingBatchRender.value = false;
    };
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to dispatch batch render');
    isTestingBatchRender.value = false;
  }
}

function formatRelativeTime(isoStr?: string): string {
  if (!isoStr) return 'Just now';
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 5000) return 'Just now';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

function getWorkerTagType(status: string) {
  switch (status?.toUpperCase()) {
    case 'ONLINE':
    case 'IDLE':
      return 'success';
    case 'BUSY':
    case 'RENDERING':
      return 'primary';
    case 'OFFLINE':
      return 'danger';
    default:
      return 'info';
  }
}

function getJobTagType(status: string) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'success';
    case 'RENDERING':
    case 'COMPOSITING':
      return 'primary';
    case 'QUEUED':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'info';
  }
}

onMounted(() => {
  refreshAll();
  pollTimer = setInterval(() => {
    if (autoRefresh.value) {
      refreshAll();
    }
  }, 5000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center pb-5 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)] flex items-center gap-2">
          <el-icon class="text-blue-500"><Platform /></el-icon>
          {{ t('settings.renderClusterTitle') }}
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          {{ t('settings.renderClusterDesc') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-switch
          v-model="autoRefresh"
          inline-prompt
          :active-text="t('observability.auto5s')"
          :inactive-text="t('observability.paused')"
          size="small"
        />
        <el-button size="small" round @click="refreshAll">
          <el-icon class="mr-1.5"><Refresh /></el-icon> {{ t('common.refresh') }}
        </el-button>
        <el-button type="primary" round size="small" :loading="isTestingBatchRender" @click="handleTestBatchRender">
          <el-icon class="mr-1.5"><VideoPlay /></el-icon> {{ t('settings.testBatchRenderBtn') }}
        </el-button>
      </div>
    </div>

    <!-- Live Batch Render Progress Banner (SSE Connected) -->
    <div v-if="batchRenderProgress" class="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-semibold text-blue-500">
          <el-icon class="is-loading" v-if="batchRenderProgress.status !== 'completed'"><Loading /></el-icon>
          <el-icon class="text-green-500" v-else><CircleCheck /></el-icon>
          <span>{{ t('settings.cloudRunBatchStatus', { id: batchRenderProgress.episodeId }) }} {{ batchRenderProgress.status.toUpperCase() }}</span>
        </div>
        <span class="text-xs font-bold text-blue-500">{{ batchRenderProgress.progressPercent }}%</span>
      </div>
      <el-progress :percentage="batchRenderProgress.progressPercent" :stroke-width="8" color="#3b82f6" />
      <p v-if="batchRenderProgress.outputUrl" class="text-xs text-green-500 font-medium">
        {{ t('common.outputAsset') }} <a :href="batchRenderProgress.outputUrl" target="_blank" class="underline">{{ batchRenderProgress.outputUrl }}</a>
      </p>
    </div>

    <!-- FinOps & Cloud Run Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">{{ t('settings.cloudRunWorkers') }}</span>
        <h3 class="text-3xl font-extrabold text-blue-500 mt-2">{{ clusterMetrics.activeGpuInstances }} {{ t('settings.activeStatus') }}</h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-3">{{ t('settings.regionLabel') }} {{ clusterMetrics.region || 'us-central1' }}</p>
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">{{ t('settings.pubSubQueueDepth') }}</span>
        <h3 class="text-3xl font-extrabold text-amber-500 mt-2">{{ clusterMetrics.queuedJobsCount }} {{ t('settings.tasksLabel') }}</h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-3">{{ t('settings.topicLabel') }} {{ config?.pubsub?.topicRender || 'shine-render-jobs' }}</p>
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">{{ t('settings.activeRenderJobs') }}</span>
        <h3 class="text-3xl font-extrabold text-[var(--el-text-color-primary)] mt-2">{{ clusterMetrics.activeJobsCount }} {{ t('settings.jobsLabel') }}</h3>
        <el-progress :percentage="Math.min(100, Math.round(clusterMetrics.gpuLoadPercentage))" color="var(--el-color-primary)" :stroke-width="6" class="mt-3" />
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">{{ t('settings.estMonthlySpend') }}</span>
        <h3 class="text-3xl font-extrabold text-[var(--el-text-color-primary)] mt-2">${{ clusterMetrics.monthlySpendUsd.toFixed(2) }}</h3>
        <p class="text-xs text-primary mt-3">{{ t('settings.capPerMonth', { cap: clusterMetrics.monthlyBudgetCap }) }}</p>
      </div>
    </div>

    <!-- Live Registered Worker Microservices Table -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('observability.connectedWorkerServices') }}</h3>
        </div>
        <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t('observability.nodesRegistered', { count: workerNodes.length }) }}</span>
      </div>

      <el-table :data="workerNodes" style="width: 100%" class="rounded-xl overflow-hidden" empty-text="No worker heartbeats received yet. Workers report via Pub/Sub every 30s.">
        <el-table-column prop="workerName" label="Worker Node / Revision" min-width="200">
          <template #default="{ row }">
            <div class="font-medium text-xs text-[var(--el-text-color-primary)]">{{ row.workerName || row.workerId }}</div>
            <div class="text-[11px] text-[var(--el-text-color-secondary)] font-mono">{{ row.workerId }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="serviceName" label="Microservice" width="180">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.serviceName || 'shine-render-worker' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="GCP Region" width="120">
          <template #default="{ row }">
            <span class="text-xs font-mono">{{ row.region || 'us-central1' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Resource Utilization" width="180">
          <template #default="{ row }">
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-[var(--el-text-color-secondary)]">
                <span>CPU: {{ row.cpuUsagePct || 0 }}%</span>
                <span>RAM: {{ row.memoryUsageMb || 0 }} MB</span>
              </div>
              <el-progress :percentage="Math.min(100, row.cpuUsagePct || 10)" :stroke-width="4" :show-text="false" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="getWorkerTagType(row.status)" round effect="plain">
              {{ row.status || 'ONLINE' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Last Heartbeat" width="130">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ formatRelativeTime(row.lastHeartbeat) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Google Cloud Run & Pub/Sub Serverless Workers Configuration -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-base">
            <el-icon><Platform /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.cloudRunInfrastructure') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.cloudRunInfraDesc') }}</p>
          </div>
        </div>
        <el-button type="primary" round size="small" @click="emit('save'); toast.success(t('toast.clusterConfigSaved'))">
          {{ t('settings.saveClusterConfig') }}
        </el-button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.cloudRunRenderUrl') }}</label>
          <el-input v-model="config.cloudRun.renderUrl" placeholder="https://shine-render-worker-xyz.a.run.app" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.cloudRunServiceName') }}</label>
          <el-input v-model="config.cloudRun.serviceName" placeholder="shine-render-worker" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.cloudRunRegion') }}</label>
          <el-input v-model="config.cloudRun.region" placeholder="us-central1" size="small"/>
        </div>
        <div class="sm:col-span-2">
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.pubSubRenderTopic') }}</label>
          <el-input v-model="config.pubsub.topicRender" placeholder="shine-render-jobs" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.pubSubSubscription') }}</label>
          <el-input v-model="config.pubsub.subscriptionRender" placeholder="shine-render-sub" size="small"/>
        </div>
      </div>
    </div>

    <!-- Render Jobs Queue Table -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.activeClusterRenderJobs') }}</h3>
        <span class="text-xs text-[var(--el-text-color-secondary)]">{{ renderJobs.length }} Total Job(s)</span>
      </div>

      <el-table :data="renderJobs" style="width: 100%" class="rounded-xl overflow-hidden" empty-text="No render jobs dispatched yet. Submit a render or batch render to see live progress.">
        <el-table-column prop="jobId" label="Job ID" width="140">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.jobId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="seriesTitle" label="Series / Episode" min-width="180">
          <template #default="{ row }">
            <span class="text-xs font-medium text-[var(--el-text-color-primary)]">{{ row.seriesTitle || row.episodeId || 'Series Export' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="workerName" label="Assigned Worker Node" width="200">
          <template #default="{ row }">
            <span class="text-xs font-mono text-[var(--el-text-color-secondary)]">{{ row.workerName || row.workerId || 'Auto (Pub/Sub)' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="Progress" width="160">
          <template #default="{ row }">
            <el-progress :percentage="row.progress || 0" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getJobTagType(row.status)" round effect="plain">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Output / Download" width="160">
          <template #default="{ row }">
            <a
              v-if="row.downloadUrl || row.outputUrl"
              :href="row.downloadUrl || row.outputUrl"
              target="_blank"
              class="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              <el-icon><Download /></el-icon> Download MP4
            </a>
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
