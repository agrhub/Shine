# Master Execution Prompt: Sprint 7 — OpenVideo Engine Integration, Real AI Services & Interactive E2E Testing

> **Usage**: Copy this entire document and paste it into a new agent session. Use the `/goal` command to ensure the agent runs continuously until all Gates are passed without stopping midway.
>
> **Project Root**: `D:\Workspace\Gits\CamHub\openvideo\apps\shine`

---

## ⚠️ CRITICAL WARNING

This sprint has historically been executed superficially — agents complete it in 5 minutes and report "done" without making any real changes to the timeline editor or backend API connections. You MUST follow every step in strict order. Do NOT skip any step.

---

## STEP 0 — MANDATORY PRE-READ PHASE (Do NOT skip)

Before writing a single line of code, read each of the following files in order and record key patterns extracted from each:

**Sprint 7 Documentation:**
1. Read: `apps/shine/docs/agent-prompt-sprint-7.md`
2. Read: `apps/shine/docs/implementation-plan-sprint-7.md`
3. Read: `apps/shine/docs/sprint-7-tracker.md`
4. Read: `apps/shine/docs/process-improvements.md`

**Reference Projects (extract real implementation patterns):**
5. Read: `apps/shine/tmp/Toonflow-app-master/src/agents/scriptAgent/index.ts`
6. Read: `apps/shine/tmp/Toonflow-app-master/data/skills/script_execution_skeleton.md`
7. Read: `apps/shine/tmp/Toonflow-app-master/data/skills/script_execution_script.md`
8. Read: `apps/shine/tmp/Toonflow-app-master/data/skills/production_execution_storyboard_panel.md`
9. Read: `apps/shine/tmp/Toonflow-app-master/data/skills/production_execution_director_plan.md`
10. Read: `apps/shine/tmp/LocalMiniDrama-main/backend-node/src/services/aiClient.js` (read in full)
11. Read: `apps/shine/tmp/LocalMiniDrama-main/backend-node/src/services/episodeStoryboardService.js` (read in full)
12. Read: `apps/shine/tmp/LocalMiniDrama-main/backend-node/src/services/ttsService.js`
13. Read: `apps/shine/tmp/LocalMiniDrama-main/backend-node/src/services/characterLibraryService.js`
14. Read: `apps/shine/tmp/Jellyfish-main/AGENTS.md` (read in full)
15. Read: `apps/shine/tmp/Jellyfish-main/backend/app/chains/agents/element_extractor_agent.py`
16. Read: `apps/shine/tmp/Jellyfish-main/backend/app/chains/agents/shot_frame_prompt_agents.py`
17. Read: `apps/shine/tmp/BigBanana-AI-Director-main/README_EN.md`

**OpenVideo Reference Implementation:**
18. Read: `apps/vue-editor/src/lib/project.ts`
19. Read: `apps/vue-editor/src/components/editor/CanvasPanel.vue` (read in full)
20. Read: `apps/vue-editor/src/components/editor/Editor.vue` (read in full)
21. Read: `apps/vue-editor/src/components/editor/timeline/Timeline.vue` (read in full)
22. Read: `apps/vue-editor/src/components/editor/timeline/TimelineStudioSync.vue` (read in full)

**Create research notes before proceeding:**
Create file: `apps/shine/docs/scratch/research-notes.md`
Document:
- Key patterns from Toonflow's 3-layer agent pipeline (Decision → Supervision → Execution)
- Key service patterns from LocalMiniDrama (aiClient, episodeStoryboard, tts)
- State machine from Jellyfish AGENTS.md (pending → ready → video-readiness → generating → completed)
- OpenVideo Core initialization pattern from `vue-editor/src/lib/project.ts`
- OpenVideo Studio mount pattern from `vue-editor/src/components/editor/CanvasPanel.vue`

**DO NOT proceed to Step 1 until `research-notes.md` has been created.**

---

## STEP 1 — MICRO-SPRINT 7.1: Auth API + Dashboard Real Data (Days 1–2)

**Read current state first:**
- `apps/shine/server/src/routes/auth.ts`
- `apps/shine/client/src/stores/useAuthStore.ts`
- `apps/shine/client/src/pages/auth/Signup.vue`
- `apps/shine/client/src/pages/auth/Login.vue`
- `apps/shine/client/src/pages/dashboard/index.vue`

**Implement:**

**1a. Create/update `apps/shine/client/src/utils/http.ts`:**
- Axios instance with `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'`
- Request interceptor: attach `Authorization: Bearer <token>` from `localStorage.getItem('shine_token')`
- Response interceptor:
  - `401` → clear token from localStorage, redirect to `/auth/login`
  - `422` → extract validation error messages, call `ElMessage.error()` with specific field errors
  - `500` → call `ElMessage.error('Server error. Please try again.')`

