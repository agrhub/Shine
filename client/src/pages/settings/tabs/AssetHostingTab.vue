<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const { t } = useI18n();

const storageProviders = [
  { id: 'gcs', name: 'Google Cloud Storage (GCS)', tag: 'GCP Native', icon: 'Platform', color: 'text-blue-500', desc: 'Google Cloud Platform bucket storage with instant presigned URLs' },
  { id: 'b2', name: 'Backblaze B2', tag: 'Lowest Cost', icon: 'Folder', color: 'text-red-500', desc: 'Cost-effective S3-compatible object storage' },
  { id: 'r2', name: 'Cloudflare R2', tag: 'Zero Egress', icon: 'Lightning', color: 'text-amber-500', desc: 'Zero egress bandwidth fee S3 storage' },
  { id: 's3', name: 'Amazon S3', tag: 'AWS Standard', icon: 'Files', color: 'text-amber-600', desc: 'Enterprise standard AWS S3 buckets' },
  { id: 'local', name: 'Local Disk', tag: 'Local Server', icon: 'FolderOpened', color: 'text-indigo-400', desc: 'Local server filesystem storage' },
];

const isSaving = ref(false);

function handleSave() {
  isSaving.value = true;
  emit('save');
  setTimeout(() => {
    isSaving.value = false;
  }, 600);
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between pb-5 border-b border-[var(--el-border-color)]">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-[var(--el-text-color-primary)] flex items-center gap-2">
          <el-icon class="text-primary"><Folder /></el-icon>
          {{ t('settings.assetHostingTitle') }}
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          {{ t('settings.assetHostingDesc') }}
        </p>
      </div>
      <el-button type="primary" round size="small" :loading="isSaving" @click="handleSave">
        {{ t('settings.saveStorageConfig') }}
      </el-button>
    </div>

    <!-- Unified Multi-Cloud Storage Provider Config -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
            <el-icon :size="20"><Upload /></el-icon>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">{{ t('settings.assetHostingTitle') }}</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t('settings.activeProviderLabel') }} <span class="font-bold text-primary">{{ (config.s3.provider || 'gcs').toUpperCase() }}</span></p>
          </div>
        </div>
        <el-switch v-model="config.s3.enabled" size="small"/>
      </div>

      <!-- Provider Selector Grid -->
      <div>
        <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-3">{{ t('settings.selectActiveStorageProvider') }}</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div
            v-for="p in storageProviders"
            :key="p.id"
            @click="config.s3.provider = (p.id as any)"
            :class="[
              'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3',
              config.s3.provider === p.id
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-[var(--el-border-color)] hover:border-gray-400 bg-[var(--el-bg-color-page)]',
            ]"
          >
            <div class="flex items-center justify-between">
              <el-icon :size="18" :class="p.color"><component :is="p.icon" /></el-icon>
              <el-tag size="small" round :type="config.s3.provider === p.id ? 'primary' : undefined" effect="plain">{{ p.tag }}</el-tag>
            </div>
            <div>
              <span class="text-xs font-bold block text-[var(--el-text-color-primary)]">{{ p.name }}</span>
              <span class="text-[10px] text-[var(--el-text-color-secondary)] line-clamp-1 mt-0.5">{{ p.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Google Cloud Storage (GCS) -->
      <div v-if="config.s3.provider === 'gcs'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <el-icon class="text-blue-500 text-sm"><Platform /></el-icon>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">{{ t('settings.gcsConfigTitle') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.gcsMediaBucket') }}</label>
            <el-input v-model="config.gcs.bucketName" placeholder="shine-studio-media" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.gcpProjectId') }}</label>
            <el-input v-model="config.gcs.projectId" placeholder="camhub-shine" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.publicCdnCustomDomain') }}</label>
            <el-input v-model="config.gcs.publicDomain" placeholder="https://storage.googleapis.com/shine-studio-media" size="small"/>
          </div>
          <div class="sm:col-span-3">
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.serviceAccountKeyPath') }}</label>
            <el-input v-model="config.gcs.keyFilename" placeholder="./service-account.json (or uses GOOGLE_APPLICATION_CREDENTIALS / ADC)" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Backblaze B2 -->
      <div v-else-if="config.s3.provider === 'b2'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <el-icon class="text-red-500 text-sm"><Folder /></el-icon>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">{{ t('settings.b2ConfigTitle') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2BucketName') }}</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-media" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2S3Endpoint') }}</label>
            <el-input v-model="config.s3.endpoint" placeholder="https://s3.us-east-005.backblazeb2.com" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.awsRegion') }}</label>
            <el-input v-model="config.s3.region" placeholder="us-east-005" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2KeyId') }}</label>
            <el-input v-model="config.s3.accessKeyId" placeholder="005..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2AppKey') }}</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password placeholder="K005..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.publicCdnCustomDomain') }}</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://cdn.shine-studio.ai" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Cloudflare R2 -->
      <div v-else-if="config.s3.provider === 'r2'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <el-icon class="text-amber-500 text-sm"><Lightning /></el-icon>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">{{ t('settings.r2ConfigTitle') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.r2BucketName') }}</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-r2-assets" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.r2AccountId') }}</label>
            <el-input v-model="config.s3.accountId" placeholder="d5c8e..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.publicCdnCustomDomain') }}</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://assets.yourdomain.com" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.r2AccessKey') }}</label>
            <el-input v-model="config.s3.accessKeyId" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.r2SecretKey') }}</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2S3Endpoint') }}</label>
            <el-input v-model="config.s3.endpoint" placeholder="https://<accountId>.r2.cloudflarestorage.com" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Amazon S3 -->
      <div v-else-if="config.s3.provider === 's3'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <el-icon class="text-amber-600 text-sm"><Files /></el-icon>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">{{ t('settings.s3ConfigTitle') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.s3BucketName') }}</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-enterprise-assets" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.awsRegion') }}</label>
            <el-input v-model="config.s3.region" placeholder="us-east-1" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.publicCdnCustomDomain') }}</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://d111111abcdef8.cloudfront.net" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.s3AccessKey') }}</label>
            <el-input v-model="config.s3.accessKeyId" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.s3SecretKey') }}</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.b2S3Endpoint') }}</label>
            <el-input v-model="config.s3.endpoint" placeholder="Leave empty for standard AWS" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Local Disk Storage -->
      <div v-else class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <el-icon class="text-indigo-400 text-sm"><FolderOpened /></el-icon>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">{{ t('settings.localDiskConfigTitle') }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.localUploadDir') }}</label>
            <el-input value="./uploads" disabled size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">{{ t('settings.internalStreamRoute') }}</label>
            <el-input value="/api/assets/file/*" disabled size="small"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
