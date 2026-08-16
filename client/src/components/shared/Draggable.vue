<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';

const props = withDefaults(defineProps<{
  shouldDisplayPreview?: boolean;
  data?: Record<string, any>;
}>(), {
  shouldDisplayPreview: true,
  data: () => ({})
});

const isDragging = ref(false);
const position = ref({ x: 0, y: 0 });

const handleDragStart = (e: DragEvent) => {
  isDragging.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.setDragImage(new Image(), 0, 0); // Hide default preview
    const dataStr = JSON.stringify(props.data);
    e.dataTransfer.setData('text/plain', dataStr);
    e.dataTransfer.setData(dataStr, dataStr);
    e.dataTransfer.effectAllowed = 'move';
  }
  position.value = { x: e.clientX, y: e.clientY };
};

const handleDragEnd = () => {
  isDragging.value = false;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (isDragging.value) {
    position.value = { x: e.clientX, y: e.clientY };
  }
};

const handleDocumentDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (isDragging.value) {
    position.value = { x: e.clientX, y: e.clientY };
  }
};

watch(isDragging, (dragging) => {
  if (dragging) {
    document.addEventListener('dragover', handleDocumentDragOver);
  } else {
    document.removeEventListener('dragover', handleDocumentDragOver);
  }
});

onUnmounted(() => {
  document.removeEventListener('dragover', handleDocumentDragOver);
});
</script>

<template>
  <div
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    class="draggable-wrapper"
  >
    <slot />
  </div>

  <Teleport to="body">
    <div
      v-if="isDragging && shouldDisplayPreview"
      :style="{
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%, -50%)',
      }"
    >
      <slot name="preview" />
    </div>
  </Teleport>
</template>
