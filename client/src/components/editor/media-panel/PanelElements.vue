<script setup lang="ts">
import { ref } from 'vue';
import { createShapeClip, type ShapeElement } from '@/lib/shape-utils';
import { core } from '@/lib/project';
import { generateId } from '@openvideo/core';

interface BackdropElement {
  id: string;
  name: string;
  backdropType: 'solid' | 'gradient' | 'meshGradient' | 'noise' | 'floatingBlobs';
  colors: string[];
  gradientType?: 'linear' | 'radial';
  speed?: number;
  icon: string;
}

const SHAPES: ShapeElement[] = [
  { id: 'rectangle', name: 'Rectangle', shapeType: 'rectangle', icon: '□' },
];

const BACKDROPS: BackdropElement[] = [
  {
    id: 'solid_backdrop',
    name: 'Solid Backdrop',
    backdropType: 'solid',
    colors: ['#6A5AF9'],
    icon: '🎨',
  },
  {
    id: 'gradient_backdrop',
    name: 'Gradient Backdrop',
    backdropType: 'gradient',
    colors: ['#6A5AF9', '#B14EFF'],
    gradientType: 'linear',
    icon: '🌈',
  },
  {
    id: 'mesh_backdrop',
    name: 'Mesh Gradient',
    backdropType: 'meshGradient',
    colors: ['#6A5AF9', '#B14EFF', '#FF7A7A'],
    speed: 0.15,
    icon: '🔮',
  },
  {
    id: 'noise_backdrop',
    name: 'Noise Backdrop',
    backdropType: 'noise',
    colors: ['#222222', '#444444'],
    speed: 0.1,
    icon: '📺',
  },
  {
    id: 'blobs_backdrop',
    name: 'Floating Blobs',
    backdropType: 'floatingBlobs',
    colors: ['#6A5AF9', '#FF7A7A'],
    speed: 0.2,
    icon: '🫧',
  },
];

const selectedId = ref<string | null>(null);

const handleAddShape = async (element: ShapeElement) => {
  selectedId.value = element.id;
  try {
    const shapeClip = createShapeClip(element);
    await core.clip.add(shapeClip);
    console.log("Added shape:", element.name, "with ID:", shapeClip.id);
  } catch (error) {
    console.error('Failed to add shape:', error);
  }
  setTimeout(() => (selectedId.value = null), 300);
};

const handleAddBackdrop = async (element: BackdropElement) => {
  selectedId.value = element.id;
  try {
    const duration = 5000000;
    const backdropClip = {
      id: generateId(),
      type: "Backdrop",
      name: element.name,
      timing: {
        display: { from: 0, to: duration },
        trim: { from: 0, to: duration },
        duration,
        playbackRate: 1,
      },
      transform: {
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        angle: 0,
        opacity: 1,
        zIndex: 0,
      },
      style: {
        backdropType: element.backdropType,
        colors: element.colors,
        gradientType: element.gradientType,
        speed: element.speed,
      },
      animations: [],
      locked: false,
    };

    await core.clip.add(backdropClip as any);
    console.log("Added backdrop:", element.name, "with ID:", backdropClip.id);
  } catch (error) {
    console.error('Failed to add backdrop:', error);
  }
  setTimeout(() => (selectedId.value = null), 300);
};
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-auto p-4 space-y-6">
      <!-- Shapes Section -->
      <div class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Shapes
        </h3>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
          <button
            v-for="element in SHAPES"
            :key="element.id"
            @click="handleAddShape(element)"
            :class="[
              'group relative aspect-square border overflow-hidden rounded-md bg-secondary/30 border-border/40 hover:border-border hover:bg-secondary/50 transition-all duration-150',
              selectedId === element.id && 'ring-2 ring-primary border-primary'
            ]"
          >
            <div class="w-full h-full flex items-center justify-center p-3">
              <span class="text-4xl text-foreground/60">{{ element.icon }}</span>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-[10px] font-medium text-foreground truncate block">
                {{ element.name }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Backdrops Section -->
      <div class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Backdrops
        </h3>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
          <button
            v-for="element in BACKDROPS"
            :key="element.id"
            @click="handleAddBackdrop(element)"
            :class="[
              'group relative aspect-square border overflow-hidden rounded-md bg-secondary/30 border-border/40 hover:border-border hover:bg-secondary/50 transition-all duration-150',
              selectedId === element.id && 'ring-2 ring-primary border-primary'
            ]"
          >
            <div class="w-full h-full flex items-center justify-center p-3">
              <span class="text-4xl">{{ element.icon }}</span>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-[10px] font-medium text-foreground truncate block">
                {{ element.name }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
