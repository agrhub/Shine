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

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar">
      <div
        v-for="char in characters"
        :key="char.id"
        class="rounded-2xl border p-3.5 flex flex-row gap-3.5 cursor-pointer hover:border-[var(--el-color-primary)] transition-all group relative overflow-hidden"
        style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color-light);"
        @click="viewCharacter(char)"
      >
        <!-- Big Character Portrait on Left -->
        <div v-loading="getCharStatus(char.id) === 'running'"
          class="w-28 sm:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden relative border shadow-sm flex items-center justify-center"
          style="border-color: var(--el-border-color); background-color: var(--el-fill-color-darker);"
        >
          <img
            v-if="char.avatarUrl"
            :src="char.avatarUrl"
            :alt="char.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div v-else class="flex flex-col items-center justify-center p-2 text-center text-xs space-y-1" style="color: var(--el-text-color-placeholder);">
            <el-icon :size="32"><User /></el-icon>
            <span class="text-[10px]">{{ t('workspace.noAvatarYet', 'No render yet') }}</span>
          </div>
          <div
            v-if="getCharStatus(char.id) === 'done' || char.avatarUrl"
            class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style="background-color: var(--el-color-success);"
          >
            <el-icon :size="10" style="color: white;"><Check /></el-icon>
          </div>
        </div>

        <!-- Details on Right -->
        <div class="flex-1 min-w-0 flex flex-col justify-between">
          <div class="space-y-1.5">
            <!-- Name & Role -->
            <div class="flex items-center justify-between gap-1.5">
              <p class="font-bold text-sm truncate" style="color: var(--el-text-color-primary);">{{ char.name }}</p>
              <el-tag size="small" :type="char.role === 'protagonist' ? 'danger' : char.role === 'antagonist' ? 'warning' : 'info'" effect="light" round class="!text-[9px] !font-medium capitalize">
                {{ char.role }}
              </el-tag>
            </div>

            <!-- Identity preview -->
            <p v-if="char.identity" class="text-[11px] leading-relaxed line-clamp-2" style="color: var(--el-text-color-secondary);">
              {{ char.identity }}
            </p>

            <!-- Badges: Gender, Nationality, Voice, LoRA -->
            <div class="flex items-center gap-1 flex-wrap">
              <el-tag v-if="char.gender" size="small" effect="plain" round class="!text-[9px]">
                {{ char.gender === 'female' ? `♀ ${t('workspace.female')}` : char.gender === 'male' ? `♂ ${t('workspace.male')}` : t('workspace.neutral') }}
              </el-tag>
              <el-tag v-if="char.nationality" size="small" type="info" effect="plain" round class="!text-[9px]">
                🌐 {{ char.nationality }}
              </el-tag>
              <el-tag v-if="char.voiceId" size="small" type="success" effect="plain" round class="!text-[9px]">
                🎙 {{ char.voiceId }}
              </el-tag>
              <el-tag v-if="char.loraModel" size="small" type="info" effect="plain" class="!text-[9px] !font-mono truncate max-w-[100px]">
                {{ char.loraModel }}
              </el-tag>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-1.5 pt-2" @click.stop>
            <el-button
              type="primary"
              size="small"
              round
              class="flex-1"
              icon="Picture"
              :loading="getCharStatus(char.id) === 'running'"
              @click="handleRenderCharacter(char)"
            >
              {{ char.avatarUrl ? 'Re-render' : (getCharStatus(char.id) === 'running' ? t('workspace.renderingCharacter') : t('workspace.renderCharacter')) }}
            </el-button>
            <el-button
              size="small"
              round
              icon="User"
              @click="viewCharacter(char)"
              class="!ml-0"
            >
              Detail
            </el-button>
          </div>
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
