<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Download,
  Upload,
  FilePlus,
  Keyboard,
  Sparkles,
  Moon,
  Sun,
  Square,
  Smartphone,
  Monitor,
  Archive,
  Save,
  LogOut,
  User as UserIcon,
  Loader2,
} from 'lucide-vue-next';
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icons } from '../shared/icons';
import { LogoIcons } from '../shared/logos';
import { useStudioStore } from '~/composables/useStudioStore';
import { usePanelStore } from '@/stores/usePanelStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAuthStore } from '@/stores/useAuthStore';
import ExportModal from './ExportModal.vue';
import { toast } from 'vue-sonner';
import http from '@/utils/http';
import ShortcutsModal from './ShortcutsModal.vue';
import TaskbarPopover from './TaskbarPopover.vue';
import { core } from '@/utils/project';
import { useTheme } from '@/composables/useTheme';

const { theme, toggleTheme } = useTheme();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const panelStore = usePanelStore();
const projectStore = useProjectStore();
const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);

const isSaving = ref(false);
const canUndo = ref(false);
const canRedo = ref(false);
const isExportModalOpen = ref(false);
const isShortcutsModalOpen = ref(false);

const handleSaveProject = async () => {
  isSaving.value = true;
  try {
    const projectId = (route.query.id as string) || projectStore.projectId;
    const currentState = core.store.getState();
    const payload = {
      name: projectStore.projectName || 'Untitled Project',
      aspectRatio: projectStore.aspectRatio,
      width: projectStore.canvasSize.width,
      height: projectStore.canvasSize.height,
      fps: projectStore.fps,
      dataJson: JSON.stringify(currentState),
      userId: authStore.user?.id || 'demo_user',
    };

    const episodeId = projectStore.projectId || (route.params.episodeId as string) || (route.query.id as string) || 'ep_01';

    await http.put(`/episodes/${episodeId}/timeline`, {
      settings: {
        width: projectStore.canvasSize.width,
        height: projectStore.canvasSize.height,
        fps: projectStore.fps,
      },
      tracks: currentState.tracks || [],
      clips: currentState.clips || {},
      changeSummary: 'Saved from Studio Header',
      author: {
        id: authStore.user?.id || 'usr_default',
        name: authStore.user?.name || 'Editor Alpha',
      },
    });

    toast.success('Episode timeline saved to cloud!');
  } catch (error: any) {
    console.error('Failed to save project:', error);
    toast.error(error.message || 'Failed to save timeline to cloud');
  } finally {

    isSaving.value = false;
  }
};
const customWidth = ref('');
const customHeight = ref('');

const updateHistoryState = () => {
  if (!studio.value) return;
  canUndo.value = studio.value.history.canUndo();
  canRedo.value = studio.value.history.canRedo();
};

watch(studio, (newStudio, oldStudio) => {
  if (oldStudio) oldStudio.off('history:changed', updateHistoryState);
  if (newStudio) {
    newStudio.on('history:changed', updateHistoryState);
    updateHistoryState();
  }
}, { immediate: true });

const handleNew = () => {
  const confirmed = window.confirm(
    'Are you sure you want to start a new project? Unsaved changes will be lost.'
  );
  if (confirmed) {
    (core as any).clear?.();
  }
};

const handleExportJSON = () => {
  try {
    const json = core.project.export();
    const clipsArr = Array.isArray(json?.clips) ? json.clips : Object.values(json?.clips || {});
    console.log("handleExportJSON", json);
    if (clipsArr.length === 0) {
      toast.warning('No clips to export');
      return;
    }
    const jsonString = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement('a');
    document.body.appendChild(aEl);
    aEl.href = url;
    aEl.download = `openvideo-project-${Date.now()}.json`;
    aEl.click();
    setTimeout(() => {
      if (document.body.contains(aEl)) document.body.removeChild(aEl);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error: any) {
    toast.error('Failed to export to JSON: ' + error.message);
  }
};

const handleImportJSON = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      core.project.import(json);
      // await (core as any).loadFromJSON?.(json);
      toast.success('Project loaded successfully');
    } catch (error: any) {
      toast.error('Failed to load from JSON: ' + error.message);
    } finally {
      if (document.body.contains(input)) document.body.removeChild(input);
    }
  };
  document.body.appendChild(input);
  input.click();
};

const handleApplyCustomSize = () => {
  const w = parseInt(customWidth.value);
  const h = parseInt(customHeight.value);
  if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
    const ratio = w === h ? 'Square' : w > h ? 'Landscape' : 'Portrait';
    projectStore.setCanvasSize({ width: w, height: h }, ratio);
  } else {
    toast.error('Invalid dimensions');
  }
};

const handleUndo = () => studio.value?.undo();
const handleRedo = () => studio.value?.redo();
</script>

