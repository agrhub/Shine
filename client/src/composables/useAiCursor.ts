import { ref } from 'vue';
import { useMediaPanelStore, type Tab } from './useMediaPanelStore';

export const cursorPos = ref({
  x: 50,
  y: 20,
  visible: false,
  clicking: false,
  label: '',
});

export function triggerAiCursorAnimation(tab: Tab, queryText: string, onComplete?: () => void) {
  const mediaStore = useMediaPanelStore();

  const tabXMap: Record<Tab, number> = {
    uploads: 25,
    images: 55,
    videos: 85,
    text: 115,
    elements: 145,
    captions: 175,
    music: 205,
    voiceovers: 235,
    sfx: 265,
    transitions: 295,
    effects: 325,
  };

  const tabX = tabXMap[tab] || 85;

  // Step 1: Hover & click active tab
  cursorPos.value = {
    x: tabX,
    y: 18,
    visible: true,
    clicking: false,
    label: `Switching to ${tab} tab`,
  };

  setTimeout(() => {
    cursorPos.value.clicking = true;
    mediaStore.setActiveTab(tab);

    setTimeout(() => {
      cursorPos.value.clicking = false;
      // Step 2: Move to Search Input
      cursorPos.value = {
        x: 120,
        y: 65,
        visible: true,
        clicking: false,
        label: `Searching "${queryText}"`,
      };

      setTimeout(() => {
        cursorPos.value.clicking = true;
        mediaStore.setSearchQuery(tab, queryText);

        setTimeout(() => {
          cursorPos.value.clicking = false;
          // Step 3: Move to 1st item in grid
          cursorPos.value = {
            x: 80,
            y: 180,
            visible: true,
            clicking: false,
            label: `Selecting 1st ${tab}`,
          };

          setTimeout(() => {
            cursorPos.value.clicking = true;

            setTimeout(() => {
              cursorPos.value.clicking = false;
              cursorPos.value.visible = false;
              if (onComplete) onComplete();
            }, 400);
          }, 600);
        }, 500);
      }, 500);
    }, 400);
  }, 400);
}
