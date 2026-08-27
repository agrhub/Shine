<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WebCodecsUnsupportedModalProps {
  open: boolean;
}

defineProps<WebCodecsUnsupportedModalProps>();
const { t } = useI18n();
</script>

<template>
  <Dialog :open="open">
    <DialogContent :show-close-button="false" class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('editor.browserNotSupported') }}</DialogTitle>
      </DialogHeader>
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">
          {{ t('editor.unsupportedDesc') }}
        </p>
        <div>
          <p class="font-medium text-sm mb-2">
            {{ t('editor.supportedBrowsersList') }}
          </p>
          <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>{{ t('editor.chromeBrowser') }}</li>
            <li>{{ t('editor.edgeBrowser') }}</li>
            <li>{{ t('editor.operaBrowser') }}</li>
          </ul>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ t('editor.safariFirefoxNote') }}
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
