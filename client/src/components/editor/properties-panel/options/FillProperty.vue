<script setup lang="ts">
import { ref, watch } from 'vue';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  color: string;
}>();

const emit = defineEmits<{
  (e: 'colorChange', val: string): void;
}>();

const colorPickerOpen = ref(false);
const localColor = ref(props.color || '#3b82f6');

const hasFill = ref(
  !!props.color && props.color !== '' && props.color !== 'transparent'
);

watch(() => props.color, (v) => {
  localColor.value = v || '#3b82f6';
  hasFill.value = !!v && v !== '' && v !== 'transparent';
});

const handleAdd = () => emit('colorChange', '#3b82f6');
const handleRemove = () => emit('colorChange', 'transparent');
const handleColorInput = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  localColor.value = color;
  emit('colorChange', color);
};
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold">Fill</span>
      <div class="flex gap-1">
        <Button v-if="!hasFill" variant="ghost" size="icon" class="size-5 text-muted-foreground" @click="handleAdd">
          <Plus class="size-3" />
        </Button>
        <Button v-else variant="ghost" size="icon" class="size-5 text-destructive" @click="handleRemove">
          <Trash2 class="size-3" />
        </Button>
      </div>
    </div>

    <div v-if="hasFill" class="py-1">
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-muted-foreground">Color</span>
        <div class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-40">
          <button
            class="h-5 w-5 rounded border border-border shadow-sm shrink-0"
            :style="{ backgroundColor: localColor }"
            @click="colorPickerOpen = !colorPickerOpen"
          />
          <input
            type="color"
            :value="localColor"
            class="w-0 h-0 opacity-0 absolute"
            @input="handleColorInput"
          />
          <span class="text-xs font-mono uppercase flex-1 truncate">{{ localColor.toUpperCase() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
