<script setup lang="ts">
import { ref, watch } from 'vue';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChromePicker } from 'vue-color';
import { Plus, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
  color: string;
  width: number;
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'remove'): void;
  (e: 'colorChange', val: string): void;
  (e: 'widthChange', val: number): void;
}>();

const colorPickerOpen = ref(false);
const localColor = ref(props.color || '#000000');

watch(() => props.color, (v) => { localColor.value = v || '#000000'; });

const handleColorChange = (val: { hex: string }) => {
  localColor.value = val.hex;
  emit('colorChange', val.hex);
};
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold">Stroke</span>
      <div class="flex gap-1">
        <Button v-if="!open" variant="ghost" size="icon" class="size-5 text-muted-foreground" @click="emit('add')">
          <Plus class="size-3" />
        </Button>
        <Button v-else variant="ghost" size="icon" class="size-5 text-destructive" @click="emit('remove')">
          <Trash2 class="size-3" />
        </Button>
      </div>
    </div>

    <div v-if="open" class="py-1 flex flex-col gap-2">
      <!-- Width -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground w-20">Width</span>
        <div class="flex items-center gap-2 flex-1">
          <Slider
            :model-value="[width]"
            :min="0"
            :max="30"
            :step="1"
            class="flex-1"
            @update:model-value="(v) => emit('widthChange', v![0])"
          />
          <span class="text-xs font-mono w-8 text-right">{{ width }}px</span>
        </div>
      </div>
      <!-- Color -->
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground w-20">Color</span>
        <Popover v-model:open="colorPickerOpen">
          <PopoverTrigger as-child>
            <button class="h-7 w-7 rounded border border-border shadow-sm" :style="{ backgroundColor: localColor }" />
          </PopoverTrigger>
          <PopoverContent class="p-0 w-auto" align="start">
            <ChromePicker :model-value="localColor" @update:model-value="handleColorChange" />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  </div>
</template>
