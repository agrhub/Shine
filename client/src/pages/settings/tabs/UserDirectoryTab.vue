<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import http from '@/utils/http';

const { t } = useI18n();

const isLoading = ref(false);
const userDirectory = ref<any[]>([]);

const userSearchQuery = ref('');
const userTierFilter = ref('');

const filteredUserDirectory = computed(() => {
  return userDirectory.value.filter((u: any) => {
    const query = userSearchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.id && u.id.toLowerCase().includes(query));
    const matchesTier = !userTierFilter.value || (u.tier && u.tier.toLowerCase() === userTierFilter.value.toLowerCase());
    return matchesSearch && matchesTier;
  });
});

async function loadUsers() {
  isLoading.value = true;
  try {
    const res: any = await http.get('/admin/users');
    if (res?.data && Array.isArray(res.data)) {
      userDirectory.value = res.data;
    } else if (Array.isArray(res)) {
      userDirectory.value = res;
    }
  } catch (err: any) {
    console.error('Failed to load user directory', err);
    toast.error(t('toast.userDirectoryLoadError'));
  } finally {
    isLoading.value = false;
  }
}

// Edit Role Modal State
const isEditRoleModalOpen = ref(false);
const selectedDirectoryUser = ref<any>(null);
const editUserRoleValue = ref('user');
const isUpdatingRole = ref(false);

function openEditUserRole(u: any) {
  selectedDirectoryUser.value = u;
  editUserRoleValue.value = u.role || 'user';
  isEditRoleModalOpen.value = true;
}

async function saveUserRole() {
  if (!selectedDirectoryUser.value) return;
  isUpdatingRole.value = true;
  try {
    await http.patch(`/admin/users/${selectedDirectoryUser.value.id}/role`, {
      role: editUserRoleValue.value,
    });
    selectedDirectoryUser.value.role = editUserRoleValue.value;
    toast.success(t('toast.userRoleUpdated'));
    isEditRoleModalOpen.value = false;
    loadUsers();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || t('toast.userDirectoryLoadError'));
  } finally {
    isUpdatingRole.value = false;
  }
}

// Edit Credits Modal State
const isCreditsModalOpen = ref(false);
const creditsValue = ref(100);
const isUpdatingCredits = ref(false);

function openEditCredits(u: any) {
  selectedDirectoryUser.value = u;
  creditsValue.value = u.creditBalance || u.credits || 100;
  isCreditsModalOpen.value = true;
}

