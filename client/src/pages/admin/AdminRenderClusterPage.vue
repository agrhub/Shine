<template>
  <div class="admin-cluster-page bg-surface text-on-surface min-h-screen p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold text-on-surface flex items-center gap-2">
          <el-icon class="text-primary"><Cpu /></el-icon>
          {{ $t('admin.renderClusterTitle') || 'FinOps Cloud Run Render Cluster' }}
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          Monitor GPU utilization, render worker queue, and cost efficiency metrics
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-tag type="success" size="large" effect="dark">
          Active Cluster: 16 GPU Instances
        </el-tag>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <el-card shadow="never" class="bg-surface-container border-outline-variant">
        <span class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">GPU Cluster Load</span>
        <h2 class="text-3xl font-extrabold text-primary mt-2">78.4%</h2>
        <el-progress :percentage="78" color="var(--el-color-primary)" :stroke-width="8" class="mt-4" />
      </el-card>

      <el-card shadow="never" class="bg-surface-container border-outline-variant">
        <span class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Active Render Jobs</span>
        <h2 class="text-3xl font-extrabold text-on-surface mt-2">12 Jobs</h2>
        <p class="text-xs text-on-surface-variant mt-3">4 queued in Cloud Tasks queue</p>
      </el-card>

      <el-card shadow="never" class="bg-surface-container border-outline-variant">
        <span class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Est. Monthly FinOps Spend</span>
        <h2 class="text-3xl font-extrabold text-on-surface mt-2">$3,420.50</h2>
        <p class="text-xs text-primary mt-3">On-track within budget ($4,500 cap)</p>
      </el-card>
    </div>

    <!-- Render Jobs Queue Table -->
    <el-card shadow="never" class="bg-surface-container border-outline-variant">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-semibold text-base text-on-surface">Active Cloud Run Render Jobs</span>
          <el-button type="primary" plain size="small" @click="fetchClusterStatus">
            <el-icon class="mr-1"><Refresh /></el-icon>
            Refresh Metrics
          </el-button>
        </div>
      </template>

      <el-table :data="renderJobs" style="width: 100%" class="bg-surface-container">
        <el-table-column prop="jobId" label="Job ID" width="140" />
        <el-table-column prop="seriesTitle" label="Series & Episode" min-width="200" />
        <el-table-column prop="gpuNode" label="Worker Node" width="160" />
        <el-table-column prop="progress" label="Progress" width="180">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="130">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/utils/http';
import { Cpu, Refresh } from '@element-plus/icons-vue';

const renderJobs = ref([
  { jobId: 'job-9821', seriesTitle: 'The CEO Awakening (Ep 15)', gpuNode: 'us-central1-a-gpu-01', progress: 84, status: 'processing' },
  { jobId: 'job-9822', seriesTitle: 'Neon Dawn (Ep 12)', gpuNode: 'us-central1-a-gpu-02', progress: 42, status: 'processing' },
  { jobId: 'job-9823', seriesTitle: 'Echoes of Silence (Ep 04)', gpuNode: 'us-central1-b-gpu-01', progress: 100, status: 'completed' },
]);

async function fetchClusterStatus() {
  try {
    const res = await http.get('/admin/render-cluster');
    if (res.data && res.data.data) {
      console.log('Cluster status updated', res.data.data);
    }
  } catch (err) {
    console.error('Failed to fetch cluster status', err);
  }
}

onMounted(() => {
  fetchClusterStatus();
});
</script>

<style scoped>
.admin-cluster-page :deep(.el-card) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}
</style>