**1b. Update `apps/shine/client/src/stores/useAuthStore.ts`:**
- Import `http` instance from `@/utils/http`
- Implement `signup(data)`: call `POST /v1/auth/signup`, save token to `localStorage['shine_token']`, save user to store
- Implement `login(data)`: call `POST /v1/auth/login`, save token and user
- Implement `logout()`: clear token from localStorage, reset store state
- Implement `fetchMe()`: call `GET /v1/auth/me`, update user in store
- Add `isLoading: boolean` and `error: string | null` reactive state

**1c. Update `apps/shine/client/src/pages/auth/Signup.vue`:**
- Connect form submission handler to `authStore.signup()`
- "Create Account" button must have `:loading="authStore.isLoading"`
- On success: redirect to `/dashboard`
- On error: display API error message via `ElMessage.error()`

**1d. Update `apps/shine/client/src/pages/auth/Login.vue`:**
- Connect form submission to `authStore.login()`
- "Sign In" button must have `:loading="authStore.isLoading"`
- On success: redirect to `/dashboard`

**1e. Update `apps/shine/client/src/stores/useSeriesStore.ts`:**
- Import `http` instance
- Implement `fetchSeriesList()`: call `GET /v1/series`, store result in `seriesList`
- Implement `createSeries(data)`: call `POST /v1/series`, append to `seriesList`
- Implement `deleteSeries(id)`: call `DELETE /v1/series/:id`, remove from `seriesList`

**1f. Update `apps/shine/client/src/pages/dashboard/index.vue`:**
- `onMounted`: call `seriesStore.fetchSeriesList()`
- Show `el-skeleton` loading state while fetching
- Show empty state UI when `seriesList.length === 0`
- Render series cards from `seriesStore.seriesList` — remove ALL hardcoded mock arrays

**Gate 7.1 — Run all three, all must pass:**
```powershell
cd apps/shine/client
pnpm run check-quality
pnpm run check-i18n
pnpm run build
```
Update `apps/shine/docs/sprint-7-tracker.md` Section 7.1 with real status and evidence before proceeding.

---

## STEP 2 — MICRO-SPRINT 7.2: OpenVideo Canvas + Timeline (Days 3–4)

> **This is the most critical step.** You MUST implement real OpenVideo library integration. Do NOT use `<div>` placeholders, static track bars, or image placeholders for the canvas.
> Model your implementation EXACTLY on `apps/vue-editor/src/components/editor/CanvasPanel.vue`.

**Read current state first:**
- `apps/shine/client/src/views/workspace/EditPage.vue`

**Implement:**

**2a. Create `apps/shine/client/src/lib/project.ts`:**
Copy and adapt from `apps/vue-editor/src/lib/project.ts`:
```typescript
import { Core, CoreConfig, BrowserMetadataProvider } from '@openvideo/core';

CoreConfig.setMetadataProvider(new BrowserMetadataProvider());

// 9:16 vertical format for micro-drama (portrait mobile)
const canvasSize = { width: 1080, height: 1920 };
const fps = 30;

export const core = new Core({
  settings: {
    width: canvasSize.width,
    height: canvasSize.height,
    fps,
    duration: 300_000_000, // 5 minutes max episode
  },
});

export const playbackController = core.playback;
export const projectStore = core.store;
```

**2b. Rewrite `apps/shine/client/src/views/workspace/EditPage.vue`:**
Based on `apps/vue-editor/src/components/editor/CanvasPanel.vue`:

Script setup must include:
```typescript
import { Studio, fontManager } from '@openvideo/engine-pixi';
import { core, playbackController } from '@/lib/project';
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const studioRef = ref<Studio | null>(null);
const isReady = ref(false);
```

`onMounted` must:
1. Call `GET /v1/episodes/:id/timeline` to fetch saved timeline JSON
2. Initialize Studio: `new Studio(canvasRef.value, { fps: 30, interactivity: true })`
3. If timeline JSON exists: `core.project.import(timelineJson)`
4. Else: `core.project.new()`
5. Set `isReady.value = true`

Template must include:
- `<canvas ref="canvasRef" />` inside a 9:16 phone preview container (aspect ratio 9:16)
- Play button: calls `core.playback.play()`
- Pause button: calls `core.playback.pause()`
- Split clip button: calls `core.execute({ id: uuid(), type: 'clip.split', payload: { time: currentTime } })`
- Keyboard shortcut `Ctrl+Z`: calls `core.undo()`
- Keyboard shortcut `Ctrl+Y`: calls `core.redo()`

`onUnmounted` must:
- `studioRef.value?.destroy()`

**2c. Integrate `@openvideo/timeline`:**
- Read `apps/shine/client/node_modules/@openvideo/timeline/dist/` to discover exported API
- If a Timeline Vue component is exported: mount it in the bottom editor panel
- If no component export exists: build a minimal timeline panel using `core.store.getState()` for tracks and clips, modeled on `apps/vue-editor/src/components/editor/timeline/Timeline.vue`

