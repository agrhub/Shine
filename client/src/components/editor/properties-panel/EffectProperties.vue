<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VALUES_FILTER_SPECIAL_LIMITS, VALUES_FILTER_SPECIAL } from '@openvideo/engine-pixi';
import Slider from '@/components/ui/slider/Slider.vue';
import Select from '@/components/ui/select/Select.vue';
import SelectContent from '@/components/ui/select/SelectContent.vue';
import SelectGroup from '@/components/ui/select/SelectGroup.vue';
import SelectItem from '@/components/ui/select/SelectItem.vue';
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue';
import SelectValue from '@/components/ui/select/SelectValue.vue';
import Button from '@/components/ui/button/Button.vue';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import InputGroupButton from '@/components/ui/input-group/InputGroupButton.vue';
import InputGroupInput from '@/components/ui/input-group/InputGroupInput.vue';
import NumberInput from '@/components/ui/number-input/NumberInput.vue';

interface EffectPropertiesProps {
  clip: any;
}

const props = defineProps<EffectPropertiesProps>();

const filterKey = computed(() => props.clip?.effectKey || props.clip?.effect?.key);

const limits = computed(() => {
  if (!filterKey.value) return {};
  return (VALUES_FILTER_SPECIAL_LIMITS as any)[filterKey.value] || {};
});

const defaultValues = computed(() => {
  if (!filterKey.value) return {};
  return (VALUES_FILTER_SPECIAL as any)[filterKey.value] || {};
});

const EXTRA_PROPERTIES = {
  asciiFilter: {
    color: 'color',
    replaceColor: 'checkbox',
  },
  bevelFilter: {
    lightColor: 'color',
    shadowColor: 'color',
  },
  colorGradientFilter: {
    type: 'select',
  },
  colorMapFilter: {
    nearest: 'checkbox',
  },
  colorOverlayFilter: {
    color: 'color',
  },
  colorReplaceFilter: {
    originalColor: 'color',
    targetColor: 'color',
  },
  crtFilter: {
    verticalLine: 'checkbox',
  },
  dotFilter: {
    grayscale: 'checkbox',
  },
  dropShadowFilter: {
    color: 'color',
    shadowOnly: 'checkbox',
  },
  glitchFilter: {
    fillMode: 'select',
  },
  glowFilter: {
    color: 'color',
    knockout: 'checkbox',
  },
  godrayFilter: {
    parallel: 'checkbox',
  },
  hslAdjustmentFilter: {
    colorize: 'checkbox',
  },
  multiColorReplaceFilter: {
    replacements: 'replacements',
  },
  outlineFilter: {
    color: 'color',
    knockout: 'checkbox',
  },
  simpleLightmapFilter: {
    color: 'color',
  },
};

const extraProperties = computed(() => {
  if (!filterKey.value) return {};
  return (EXTRA_PROPERTIES as any)[filterKey.value] || {};
});

const values = computed(() => props.clip?.values || props.clip?.effect?.values || {});

const handleUpdate = (property: string, value: any) => {
  if (!props.clip) return;
  props.clip.update({
    values: {
      ...values.value,
      [property]: value,
    },
  });
};

const hasProperties = computed(() => {
  return (
    (limits.value && Object.keys(limits.value).length > 0) ||
    (extraProperties.value && Object.keys(extraProperties.value).length > 0)
  );
});

const TYPES_COLOR_GRADIENT_FILTER = [
  { value: 0, label: 'Linear' },
  { value: 1, label: 'Radial' },
  { value: 2, label: 'Conic' },
];

const TYPES_GLITCH_FILTER = [
  { value: 0, label: 'TRANSPARENT' },
  { value: 1, label: 'ORIGINAL' },
  { value: 2, label: 'LOOP' },
  { value: 3, label: 'CLAMP' },
  { value: 4, label: 'MIRROR' },
];

// Helper mutation functions to keep template logic clean and type-safe
function addStop(property: string, config: any) {
  const current = values.value[property] ?? defaultValues.value[property] ?? [];
  const list = [...current];
  list.push({ color: '#000000', offset: config[0].offset.min, alpha: config[0].alpha.min });
  handleUpdate(property, list);
}

function removeStop(property: string, index: number | string) {
  const current = values.value[property] ?? defaultValues.value[property] ?? [];
  const list = [...current];
  list.splice(Number(index), 1);
  handleUpdate(property, list);
}

function updateStopField(property: string, index: number | string, field: string, val: any) {
  const current = values.value[property] ?? defaultValues.value[property] ?? [];
  const list = [...current];
  const idx = Number(index);
  list[idx] = { ...list[idx], [field]: val };
  handleUpdate(property, list);
}

