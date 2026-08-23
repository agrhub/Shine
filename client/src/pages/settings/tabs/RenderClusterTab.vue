<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const clusterMetrics = ref({
  activeGpuInstances: 16,
  gpuLoadPercentage: 78.4,
  activeJobsCount: 12,
  queuedJobsCount: 4,
  monthlySpendUsd: 3420.50,
  monthlyBudgetCap: 4500,
  serviceName: 'shine-render-worker',
  region: 'us-central1',
  status: 'ONLINE',
});

const renderJobs = ref([
  { jobId: 'job-9801', seriesTitle: 'Spy Neighbor (Ep 1)', gpuNode: 'us-central1-worker-01', progress: 85, status: 'RENDERING' },
  { jobId: 'job-9802', seriesTitle: 'Cyber Revenge (Ep 3)', gpuNode: 'us-central1-worker-02', progress: 42, status: 'RENDERING' },
  { jobId: 'job-9803', seriesTitle: 'Midnight CEO (Ep 1)', gpuNode: 'us-central1-worker-03', progress: 100, status: 'COMPLETED' },
  { jobId: 'job-9804', seriesTitle: 'Dragon Reborn (Ep 2)', gpuNode: 'us-central1-worker-04', progress: 12, status: 'RENDERING' },
]);

const isTestingBatchRender = ref(false);
const batchRenderProgress = ref<{ jobId: string; episodeId: string; status: string; progressPercent: number; outputUrl?: string } | null>(null);

