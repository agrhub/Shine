<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import Popover from '@/components/ui/popover/Popover.vue';
import PopoverContent from '@/components/ui/popover/PopoverContent.vue';
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import { getGroupedFonts } from '@/utils/font-utils';

const props = defineProps<{
  currentFamily: string;
}>();

const emit = defineEmits<{
  (e: 'change', postScriptName: string): void;
}>();

const GROUPED_FONTS = getGroupedFonts();
const isOpen = ref(false);

const currentFontFamily = computed(() => {
  return GROUPED_FONTS.find((f) => f.family === props.currentFamily) ?? GROUPED_FONTS[0];
});

function selectFont(postScriptName: string) {
  emit('change', postScriptName);
  isOpen.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Font
    </label>
    <Popover :open="isOpen" @update:open="isOpen = $event">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="isOpen"
          class="w-full h-7 justify-between px-3 border-input text-xs relative"
        >
          <span class="truncate">{{ currentFontFamily?.family ?? "Select font" }}</span>
          <ChevronDown class="size-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0 gap-0" align="start">
        <ScrollArea class="h-72 w-full">
          <div class="flex flex-col p-1 gap-px">
            <button
              v-for="family in GROUPED_FONTS"
              :key="family.family"
              class="flex w-full items-center px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              :class="currentFontFamily?.family === family.family ? 'bg-accent/50 text-accent-foreground' : ''"
              @click="selectFont(family.mainFont.postScriptName)"
            >
              <span class="flex-1 text-left">{{ family.family }}</span>
              <Check v-if="currentFontFamily?.family === family.family" class="size-4 ml-2" />
            </button>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  </div>
</template>
