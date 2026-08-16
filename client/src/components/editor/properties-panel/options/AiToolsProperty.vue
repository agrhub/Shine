<script setup lang="ts">
import Switch from '@/components/ui/switch/Switch.vue';
import Button from '@/components/ui/button/Button.vue';

interface AiToolsPropertyProps {
  noiseReduction: boolean;
  enhanceVoice: boolean;
  beatsDetection: boolean;
}

defineProps<AiToolsPropertyProps>();

const emit = defineEmits<{
  (e: 'noiseReductionChange', val: boolean): void;
  (e: 'enhanceVoiceChange', val: boolean): void;
  (e: 'beatsDetectionChange', val: boolean): void;
}>();
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-semibold text-foreground">AI Tools</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="size-5 text-muted-foreground hover:text-foreground"
      >
        <span class="text-base leading-none">+</span>
      </Button>
    </div>

    <div class="py-1 flex flex-col gap-2">
      <!-- Noise Reduction -->
      <div
        class="p-3 border transition-all duration-300"
        :class="noiseReduction
          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.05)]'
          : 'bg-secondary/30 border-border/40 hover:border-border/60'"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold text-foreground">Noise Reduction</span>
            <span class="text-[10px] text-muted-foreground">Reduce background noise</span>
          </div>
          <Switch
            :checked="noiseReduction"
            @update:checked="emit('noiseReductionChange', $event)"
            class="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <!-- Enhance Voice -->
      <div
        class="p-3 border transition-all duration-300"
        :class="enhanceVoice
          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.05)]'
          : 'bg-secondary/30 border-border/40 hover:border-border/60'"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold text-foreground">Enhance Voice</span>
            <span class="text-[10px] text-muted-foreground">Clarify spoken frequencies</span>
          </div>
          <Switch
            :checked="enhanceVoice"
            @update:checked="emit('enhanceVoiceChange', $event)"
            class="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <!-- Beats Detection -->
      <div
        class="p-3 border transition-all duration-300"
        :class="beatsDetection
          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.05)]'
          : 'bg-secondary/30 border-border/40 hover:border-border/60'"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold text-foreground">Beats Detection</span>
            <span class="text-[10px] text-muted-foreground">Detect and snap to beats</span>
          </div>
          <Switch
            :checked="beatsDetection"
            @update:checked="emit('beatsDetectionChange', $event)"
            class="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>
