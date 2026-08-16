import { ref, watch } from 'vue';

const THEME_KEY = 'vue-editor-theme';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark'; // Editor defaults to dark
}

const theme = ref<Theme>(getInitialTheme());

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
  localStorage.setItem(THEME_KEY, t);
}

// Apply on init
if (typeof document !== 'undefined') {
  applyTheme(theme.value);
}

watch(theme, (t) => {
  applyTheme(t);
});

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return {
    theme,
    toggleTheme,
    isDark: () => theme.value === 'dark',
  };
}
