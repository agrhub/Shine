<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const router = useRouter();

const newPassword = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);

function handleResetPassword() {
  if (!newPassword.value || !confirmPassword.value) {
    ElMessage.error(t('toast.loginRequiredFields'));
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.error(t('toast.passwordsMismatch'));
    return;
  }
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
    ElMessage.success(t('toast.passwordResetSuccess'));
    router.push('/auth/login');
  }, 1000);
}
</script>

<template>
  <div id="reset-password-page" class="space-y-8 font-['Outfit',sans-serif]">
    <!-- Header -->
    <div class="space-y-1">
      <h2 class="text-3xl font-extrabold tracking-tight text-[#1c1b1b] dark:text-white">
        {{ t('auth.resetPasswordHeader') }}
      </h2>
      <p class="text-sm text-gray-500 dark:text-on-surface-variant">
        Enter your new password below to secure your account.
      </p>
    </div>

    <!-- Form -->
    <form class="space-y-5" @submit.prevent="handleResetPassword">
      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-on-surface-variant mb-1.5">
          New password
        </label>
        <input
          id="reset-new-password"
          v-model="newPassword"
          type="password"
          placeholder="••••••••"
          class="w-full bg-[#f3f3f3] dark:bg-[#1f2029] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#1c1b1b] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--el-color-primary)] transition-all"
          required
        />
      </div>

      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-on-surface-variant mb-1.5">
          Confirm new password
        </label>
        <input
          id="reset-confirm-password"
          v-model="confirmPassword"
          type="password"
          placeholder="••••••••"
          class="w-full bg-[#f3f3f3] dark:bg-[#1f2029] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#1c1b1b] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--el-color-primary)] transition-all"
          required
        />
      </div>

      <el-button
        type="primary"
        size="large"
        class="!w-full !bg-primary !text-on-primary !border-none !font-extrabold text-sm !h-12 !rounded-full hover:!opacity-95 shadow-md"
        :loading="isLoading"
        @click="handleResetPassword"
      >
        {{ t('auth.resetBtn') }}
      </el-button>
    </form>
  </div>
</template>
