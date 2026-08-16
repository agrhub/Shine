<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSeriesStore } from '@/stores/useSeriesStore';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { toast } from 'vue-sonner';
import { User } from '@element-plus/icons-vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'view-character', char: any): void;
}>();

const { t } = useI18n();
const seriesStore = useSeriesStore();
const pipelineStore = usePipelineStore();

const characters = computed(() => seriesStore.charactersList);

function close() {
  emit('update:open', false);
}

function viewCharacter(char: any) {
  emit('view-character', char);
}

async function handleRenderCharacter(char: any) {
  try {
    toast.info(t('workspace.renderingCharacter'));
    await pipelineStore.renderCharacter(char);
    toast.success(t('toast.characterRendered'));
  } catch {
    toast.error(t('toast.failedToQueueCharRender'));
  }
}

function getCharStatus(charId: string) {
  return pipelineStore.characterRenderStatuses.get(charId) || 'idle';
}
</script>

<template>
  <el-dialog
    :model-value="open"
    @update:model-value="emit('update:open', $event)"
    :title="t('workspace.manageCastAll')"
    width="680px"
    align-center
    destroy-on-close
    class="cast-modal"
  >
    <div v-if="characters.length === 0" class="text-center py-12 space-y-3" style="color: var(--el-text-color-secondary);">
      <el-icon :size="40"><User /></el-icon>
      <p class="text-sm">{{ t('workspace.noCharacters', 'No characters found for this series.') }}</p>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
      <div
        v-for="char in characters"
        :key="char.id"
        class="rounded-2xl border p-4 flex flex-col gap-3 cursor-pointer hover:border-[var(--el-color-primary)] transition-all group"
        style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
        @click="viewCharacter(char)"
      >
        <!-- Avatar Area -->
        <div class="flex items-center gap-3">
          <div class="relative">
            <el-avatar
              v-if="char.avatarUrl"
              :src="char.avatarUrl"
              :size="56"
              class="border-2"
              style="border-color: var(--el-color-primary-light-5);"
            />
            <el-avatar
              v-else
              :size="56"
              class="border-2"
              style="border-color: var(--el-border-color); background-color: var(--el-fill-color-dark);"
            >
              <el-icon :size="24"><User /></el-icon>
            </el-avatar>

            <!-- Render status badge -->
            <div
              v-if="getCharStatus(char.id) === 'running'"
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style="background-color: var(--el-color-warning);"
            >
              <el-icon class="is-loading" :size="10" style="color: white;"><Loading /></el-icon>
            </div>
            <div
              v-else-if="getCharStatus(char.id) === 'done'"
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style="background-color: var(--el-color-success);"
            >
              <el-icon :size="10" style="color: white;"><Check /></el-icon>
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm truncate" style="color: var(--el-text-color-primary);">{{ char.name }}</p>
            <p class="text-xs truncate" style="color: var(--el-text-color-secondary);">{{ char.role }}</p>
          </div>
        </div>

        <!-- Identity preview -->
        <p v-if="char.identity" class="text-[11px] leading-relaxed line-clamp-2" style="color: var(--el-text-color-secondary);">
          {{ char.identity }}
        </p>

        <!-- Badges: Gender, Nationality, Voice, LoRA -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <el-tag v-if="char.gender" size="small" effect="plain" round class="!text-[9px]">
            {{ char.gender === 'female' ? `♀ ${t('workspace.female')}` : char.gender === 'male' ? `♂ ${t('workspace.male')}` : t('workspace.neutral') }}
          </el-tag>
          <el-tag v-if="char.nationality" size="small" type="info" effect="plain" round class="!text-[9px]">
            🌐 {{ char.nationality }}
          </el-tag>
          <el-tag v-if="char.voiceId" size="small" type="success" effect="plain" round class="!text-[9px]">
            🎙 {{ char.voiceId }}
          </el-tag>
          <el-tag v-if="char.loraModel" size="small" type="info" effect="plain" class="!text-[9px] !font-mono truncate max-w-full">
            {{ char.loraModel }}
          </el-tag>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-auto" @click.stop>
          <el-button
            v-if="!char.avatarUrl"
            type="primary"
            size="small"
            round
            class="flex-1"
            icon="Picture"
            :loading="getCharStatus(char.id) === 'running'"
            @click="handleRenderCharacter(char)"
          >
            {{ getCharStatus(char.id) === 'running' ? t('workspace.renderingCharacter') : t('workspace.renderCharacter') }}
          </el-button>
          <el-button
            v-else
            size="small"
            round
            class="flex-1"
            icon="Picture"
            :loading="getCharStatus(char.id) === 'running'"
            @click="handleRenderCharacter(char)"
          >
            Re-render
          </el-button>
          <el-button
            size="small"
            round
            icon="User"
            @click="viewCharacter(char)"
          >
            Detail
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <span class="text-xs" style="color: var(--el-text-color-secondary);">
          {{ characters.length }} {{ t('workspace.characterConsistency', 'characters') }}
        </span>
        <el-button round @click="close">{{ t('common.close', 'Close') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>