async function saveUserCredits() {
  if (!selectedDirectoryUser.value) return;
  isUpdatingCredits.value = true;
  try {
    await http.patch(`/admin/users/${selectedDirectoryUser.value.id}/credits`, {
      credits: creditsValue.value,
    });
    selectedDirectoryUser.value.creditBalance = creditsValue.value;
    selectedDirectoryUser.value.credits = creditsValue.value;
    toast.success(t('toast.userCreditsUpdated'));
    isEditRoleModalOpen.value = false;
    loadUsers();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || t('toast.userDirectoryLoadError'));
  } finally {
    isUpdatingCredits.value = false;
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center pb-5 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)] flex items-center gap-2">
          <el-icon class="text-amber-500"><Lock /></el-icon>
          {{ t('settings.userDirTitle') }}
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          {{ t('settings.userDirDesc') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <el-tag type="info" size="small" round effect="plain">{{ t('settings.totalUsersLabel') }} {{ filteredUserDirectory.length }}</el-tag>
        <el-button size="small" round :loading="isLoading" @click="loadUsers">
          <el-icon class="mr-1.5"><Refresh /></el-icon> {{ t('common.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="flex items-center gap-4">
      <el-input
        v-model="userSearchQuery"
        placeholder="Search by name, email, or ID..."
        clearable
        style="max-width: 320px"
        size="small"
      >
        <template #prefix>
          <el-icon class="text-gray-400"><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="userTierFilter" placeholder="Filter Tier" style="width: 150px" size="small">
        <el-option label="All Tiers" value="" />
        <el-option label="Free Tier" value="free" />
        <el-option label="Creator Pro" value="creator" />
        <el-option label="Studio Team" value="studio" />
        <el-option label="Enterprise" value="enterprise" />
      </el-select>
    </div>

    <!-- User Directory Table -->
    <div class="bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl overflow-hidden shadow-soft">
      <el-table v-loading="isLoading" :data="filteredUserDirectory" style="width: 100%">
        <el-table-column label="User Details" min-width="260">
          <template #default="{ row }">
            <div class="flex items-center gap-3 py-1">
              <img
                :src="row.avatarUrl || '/images/avatars/avatar-default.jpg'"
                class="w-9 h-9 rounded-full bg-surface-container object-cover border border-white/10 shrink-0"
              />
              <div class="min-w-0">
                <div class="font-bold text-xs text-[var(--el-text-color-primary)] truncate">{{ row.name }}</div>
                <div class="text-[11px] text-[var(--el-text-color-secondary)] truncate">{{ row.email }}</div>
                <div class="text-[10px] text-gray-500 font-mono">ID: {{ row.id }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="tier" label="Plan Tier" width="130">
          <template #default="{ row }">
            <el-tag size="small" type="warning" round effect="plain">{{ (row.tier || 'FREE').toUpperCase() }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="Role" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'admin' ? 'danger' : row.role === 'creator' ? 'success' : 'info'" round effect="plain">
              {{ row.role || 'user' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="creditBalance" label="Credits" width="130">
          <template #default="{ row }">
            <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
              <el-icon class="text-amber-500 text-[10px]"><Coin /></el-icon>
              <span>{{ (row.creditBalance ?? row.credits ?? 0).toLocaleString() }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="2FA" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.two_factor_enabled ? 'success' : 'info'" round effect="plain">
              {{ row.two_factor_enabled ? 'ON' : 'OFF' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="180" align="right">
          <template #default="{ row }">
            <div class="flex items-center justify-end gap-1">
              <el-button type="primary" link size="small" @click="openEditUserRole(row)">
                Role
              </el-button>
              <el-button type="warning" link size="small" @click="openEditCredits(row)">
                Credits
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Edit User Role Modal -->
    <el-dialog v-model="isEditRoleModalOpen" title="Edit User Role & Permissions" width="420px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <p class="text-xs text-[var(--el-text-color-secondary)]">
          Editing role for: <strong class="text-[var(--el-text-color-primary)]">{{ selectedDirectoryUser?.name }} ({{ selectedDirectoryUser?.email }})</strong>
        </p>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Assigned System Role</label>
          <el-select v-model="editUserRoleValue" class="w-full" size="small">
            <el-option label="Administrator (Full Admin Access)" value="admin" />
            <el-option label="Creator / Producer (Generate & Edit)" value="creator" />
            <el-option label="Standard User (Limited Access)" value="user" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isEditRoleModalOpen = false">Cancel</el-button>
          <el-button type="primary" round size="small" :loading="isUpdatingRole" @click="saveUserRole">Save Role</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Edit User Credits Modal -->
    <el-dialog v-model="isCreditsModalOpen" title="Adjust User AI Credits" width="420px" destroy-on-close align-center class="rounded-2xl">
      <div class="space-y-4 py-2">
        <p class="text-xs text-[var(--el-text-color-secondary)]">
          Adjust credits for: <strong class="text-[var(--el-text-color-primary)]">{{ selectedDirectoryUser?.name }} ({{ selectedDirectoryUser?.email }})</strong>
        </p>
        <div>
          <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1.5">Credit Balance</label>
          <el-input-number v-model="creditsValue" :min="0" :step="100" class="!w-full" size="small" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button round size="small" @click="isCreditsModalOpen = false">Cancel</el-button>
          <el-button type="primary" round size="small" :loading="isUpdatingCredits" @click="saveUserCredits">Save Credits</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
