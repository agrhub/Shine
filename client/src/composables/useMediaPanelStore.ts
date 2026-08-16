import { ref } from 'vue';
import {
  Folder,
  Image as ImageIcon,
  Video,
  Type,
  Shapes,
  Captions,
  Music,
  Mic,
  AudioWaveform,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-vue-next';

export type Tab =
  | 'uploads'
  | 'images'
  | 'videos'
  | 'music'
  | 'text'
  | 'captions'
  | 'effects'
  | 'elements'
  | 'voiceovers'
  | 'sfx'
  | 'transitions';

export const tabs = {
  uploads: {
    icon: Folder,
    label: 'Uploads',
  },
  images: {
    icon: ImageIcon,
    label: 'Images',
  },
  videos: {
    icon: Video,
    label: 'Videos',
  },
  text: {
    icon: Type,
    label: 'Text',
  },
  elements: {
    icon: Shapes,
    label: 'Elements',
  },
  captions: {
    icon: Captions,
    label: 'Captions',
  },
  music: {
    icon: Music,
    label: 'Music',
  },
  voiceovers: {
    icon: Mic,
    label: 'Voiceovers',
  },
  sfx: {
    icon: AudioWaveform,
    label: 'SFX',
  },
  transitions: {
    icon: ArrowLeftRight,
    label: 'Transitions',
  },
  effects: {
    icon: Sparkles,
    label: 'Effects',
  },
};

interface MediaPanelState {
  activeTab: Tab;
  highlightMediaId: string | null;
  showProperties: boolean;
  searchQueries: Record<Tab, string>;
}

const mediaPanelState = ref<MediaPanelState>({
  activeTab: 'uploads',
  highlightMediaId: null,
  showProperties: false,
  searchQueries: {
    uploads: '',
    images: '',
    videos: '',
    music: '',
    text: '',
    captions: '',
    effects: '',
    elements: '',
    voiceovers: '',
    sfx: '',
    transitions: '',
  },
});

export const useMediaPanelStore = () => {
  const setActiveTab = (tab: Tab) => {
    mediaPanelState.value.activeTab = tab;
    mediaPanelState.value.showProperties = false;
  };

  const setSearchQuery = (tab: Tab, query: string) => {
    mediaPanelState.value.activeTab = tab;
    mediaPanelState.value.searchQueries[tab] = query;
    mediaPanelState.value.showProperties = false;
  };

  const setShowProperties = (show: boolean) => {
    mediaPanelState.value.showProperties = show;
  };

  const requestRevealMedia = (mediaId: string) => {
    mediaPanelState.value.activeTab = 'uploads';
    mediaPanelState.value.highlightMediaId = mediaId;
    mediaPanelState.value.showProperties = false;
  };

  const clearHighlight = () => {
    mediaPanelState.value.highlightMediaId = null;
  };

  return {
    state: mediaPanelState,
    setActiveTab,
    setSearchQuery,
    setShowProperties,
    requestRevealMedia,
    clearHighlight,
  };
};
