<template>
  <div class="admin-users-page bg-surface text-on-surface min-h-screen p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
      <div>
        <h1 class="text-2xl font-bold text-on-surface flex items-center gap-2">
          <el-icon class="text-primary"><User /></el-icon>
          {{ $t('admin.usersTitle') || 'User Management Directory' }}
        </h1>
        <p class="text-sm text-on-surface-variant mt-1">
          Back-office portal to manage subscriptions, user roles, and support impersonation
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-tag type="info" size="large" effect="dark">Total Users: {{ users.length }}</el-tag>
      </div>
    </div>

    <!-- Filters Bar -->
    <el-card shadow="never" class="bg-surface-container border-outline-variant mb-6">
      <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div class="flex flex-1 gap-4 w-full sm:w-auto">
          <el-input
            v-model="searchQuery"
            placeholder="Search by name or email..."
            clearable
            style="max-width: 320px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select v-model="selectedTierFilter" placeholder="Filter Tier" style="width: 160px">
            <el-option label="All Tiers" value="" />
            <el-option label="Free" value="free" />
            <el-option label="Creator" value="creator" />
            <el-option label="Studio" value="studio" />
            <el-option label="Enterprise" value="enterprise" />
          </el-select>
        </div>

        <el-button type="primary" plain @click="fetchUsers">
          <el-icon class="mr-1"><Refresh /></el-icon>
          Refresh Directory
        </el-button>
      </div>
    </el-card>

    <!-- Users Table -->
    <el-card shadow="never" class="bg-surface-container border-outline-variant">
      <el-table :data="filteredUsers" style="width: 100%" class="bg-surface-container">
        <el-table-column label="User" min-width="220">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :src="row.avatarUrl" :size="36" />
              <div>
                <p class="font-medium text-on-surface">{{ row.name }}</p>
                <p class="text-xs text-on-surface-variant">{{ row.email }}</p>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="subscriptionTier" label="Subscription Tier" width="160">
          <template #default="{ row }">
            <el-tag :type="getTierTagType(row.subscriptionTier)" effect="dark" size="small">
              {{ row.subscriptionTier.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="Role" width="130">
          <template #default="{ row }">
            <span class="text-xs font-semibold text-gray-300">{{ row.role }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="creditBalance" label="Credit Balance" width="150">
          <template #default="{ row }">
            <span class="text-xs font-mono font-bold text-primary">{{ row.creditBalance }} pts</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="200" align="right">
          <template #default="{ row }">
            <div class="flex justify-end gap-2">
              <el-button size="small" plain @click="openEditRole(row as any)">
                Edit Role
              </el-button>
              <el-button size="small" type="warning" plain @click="handleImpersonate(row as any)">
                Impersonate
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredUsers.length"
          layout="prev, pager, next"
          background
        />
      </div>
    </el-card>

    <!-- Role Edit Modal -->
    <el-dialog v-model="editDialogVisible" title="Edit User Role" width="420px" custom-class="bg-surface-container border-outline-variant">
      <div v-if="selectedUser" class="space-y-4">
        <p class="text-sm text-gray-300">Editing role for <strong>{{ selectedUser.name }}</strong> ({{ selectedUser.email }})</p>

        <div>
          <label class="block text-xs text-on-surface-variant mb-1">Select Role</label>
          <el-select v-model="newRole" class="w-full">
            <el-option label="User" value="user" />
            <el-option label="Creator" value="creator" />
            <el-option label="Admin" value="admin" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveRole">Save Changes</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import http from '@/utils/http';
import { ElMessage } from 'element-plus';
import { User, Search, Refresh } from '@element-plus/icons-vue';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  subscriptionTier: string;
  role: string;
  creditBalance: number;
  status: 'active' | 'suspended';
}

const searchQuery = ref('');
const selectedTierFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const editDialogVisible = ref(false);
const selectedUser = ref<AdminUser | null>(null);
const newRole = ref('user');

const users = ref<AdminUser[]>([
  {
    id: 'usr-001',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    avatarUrl: 'https://picsum.photos/seed/user1/100',
    subscriptionTier: 'studio',
    role: 'admin',
    creditBalance: 2450,
    status: 'active',
  },
  {
    id: 'usr-002',
    name: 'Sarah Connor',
    email: 'sarah.c@example.com',
    avatarUrl: 'https://picsum.photos/seed/user2/100',
    subscriptionTier: 'creator',
    role: 'creator',
    creditBalance: 850,
    status: 'active',
  },
  {
    id: 'usr-003',
    name: 'Michael Scott',
    email: 'michael.s@example.com',
    avatarUrl: 'https://picsum.photos/seed/user3/100',
    subscriptionTier: 'free',
    role: 'user',
    creditBalance: 40,
    status: 'active',
  },
  {
    id: 'usr-004',
    name: 'Elena Rostova',
    email: 'elena.r@example.com',
    avatarUrl: 'https://picsum.photos/seed/user4/100',
    subscriptionTier: 'enterprise',
    role: 'creator',
    creditBalance: 12000,
    status: 'active',
  },
]);

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesTier = !selectedTierFilter.value || u.subscriptionTier === selectedTierFilter.value;
    return matchesSearch && matchesTier;
  });
});

function getTierTagType(tier: string) {
  switch (tier) {
    case 'free': return 'info';
    case 'creator': return 'success';
    case 'studio': return 'warning';
    case 'enterprise': return 'danger';
    default: return 'info';
  }
}

async function fetchUsers() {
  try {
    const res = await http.get('/admin/users');
    if (res.data && res.data.data) {
      users.value = res.data.data;
    }
  } catch (err) {
    console.error('Failed to fetch admin users', err);
  }
}

function openEditRole(user: AdminUser) {
  selectedUser.value = user;
  newRole.value = user.role;
  editDialogVisible.value = true;
}

async function saveRole() {
  if (!selectedUser.value) return;
  try {
    await http.put(`/admin/users/${selectedUser.value.id}/role`, { role: newRole.value });
    selectedUser.value.role = newRole.value;
    ElMessage.success('User role updated successfully');
    editDialogVisible.value = false;
  } catch (err) {
    console.error('Failed to update user role', err);
    ElMessage.error('Failed to update role');
  }
}

async function handleImpersonate(user: AdminUser) {
  try {
    const res = await http.post('/admin/impersonate', { userId: user.id });
    if (res.data && res.data.data && res.data.data.token) {
      ElMessage.success(`Impersonating ${user.name}`);
    }
  } catch (err) {
    console.error('Impersonate failed', err);
    ElMessage.error('Impersonation failed');
  }
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-users-page :deep(.el-card) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}
.admin-users-page :deep(.el-table) {
  --el-table-bg-color: var(--el-bg-color-overlay) !important;
  --el-table-tr-bg-color: var(--el-bg-color-overlay) !important;
  --el-table-header-bg-color: var(--el-bg-color) !important;
  --el-table-border-color: var(--el-border-color) !important;
  --el-table-text-color: var(--el-text-color-primary) !important;
}
</style>
