<script setup lang="ts">
import { ref, computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  content: string;
}>();

// Video Preview Modal state
const videoModalVisible = ref(false);
const activeVideoSrc = ref('');
const activeVideoTitle = ref('');

function openVideoPreview(src: string, title = 'Video Preview') {
  activeVideoSrc.value = src;
  activeVideoTitle.value = title;
  videoModalVisible.value = true;
}

// Extract media items for structured UI presentation
interface ExtractedMedia {
  images: Array<{ alt: string; src: string }>;
  audios: Array<{ title: string; src: string }>;
  videos: Array<{ title: string; src: string }>;
}

function cleanMediaUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^https?:\/\/[^\/]+(?:\/[^\/]+)*?(\/api\/(?:assets\/file|media)\/)/, '$1')
            .replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/api\/)/, '$1');
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url) || url.includes('/renders/') || url.includes('video');
}

function isAudioUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i.test(url) || url.includes('voice_') || url.includes('bgm_');
}

const extractedMedia = computed<ExtractedMedia>(() => {
  const text = (props.content || '').replace(/https?:\/\/[^\/]+(?:\/[^\/]+)*?(\/api\/(?:assets\/file|media)\/)/g, '$1');
  const images: Array<{ alt: string; src: string }> = [];
  const audios: Array<{ title: string; src: string }> = [];
  const videos: Array<{ title: string; src: string }> = [];
  const seenUrls = new Set<string>();

  // 1. Match Markdown Images: ![alt](url)
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(text)) !== null) {
    const alt = (match[1] || '').trim();
    const src = cleanMediaUrl(match[2]);
    if (!src || seenUrls.has(src)) continue;
    seenUrls.add(src);

    if (isVideoUrl(src) || alt.toLowerCase().includes('video') || alt.toLowerCase().includes('preview') || alt.toLowerCase().includes('render')) {
      videos.push({ title: alt || 'Rendered Episode Video', src });
    } else if (isAudioUrl(src)) {
      audios.push({ title: alt || 'Audio Track', src });
    } else {
      images.push({ alt: alt || 'Asset Image', src });
    }
  }

  // 2. Match Audio Links: [Title](url.wav|.mp3|/api/assets/file/...)
  const audioRegex = /\[([^\]]*(?:Voice|Audio|BGM|Soundtrack|Dialogue)[^\]]*)\]\(([^)]+)\)/gi;
  while ((match = audioRegex.exec(text)) !== null) {
    const title = match[1] || 'Audio Track';
    const src = cleanMediaUrl(match[2]);
    if (!src || seenUrls.has(src)) continue;
    seenUrls.add(src);
    audios.push({ title, src });
  }

  // 3. Match Video Links: [Title](url.mp4|/api/assets/file/...) or Video Clip Rendered (/api/...)
  const videoRegex = /(?:\[([^\]]*(?:Video|Clip|Scene|Visual|🎬|View Rendered)[^\]]*)\]\(([^)]+)\)|(?:Video Clip Rendered|Video Rendered|Video Clip)\s*\(([^)]+)\))/gi;
  while ((match = videoRegex.exec(text)) !== null) {
    const title = match[1] || 'Rendered Episode Video';
    const src = cleanMediaUrl(match[2] || match[3]);
    if (!src || seenUrls.has(src)) continue;
    seenUrls.add(src);
    videos.push({ title, src });
  }

  return { images, audios, videos };
});

const previewImageSrcList = computed(() => {
  return extractedMedia.value.images.map(img => img.src);
});

