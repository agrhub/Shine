<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  ChevronsUpDown,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Underline,
  Strikethrough,
  Type
} from 'lucide-vue-next';
import Popover from '@/components/ui/popover/Popover.vue';
import PopoverContent from '@/components/ui/popover/PopoverContent.vue';
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue';
import Input from '@/components/ui/input/Input.vue';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import Button from '@/components/ui/button/Button.vue';
import Select from '@/components/ui/select/Select.vue';
import SelectContent from '@/components/ui/select/SelectContent.vue';
import SelectItem from '@/components/ui/select/SelectItem.vue';
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue';
import SelectValue from '@/components/ui/select/SelectValue.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';
import { getGroupedFonts } from '@/utils/font-utils';

interface TextGroupPropertyProps {
  text: string;
  currentFamily: string;
  currentFont: {
    postScriptName: string;
    fullName: string;
  };
  fontStyles: Array<{ id: string; postScriptName: string; fullName: string }>;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  underline: boolean;
  overline: boolean;
  linethrough: boolean;
  textCase: 'none' | 'uppercase' | 'lowercase';
}

const props = defineProps<TextGroupPropertyProps>();

const emit = defineEmits<{
  (e: 'textChange', val: string): void;
  (e: 'fontChange', postScriptName: string): void;
  (e: 'fontStyleChange', postScriptName: string): void;
  (e: 'fontSizeChange', val: number): void;
  (e: 'textAlignChange', val: 'left' | 'center' | 'right'): void;
  (e: 'underlineChange', val: boolean): void;
  (e: 'overlineChange', val: boolean): void;
  (e: 'linethroughChange', val: boolean): void;
  (e: 'textCaseChange', val: 'none' | 'uppercase' | 'lowercase'): void;
}>();

const GROUPED_FONTS = getGroupedFonts();
const isOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

watch(isOpen, (open) => {
  if (open) {
    searchQuery.value = '';
    nextTick(() => {
      searchInput.value?.focus();
    });
  }
});

const fontItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const filtered = GROUPED_FONTS.filter((family) =>
    family.family.toLowerCase().includes(query)
  ).sort((a, b) => a.family.localeCompare(b.family));

  return filtered;
});

function selectFont(postScriptName: string) {
  emit('fontChange', postScriptName);
  isOpen.value = false;
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Section Header -->
    <div class="flex items-center justify-between py-2">
      <span class="text-xs font-semibold text-foreground">Typography</span>
    </div>

    <div class="py-1 flex flex-col">
      <!-- Content -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Content</span>
        <Input
          :model-value="text"
          @update:model-value="emit('textChange', String($event))"
          class="w-[160px] h-7 text-xs! bg-secondary border"
          placeholder="Text"
        />
      </div>

      <!-- Font -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Font</span>
        <div class="w-[160px]">
          <Popover :open="isOpen" @update:open="isOpen = $event">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                :aria-expanded="isOpen"
                class="w-full h-7 justify-between px-3 border-input text-xs relative"
              >
                <span class="truncate">{{ currentFamily }}</span>
                <ChevronsUpDown class="size-4 opacity-50 shrink-0 absolute right-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="p-0 gap-0" align="end">
              <div class="p-2 border-b border-border">
                <input
                  ref="searchInput"
                  placeholder="Search fonts..."
                  v-model="searchQuery"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <ScrollArea class="h-72 w-full">
                <div class="flex flex-col p-1 gap-px">
                  <div
                    v-if="fontItems.length === 0"
                    class="px-2 py-3 text-sm text-muted-foreground text-center"
                  >
                    No fonts found
                  </div>
                  <button
                    v-else
                    v-for="family in fontItems"
                    :key="family.family"
                    class="flex w-full items-center px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    :class="currentFamily === family.family ? 'bg-accent/50 text-accent-foreground' : ''"
                    @click="selectFont(family.mainFont.postScriptName)"
                  >
                    <span class="flex-1 text-left">{{ family.family }}</span>
                    <Check v-if="currentFamily === family.family" class="size-4 ml-2" />
                  </button>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <!-- Style -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Style</span>
        <Select :model-value="currentFont.postScriptName" @update:model-value="emit('fontStyleChange', String($event))">
          <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="style in fontStyles" :key="style.id" :value="style.postScriptName">
              {{ style.fullName.replace(currentFamily, '').trim() || 'Regular' }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Size -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Size</span>
        <InputGroup class="w-[160px]">
          <NumberInput
            :model-value="fontSize"
            @update:model-value="emit('fontSizeChange', Number($event))"
            class="pl-2 bg-transparent text-xs!"
          />
          <InputGroupAddon align="inline-end">
            <Type class="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <!-- Align -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Align</span>
        <div class="flex items-center bg-secondary p-0.5 w-[160px]">
          <button
            @click="emit('textAlignChange', 'left')"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="textAlign === 'left' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <AlignLeft class="size-3.5" />
          </button>
          <button
            @click="emit('textAlignChange', 'center')"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="textAlign === 'center' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <AlignCenter class="size-3.5" />
          </button>
          <button
            @click="emit('textAlignChange', 'right')"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="textAlign === 'right' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <AlignRight class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Decoration -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Decoration</span>
        <div class="flex items-center bg-secondary p-0.5 w-[160px]">
          <button
            @click="emit('underlineChange', !underline)"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="underline ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <Underline class="size-3.5" />
          </button>
          <button
            @click="emit('overlineChange', !overline)"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="overline ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <svg viewBox="0 0 256 256" fill="currentColor" class="size-3.5">
              <path d="M192,104v40a64,64,0,0,1-128,0V104a8,8,0,0,1,16,0v40a48,48,0,0,0,96,0V104a8,8,0,0,1,16,0ZM216,64a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16H208A8,8,0,0,1,216,64Z" />
            </svg>
          </button>
          <button
            @click="emit('linethroughChange', !linethrough)"
            class="flex-1 flex items-center justify-center h-6 transition-colors"
            :class="linethrough ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            <Strikethrough class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Case -->
      <div class="flex items-center justify-between py-1 gap-4">
        <span class="text-xs text-muted-foreground">Case</span>
        <div class="flex items-center bg-secondary p-0.5 w-[160px]">
          <button
            @click="emit('textCaseChange', 'none')"
            class="flex-1 h-6 text-[10px] font-medium transition-colors"
            :class="textCase === 'none' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            aA
          </button>
          <button
            @click="emit('textCaseChange', 'uppercase')"
            class="flex-1 h-6 text-[10px] font-medium transition-colors"
            :class="textCase === 'uppercase' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            AA
          </button>
          <button
            @click="emit('textCaseChange', 'lowercase')"
            class="flex-1 h-6 text-[10px] font-medium transition-colors"
            :class="textCase === 'lowercase' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            aa
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
