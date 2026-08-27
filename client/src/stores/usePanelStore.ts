import { ActiveTab, EditorMode } from '@/types/api';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePanelStore = defineStore('panel', () => {
  // Original Vue panel properties
  const activeTab = ref<ActiveTab>('assets');
  const isExportModalOpen = ref<boolean>(false);
  const isShortcutsModalOpen = ref<boolean>(false);

  // Missing properties from React panel-store.ts
  const toolsPanel = ref<number>(21);
  const copilotPanel = ref<number>(21);
  const previewPanel = ref<number>(50);
  const propertiesPanel = ref<number>(25);
  const mainContent = ref<number>(70);
  const timeline = ref<number>(30);
  const isCopilotVisible = ref<boolean>(true);
  const editorMode = ref<EditorMode>('editor');
  const showLeftPanel = ref<boolean>(true);
  const showRightPanel = ref<boolean>(true);
  const showTimeline = ref<boolean>(true);

  // Setters/toggles
  function setActiveTab(tab: ActiveTab) {
    activeTab.value = tab;
  }

  function setToolsPanel(size: number) {
    toolsPanel.value = size;
  }

  function setPreviewPanel(size: number) {
    previewPanel.value = size;
  }

  function setPropertiesPanel(size: number) {
    propertiesPanel.value = size;
  }

  function setMainContent(size: number) {
    mainContent.value = size;
  }

  function setTimeline(size: number) {
    timeline.value = size;
  }

  function setCopilotPanel(size: number) {
    copilotPanel.value = size;
  }

  function toggleCopilot() {
    isCopilotVisible.value = !isCopilotVisible.value;
  }

  function setEditorMode(mode: EditorMode) {
    editorMode.value = mode;
  }

  function toggleLeftPanel() {
    showLeftPanel.value = !showLeftPanel.value;
  }

  function toggleRightPanel() {
    showRightPanel.value = !showRightPanel.value;
  }

  function toggleTimeline() {
    showTimeline.value = !showTimeline.value;
  }

  function resetLayout() {
    showLeftPanel.value = true;
    showRightPanel.value = true;
    showTimeline.value = true;
  }

  function setExportModalOpen(open: boolean) {
    isExportModalOpen.value = open;
  }

  function setShortcutsModalOpen(open: boolean) {
    isShortcutsModalOpen.value = open;
  }

  return {
    activeTab,
    isExportModalOpen,
    isShortcutsModalOpen,
    toolsPanel,
    copilotPanel,
    previewPanel,
    propertiesPanel,
    mainContent,
    timeline,
    isCopilotVisible,
    editorMode,
    showLeftPanel,
    showRightPanel,
    showTimeline,
    setActiveTab,
    setToolsPanel,
    setPreviewPanel,
    setPropertiesPanel,
    setMainContent,
    setTimeline,
    setCopilotPanel,
    toggleCopilot,
    setEditorMode,
    toggleLeftPanel,
    toggleRightPanel,
    toggleTimeline,
    resetLayout,
    setExportModalOpen,
    setShortcutsModalOpen,
  };
});