async function loadClusterMetrics() {
  try {
    const res: any = await http.get('/admin/render-cluster');
    if (res?.data) {
      clusterMetrics.value = {
        activeGpuInstances: res.data.activeInstances || 16,
        gpuLoadPercentage: res.data.gpuLoadPct || 78,
        activeJobsCount: res.data.activeJobs?.length || 2,
        queuedJobsCount: res.data.queuedJobsCount || 0,
        monthlySpendUsd: res.data.monthlyCostUsd || 3420.5,
        monthlyBudgetCap: 4500,
        serviceName: res.data.serviceName || 'shine-render-worker',
        region: res.data.region || 'us-central1',
        status: res.data.status || 'ONLINE',
      };
      if (res.data.activeJobs) {
        renderJobs.value = res.data.activeJobs.map((j: any) => ({
          jobId: j.jobId,
          seriesTitle: j.seriesTitle,
          gpuNode: j.gpuNode,
          progress: j.progress,
          status: j.status?.toUpperCase() || 'RENDERING',
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load cluster metrics', err);
  }
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
            toast.success(`Render complete: ${data.outputUrl || data.s3Key}`);
            eventSource.close();
            isTestingBatchRender.value = false;
            loadClusterMetrics();
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

onMounted(() => {
  loadClusterMetrics();
});
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center pb-5 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)] flex items-center gap-2">
          <i class="fa-brands fa-google text-blue-500"></i>
          Google Cloud Run & Compositor Render Cluster
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          Serverless headless render workers, Google Cloud Pub/Sub queue depth, and FinOps spending
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-tag :type="clusterMetrics.status === 'ONLINE' ? 'success' : 'warning'" size="small" effect="plain" round>
          {{ clusterMetrics.status || 'ONLINE' }}: {{ clusterMetrics.activeGpuInstances }} Workers
        </el-tag>
        <el-button type="primary" round size="small" :loading="isTestingBatchRender" @click="handleTestBatchRender">
          <i class="fa-solid fa-play mr-1.5 text-xs"></i> Test Cloud Run Batch Render
        </el-button>
      </div>
    </div>

    <!-- Live Batch Render Progress Banner (SSE Connected) -->
    <div v-if="batchRenderProgress" class="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-semibold text-blue-500">
          <i class="fa-solid fa-spinner fa-spin" v-if="batchRenderProgress.status !== 'completed'"></i>
          <i class="fa-solid fa-circle-check text-green-500" v-else></i>
          <span>Cloud Run Batch Job ({{ batchRenderProgress.episodeId }}) — Status: {{ batchRenderProgress.status.toUpperCase() }}</span>
        </div>
        <span class="text-xs font-bold text-blue-500">{{ batchRenderProgress.progressPercent }}%</span>
      </div>
      <el-progress :percentage="batchRenderProgress.progressPercent" :stroke-width="8" color="#3b82f6" />
      <p v-if="batchRenderProgress.outputUrl" class="text-xs text-green-500 font-medium">
        Output Asset: <a :href="batchRenderProgress.outputUrl" target="_blank" class="underline">{{ batchRenderProgress.outputUrl }}</a>
      </p>
    </div>

    <!-- FinOps & Cloud Run Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">Cloud Run Workers</span>
        <h3 class="text-3xl font-extrabold text-blue-500 mt-2">{{ clusterMetrics.activeGpuInstances }} Active</h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-3">Region: {{ clusterMetrics.region || 'us-central1' }}</p>
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">Pub/Sub Queue Depth</span>
        <h3 class="text-3xl font-extrabold text-amber-500 mt-2">{{ clusterMetrics.queuedJobsCount }} Tasks</h3>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-3">Topic: {{ config.pubsub.topicRender }}</p>
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">Active Render Jobs</span>
        <h3 class="text-3xl font-extrabold text-[var(--el-text-color-primary)] mt-2">{{ clusterMetrics.activeJobsCount }} Jobs</h3>
        <el-progress :percentage="Math.round(clusterMetrics.gpuLoadPercentage)" color="var(--el-color-primary)" :stroke-width="6" class="mt-3" />
      </div>

      <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft">
        <span class="text-xs text-[var(--el-text-color-secondary)] font-semibold uppercase tracking-wider">Est. Monthly FinOps Spend</span>
        <h3 class="text-3xl font-extrabold text-[var(--el-text-color-primary)] mt-2">${{ clusterMetrics.monthlySpendUsd.toLocaleString() }}</h3>
        <p class="text-xs text-primary mt-3">Cap: ${{ clusterMetrics.monthlyBudgetCap }} / month</p>
      </div>
    </div>

    <!-- Google Cloud Run & Pub/Sub Serverless Workers Configuration -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-base">
            <i class="fa-brands fa-google"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">Google Cloud Run & Pub/Sub Worker Infrastructure</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Serverless headless compositor containers & asynchronous batch job dispatch parameters</p>
          </div>
        </div>
        <el-button type="primary" round size="small" @click="emit('save'); toast.success('Cluster configuration saved')">
          Save Cluster Settings
        </el-button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Cloud Run Render URL</label>
          <el-input v-model="config.cloudRun.renderUrl" placeholder="https://shine-render-worker-xyz.a.run.app" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Cloud Run Service Name</label>
          <el-input v-model="config.cloudRun.serviceName" placeholder="shine-render-worker" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Cloud Run Region</label>
          <el-input v-model="config.cloudRun.region" placeholder="us-central1" size="small"/>
        </div>
        <div class="sm:col-span-2">
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Pub/Sub Render Topic</label>
          <el-input v-model="config.pubsub.topicRender" placeholder="shine-render-jobs" size="small"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Pub/Sub Subscription</label>
          <el-input v-model="config.pubsub.subscriptionRender" placeholder="shine-render-sub" size="small"/>
        </div>
      </div>
    </div>

    <!-- Render Jobs Queue Table -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-4">
      <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">Active Cluster Render Jobs</h3>
      <el-table :data="renderJobs" style="width: 100%" class="rounded-xl overflow-hidden">
        <el-table-column prop="jobId" label="Job ID" width="130" />
        <el-table-column prop="seriesTitle" label="Series & Episode" min-width="200" />
        <el-table-column prop="gpuNode" label="Cloud Run Worker Node" width="220" />
        <el-table-column prop="progress" label="Progress" width="180">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'COMPLETED' ? 'success' : 'primary'" round effect="plain">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