**Gate 7.2 — Run all, all must pass:**
```powershell
pnpm run check-quality   # Must detect @openvideo/core in EditPage.vue
pnpm run check-i18n
pnpm run build
```
Update `apps/shine/docs/sprint-7-tracker.md` Section 7.2 before proceeding.

---

## STEP 3 — MICRO-SPRINT 7.3: AI Agent Services + Skills Library (Days 5–7)

**3a. Create `apps/shine/server/src/skills/` directory and port skill prompts:**

For each source file, read it fully, understand its structure, then adapt it for Shine's context (English-language micro-drama, vertical 9:16 format):

| Source File | Destination |
|---|---|
| `Toonflow/data/skills/script_execution_skeleton.md` | `server/src/skills/script_skeleton.md` |
| `Toonflow/data/skills/script_execution_script.md` | `server/src/skills/script_scene.md` |
| `Toonflow/data/skills/production_execution_storyboard_panel.md` | `server/src/skills/production_storyboard.md` |
| `Toonflow/data/skills/production_execution_director_plan.md` | `server/src/skills/production_frame_prompt.md` |

Create new prompts for Shine-specific features:
- `server/src/skills/trend_radar.md` — Viral trend analysis across TikTok/Douyin/YT Shorts by region
- `server/src/skills/compliance_check.md` — Content safety and platform compliance evaluation

**3b. Create `apps/shine/server/src/lib/aiClient.ts`:**
Based on `LocalMiniDrama/backend-node/src/services/aiClient.js`:
- Primary provider: Vertex AI Gemini via `@google/genai`
- Function `generateText(prompt, systemPrompt, options)`: calls real model
- Function `generateStructured<T>(prompt, schema)`: returns typed JSON via structured output
- Function `loadSkill(skillName: string): string`: reads `.md` file from `src/skills/` directory

**3c. Create `apps/shine/server/src/services/scriptService.ts`:**
Based on Toonflow `scriptAgent` (Decision → Supervision → Execution):
- `generateSkeleton(seriesId, premise, genre)`:
  1. Load `script_skeleton.md` skill via `loadSkill()`
  2. Call `aiClient.generateStructured()` with Gemini
  3. Return structured episode skeleton JSON
  4. Emit Socket.io events: `script:thinking`, `script:skeleton_done`
- `generateEpisodeScript(episodeId, skeletonData)`:
  1. Load `script_scene.md` skill
  2. Generate scene-by-scene script with AI
  3. Save to DB
  4. Emit: `script:scene_done` with scene index

**3d. Update server routes to call real services:**
- `POST /v1/ai/generate-script` → calls `scriptService.generateSkeleton()`
- `POST /v1/ai/generate-scenes` → calls `scriptService.generateEpisodeScript()`
- `POST /v1/projects/:id/analysis` → calls `analysisService.analyzeScriptPacing()`

**3e. Implement Episode State Machine in DB:**
Based on Jellyfish `AGENTS.md`:
Add `status` column to episodes table with values:
`pending` → `ready` → `video_readiness` → `generating` → `completed` → `failed`

**Gate 7.3 — Run all, all must pass:**
```powershell
pnpm run check-quality   # Must detect skills directory with 6 required files
pnpm run check-i18n
pnpm run build
```
Update `apps/shine/docs/sprint-7-tracker.md` Section 7.3 before proceeding.

---

## STEP 4 — MICRO-SPRINT 7.4: Viral Trend Radar + Analytics (Days 8–9)

**4a. Create `apps/shine/server/src/services/trendService.ts`:**
- `fetchTrends(region: 'US' | 'SEA_VN' | 'CN' | 'LATAM' | 'JP_KR' | 'EU')`:
  - Attempt to call TikTok Trending API / YouTube Trending API for the region
  - If no API key configured: use `aiClient.generateStructured()` with `trend_radar.md` skill to generate realistic trend analysis based on Gemini's knowledge
  - Return: `Array<{ hashtag: string; velocity: number; genre: string; hook: string; region: string }>`
- `checkCompliance(premise: string)`:
  - Load `compliance_check.md` skill
  - Call Gemini to evaluate content safety, platform compliance
  - Return: `{ safe: boolean; issues: string[]; score: number }`

**4b. Update route `POST /v1/wizard/trend-hunt`** to call `trendService.fetchTrends()`

**4c. Update `SeriesWizardModal.vue` Step 2:**
- Remove hardcoded trend data array
- Call `/v1/wizard/trend-hunt` with selected region
- Show loading skeleton while fetching
- Display real trend results from API