function updateMatrixItem(property: string, index: number | string, val: any) {
  const current = values.value[property] ?? [];
  const list = [...current];
  list[Number(index)] = val;
  handleUpdate(property, list);
}

function addReplacement(property: string) {
  const list = [...(values.value[property] || [])];
  list.push(['#000000', '#000000']);
  handleUpdate(property, list);
}

function removeReplacement(property: string, index: number | string) {
  const list = [...values.value[property]];
  list.splice(Number(index), 1);
  handleUpdate(property, list);
}

function updateReplacementItem(property: string, rowIndex: number | string, colorIndex: number | string, val: any) {
  const list = [...values.value[property]];
  const rIdx = Number(rowIndex);
  list[rIdx] = [...list[rIdx]];
  list[rIdx][Number(colorIndex)] = val;
  handleUpdate(property, list);
}

function updatePairItem(property: string, index: number | string, val: any) {
  const current = values.value[property] ?? defaultValues.value[property] ?? [];
  const list = [...current];
  list[Number(index)] = val;
  handleUpdate(property, list);
}
</script>

<template>
  <div class="flex flex-col text-xs space-y-4">
    <div class="font-semibold text-sm">Effect Configuration</div>

    <div v-if="!hasProperties" class="text-sm text-muted-foreground italic text-center py-4">
      Properties not available for modification
    </div>

    <div v-else class="flex flex-col gap-3">
      <!-- Standard properties based on limits -->
      <div v-for="[property, config] in Object.entries(limits)" :key="property">
        <!-- Complex properties rendered block-style -->
        <div v-if="property === 'stops' || property === 'matrix'" class="flex flex-col gap-2 py-1">
          <span class="text-xs font-semibold text-foreground capitalize">
            {{ property.replace(/([A-Z])/g, ' $1').trim() }}
          </span>

          <!-- Stops property renderer -->
          <div v-if="property === 'stops'" class="flex flex-col gap-4">
            <div
              v-for="(stop, index) in (values[property] ?? defaultValues[property] ?? [])"
              :key="index"
              class="flex flex-col gap-2 border p-2 rounded relative pt-6 bg-secondary/10"
            >
              <button
                v-if="(values[property] ?? defaultValues[property] ?? []).length > 2"
                class="absolute top-0 right-2 text-red-400 hover:text-red-500 text-sm"
                @click="removeStop(property, index)"
              >
                ×
              </button>

              <!-- Color picker -->
              <div class="flex items-center justify-between py-1 gap-4">
                <span class="text-xs text-muted-foreground">Color</span>
                <div class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-40">
                  <button
                    class="h-5 w-5 rounded border border-border shadow-sm shrink-0"
                    :style="{ backgroundColor: stop.color }"
                    @click="($refs[`stopColorInput_${index}`] as any)?.[0]?.click()"
                  />
                  <input
                    :ref="`stopColorInput_${index}`"
                    type="color"
                    :value="stop.color"
                    class="w-0 h-0 opacity-0 absolute"
                    @input="updateStopField(property, index, 'color', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="text-xs font-mono uppercase flex-1 truncate">{{ stop.color.toUpperCase() }}</span>
                </div>
              </div>

              <!-- Offset -->
              <div class="flex items-center justify-between py-1 gap-4">
                <span class="text-xs text-muted-foreground">Offset</span>
                <div class="flex items-center gap-2 w-40">
                  <Slider
                    :model-value="[stop.offset]"
                    :min="(config as any)[0].offset.min"
                    :max="(config as any)[0].offset.max"
                    :step="(config as any)[0].offset.step"
                    @update:model-value="v => v && updateStopField(property, index, 'offset', v[0])"
                    class="flex-1"
                  />
                  <InputGroup class="w-14 h-7">
                    <NumberInput
                      :model-value="stop.offset"
                      @update:model-value="updateStopField(property, index, 'offset', $event || 0)"
                      class="pl-1 bg-transparent text-xs!"
                      :min="(config as any)[0].offset.min"
                      :max="(config as any)[0].offset.max"
                      :step="(config as any)[0].offset.step"
                    />
                  </InputGroup>
                </div>
              </div>

              <!-- Alpha -->
              <div class="flex items-center justify-between py-1 gap-4">
                <span class="text-xs text-muted-foreground">Alpha</span>
                <div class="flex items-center gap-2 w-40">
                  <Slider
                    :model-value="[stop.alpha]"
                    :min="(config as any)[0].alpha.min"
                    :max="(config as any)[0].alpha.max"
                    :step="(config as any)[0].alpha.step"
                    @update:model-value="v => v && updateStopField(property, index, 'alpha', v[0])"
                    class="flex-1"
                  />
                  <InputGroup class="w-14 h-7">
                    <NumberInput
                      :model-value="stop.alpha"
                      @update:model-value="updateStopField(property, index, 'alpha', $event || 0)"
                      class="pl-1 bg-transparent text-xs!"
                      :min="(config as any)[0].alpha.min"
                      :max="(config as any)[0].alpha.max"
                      :step="(config as any)[0].alpha.step"
                    />
                  </InputGroup>
                </div>
              </div>
            </div>
            <Button
              @click="addStop(property, config)"
              variant="outline"
              size="sm"
              class="w-full"
            >
              Add Stop
            </Button>
          </div>

          <!-- Matrix property renderer -->
          <div v-else-if="property === 'matrix'" class="flex flex-col gap-2">
            <div
              v-for="(v, i) in (values[property] ?? [])"
              :key="i"
              class="flex items-center justify-between py-1 gap-4"
            >
              <span class="text-xs text-muted-foreground font-mono">M{{ i }}</span>
              <div class="flex items-center gap-2 w-[160px]">
                <Slider
                  :model-value="[v]"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  @update:model-value="val => val && updateMatrixItem(property, i, val[0])"
                  class="flex-1"
                />
                <InputGroup class="w-14 h-7">
                  <NumberInput
                    :model-value="v"
                    @update:model-value="updateMatrixItem(property, i, $event || 0)"
                    class="pl-1 bg-transparent text-xs! text-center"
                    :min="0"
                    :max="1"
                    :step="0.01"
                  />
                </InputGroup>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline-rendered standard properties -->
        <div v-else class="flex items-center justify-between py-1 gap-4">
          <span class="text-xs text-muted-foreground capitalize">
            {{ property.replace(/([A-Z])/g, ' $1').trim() }}
          </span>
          <div class="w-[160px]">
            <!-- Coordinates Property -->
            <div
              v-if="
                (values[property] ?? defaultValues[property]) &&
                typeof (values[property] ?? defaultValues[property]) === 'object' &&
                'x' in (values[property] ?? defaultValues[property]) &&
                'y' in (values[property] ?? defaultValues[property])
              "
              class="flex flex-col gap-1 w-[160px]"
            >
              <div v-for="axis in (['x', 'y'] as const)" :key="axis" class="flex items-center gap-2 py-0.5">
                <span class="w-3 text-[10px] font-semibold text-muted-foreground uppercase">
                  {{ axis }}
                </span>
                <Slider
                  :model-value="[(values[property] ?? defaultValues[property])[axis]]"
                  :min="(config as any)[axis].min"
                  :max="(config as any)[axis].max"
                  :step="(config as any)[axis].step"
                  @update:model-value="
                    v => v && handleUpdate(property, {
                      ...(values[property] ?? defaultValues[property]),
                      [axis]: v[0],
                    })
                  "
                  class="flex-1"
                />
                <InputGroup class="w-12 h-7">
                  <NumberInput
                    :model-value="(values[property] ?? defaultValues[property])[axis]"
                    @update:model-value="
                      handleUpdate(property, {
                        ...(values[property] ?? defaultValues[property]),
                        [axis]: $event || 0,
                      })
                    "
                    class="pl-1 bg-transparent text-[10px]!"
                    :min="(config as any)[axis].min"
                    :max="(config as any)[axis].max"
                    :step="(config as any)[axis].step"
                  />
                </InputGroup>
              </div>
            </div>

            <!-- Pair Property (amplitude, waveLength, alpha) -->
            <div
              v-else-if="
                ['amplitude', 'waveLength', 'alpha'].includes(property) &&
                Array.isArray(values[property] ?? defaultValues[property]) &&
                (values[property] ?? defaultValues[property]).length === 2
              "
              class="flex flex-col gap-1 w-[160px]"
            >
              <div v-for="i in ([0, 1] as const)" :key="i" class="flex items-center gap-2 py-0.5">
                <span class="w-8 text-[9px] uppercase text-muted-foreground truncate">
                  {{ i === 0 ? 'Start' : 'End' }}
                </span>
                <Slider
                  :model-value="[(values[property] ?? defaultValues[property])[i]]"
                  :min="(config as any)[i].min"
                  :max="(config as any)[i].max"
                  :step="(config as any)[i].step"
                  @update:model-value="v => v && updatePairItem(property, i, v[0])"
                  class="flex-1"
                />
                <InputGroup class="w-12 h-7">
                  <NumberInput
                    :model-value="(values[property] ?? defaultValues[property])[i]"
                    @update:model-value="updatePairItem(property, i, $event || 0)"
                    class="pl-1 bg-transparent text-[10px]!"
                    :min="(config as any)[i].min"
                    :max="(config as any)[i].max"
                    :step="(config as any)[i].step"
                  />
                </InputGroup>
              </div>
            </div>

            <!-- Simple Slider Property -->
            <div v-else class="flex items-center gap-2">
              <Slider
                :model-value="[values[property] ?? defaultValues[property] ?? 0]"
                :min="(config as any).min"
                :max="(config as any).max"
                :step="(config as any).step"
                @update:model-value="v => v && handleUpdate(property, v[0])"
                class="flex-1"
              />
              <InputGroup class="w-14 h-7">
                <NumberInput
                  :model-value="values[property] ?? defaultValues[property] ?? 0"
                  @update:model-value="handleUpdate(property, $event)"
                  class="pl-1 bg-transparent text-xs!"
                  :min="(config as any).min"
                  :max="(config as any).max"
                  :step="(config as any).step"
                />
              </InputGroup>
            </div>
          </div>
        </div>
      </div>

      <!-- Extra properties -->
      <div v-for="[property, type] in Object.entries(extraProperties)" :key="property">
        <div v-if="type === 'replacements'" class="flex flex-col gap-2 py-2">
          <span class="text-xs font-semibold text-foreground capitalize">
            {{ property.replace(/([A-Z])/g, ' $1').trim() }}
          </span>
          <div class="flex flex-col gap-2">
            <div
              v-for="(colors, rowIndex) in (values[property] ?? [])"
              :key="rowIndex"
              class="flex items-center gap-2 border p-2 rounded relative pt-6"
            >
              <button
                v-if="(values[property] ?? []).length > 1"
                class="absolute top-0 right-2 text-red-400 hover:text-red-500 text-sm"
                @click="removeReplacement(property, rowIndex)"
              >
                ×
              </button>
              <div
                v-for="(color, colorIndex) in colors"
                :key="colorIndex"
                class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-28"
              >
                <button
                  class="h-5 w-5 rounded border border-border shadow-sm shrink-0"
                  :style="{ backgroundColor: color }"
                  @click="($refs[`replColor_${rowIndex}_${colorIndex}`] as any)?.[0]?.click()"
                />
                <input
                  :ref="`replColor_${rowIndex}_${colorIndex}`"
                  type="color"
                  :value="color"
                  class="w-0 h-0 opacity-0 absolute"
                  @input="updateReplacementItem(property, rowIndex, colorIndex, ($event.target as HTMLInputElement).value)"
                />
                <span class="text-[10px] font-mono uppercase flex-1 truncate">{{ color.toUpperCase() }}</span>
              </div>
            </div>
            <Button
              @click="addReplacement(property)"
              variant="outline"
              size="sm"
              class="w-full"
            >
              Add Replacement
            </Button>
          </div>
        </div>

        <div v-else class="flex items-center justify-between py-1 gap-4">
          <span class="text-xs text-muted-foreground capitalize">
            {{ property.replace(/([A-Z])/g, ' $1').trim() }}
          </span>
          <div class="w-[160px]">
            <!-- Color picker -->
            <div
              v-if="type === 'color'"
              class="flex items-center gap-2 h-7 bg-muted border border-border rounded-md px-2 w-40 ml-auto"
            >
              <button
                class="h-5 w-5 rounded border border-border shadow-sm shrink-0"
                :style="{ backgroundColor: (values[property] ?? defaultValues[property] ?? '#000000') }"
                @click="($refs[`extraColorInput_${property}`] as any)?.click()"
              />
              <input
                :ref="`extraColorInput_${property}`"
                type="color"
                :value="(values[property] ?? defaultValues[property] ?? '#000000')"
                class="w-0 h-0 opacity-0 absolute"
                @input="handleUpdate(property, ($event.target as HTMLInputElement).value)"
              />
              <span class="text-xs font-mono uppercase flex-1 truncate">
                {{ (values[property] ?? defaultValues[property] ?? '#000000').toUpperCase() }}
              </span>
            </div>

            <!-- Checkbox option -->
            <div v-else-if="type === 'checkbox'" class="flex justify-end">
              <input
                type="checkbox"
                :checked="!!(values[property] ?? defaultValues[property])"
                @change="handleUpdate(property, ($event.target as HTMLInputElement).checked)"
                class="rounded border-white/20 bg-secondary text-primary focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer"
              />
            </div>

            <!-- Select dropdown -->
            <Select
              v-else-if="type === 'select'"
              :model-value="String(values[property] ?? defaultValues[property] ?? 0)"
              @update:model-value="handleUpdate(property, Number($event))"
            >
              <SelectTrigger class="w-[160px] h-7 bg-secondary border text-xs!">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="option in (property === 'fillMode' ? TYPES_GLITCH_FILTER : TYPES_COLOR_GRADIENT_FILTER)"
                    :key="option.value"
                    :value="option.value.toString()"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
