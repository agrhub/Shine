# TASK: IMPLEMENT SPRINT 4 — AI Creative Studio (Voice, Captions, Cliffhanger & Dubbing)
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-4.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

**Sprint 4 builds on Sprints 1–3. Confirm prerequisites are met before starting:**
- Client runs on `http://localhost:3000`, server on `http://localhost:3001` ✅
- `timelineStore.ts` with `execute()`, `clipSplit()`, `exportToJSON()` exists ✅
- `src/views/workspace/EditPage.vue` (Timeline NLE) exists ✅
- `GeminiClient.ts` with Vertex AI SDK (`@google/genai`) exists ✅
- Centralized Axios client (`src/utils/http.ts`) + 6 locale i18n exists ✅

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

Read the following documents using `view_file` BEFORE writing any code:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-4.md`.

2. **UI Component Catalog:**
    Key components this sprint:
   `FaSlider` (emotion intensity, spatial audio pan), `FaSelect` (voice preset, language), `FaSwitch` (karaoke toggle), `FaProgress` (TTS generation), `FaTag` (emotion label), `FaCard` (voice preset cards).
   Read the README for each: `src/components/basic/<component-name>/README.md`.

3. **AI Prompt Engineering Guide:**
   Read `docs/ai-prompt-guide.md` Sections 10, 12 — voice/audio prompt engineering.

4. **API Reference:**
   Read `docs/api-document.md` — Voice, Captions, Spatial Audio, Cliffhanger endpoint sections.

5. **View UI design mockups BEFORE coding any page:**
   - `/dubbing/*` → `view_file` `docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png`
   - `/captions/*` → `view_file` `docs/stitch_shine_app_design/caption_management_shadows_in_the_code/screen.png`

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

```bash
# Check what voice/caption files already exist
find apps/shine/client/src -name "*voice*" -o -name "*Voice*" -o -name "*caption*" 2>/dev/null
find apps/shine/server/src -name "*voice*" -o -name "*caption*" -o -name "*audio*" 2>/dev/null

# Check if google TTS is installed
cat apps/shine/server/package.json | grep -E "text-to-speech|tts"

# Check if stores already exist
ls apps/shine/client/src/stores/
```

---

## STEP 2: MANDATORY ENFORCEMENT GATES — VIOLATING ANY GATE = AUTOMATIC FAILURE

### 🚫 GATE 0: MANDATORY GOOGLE STITCH MCP HTML CODE FETCH & ALIGNMENT
- **DO NOT GUESS OR INVENT LAYOUTS/TEXT:** Agent MUST NOT write generic dark templates or invent custom text.
- **MANDATORY FETCH WORKFLOW FOR EVERY PAGE:**
  1. Find the screen folder in `docs/stitch_shine_app_design/<screen_folder_name>`.
  2. Open and read the `code.html` template or `screen.png` image directly from that folder.
  3. Translate the local Stitch HTML layout, sections, headings, cards, text content, and color palette (`#006c45`, `#3ecf8e`, light/dark themes) 100% into the Vue `.vue` page using Element Plus (`element-plus`) components.


### 🚫 GATE 1: STRICT PROHIBITION OF GRADIENTS & NEON GLOWS
Voice preset cards, karaoke subtitle preview, spatial audio visualizer, and cliffhanger generator panels MUST NOT have any purple gradients or glowing effects. Page elements MUST use clean dark-slate palette (`#121218`, `#1a1b23`, `#2d2e3a`).

### 🚫 GATE 2: MANDATORY ELEMENT PLUS COMPONENTS (`element-plus`)
- ALL views and pages MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
- Custom `Fa-Admin` components (`@/components/basic`) are deprecated. Switch completely to Element Plus for consistent design, UI layout, and colors.

Voice preset card selected state MUST use: `border: 2px solid var(--primary)` (white) — NO colored glow.
Karaoke preview text MUST use standard white-on-dark styling — NO neon colors.

**Self-check:**
```bash
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple\|text-shadow" \
  apps/shine/client/src/views/workspace/ \
  apps/shine/client/src/components/voice/ \
  apps/shine/client/src/components/captions/
# EXPECTED: 0 matches
```

### 🚫 GATE 2: MANDATORY BASIC UI COMPONENTS (`@/components/basic/`)
Read README before using each component. Required bindings:
- Voice preset grid → `FaCard` (each voice as a card with `FaAvatar` or thumbnail)
- Emotion intensity → `FaSlider` with labeled tick marks
- Emotion tag selector → `FaSelect` with `FaTag` option display
- Language/voice selector → `FaSelect`
- TTS generation progress → `FaProgress`
- Karaoke style presets → `FaCard` swatch grid (NO custom HTML)
- Karaoke toggles → `FaSwitch` (bass-sync, emoji sentiment)
- Cliffhanger transition selector → `FaSelect`
- Generate buttons → `FaButton` with `:loading` prop

### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
NEVER test on port `5173`.

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
All API calls MUST go through Pinia stores:
- `voiceStore.generateTts(req)` → `POST /v1/voices/tts`
- `voiceStore.reAlignDubbing(episodeId, audioUrl)` → `POST /v1/voices/dubbing/re-align`
- `captionStore.applyKaraokeStyle(episodeId, style)` → `POST /v1/captions/kinetic-style`
- `captionStore.generateCliffhanger(episodeId)` → `POST /v1/ai/cliffhanger/generate`
- `captionStore.mixSpatialAudio(episodeId, config)` → `POST /v1/audio/spatial-mix`

**Self-check:**
```bash
grep -rn "fetch(" apps/shine/client/src/views/ apps/shine/client/src/components/
# EXPECTED: 0 matches
```

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS
Add key blocks to ALL 6 locale files: `voice.*`, `dubbing.*`, `caption.*`, `cliffhanger.*`, `audio.*`

Example structure:
```json
{
  "voice": {
    "title": "Voice & Dubbing Studio",
    "presetSectionTitle": "Voice Presets",
    "generateAllBtn": "Generate All TTS",
    "reAlignBtn": "Re-Align Dubbing",
    "emotionLabel": "Emotion",
    "intensityLabel": "Intensity"
  },
  "caption": {
    "karaokeTab": "Karaoke Style",
    "spatialAudioTab": "Spatial Audio",
    "cliffhangerTab": "Cliffhanger"
  },
  "toast": {
    "ttsGenerated": "TTS audio generated successfully!",
    "dubbingAligned": "Dubbing timeline re-aligned!",
    "captionStyleApplied": "Karaoke style applied!",
    "cliffhangerGenerated": "Cliffhanger hook generated!"
  }
}
```

---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-4.md`)

### 3.1 Package Installation
```bash
cd apps/shine/server && pnpm add @google-cloud/text-to-speech
```

### 3.2 TypeScript Contracts

**MODIFY:**
1. `client/src/types/api.ts` — Add: `VoicePreset`, `TtsRequest`, `TtsResponse`, `WordTiming`, `KaraokeStyle`, `CliffhangerJob`

### 3.3 Pinia Stores

**CREATE:**
2. `client/src/stores/voiceStore.ts` — TTS generation, dubbing re-alignment, emotion steering
3. `client/src/stores/captionStore.ts` — Karaoke style, cliffhanger generation, spatial audio mix

### 3.4 Voice & Dubbing UI

**CREATE:**
4. `client/src/views/workspace/VoiceDubbingPage.vue` — Voice studio workspace (matches `workspace-voice-dubbing.png`)
5. `client/src/components/voice/VoicePresetSelector.vue` — 30-voice preset card grid
6. `client/src/components/voice/EmotionIntensitySlider.vue` — FaSelect emotion + FaSlider intensity

### 3.5 Captions & Cliffhanger UI

**CREATE:**
7. `client/src/views/workspace/CaptionsPage.vue` — Captions workspace with FaTabs (matches `workspace-captions.png`)
8. `client/src/components/captions/KaraokePreviewPanel.vue` — Style preset swatch grid + live preview
9. `client/src/components/captions/CliffhangerGenerator.vue` — Transition selector + generate button

### 3.6 Backend REST Routes

**CREATE:**
10. `server/src/routes/voices.ts` — `GET /v1/voices/presets`, `POST /v1/voices/tts`, `POST /v1/voices/dubbing/re-align`, `POST /v1/voices/steer-emotion`
11. `server/src/routes/captions.ts` — `POST /v1/captions/kinetic-style`
12. `server/src/routes/audio.ts` — `POST /v1/audio/spatial-mix`
13. `server/src/routes/cliffhanger.ts` — `POST /v1/ai/cliffhanger/generate`

**MODIFY:**
14. `server/src/index.ts` — Register all new route modules at `/v1`

### 3.7 Locale Dictionaries

**MODIFY:**
15. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `voice.*`, `dubbing.*`, `caption.*`, `cliffhanger.*`, `audio.*` keys

### 3.8 Router

**MODIFY:**
16. `client/src/router/index.ts` — Add `/dubbing/:seriesId/:episodeId` and `/captions/:seriesId/:episodeId` routes under StudioLayout

### 3.9 Testing

**CREATE:**
17. `tests/e2e/sprint-4-journey.spec.ts` — Playwright E2E test

---

## STEP 4: COMPONENT DESIGN RULES

### VoiceDubbingPage.vue — LAYOUT (matches `workspace-voice-dubbing.png`)
```
3-panel layout:
  LEFT panel: VoicePresetSelector.vue
    - Grid of FaCard voice cards (2–3 columns)
    - Each card: FaAvatar/thumbnail + voice name + FaTag (gender/language) + sample play button
    - Selected card: border-color var(--primary) — NO purple glow

  CENTER panel: Episode script line editor
    - FaCard per script line with character name FaTag + dialogue text
    - Per-line voice assignment dropdown (FaSelect)
    - TTS status icon per line

  RIGHT panel: EmotionIntensitySlider.vue
    - FaSelect for emotion tag (neutral / joyful / sad / tense / angry)
    - FaSlider for intensity (0–100)
    - FaButton "Preview" + FaButton "Apply to All"

  BOTTOM toolbar:
    - FaButton "Generate All TTS" (with :loading state)
    - FaProgress bar (batch TTS progress)
    - FaButton "Re-Align Dubbing"
```

### CaptionsPage.vue — FaTabs with 3 tabs (matches `workspace-captions.png`)
```
Tab 1 — Karaoke Style:
  - KaraokePreviewPanel.vue
  - 4 preset swatch cards (pop, bounce, fade, slide) using FaCard
  - FaSwitch "Bass Sync" + FaSwitch "Emoji Sentiment"
  - Simulated phone viewport showing animated preview

Tab 2 — Spatial Audio:
  - Top-down 2D soundstage visualization (canvas element)
  - FaSlider for pan position per audio track
  - FaSelect for reverb profile

Tab 3 — Cliffhanger:
  - CliffhangerGenerator.vue
  - FaSelect transition type (glitch / flash)
  - FaSwitch zoom keyframe
  - FaButton "Generate Cliffhanger" (with :loading)
  - FaProgress generation status
```

---

## STEP 5: BACKEND IMPLEMENTATION RULES

All endpoints return the standardized format:
```typescript
res.json({ code: 200, data: { ... }, message: '...', error: null });
```

### voices.ts — TTS endpoint pattern
```typescript
// POST /v1/voices/tts
router.post('/tts', async (req, res) => {
  const { text, voiceId, emotionTag, intensityLevel } = req.body;
  // Call Google Cloud TTS API
  // Upload resulting audio to S3
  // Return audioUrl + word timings
  res.json({ code: 200, data: { audioUrl, durationMs, wordTimings }, message: 'TTS generated', error: null });
});
```

### voices.ts — Dubbing re-align pattern
```typescript
// POST /v1/voices/dubbing/re-align
// Compute duration delta between original clip and dubbed audio
// Return TimelineCommand[] patches for the client to apply via timelineStore.executeMany()
res.json({ code: 200, data: { commands: [...], deltaMs: 340 }, message: 'Re-alignment calculated', error: null });
```

---

## STEP 6: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

```bash
# 1. TypeScript check
cd apps/shine/client && npx tsc --noEmit
cd apps/shine/server && npx tsc --noEmit

# 2. Run Playwright E2E test
pnpm exec playwright test tests/e2e/sprint-4-journey.spec.ts --reporter=list

# 3. Verify no gradients or neon glows
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple\|text-shadow.*purple" \
  apps/shine/client/src/views/workspace/ \
  apps/shine/client/src/components/voice/ \
  apps/shine/client/src/components/captions/
# EXPECTED: 0 matches

# 4. Verify no raw fetch()
grep -rn "fetch(" apps/shine/client/src/views/ apps/shine/client/src/components/
# EXPECTED: 0 matches

# 5. Run automated i18n linter (MUST PASS WITH 0 ERRORS)
cd apps/shine/client && pnpm run check-i18n
# EXPECTED RESULT: 🎉 i18n AUDIT PASSED!

```

---

## STEP 7: MANDATORY COMPLETION REPORT

Save the report to `docs/reports/sprint-4-report.md` with all 5 required sections:

1. **Summary of Created/Modified Files** (grouped by: Pinia Stores / Voice UI / Caption UI / Backend Routes / Locales)
2. **Build & TypeCheck Results** (paste actual `npx tsc --noEmit` output)
3. **Playwright E2E Test Results** (paste actual test output with PASS/FAIL per step)
4. **Real Browser Screenshots** from `http://localhost:3000` — showing: voice preset grid, TTS progress, karaoke preview, cliffhanger generated. DO NOT use `generate_image`.
5. **FR Compliance Matrix** — Pass/Fail for: FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098. Include unit test results: `TC-CLF-001`, `TC-DUB-001`, `TC-KAP-001`, `TC-SPT-001`.
