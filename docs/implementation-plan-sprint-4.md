# Sprint 4 Implementation Plan: AI Creative Studio (Voice, Captions, Cliffhanger & Dubbing)

## Background

Sprint 4 covers **FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098**. The goal is to deliver the Neural TTS voice engine (30 voices), multi-market dubbing timeline re-alignment, dynamic kinetic subtitle engine (karaoke/bass-sync), spatial audio 3D soundstage, and the dynamic cliffhanger hook generator.

**What already exists in the codebase:**
- ✅ GeminiClient.ts with Vertex AI SDK (`@google/genai` v2.16.0)
- ✅ Express server with route module pattern
- ✅ Vue 3 AppLayout and StudioLayout shells, Pinia stores, Axios client
- ✅ Timeline NLE Editor (`src/views/workspace/EditPage.vue`) from Sprint 3
- ✅ `timelineStore.ts` command engine for clip manipulation

**What is missing / needs to be built:**
- ❌ No Voice & Dubbing workspace page (`src/views/workspace/VoiceDubbingPage.vue`)
- ❌ No Captions workspace page (`src/views/workspace/CaptionsPage.vue`)
- ❌ No `voiceStore.ts` or `captionStore.ts` Pinia stores
- ❌ No `VoicePresetSelector.vue` (30-voice picker component)
- ❌ No `KaraokePreviewPanel.vue` (real-time kinetic subtitle preview)
- ❌ No `CliffhangerGenerator.vue` (cliffhanger hook CTA panel)
- ❌ No `POST /voices/tts`, `POST /voices/dubbing/re-align`, `POST /voices/steer-emotion` endpoints
- ❌ No `POST /captions/kinetic-style`, `POST /audio/spatial-mix`, `POST /ai/cliffhanger/generate` endpoints
- ❌ No `tests/e2e/sprint-4-journey.spec.ts`
- ❌ No `docs/reports/sprint-4-report.md`

---

## Open Questions