**4d. Update `GET /v1/analytics/overview`:**
- Fetch real aggregated data from DB: series count, episode count, total views
- Calculate retention curve from episode completion events
- Return structured analytics JSON

**4e. Update `AnalyticsPage.vue`:**
- On mount: call `GET /v1/analytics/overview`
- Bind retention curve SVG to real data points
- Bind revenue breakdown donut to real platform data
- Add date range filter that re-fetches from API

**Gate 7.4 — Run all, all must pass:**
```powershell
pnpm run check-quality
pnpm run check-i18n
pnpm run build
```
Update `apps/shine/docs/sprint-7-tracker.md` Section 7.4 before proceeding.

---

## STEP 5 — MICRO-SPRINT 7.5: E2E Verification + Bug Fix (Day 10)

Execute each flow by making real HTTP requests or simulating real user interactions. Verify API calls and DB state changes. Do NOT use URL navigation shortcuts.

**Flow 1 — User Signup:**
1. Make `POST http://localhost:3000/v1/auth/signup` with `{ name, email, password }`
2. Verify: response contains `{ token, user }` (not an error)
3. Verify: token format is valid JWT
4. Verify: user record exists in DB

**Flow 2 — New Series Creation:**
1. Make `POST http://localhost:3000/v1/series` with auth token header
2. Verify: `201` response with series object
3. Verify: `GET /v1/series` returns the newly created series
4. Verify: series record exists in DB with correct fields

**Flow 3 — AI Script Generation:**
1. Make `POST http://localhost:3000/v1/ai/generate-script` with auth token and series data
2. Verify: Gemini API is actually called (check server logs — must see real API request)
3. Verify: response contains real script content (not hardcoded mock text)
4. Verify: episode record updated in DB with generated script

**Flow 4 — OpenVideo Timeline Verification:**
1. Open `EditPage.vue` in browser
2. Inspect DOM: must find `<canvas>` element (NOT `<div class="track">` placeholder)
3. Open browser console: must be zero errors related to `@openvideo/core`
4. Click Play button: verify `core.playback.play()` is called (log in console)
5. Press `Ctrl+Z`: verify undo executes (log in console)

**Flow 5 — Analytics Data:**
1. Make `GET http://localhost:3000/v1/analytics/overview` with auth token
2. Verify: response data comes from DB queries (check server logs)
3. Verify: numbers change if you add/remove series from DB

**Final Quality Check — all three must pass with zero errors:**
```powershell
pnpm run check-quality    # Zero mock data, OpenVideo integrated, Skills library present
pnpm run check-i18n       # 100% key parity across 6 locales
pnpm run build            # Zero compilation errors
```

**Update `apps/shine/docs/sprint-7-tracker.md` Section 7.5 — ALL rows must show ✅ REAL.**

---

## 📋 REPORTING RULES

After each micro-sprint, update `apps/shine/docs/sprint-7-tracker.md` with honest status:

| Symbol | Meaning |
|--------|---------|
| ✅ REAL | Fully implemented with real evidence (log output, API response, DB record) |
| ⚠️ PARTIAL | Partially done — still has mock data or incomplete logic |
| ❌ BLOCKED | Cannot proceed — specify exact blocker and action needed |
| 🚧 WIP | Currently being implemented |

**FORBIDDEN**: Reporting ✅ when the feature is still mocked, hardcoded, or not implemented.

**REQUIRED for blocked features**:
```
Feature: POST /v1/ai/voice-gen
Status: ❌ BLOCKED
Blocker: VERTEX_AI_API_KEY not configured in apps/shine/server/.env
Action needed: Add VERTEX_AI_API_KEY to the .env file
```

---

## ✅ SPRINT 7 DEFINITION OF DONE

Sprint 7 is complete ONLY when ALL of the following are true:

1. `apps/shine/docs/scratch/research-notes.md` exists and documents extracted patterns
2. `apps/shine/server/src/skills/` contains all 6 required `.md` files (each > 500 bytes)
3. `apps/shine/client/src/lib/project.ts` exists with real `Core` instance (width: 1080, height: 1920)
4. `apps/shine/client/src/views/workspace/EditPage.vue` imports and instantiates `@openvideo/core` and `@openvideo/engine-pixi`
5. `apps/shine/server/src/lib/aiClient.ts` imports and calls `@google/genai` (not mocked)
6. `apps/shine/server/src/services/scriptService.ts` exists and reads skill files from disk
7. `apps/shine/server/src/services/trendService.ts` exists and calls Gemini or real trend API
8. `pnpm run check-quality` passes with zero errors
9. `pnpm run check-i18n` passes with 100% key parity across 6 locales
10. `pnpm run build` compiles clean with zero errors
11. All 5 E2E flows verified with real API calls and DB state changes
12. `apps/shine/docs/sprint-7-tracker.md` — every row shows ✅ REAL with evidence
