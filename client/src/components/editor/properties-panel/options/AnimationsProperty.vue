<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Pencil, Trash2, Gem } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import SectionHeader from './SectionHeader.vue';

interface Animation {
  id: string;
  type: string;
  options?: {
    id?: string;
    duration?: number;
    [key: string]: any;
  };
}

const props = defineProps<{
  animations: Animation[];
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'remove'): void;
  (e: 'edit', animationId: string): void;
  (e: 'delete', animationId: string): void;
}>();

const hasAnimations = computed(() => props.animations.length > 0);
</script>

<template>
  <div>
    <SectionHeader
      title="Animations"
      :has-content="hasAnimations"
      @add="emit('add')"
      @remove="emit('remove')"
    />
    <div v-if="hasAnimations" class="py-1 flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        class="w-full gap-1.5 text-xs h-7 hover:bg-secondary/60"
        @click="emit('add')"
      >
        <Plus class="size-3.5" />
        Add Animation
      </Button>
      <div class="flex flex-col gap-1.5">
        <div
          v-for="(anim, index) in animations"
          :key="anim.options?.id ?? anim.id"
          class="flex items-center gap-2 p-2 bg-secondary/20 hover:bg-secondary/30 group border border-transparent hover:border-secondary/50 transition-colors"
        >
          <div class="flex items-center justify-center size-7 rounded bg-primary/10 text-primary shrink-0">
            <Gem class="size-3.5" />
          </div>
          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium capitalize truncate">{{ anim.type }}</span>
              <Badge variant="secondary" class="text-[9px] px-1.5 py-0 h-4 font-normal">
                {{ 
                  (anim.options?.duration ?? 0) / 1e6 < 1
                    ? `${Math.round(((anim.options?.duration ?? 0) / 1e6) * 1000)}ms`
                    : `${Math.round(((anim.options?.duration ?? 0) / 1e6) * 10) / 10}s`
                }}
              </Badge>
            </div>
            <span class="text-[10px] text-muted-foreground truncate">#{{ index + 1 }}</span>
          </div>
          <div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              class="size-6 hover:bg-secondary"
              @click="emit('edit', anim.id)"
            >
              <Pencil class="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6 hover:bg-secondary text-muted-foreground hover:text-red-400"
              @click="emit('delete', anim.id)"
            >
              <Trash2 class="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