> [!IMPORTANT]
> **Google Cloud Text-to-Speech vs Vertex AI:** The TTS engine will use Google Cloud Text-to-Speech API (`@google-cloud/text-to-speech`) for 30 Neural2/Studio voices. Ensure GCP service account has `Cloud Text-to-Speech API` enabled.
>
> **Audio Duration Delta Calculation:** For `POST /voices/dubbing/re-align`, the delta $\Delta t_{\mu s}$ between dubbed audio duration and original timeline clip duration must be computed server-side. If `$\Delta t > 200ms$`, auto-adjust clip bounds in the timeline JSON patch and return updated `TimelineCommand[]` to the client for `timelineStore.executeMany()`.
>
> **Karaoke Bass-Sync:** Bass-sync (FR-097) requires audio frequency analysis (BPM/beat detection). Use `essentia.js` (WASM) on the client or `librosa` via a Python sidecar for beat timestamps. Default fallback: word-level timing from TTS response timestamps.

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **BASIC UI COMPONENT MANDATE:** ALL pages MUST use only the 44 native components in `@/components/basic/`.  and each component's `README.md` for exact props/slots. Key components: `FaSlider` (emotion intensity, spatial audio pan), `FaSelect` (voice preset, language), `FaSwitch` (karaoke toggle), `FaProgress` (TTS generation progress), `FaTag` (emotion label badges).
3. **UI MOCKUP GROUND TRUTH:** Before coding `/dubbing/*`, call `view_file` on [`workspace-voice-dubbing.png`](../docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png). Before coding `/captions/*`, view [`workspace-captions.png`](../docs/stitch_shine_app_design/caption_management_shadows_in_the_code/screen.png).
4. **PORT LOCK:** Client MUST run on `http://localhost:3000` (Vite `strictPort: true`). Server MUST run on `http://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS:** Raw `fetch()` is STRICTLY PROHIBITED. All API calls MUST go through Pinia store actions (`voiceStore`, `captionStore`) + `src/utils/http.ts`.
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings MUST use `$t('...')` in templates and `i18n.global.t('...')` in TS/JS. Add `voice.*`, `dubbing.*`, `caption.*`, `cliffhanger.*`, `audio.*` keys to all 6 locale JSON files.

---

### Component 1: Package Installation

#### [MODIFY] `server/package.json` — Install TTS & audio packages
```bash
cd apps/shine/server
pnpm add @google-cloud/text-to-speech
```

---

### Component 2: TypeScript Contracts

#### [MODIFY] `client/src/types/api.ts`
Add TypeScript interfaces:
```typescript
interface VoicePreset { id: string; name: string; gender: 'male'|'female'; language: string; emotion: string; sampleUrl: string }
interface TtsRequest { text: string; voiceId: string; emotionTag: string; intensityLevel: number }
interface TtsResponse { audioUrl: string; durationMs: number; wordTimings: WordTiming[] }
interface KaraokeStyle { preset: 'pop'|'bounce'|'fade'|'slide'; emojiSentiment: boolean; bassSync: boolean }
interface CliffhangerJob { transitionType: 'glitch'|'flash'; zoomKeyframe: boolean; stingerWavUrl: string; ctaText: string }
```

---

### Component 3: Pinia Stores

#### [NEW] `client/src/stores/voiceStore.ts`
Pinia store for voice & dubbing:
- `voicePresets: VoicePreset[]` — loaded from `GET /v1/voices/presets`
- `selectedVoice: VoicePreset | null`
- `generateTts(req: TtsRequest)` — calls `POST /v1/voices/tts`, returns audio URL
- `reAlignDubbing(episodeId, audioUrl)` — calls `POST /v1/voices/dubbing/re-align`, applies returned `TimelineCommand[]` via `timelineStore.executeMany()`
- `steerEmotion(voiceId, targetEmotion)` — calls `POST /v1/voices/steer-emotion`
- All toasts: `i18n.global.t('toast.ttsGenerated')`, `i18n.global.t('toast.dubbingAligned')`

#### [NEW] `client/src/stores/captionStore.ts`
Pinia store for captions & cliffhanger:
- `applyKaraokeStyle(episodeId, style: KaraokeStyle)` — calls `POST /v1/captions/kinetic-style`
- `generateCliffhanger(episodeId)` — calls `POST /v1/ai/cliffhanger/generate`
- `mixSpatialAudio(episodeId, panConfig)` — calls `POST /v1/audio/spatial-mix`
- All toasts: `i18n.global.t('toast.captionStyleApplied')`, `i18n.global.t('toast.cliffhangerGenerated')`

---

### Component 4: Voice & Dubbing UI

#### [NEW] `client/src/views/workspace/VoiceDubbingPage.vue`
Voice & Dubbing workspace page (matches `workspace-voice-dubbing.png`):
- Left panel: `VoicePresetSelector.vue` grid of 30 voice cards using `FaCard`
- Center panel: Episode script line-by-line with per-line voice assignment
- Right panel: `EmotionIntensitySlider.vue` with `FaSlider` + `FaSelect` for emotion tag
- Bottom bar: `FaButton` "Generate All TTS", `FaButton` "Re-Align Dubbing"
- `FaProgress` bar showing batch TTS generation progress

#### [NEW] `client/src/components/voice/VoicePresetSelector.vue`
Grid of 30 voice preset cards using `FaCard` with `FaTag` for gender/language badge, audio waveform preview thumbnail, and active selection highlight.

#### [NEW] `client/src/components/voice/EmotionIntensitySlider.vue`
Emotion intensity control with:
- `FaSelect` for emotion tag (`neutral`, `joyful`, `sad`, `tense`, `angry`)
- `FaSlider` for intensity level (0-100)
- Real-time preview of emotion tag change on selected voice

---

### Component 5: Captions & Cliffhanger UI

#### [NEW] `client/src/views/workspace/CaptionsPage.vue`
Dynamic Kinetic Subtitle Editor (matches `workspace-captions.png`):
- `FaTabs` with tabs: "Karaoke Style", "Spatial Audio", "Cliffhanger"
- Karaoke tab: `KaraokePreviewPanel.vue` with style preset grid
- Spatial audio tab: AntV G6-based 3D soundstage top-down visualization
- Cliffhanger tab: `CliffhangerGenerator.vue`

#### [NEW] `client/src/components/captions/KaraokePreviewPanel.vue`
Real-time karaoke subtitle preview:
- 4 style presets (`pop`, `bounce`, `fade`, `slide`) displayed as `FaCard` style swatches
- `FaSwitch` for emoji sentiment toggle, `FaSwitch` for bass-sync toggle
- Live preview of subtitle animation in a simulated phone viewport frame

#### [NEW] `client/src/components/captions/CliffhangerGenerator.vue`
Cliffhanger hook CTA generator panel:
- `FaSelect` for GLSL shader transition type (`glitch`, `flash`)
- `FaSwitch` for zoom keyframe enable
- `FaButton` "Generate Cliffhanger" → triggers `captionStore.generateCliffhanger()`
- `FaProgress` bar showing generation status

---

### Component 6: Backend REST Routes

#### [NEW] `server/src/routes/voices.ts`
- `GET /v1/voices/presets` — Return catalog of 30 Neural TTS voices
- `POST /v1/voices/tts` — Call Google Cloud TTS API, upload audio to S3, return URL + word timings
- `POST /v1/voices/dubbing/re-align` — Compute duration delta, return `TimelineCommand[]` patches
- `POST /v1/voices/steer-emotion` — Apply emotion steering to selected voice parameters

#### [NEW] `server/src/routes/captions.ts`
- `POST /v1/captions/kinetic-style` — Apply kinetic subtitle style to episode caption track

#### [NEW] `server/src/routes/audio.ts`
- `POST /v1/audio/spatial-mix` — Compute 3D spatial audio panning matrix, return mixed audio URL

#### [NEW] `server/src/routes/cliffhanger.ts`
- `POST /v1/ai/cliffhanger/generate` — Generate GLSL shader transition, stinger WAV, zoom keyframe patch, CTA caption overlay

#### [MODIFY] `server/src/index.ts`
Register all new route modules at `/v1`.

---

### Component 7: Locale Dictionaries

#### [MODIFY] `client/src/locales/{en,vi,zh,jp,es,fr}.json`
Add translation key blocks: `voice.*`, `dubbing.*`, `caption.*`, `cliffhanger.*`, `audio.*`, `toast.ttsGenerated`, `toast.dubbingAligned`, `toast.captionStyleApplied`, `toast.cliffhangerGenerated`

---

### Component 8: E2E Tests

#### [NEW] `tests/e2e/sprint-4-journey.spec.ts`
Interactive Playwright E2E test covering:
1. Navigate to `/dubbing/series-001/episode-001` — assert Voice Dubbing page renders
2. Click voice preset card (e.g., "Aria — Female EN") → assert voice selected, highlight applied
3. Click "Generate All TTS" → assert FaProgress bar animates, audio URLs returned
4. Change emotion to "tense", intensity to 80 → assert TTS regenerates
5. Click "Re-Align Dubbing" → assert timeline clips re-align, toast `toast.dubbingAligned`
6. Navigate to `/captions/series-001/episode-001` → switch to Karaoke tab
7. Click "Pop" karaoke preset → assert subtitle preview animates
8. Toggle bass-sync → assert toggle state updates
9. Navigate to Cliffhanger tab → click "Generate Cliffhanger" → assert progress completes
10. Screenshots: `01_voice_selected.png` → `02_tts_generated.png` → `03_dubbing_aligned.png` → `04_karaoke_preview.png` → `05_cliffhanger_generated.png`

---

## Verification Plan

### Automated Tests
- `cd apps/shine/client && npx tsc --noEmit` — zero TypeScript errors
- `cd apps/shine/server && npx tsc --noEmit` — zero TypeScript errors
- `pnpm exec playwright test tests/e2e/sprint-4-journey.spec.ts`
- Unit tests: `TC-CLF-001`, `TC-DUB-001`, `TC-KAP-001`, `TC-SPT-001`

### Manual Verification
- Dev server: `npm run dev` (client port 3000, server port 3001)
- Open `/dubbing/*` and `/captions/*` — verify clean dark-slate layout matching mockups
- Verify 30 voice presets load from `GET /v1/voices/presets`
- Verify TTS audio plays back correctly via `<audio>` element
- Verify karaoke preview renders subtitle animation (no purple neon glows)
- Verify cliffhanger generator returns GLSL transition name and stinger audio URL

### Report
- Create `docs/reports/sprint-4-report.md` with all 5 required sections + embedded screenshots
