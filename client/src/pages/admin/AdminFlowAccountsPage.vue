<template>
  <div class="admin-flow-accounts bg-surface text-on-surface min-h-screen p-6">
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <el-icon class="text-primary"><VideoCamera /></el-icon>
          Flow Accounts Pool
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          Manage Google Flow (Veo/Imagen) Session Tokens
        </p>
      </div>
      <div class="flex gap-2">
        <el-button type="primary" plain @click="fetchAccounts">
          <el-icon class="mr-1"><Refresh /></el-icon> Refresh
        </el-button>
        <el-button type="warning" plain @click="syncPool">
          <el-icon class="mr-1"><Connection /></el-icon> Sync Tokens
        </el-button>
        <el-button type="primary" @click="dialogVisible = true">
          <el-icon class="mr-1"><Plus /></el-icon> Add Account
        </el-button>
      </div>
    </div>

    <!-- Health Status -->
    <el-alert
      v-if="status"
      :title="`Pool Health: ${status.poolHealth} | Accounts: ${status.activeAccounts} | reCAPTCHA: ${status.recaptchaSolverStatus}`"
      :type="status.poolHealth === 'HEALTHY' ? 'success' : 'error'"
      show-icon
      class="mb-6"
    />

    <el-table :data="accounts" v-loading="loading" class="bg-surface-container border-outline-variant rounded-lg">
      <el-table-column prop="email" label="Account Email" min-width="200" />
      <el-table-column prop="projectId" label="Project ID" width="180" />
      <el-table-column prop="credits" label="Credits" width="100">
        <template #default="{ row }">
          <span class="font-mono font-bold" :class="row.credits > 0 ? 'text-primary' : 'text-error'">
            {{ row.credits }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="Status" width="140">
        <template #default="{ row }">
          <el-tag :type="row.status === 'READY' ? 'success' : 'danger'" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="flowATExpiresAt" label="Token Expiry" width="160">
        <template #default="{ row }">
          {{ row.flowATExpiresAt ? new Date(row.flowATExpiresAt).toLocaleString() : 'N/A' }}
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120">
        <template #default="{ row }">
          <el-button type="danger" link @click="deleteAccount(row._id)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Add Account Dialog -->
    <el-dialog v-model="dialogVisible" title="Add Flow Account Cookie" width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Account Email (Identifier)">
          <el-input v-model="form.email" placeholder="hello@example.com" />
        </el-form-item>
        <el-form-item label="Session Token (__Secure-next-auth.session-token)">
          <el-input v-model="form.sessionToken" type="textarea" :rows="3" placeholder="Paste the long session token here..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="submitAccount" :loading="submitting">
            Save & Sync
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';
import { VideoCamera, Refresh, Plus, Connection } from '@element-plus/icons-vue';

const accounts = ref([]);
const status = ref<any>(null);
const loading = ref(false);
const dialogVisible = ref(false);
const submitting = ref(false);

const form = ref({
  email: '',
  sessionToken: ''
});

async function fetchAccounts() {
  loading.value = true;
  try {
    const res = await http.get('/admin/flow-accounts');
    accounts.value = res.data.accounts;
    const statusRes = await http.get('/admin/flow-accounts/status');
    status.value = statusRes.data;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || 'Failed to fetch accounts');
  } finally {
    loading.value = false;
  }
}

async function syncPool() {
  try {
    loading.value = true;
    await http.post('/admin/flow-accounts/sync');
    ElMessage.success('Pool synced successfully');
    await fetchAccounts();
  } catch (err: any) {
    ElMessage.error('Sync failed');
  } finally {
    loading.value = false;
  }
}

async function submitAccount() {
  if (!form.value.email || !form.value.sessionToken) {
    ElMessage.warning('Please fill in all fields');
    return;
  }
  
  submitting.value = true;
  try {
    await http.post('/admin/flow-accounts', form.value);
    ElMessage.success('Account added/updated successfully');
    dialogVisible.value = false;
    form.value = { email: '', sessionToken: '' };
    await fetchAccounts();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || 'Failed to save account');
  } finally {
    submitting.value = false;
  }
}

async function deleteAccount(id: string) {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this account?');
    await http.delete(`/admin/flow-accounts/${id}`);
    ElMessage.success('Account deleted');
    await fetchAccounts();
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('Delete failed');
    }
  }
}

onMounted(() => {
  fetchAccounts();
});
</script>

<style scoped>
.admin-flow-accounts :deep(.el-dialog) {
  background-color: var(--el-bg-color-overlay) !important;
}
</style>
