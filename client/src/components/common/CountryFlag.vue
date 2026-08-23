<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    code?: string; // ISO 2-letter country code e.g. "vn", "us", "jp", "cn"
    flag?: string; // Emoji flag fallback e.g. "🇻🇳"
    size?: 'small' | 'medium' | 'large' | number;
    square?: boolean;
  }>(),
  {
    code: '',
    flag: '',
    size: 'small',
    square: false,
  }
);

// Map common locale codes to country flag codes
const LOCALE_TO_COUNTRY: Record<string, string> = {
  en: 'us',
  vi: 'vn',
  zh: 'cn',
  jp: 'jp',
  ja: 'jp',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ko: 'kr',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  th: 'th',
  id: 'id',
};

// Convert emoji flag like "🇻🇳" to ISO 2-letter country code "vn"
function emojiToCountryCode(emoji: string): string {
  if (!emoji) return '';
  const codePoints = Array.from(emoji).map((char) => char.codePointAt(0) || 0);
  if (codePoints.length >= 2 && codePoints[0] >= 0x1f1e6 && codePoints[0] <= 0x1f1ff) {
    return String.fromCharCode(codePoints[0] - 0x1f1e6 + 65, codePoints[1] - 0x1f1e6 + 65).toLowerCase();
  }
  return '';
}

const cleanCode = computed(() => {
  if (props.code) {
    let c = props.code.toLowerCase().trim();
    if (c.includes('-')) {
      const parts = c.split('-');
      c = parts[parts.length - 1]?.toLowerCase() || c;
    }
    return LOCALE_TO_COUNTRY[c] || c;
  }
  if (props.flag) {
    const fromEmoji = emojiToCountryCode(props.flag);
    if (fromEmoji) return fromEmoji;
  }
  return 'us';
});

const sizeStyle = computed(() => {
  let h = 13;
  let w = 18;
  if (props.size === 'medium') { h = 16; w = 22; }
  else if (props.size === 'large') { h = 20; w = 28; }
  else if (typeof props.size === 'number') { h = props.size; w = Math.round(props.size * 1.33); }
  return {
    height: `${h}px`,
    width: `${w}px`,
    minWidth: `${w}px`,
  };
});
</script>

<template>
  <span
    class="country-flag-wrap inline-flex items-center justify-center shrink-0 align-middle"
    :title="code?.toUpperCase()"
  >
    <span
      class="fi rounded-[2px] shadow-xs border border-white/10 shrink-0 inline-block overflow-hidden"
      :class="[`fi-${cleanCode}`, { 'fis': square }]"
      :style="sizeStyle"
    ></span>
  </span>
</template>

<style scoped>
.country-flag-wrap {
  line-height: 1;
}
.fi {
  background-size: cover;
  background-position: center;
}
</style>
