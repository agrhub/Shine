import { onMounted, onUnmounted } from 'vue';
import hotkeys from 'hotkeys-js';
import { useStudioStore } from '@/stores/useStudioStore';
import { usePanelStore } from '@/stores/usePanelStore';

export function useHotkeys() {
  const studioStore = useStudioStore();
  const panelStore = usePanelStore();

  onMounted(() => {
    // Play / Pause (Space)
    hotkeys('space', (e) => {
      e.preventDefault();
      studioStore.setIsPlaying(!studioStore.isPlaying);
    });

    // Delete selected clips
    hotkeys('delete, backspace', (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      if (studioStore.selectedClips.length > 0 && studioStore.studio) {
        e.preventDefault();
        // Remove clips from studio
        for (const clip of studioStore.selectedClips) {
          studioStore.studio.removeClip?.(clip.id);
        }
        studioStore.setSelectedClips([]);
      }
    });

    // Shortcuts Modal (?)
    hotkeys('shift+?', (e) => {
      e.preventDefault();
      panelStore.setShortcutsModalOpen(true);
    });
  });

  onUnmounted(() => {
    hotkeys.unbind('space');
    hotkeys.unbind('delete, backspace');
    hotkeys.unbind('shift+?');
  });
}
