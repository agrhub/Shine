<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const storageProviders = [
  { id: 'gcs', name: 'Google Cloud Storage (GCS)', tag: 'GCP Native', icon: 'fa-brands fa-google', color: 'text-blue-500', desc: 'Google Cloud Platform bucket storage with instant presigned URLs' },
  { id: 'b2', name: 'Backblaze B2', tag: 'Lowest Cost', icon: 'fa-solid fa-fire', color: 'text-red-500', desc: 'Cost-effective S3-compatible object storage' },
  { id: 'r2', name: 'Cloudflare R2', tag: 'Zero Egress', icon: 'fa-solid fa-bolt', color: 'text-amber-500', desc: 'Zero egress bandwidth fee S3 storage' },
  { id: 's3', name: 'Amazon S3', tag: 'AWS Standard', icon: 'fa-brands fa-aws', color: 'text-amber-600', desc: 'Enterprise standard AWS S3 buckets' },
  { id: 'local', name: 'Local Disk', tag: 'Local Server', icon: 'fa-solid fa-hard-drive', color: 'text-purple-500', desc: 'Local server filesystem storage' },
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
          <i class="fa-solid fa-database text-primary"></i>
          Asset Hosting & Multi-Cloud Storage
        </h2>
        <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
          Configure active object storage provider for drama media assets, video exports, and character LoRA anchors
        </p>
      </div>
      <el-button type="primary" round size="small" :loading="isSaving" @click="handleSave">
        Save Storage Config
      </el-button>
    </div>

    <!-- Unified Multi-Cloud Storage Provider Config -->
    <div class="p-6 bg-[var(--el-card-bg-color)] border border-[var(--el-border-color)] rounded-2xl shadow-soft space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-[var(--el-border-color)]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[var(--el-text-color-primary)]">Multi-Cloud Storage Provider (Media & LoRA Anchors)</h3>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">Active Provider: <span class="font-bold text-primary">{{ (config.s3.provider || 'gcs').toUpperCase() }}</span> — Auto-ingestion and S3/GCS presigned streaming</p>
          </div>
        </div>
        <el-switch v-model="config.s3.enabled" size="small"/>
      </div>

      <!-- Provider Selection Grid -->
      <div>
        <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-2">Select Active Storage Engine</label>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            v-for="p in storageProviders"
            :key="p.id"
            @click="config.s3.provider = p.id"
            :class="[
              'p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
              config.s3.provider === p.id
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                : 'border-[var(--el-border-color)] hover:border-primary/50 bg-[var(--el-bg-color-page)]'
            ]"
          >
            <div class="flex items-center justify-between overflow-hidden">
              <i :class="[p.icon, p.color, 'text-base']"></i>
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
          <i class="fa-brands fa-google text-blue-500 text-sm"></i>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">Google Cloud Storage (GCS) Configuration</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">GCS Media Bucket</label>
            <el-input v-model="config.gcs.bucketName" placeholder="shine-studio-media" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">GCP Project ID</label>
            <el-input v-model="config.gcs.projectId" placeholder="camhub-shine" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Public CDN / Custom Domain</label>
            <el-input v-model="config.gcs.publicDomain" placeholder="https://storage.googleapis.com/shine-studio-media" size="small"/>
          </div>
          <div class="sm:col-span-3">
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Service Account Key Path / ADC</label>
            <el-input v-model="config.gcs.keyFilename" placeholder="./service-account.json (or uses GOOGLE_APPLICATION_CREDENTIALS / ADC)" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Backblaze B2 -->
      <div v-else-if="config.s3.provider === 'b2'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <i class="fa-solid fa-fire text-red-500 text-sm"></i>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">Backblaze B2 Storage Configuration</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">B2 Bucket Name</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-media" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">B2 S3 Endpoint</label>
            <el-input v-model="config.s3.endpoint" placeholder="https://s3.us-east-005.backblazeb2.com" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Region</label>
            <el-input v-model="config.s3.region" placeholder="us-east-005" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">B2 Key ID (Access Key)</label>
            <el-input v-model="config.s3.accessKeyId" placeholder="005..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">B2 Application Key (Secret Key)</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password placeholder="K005..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Public CDN Domain</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://cdn.shine-studio.ai" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Cloudflare R2 -->
      <div v-else-if="config.s3.provider === 'r2'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <i class="fa-solid fa-bolt text-amber-500 text-sm"></i>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">Cloudflare R2 Storage Configuration</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">R2 Bucket Name</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-r2-assets" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Cloudflare Account ID</label>
            <el-input v-model="config.s3.accountId" placeholder="d5c8e..." size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Public R2 CDN Domain</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://assets.yourdomain.com" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">R2 Access Key ID</label>
            <el-input v-model="config.s3.accessKeyId" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">R2 Secret Access Key</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">S3 Endpoint</label>
            <el-input v-model="config.s3.endpoint" placeholder="https://<accountId>.r2.cloudflarestorage.com" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Amazon S3 -->
      <div v-else-if="config.s3.provider === 's3'" class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <i class="fa-brands fa-aws text-amber-600 text-sm"></i>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">Amazon S3 Configuration</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">AWS S3 Bucket Name</label>
            <el-input v-model="config.s3.bucketName" placeholder="shine-enterprise-assets" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">AWS Region</label>
            <el-input v-model="config.s3.region" placeholder="us-east-1" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">CloudFront CDN Domain</label>
            <el-input v-model="config.s3.publicDomain" placeholder="https://d111111abcdef8.cloudfront.net" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">AWS Access Key ID</label>
            <el-input v-model="config.s3.accessKeyId" size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">AWS Secret Access Key</label>
            <el-input v-model="config.s3.secretAccessKey" type="password" show-password size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Custom S3 Endpoint (Optional)</label>
            <el-input v-model="config.s3.endpoint" placeholder="Leave empty for standard AWS" size="small"/>
          </div>
        </div>
      </div>

      <!-- Dynamic Settings Form: Local Disk Storage -->
      <div v-else class="p-4 bg-[var(--el-fill-color-light)] rounded-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--el-border-color)]">
          <i class="fa-solid fa-hard-drive text-purple-500 text-sm"></i>
          <span class="text-xs font-bold text-[var(--el-text-color-primary)]">Local Disk Storage Configuration</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Local Upload Directory</label>
            <el-input value="./uploads" disabled size="small"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--el-text-color-secondary)] block mb-1">Internal Stream Route</label>
            <el-input value="/api/assets/file/*" disabled size="small"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