<template>
  <header class="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10 border-b">
    <!-- Left Section -->
    <div class="flex items-center gap-2">
      <router-link to="/projects" class="pointer-events-auto flex h-9 w-9 bg-primary/20 items-center justify-center rounded-md">
        <LogoIcons.scenify class="w-6 h-6" />
      </router-link>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="h-8 text-xs font-medium">File</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48 text-xs bg-card border border-border shadow-md">
          <DropdownMenuItem @click="handleExportJSON">
            <Download class="mr-2 h-4 w-4" />
            <span>Export (to JSON)</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleImportJSON">
            <Upload class="mr-2 h-4 w-4" />
            <span>Import from JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleNew">
            <FilePlus class="mr-2 h-4 w-4" />
            <span>Clear or New project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="h-8 text-xs font-medium">
            Resize
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-56 p-3 bg-card border border-border shadow-md">
          <div class="space-y-4">
            <div class="space-y-2">
              <p class="text-xs font-medium text-muted-foreground px-1 uppercase tracking-wider">
                Presets
              </p>
              <div class="grid grid-cols-1 gap-1">
                <DropdownMenuItem
                  v-for="preset in [
                    { label: 'Square', icon: Square, width: 1080, height: 1080 },
                    { label: 'Portrait', icon: Smartphone, width: 1080, height: 1920 },
                    { label: 'Landscape', icon: Monitor, width: 1920, height: 1080 },
                  ]"
                  :key="preset.label"
                  @click="projectStore.setCanvasSize({ width: preset.width, height: preset.height }, preset.label)"
                  class="text-xs justify-between cursor-pointer px-2 py-1.5 flex items-center"
                >
                  <div class="flex items-center gap-2">
                    <component :is="preset.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{{ preset.label }}</span>
                  </div>
                  <div
                    :class="[
                      'flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/50',
                      projectStore.aspectRatio === preset.label && 'border-primary'
                    ]"
                  >
                    <div
                      v-if="projectStore.aspectRatio === preset.label"
                      class="h-2 w-2 rounded-full bg-primary"
                    />
                  </div>
                </DropdownMenuItem>
              </div>
            </div>

            <div class="h-px bg-border/50 mx-1" />

            <div class="space-y-3">
              <p class="text-xs font-medium text-muted-foreground px-1 uppercase tracking-wider">
                Custom
              </p>
              <div class="grid grid-cols-2 gap-2 px-1">
                <div class="space-y-1">
                  <label class="text-[10px] text-muted-foreground uppercase">Width</label>
                  <input
                    type="number"
                    v-model="customWidth"
                    placeholder="1920"
                    class="w-full bg-muted/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-7"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] text-muted-foreground uppercase">Height</label>
                  <input
                    type="number"
                    v-model="customHeight"
                    placeholder="1080"
                    class="w-full bg-muted/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-7"
                  />
                </div>
              </div>
              <Button
                @click="handleApplyCustomSize"
                class="w-full h-8 text-xs font-medium mt-1"
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="pointer-events-auto flex h-8 items-center px-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          :disabled="!canUndo"
          @click="handleUndo"
        >
          <Icons.undo class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground"
          :disabled="!canRedo"
          @click="handleRedo"
        >
          <Icons.redo class="size-4" />
        </Button>
      </div>
    </div>

    <!-- Center Section -->
    <div class="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 truncate max-w-[200px] sm:max-w-[300px]">
      {{ projectStore.projectName || 'Untitled Video' }}
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Keyboard shortcuts"
        @click="isShortcutsModalOpen = true"
      >
        <Keyboard class="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        :class="['h-8 w-8 transition-colors', panelStore.isCopilotVisible ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground']"
        title="AI Assistant"
        @click="panelStore.toggleCopilot"
      >
        <Sparkles class="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Toggle Theme"
        @click="toggleTheme"
      >
        <Sun v-if="theme === 'dark'" class="size-4" />
        <Moon v-else class="size-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="h-8 text-xs gap-1.5 font-medium border-border/60"
        :disabled="isSaving"
        @click="handleSaveProject"
      >
        <Loader2 v-if="isSaving" class="animate-spin size-3.5" />
        <Save v-else class="size-3.5 text-primary" />
        <span>Save</span>
      </Button>

      <Button
        size="sm"
        class="h-8 px-4 rounded-full font-medium ml-1"
        @click="isExportModalOpen = true"
      >
        Export
      </Button>

      <DropdownMenu v-if="authStore.user">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 ml-1">
            <UserIcon class="size-4 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48 text-xs bg-card border border-border shadow-md">
          <div class="px-2 py-1.5 border-b border-border/40">
            <p class="font-semibold text-foreground truncate">{{ authStore.user.name }}</p>
            <p class="text-[10px] text-muted-foreground truncate">{{ authStore.user.email }}</p>
          </div>
          <DropdownMenuItem @click="router.push('/projects')">
            <Archive class="mr-2 h-3.5 w-3.5" />
            <span>Projects Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="authStore.logout(); router.push('/login');">
            <LogOut class="mr-2 h-3.5 w-3.5 text-destructive" />
            <span class="text-destructive">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportModal :open="isExportModalOpen" @update:open="isExportModalOpen = $event" />
      <ShortcutsModal :open="isShortcutsModalOpen" @update:open="isShortcutsModalOpen = $event" />
    </div>
  </header>
</template>
