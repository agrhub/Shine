<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES } from '@/i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import CountryFlag from '@/components/common/CountryFlag.vue';

const { locale } = useI18n();
const authStore = useAuthStore();

const currentLocaleItem = computed(() => {
  return SUPPORTED_LOCALES.find(l => l.code === locale.value) || SUPPORTED_LOCALES[0];
});

function switchLocale(code: string) {
  locale.value = code as any;
  authStore.updatePreferences({ language: code });
}
</script>

<template>
  <div id="lang-select-btn" class="inline-block">
    <el-dropdown trigger="click" @command="switchLocale">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-muted transition-colors border border-border bg-background cursor-pointer"
        :title="`Language (${locale})`"
      >
        <CountryFlag :code="currentLocaleItem.code" :flag="currentLocaleItem.flag" size="medium" />
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="l in SUPPORTED_LOCALES"
            :key="(l as any).code"
            :command="(l as any).code"
            :class="{ 'font-bold bg-muted': locale === (l as any).code }"
          >
            <CountryFlag :code="l.code" :flag="l.flag" size="small" class="mr-2" />
            <span>{{ l.label }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>
