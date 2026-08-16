<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Message, ArrowLeft } from '@element-plus/icons-vue';

const { t } = useI18n();
const email = ref('');
const isLoading = ref(false);
const isSubmitted = ref(false);

function handleSendReset() {
  if (!email.value) {
    ElMessage.error(t('toast.loginRequiredFields'));
    return;
  }
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
    isSubmitted.value = true;
    ElMessage.success('Password reset instructions sent to your email.');
  }, 1000);
}
</script>

<template>
  <div id="forgot-password-page" class="space-y-8 font-['Outfit',sans-serif]">
    <!-- Header -->
    <div class="space-y-1">
      <h2 class="text-3xl font-extrabold tracking-tight text-[#1c1b1b] dark:text-white">
        {{ t('auth.forgotPasswordHeader') }}
      </h2>
      <p class="text-sm text-gray-500 dark:text-on-surface-variant">
        {{ t('auth.forgotPasswordSubtitle') }}
      </p>
    </div>

    <div v-if="!isSubmitted">
      <form class="space-y-5" @submit.prevent="handleSendReset">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-on-surface-variant mb-1.5">
            Email address
          </label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            placeholder="jane@shinedrama.com"
            class="w-full bg-[#f3f3f3] dark:bg-[#1f2029] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#1c1b1b] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--el-color-primary)] transition-all"
            required
          />
        </div>

        <el-button
          id="send-reset-btn"
          type="primary"
          size="large"
          class="!w-full !bg-primary !text-on-primary !border-none !font-extrabold text-sm !h-12 !rounded-full hover:!opacity-95 shadow-md"
          :loading="isLoading"
          @click="handleSendReset"
        >
          {{ t('auth.sendResetBtn') }}
        </el-button>
      </form>
    </div>

    <div v-else class="bg-primary/10 border border-[var(--el-color-primary)]/30 rounded-2xl p-6 text-center space-y-3">
      <div class="w-12 h-12 rounded-full bg-primary/20 text-on-primary-container flex items-center justify-center mx-auto">
        <el-icon class="text-2xl"><Message /></el-icon>
      </div>
      <h3 class="font-bold text-base text-[#1c1b1b] dark:text-white">Check your inbox</h3>
      <p class="text-xs text-gray-500 dark:text-on-surface-variant">We have sent password recovery instructions to {{ email }}.</p>
    </div>

    <div class="text-center pt-2">
      <router-link to="/auth/login" class="text-xs font-extrabold text-on-primary-container dark:text-primary hover:underline inline-flex items-center gap-1">
        <el-icon><ArrowLeft /></el-icon>
        <span>{{ t('auth.backToLogin') }}</span>
      </router-link>
    </div>
  </div>
</template>