// Clean text by stripping suggestions, master_plan JSON blocks, unwrapping code fences, and fixing LLM markdown quirks
const cleanedContent = computed(() => {
  let text = props.content || '';
  // Normalize any prepended hostname or cloud bucket domain to pure relative /api/ path
  text = text.replace(/https?:\/\/[^\/]+(?:\/[^\/]+)*?(\/api\/(?:assets\/file|media)\/)/g, '$1');
  text = text.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/api\/(?:assets\/file|media)\/)/g, '$1');
  
  // Strip out master_plan raw JSON code blocks so they are not rendered as raw JSON in message body
  text = text.replace(/```(?:master_plan|json)?\s*\{[\s\S]*?"title"[\s\S]*?\}\s*```/gi, '');
  text = text.replace(/```master_plan[\s\S]*?```/gi, '');
  // Strip out suggestions code blocks so they are not rendered as raw JSON in message body
  text = text.replace(/```(?:suggestions|json)?\s*\[\s*\{[\s\S]*?\}\s*\]\s*```/gi, '');
  text = text.replace(/```suggestions[\s\S]*?```/gi, '');

  // Remove encoded backticks and raw backticks around URLs: %60, `...`
  text = text.replace(/%60/g, '');
  text = text.replace(/\((?:https?:\/\/[^\/]+(?:\/[^\/]+)*?)?`?(\/api\/[^`)]+)`?\)/g, '($1)');
  text = text.replace(/\(https?:\/\/[^\/]+(?:\/[^\/]+)*?(\/api\/[^)]+)\)/g, '($1)');

  // Unwrap code fences (```markdown ... ```, ```text ... ```, ``` ... ```) that wrap markdown images/links or summaries
  text = text.replace(/```(?:markdown|text|txt|output)?\s*([\s\S]*?!\s*\[[\s\S]*?)\s*```/gi, '$1');
  text = text.replace(/```(?:markdown|text|txt|output)?\s*([\s\S]*?Scene\s+\d+:[\s\S]*?)\s*```/gi, '$1');
  text = text.replace(/```(?:markdown|text|txt|output)\s*([\s\S]*?)\s*```/gi, '$1');
  
  // Normalize "Video Clip Rendered (/api/...)" into "[🎬 Video Clip](/api/...)"
  text = text.replace(/(?:Video Clip Rendered|Video Rendered|Video Clip)\s*\(([^)]+)\)/gi, '[🎬 Video Clip]($1)');

  // Fix LLM bracket quirks on markdown images/links: [![Title](url)] or [!Title](url) -> ![Title](url)
  text = text.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]/g, '![$1]($2)');
  text = text.replace(/\[!([^\]]+)\]\(([^)]+)\)/g, '![$1]($2)');

  // Remove raw markdown image and duplicate video link tags that are already displayed in the top player cards
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  text = text.replace(/\[(?:View Rendered Episode Video|🎬 Video Clip|Rendered Episode Video)[^\]]*\]\([^)]+\)/gi, '');

  // Strip leading spaces from all lines so marked NEVER treats them as 4-space indented code blocks
  const lines = text.split('\n');
  let inFencedBlock = false;
  text = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFencedBlock = !inFencedBlock;
      return trimmed;
    }
    if (inFencedBlock) return line;
    return line.trimStart();
  }).join('\n');

  return text.trim();
});

// Render sanitized HTML for text segments
const renderedHtml = computed(() => {
  const contentToRender = cleanedContent.value;
  if (!contentToRender) return '';
  try {
    return marked.parse(contentToRender, { async: false, breaks: true, gfm: true }) as string;
  } catch (err) {
    return contentToRender;
  }
});
</script>

<template>
  <div class="chat-content-renderer space-y-3">
    <!-- Structured Element Plus Images Gallery (When images are present) -->
    <div v-if="extractedMedia.images.length > 0" class="grid grid-cols-2 gap-2 my-2">
      <div
        v-for="(img, idx) in extractedMedia.images"
        :key="idx"
        class="group relative rounded-xl overflow-hidden border bg-[var(--el-fill-color-dark)] flex flex-col shadow-sm transition-all hover:shadow-md"
        style="border-color: var(--el-border-color);"
      >
        <div class="aspect-square w-full relative overflow-hidden bg-black/40">
          <el-image
            :src="img.src"
            :alt="img.alt"
            fit="cover"
            loading="lazy"
            :preview-src-list="previewImageSrcList"
            :initial-index="idx"
            preview-teleported
            class="w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
          >
            <template #placeholder>
              <div class="w-full h-full flex items-center justify-center text-xs opacity-60 animate-pulse">
                <el-icon class="animate-spin text-lg"><Loading /></el-icon>
              </div>
            </template>
            <template #error>
              <div class="w-full h-full flex flex-col items-center justify-center text-[10px] opacity-60 p-2 text-center">
                <el-icon class="text-base mb-1 text-red-400"><PictureFilled /></el-icon>
                <span>Image preview unavailable</span>
              </div>
            </template>
          </el-image>
        </div>
        <div v-if="img.alt" class="p-1.5 px-2 text-[11px] font-bold truncate flex items-center justify-between" style="background-color: var(--el-fill-color-light);">
          <span class="truncate">{{ img.alt }}</span>
          <el-tag size="small" effect="plain" round class="!text-[9px] !h-4 !px-1">Asset</el-tag>
        </div>
      </div>
    </div>

    <!-- Structured Audio Player Cards -->
    <div v-if="extractedMedia.audios.length > 0" class="space-y-1.5 my-2">
      <div
        v-for="(aud, idx) in extractedMedia.audios"
        :key="idx"
        class="p-2.5 rounded-xl border flex items-center gap-2.5 shadow-sm"
        style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);"
      >
        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/20 text-indigo-400 text-xs shrink-0">
          <el-icon><Microphone /></el-icon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-bold truncate mb-1" style="color: var(--el-text-color-primary);">
            {{ aud.title || 'Voiceover Audio' }}
          </div>
          <audio :src="aud.src" controls class="w-full h-7" />
        </div>
      </div>
    </div>

    <!-- Structured Video Player Cards -->
    <div v-if="extractedMedia.videos.length > 0" class="grid grid-cols-1 gap-2 my-2">
      <div
        v-for="(vid, idx) in extractedMedia.videos"
        :key="idx"
        class="p-2.5 rounded-xl border flex items-center justify-between shadow-sm cursor-pointer transition-all hover:border-[var(--el-color-primary)]"
        style="background-color: var(--el-fill-color-light); border-color: var(--el-border-color);"
        @click="openVideoPreview(vid.src, vid.title)"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400 text-sm shrink-0">
            <el-icon><VideoPlay /></el-icon>
          </div>
          <div class="truncate">
            <div class="text-xs font-bold truncate" style="color: var(--el-text-color-primary);">
              {{ vid.title || 'Generated Video Clip' }}
            </div>
            <div class="text-[10px]" style="color: var(--el-text-color-secondary);">
              Click to preview video
            </div>
          </div>
        </div>
        <el-button type="primary" size="small" circle plain icon="VideoPlay" />
      </div>
    </div>

    <!-- Standard Rendered Markdown Body -->
    <div
      v-if="renderedHtml"
      class="markdown-body text-xs leading-relaxed break-words"
      v-html="renderedHtml"
    ></div>

    <!-- Video Fullscreen Dialog Preview -->
    <el-dialog
      v-model="videoModalVisible"
      :title="activeVideoTitle"
      width="420px"
      append-to-body
      destroy-on-close
      center
      class="rounded-2xl"
    >
      <div class="aspect-[9/16] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <video
          v-if="activeVideoSrc"
          :src="activeVideoSrc"
          controls
          autoplay
          loop
          class="w-full h-full object-contain"
        ></video>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.chat-content-renderer :deep(.markdown-body) {
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.6;
}

.chat-content-renderer :deep(h1),
.chat-content-renderer :deep(h2),
.chat-content-renderer :deep(h3),
.chat-content-renderer :deep(h4) {
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
}

.chat-content-renderer :deep(p) {
  margin-bottom: 6px;
}

.chat-content-renderer :deep(ul),
.chat-content-renderer :deep(ol) {
  padding-left: 16px;
  margin-bottom: 6px;
}

.chat-content-renderer :deep(li) {
  margin-bottom: 3px;
}

.chat-content-renderer :deep(strong) {
  font-weight: 700;
  color: var(--el-color-primary);
}

.chat-content-renderer :deep(img) {
  max-width: 100%;
  max-height: 240px;
  border-radius: 8px;
  margin: 6px 0;
  display: block;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
}

/* High contrast badge styling for inline code */
.chat-content-renderer :deep(code) {
  background-color: rgba(62, 207, 142, 0.12);
  color: var(--el-color-primary);
  border: 1px solid rgba(62, 207, 142, 0.3);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
}

/* High contrast dark container for code blocks */
.chat-content-renderer :deep(pre) {
  background-color: rgba(0, 0, 0, 0.45);
  color: #f0f2f1;
  border: 1px solid var(--el-border-color);
  padding: 8px 10px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 6px 0;
}

.chat-content-renderer :deep(pre code) {
  background-color: transparent;
  border: none;
  color: #e6e8e7;
  padding: 0;
  font-weight: normal;
}

.chat-content-renderer :deep(blockquote) {
  border-left: 3px solid var(--el-color-primary);
  background-color: rgba(62, 207, 142, 0.05);
  padding: 4px 8px;
  border-radius: 0 6px 6px 0;
  margin: 6px 0;
  color: var(--el-text-color-regular);
}

.chat-content-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 11px;
}

.chat-content-renderer :deep(th),
.chat-content-renderer :deep(td) {
  border: 1px solid var(--el-border-color);
  padding: 4px 8px;
}

.chat-content-renderer :deep(th) {
  background-color: var(--el-fill-color-light);
  font-weight: 700;
}
</style>
