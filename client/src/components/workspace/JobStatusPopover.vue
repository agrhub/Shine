<template>
  <el-popover
    placement="bottom-end"
    :width="420"
    trigger="click"
    popper-class="pipeline-job-popover"
    :hide-after="0"
    @show="onPopoverShow"
  >
    <template #reference>
      <button
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200"
        :class="[
          activeJob
            ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20 shadow-sm animate-pulse'
            : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
        ]"
        title="Background Jobs & Pipeline Monitor"
      >
        <span class="relative flex h-2 w-2">
          <span
            v-if="activeJob"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
          ></span>
          <span
            class="relative inline-flex rounded-full h-2 w-2"
            :class="activeJob ? 'bg-primary' : 'bg-muted-foreground/50'"
          ></span>
        </span>

        <component :is="activeJob ? Loader2 : Activity" class="w-3.5 h-3.5" :class="{ 'animate-spin': activeJob }" />
        
        <span v-if="activeJob" class="font-semibold">{{ activeJob.progress }}%</span>
        <span v-else class="hidden md:inline font-medium">Jobs</span>
      </button>
    </template>

    <!-- Popover Content -->
    <div class="p-1 text-card-foreground">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-border/60">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-primary" />
          <h4 class="text-xs font-semibold tracking-tight uppercase text-foreground">Pipeline Task Manager</h4>
        </div>
        <div v-if="activeJob" class="flex items-center gap-1.5">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">
            {{ activeJob.status.toUpperCase() }}
          </span>
          <button
            @click="cancelCurrentJob"
            class="text-[10px] text-destructive hover:underline font-medium ml-1"
          >
            Cancel
          </button>
        </div>
        <div v-else class="text-[11px] text-muted-foreground">
          Idle
        </div>
      </div>

      <!-- Active Job Overview -->
      <div v-if="activeJob" class="py-3 space-y-3">
        <div>
          <div class="flex justify-between items-center text-xs mb-1.5">
            <span class="font-medium truncate max-w-[260px] text-foreground">{{ activeJob.title }}</span>
            <span class="font-bold text-primary">{{ activeJob.progress }}%</span>
          </div>
          <el-progress
            :percentage="activeJob.progress"
            :stroke-width="6"
            :show-text="false"
            color="hsl(var(--primary))"
          />
          <div class="mt-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/40 flex items-start gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span class="truncate leading-relaxed">{{ activeJob.current_step || 'Processing pipeline steps...' }}</span>
          </div>
        </div>

        <!-- 6 Steps Breakdown -->
        <div class="space-y-1.5 border-t border-border/40 pt-2.5">
          <div class="text-[11px] font-medium text-muted-foreground mb-1">Production Steps</div>
          <div
            v-for="step in stepList"
            :key="step.key"
            class="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div class="flex items-center gap-2">
              <component
                :is="getStepStatusIcon(step.key)"
                class="w-3.5 h-3.5"
                :class="getStepStatusColor(step.key)"
              />
              <span class="text-[11px] font-medium" :class="{ 'text-foreground font-semibold': isStepRunning(step.key) }">
                {{ step.label }}
              </span>
            </div>
            <span class="text-[10px] text-muted-foreground font-mono">
              {{ getStepStatusText(step.key) }}
            </span>
          </div>
        </div>

        <!-- Recent Logs -->
        <div v-if="activeJob.logs && activeJob.logs.length > 0" class="border-t border-border/40 pt-2">
          <div class="text-[10px] font-medium text-muted-foreground uppercase mb-1">Recent Activity</div>
          <div class="bg-background/80 rounded p-2 text-[10px] font-mono max-h-24 overflow-y-auto space-y-1 border border-border/40">
            <div
              v-for="(log, idx) in activeJob.logs.slice(-4)"
              :key="idx"
              class="flex items-start gap-1 text-muted-foreground"
            >
              <span class="text-primary shrink-0">›</span>
              <span class="truncate">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No Active Job / History View -->
      <div v-else class="py-4 space-y-3">
        <div v-if="pipelineStore.activeJobs.length > 0" class="space-y-2">
          <div class="text-[11px] font-medium text-muted-foreground">Recent Completed Tasks</div>
          <div
            v-for="job in pipelineStore.activeJobs.slice(0, 3)"
            :key="job.id"
            class="p-2 rounded bg-muted/20 border border-border/30 text-xs space-y-1"
          >
            <div class="flex justify-between items-center">
              <span class="font-medium text-foreground truncate max-w-[240px]">{{ job.title }}</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                :class="job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
              >
                {{ job.status.toUpperCase() }}
              </span>
            </div>
            <div class="text-[10px] text-muted-foreground truncate">{{ job.current_step }}</div>
          </div>
        </div>

        <div v-else class="text-center py-6 text-muted-foreground">
          <Clock class="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p class="text-xs">No active pipeline jobs</p>
          <p class="text-[11px] text-muted-foreground/70 mt-0.5">Tasks will appear here when pipeline starts.</p>
        </div>

        <div class="pt-2 border-t border-border/50">
          <button
            @click="startFullPipeline"
            class="w-full py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
          >
            <Play class="w-3.5 h-3.5" />
            Start Full Production Pipeline
          </button>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePipelineStore } from '@/stores/usePipelineStore';
import { useSeriesStore } from '@/stores/useSeriesStore';
import {
  Activity,
  Layers,
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Play,
  Clock,
} from 'lucide-vue-next';

const pipelineStore = usePipelineStore();
const seriesStore = useSeriesStore();

const activeJob = computed(() => pipelineStore.activeJob);

const stepList = [
  { key: 'b1', label: 'B1: Cast & Wardrobes' },
  { key: 'b2', label: 'B2: Assets & Storyboards' },
  { key: 'b3', label: 'B3: AI Video Clips' },
  { key: 'b4', label: 'B4: Voiceover & TTS' },
  { key: 'b5', label: 'B5: Subtitles & Captions' },
  { key: 'b6', label: 'B6: Final Video Export' },
];

function onPopoverShow() {
  const sid = seriesStore.currentSeries?.id;
  const eid = seriesStore.activeEpisode?.id || seriesStore.activeEpisodeId;
  if (sid && eid) {
    pipelineStore.fetchActiveJobs(sid, eid);
  }
}

function isStepRunning(key: string): boolean {
  if (!activeJob.value?.step_progress) return false;
  return activeJob.value.step_progress[key]?.status === 'running';
}

function getStepStatusIcon(key: string) {
  const step = activeJob.value?.step_progress?.[key];
  if (!step || step.status === 'pending') return Circle;
  if (step.status === 'running') return Loader2;
  if (step.status === 'completed') return CheckCircle2;
  if (step.status === 'failed') return AlertCircle;
  return Circle;
}

function getStepStatusColor(key: string) {
  const step = activeJob.value?.step_progress?.[key];
  if (!step || step.status === 'pending') return 'text-muted-foreground/40';
  if (step.status === 'running') return 'text-primary animate-spin';
  if (step.status === 'completed') return 'text-emerald-500';
  if (step.status === 'failed') return 'text-destructive';
  return 'text-muted-foreground';
}

function getStepStatusText(key: string): string {
  const step = activeJob.value?.step_progress?.[key];
  if (!step || step.status === 'pending') return 'Pending';
  if (step.status === 'running') return 'In Progress';
  if (step.status === 'completed') return 'Done';
  if (step.status === 'failed') return 'Failed';
  return '';
}

async function cancelCurrentJob() {
  if (activeJob.value?.id) {
    await pipelineStore.cancelBackgroundJob(activeJob.value.id);
  }
}

async function startFullPipeline() {
  await pipelineStore.startBackgroundPipeline();
}

onMounted(() => {
  const sid = seriesStore.currentSeries?.id;
  const eid = seriesStore.activeEpisode?.id || seriesStore.activeEpisodeId;
  if (sid && eid) {
    pipelineStore.startJobPolling(sid, eid);
  }
});
</script>

<style scoped>
:deep(.el-progress-bar__outer) {
  background-color: hsl(var(--muted));
}
</style>
