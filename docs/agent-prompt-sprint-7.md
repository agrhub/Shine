# Agent Execution Prompt: Sprint 7 — OpenVideo Engine Integration, Real AI Services & Interactive E2E Testing

## 🎯 MANDATE & GOAL

You are executing **Sprint 7** of **Shine - AI Micro-Drama Video Studio**. 
Your mission is to transform the application from a static HTML mockup into a **100% real, production-ready enterprise software** where every UI action triggers real backend logic, real AI model calls, and real database state changes.

> [!CAUTION]
> **ABSOLUTE RULES FOR SPRINT 7 — VIOLATION = TASK FAILURE**:
> 1. **READ & PORT FROM `apps/shine/tmp/` REFERENCE PROJECTS FIRST**: Before writing any new code, you MUST read and understand the proven implementations in the reference projects below. Do NOT invent your own patterns when working ones already exist.
> 2. **INSTANTIATE OPENVIDEO LIBRARIES FOR REAL**: In `EditPage.vue`, you MUST import and instantiate `@openvideo/core`, `@openvideo/engine-pixi`, and `@openvideo/timeline`. Model your approach exactly on [`apps/vue-editor/src/components/editor/CanvasPanel.vue`](../../../apps/vue-editor/src/components/editor/CanvasPanel.vue) and [`apps/vue-editor/src/lib/project.ts`](../../../apps/vue-editor/src/lib/project.ts).
> 3. **NO MOCK DATA ANYWHERE**: Remove every hardcoded static array from Vue component `<script setup>`. All data comes from live Pinia stores connected to backend APIs.
> 4. **NO URL-NAVIGATION-SHORTCUT TESTING**: Every E2E verification must simulate real user input sequences — fill form fields, click buttons, assert loading states, check toast messages, verify DB state.
> 5. **REPORT FAILURES HONESTLY**: If a feature cannot be implemented due to missing API keys, missing infrastructure, or missing library support, report the exact blocker. Do NOT report "success" when the feature is still mocked.

---

## 📁 MANDATORY REFERENCE PROJECTS

Before beginning any task, read and extract patterns from these reference projects in [`apps/shine/tmp/`](../tmp):

### 1. [`Toonflow-app-master`](../tmp\Toonflow-app-master)
**Purpose**: AI Multi-Agent drama production pipeline with skill prompt system.
**Key Files to Read**:
- `src/agents/scriptAgent/index.ts` — Multi-agent orchestration, Memory system, `runDecisionAI()`, `runSupervisionAI()`, `runExecutionAI()` pipeline
- `src/agents/productionAgent/index.ts` — Storyboard generation agent, visual shot list, asset derivation
- `data/skills/script_agent_decision.md` — AI Director decision skill prompt (extract pattern for Shine's own script agent)
- `data/skills/script_execution_skeleton.md` — Episode skeleton generation prompt (extract for `POST /v1/ai/generate-script`)
- `data/skills/script_execution_script.md` — Full scene-by-scene script prompt (extract for `POST /v1/ai/generate-scenes`)
- `data/skills/production_execution_storyboard_panel.md` — Visual shot prompt panel (extract for image generation pipeline)
- `data/skills/production_execution_director_plan.md` — AI Director production plan prompt
- `src/socket/` — WebSocket real-time progress streaming architecture

**What to Port into Shine**:
- 3-layer agent pipeline: `Decision → Supervision → Execution` for `scriptAgent` and `productionAgent`
- Memory system (`src/utils/agent/memory.ts`) for cross-episode character & plot consistency
- Skill `.md` prompt files into `apps/shine/server/src/skills/`
- WebSocket-based real-time streaming progress to client

---

### 2. [`LocalMiniDrama-main`](../tmp\LocalMiniDrama-main)
**Purpose**: Full-stack mini drama production platform with real AI service integrations.
**Key Files to Read**:
- `backend-node/src/services/aiClient.js` — Multi-provider AI client (Gemini, OpenAI, DeepSeek, Claude) with model routing
- `backend-node/src/services/dramaService.js` — Core drama CRUD service, episode management
- `backend-node/src/services/episodeStoryboardService.js` — Scene-by-scene storyboard generation service (72KB — production-grade)
- `backend-node/src/services/framePromptService.js` — Per-frame visual prompt generation service
- `backend-node/src/services/characterLibraryService.js` — Character LoRA anchor management (49KB)
- `backend-node/src/services/videoService.js` — Video generation pipeline with provider routing
- `backend-node/src/services/ttsService.js` — TTS voice synthesis service
- `backend-node/src/services/promptI18n.js` — Multi-language i18n prompt system (135KB — reference for 6 locale prompt generation)
- `backend-node/src/services/storyGenerationService.js` — Novel/story text-to-drama conversion

**What to Port into Shine**:
- Multi-provider AI client pattern from `aiClient.js` into `apps/shine/server/src/lib/aiClient.ts`
- Full storyboard service pipeline from `episodeStoryboardService.js` into Shine's `/v1/ai/generate-scenes` endpoint
- Character library with facial anchor LoRA from `characterLibraryService.js` into `/v1/characters/*`
- TTS service into `/v1/ai/voice-gen`
- Frame prompt generation into the AI synthesis pipeline

---

### 3. [`Jellyfish-main`](../tmp\Jellyfish-main)
**Purpose**: Python FastAPI drama production backend with multi-agent LangChain pipeline.
**Key Files to Read**:
- `backend/AGENTS.md` — State machine rules: `pending → ready → video-readiness` (adopt into Shine's episode status system)
- `backend/AGENTS_OVERVIEW.md` — Agent orchestration overview
- `backend/SCRIPT_PROCESSING_AGENTS.md` — Script processing multi-agent architecture
- `backend/app/chains/agents/script_divider_agent.py` — Script chapter-to-scene divider agent
- `backend/app/chains/agents/element_extractor_agent.py` — Character, prop, scene element extractor
- `backend/app/chains/agents/character_portrait_analysis_agent.py` — Character portrait & costume analyzer
- `backend/app/chains/agents/shot_frame_prompt_agents.py` — Shot frame prompt generator (12KB)
- `backend/app/chains/agents/consistency_checker_agent.py` — Cross-scene visual consistency checker
- `backend/app/tasks/execute_task.py` — Background async task execution engine
- `backend/app/services/` — Analysis, monitoring, retention analytics services

**What to Port into Shine**:
- Shot status state machine (`pending → ready → video-readiness`) mapped to Shine's `EpisodeStatus` enum
- Element extractor agent pattern into Shine's script analysis pipeline
- Shot frame prompt generator into image/video synthesis service
- Consistency checker into character LoRA anchor validation
- Background task engine pattern into Shine's render job queue

---

### 4. [`BigBanana-AI-Director-main`](../tmp\BigBanana-AI-Director-main)
**Purpose**: AI Director automatic drama production pipeline.
**Key Files to Read**:
- `README.md` — Full AI Director pipeline description, multi-stage generation flow
- `README_EN.md` — English version with technical architecture details

**What to Port into Shine**:
- AI Director multi-stage prompt chain design for Series skeleton → Episode scripts → Scene shots → Frame prompts
- Director Plan generation flow into the Wizard's `POST /v1/wizard/trend-hunt` and `POST /v1/series` pipeline

---

## 🛠️ TASK BREAKDOWN & STEP-BY-STEP INSTRUCTIONS

### Task 1: Read Reference Projects (MANDATORY FIRST STEP)
Before writing any code, open and read the files listed above. Extract the following:
- [ ] AI agent pipeline architecture from Toonflow
- [ ] Service layer patterns from LocalMiniDrama
- [ ] State machine + background task patterns from Jellyfish
- [ ] Director pipeline from BigBanana

### Task 2: Implement Real AI Agent Services (`apps/shine/server/src/`)
Port the multi-agent production pipeline into Shine's Express backend:
- `src/services/aiClient.ts` — Multi-provider AI client (Vertex AI Gemini, OpenAI fallback) modeled on `LocalMiniDrama/aiClient.js`
- `src/services/scriptAgentService.ts` — 3-layer script agent: `Decision → Supervision → Execution`, modeled on Toonflow `scriptAgent/index.ts`
- `src/services/productionAgentService.ts` — Storyboard, frame prompt, visual shot list, modeled on Toonflow `productionAgent/index.ts`
- `src/services/characterService.ts` — Character creation, facial anchor LoRA management, modeled on `LocalMiniDrama/characterLibraryService.js`
- `src/services/ttsService.ts` — TTS voice synthesis, modeled on `LocalMiniDrama/ttsService.js`
- `src/services/videoService.ts` — Video generation pipeline with provider routing
- `src/services/analysisService.ts` — Script pacing analysis, retention prediction, emotional curve
- `src/services/trendService.ts` — **Viral Trend Radar**: Multi-region trend scan (TikTok, Douyin, Kuaishou, YouTube Shorts, Instagram Reels) by region (`US`, `SEA_VN`, `CN`, `LATAM`, `JP_KR`, `EU`)
- `src/skills/` directory — Port all `.md` skill prompt files from Toonflow's `data/skills/` adapting them for Shine (English + Vietnamese contexts)

### Task 3: Implement Episode State Machine (from Jellyfish AGENTS.md)
Map Jellyfish's state machine to Shine's `EpisodeStatus` enum in the database:
- `pending` = Script exists but scene extraction not confirmed
- `ready` = All scenes extracted, character anchors confirmed, assets validated
- `video-readiness` = All frames prompted, ready to send to video generation API
- `generating` = Video generation job running in background task queue
- `completed` = Episode video file rendered and available

### Task 4: Instantiate OpenVideo Libraries in `EditPage.vue`
Model implementation exactly on [`apps/vue-editor/src/components/editor/CanvasPanel.vue`](../../../apps/vue-editor/src/components/editor/CanvasPanel.vue):
- Import `Core`, `CoreConfig`, `BrowserMetadataProvider` from `@openvideo/core`
- Import `Studio`, `fontManager`, `registerCustomTransition` from `@openvideo/engine-pixi`
- Initialize `CoreConfig.setMetadataProvider(new BrowserMetadataProvider())`
- Create `core = new Core({ settings: { width: 1080, height: 1920, fps: 30 } })` (9:16 vertical = 1080×1920)
- Mount PIXI WebGL stage via `new Studio(canvasElement, { fps: 30, interactivity: true })`
- Wire `playback.play()`, `playback.pause()`, `playback.seek()`, `splitClip()`, `trimClip()`, undo/redo

### Task 5: Wire Centralized Axios HTTP Client (`src/utils/http.ts`)
- Attach `Authorization: Bearer <token>` from `localStorage.getItem('shine_token')` to every request
- Intercept `401` → clear session, redirect to `/auth/login`
- Intercept `422` → extract field validation errors, display via `ElMessage.error()`
- Intercept `500` → display server error toast with retry guidance

### Task 6: Connect Pinia Stores to Live Backend APIs
- **`useAuthStore.ts`**: `signup()`, `login()`, `logout()`, `fetchMe()` → `POST /v1/auth/*`
- **`useSeriesStore.ts`**: `fetchSeriesList()`, `createSeries()`, `fetchSeriesById()`, `deleteSeries()` → `/v1/series/*`
- **`useScriptStore.ts`**: `generateScript()`, `generateScenes()`, `fetchTimeline()` → `/v1/ai/*` & `/v1/episodes/*`
- **`usePersonaStore.ts`**: `fetchCharacters()`, `generateVoice()` → `/v1/characters/*` & `/v1/voices/*`
- **`useTrendStore.ts`**: `fetchTrends(region)` → `POST /v1/wizard/trend-hunt`

### Task 7: Implement Viral Trend Radar & Analytics Services
- **Trend Radar** (`GET /v1/trends`): Real multi-region viral trend scanning from TikTok trending API, Douyin trending, hashtag velocity scoring. Display live results in `SeriesWizardModal.vue` Step 2.
- **Script Pacing Analysis** (`POST /v1/projects/:id/analysis`): Run AI script pacing scorer, generate retention prediction score (0-100), render on `ProjectAnalysisPage.vue`.
- **Performance Analytics** (`GET /v1/analytics/overview`): Live retention decay curve (Day 1 → Day 30), revenue breakdown by platform. Render dynamically on `AnalyticsPage.vue`.

### Task 8: Interactive E2E Flow Verification (ZERO URL SHORTCUTS)
Execute these full click-sequence user flows. Each must be verified against real API calls and real DB state:

1. **Signup Flow**: Type Name/Email/Password → Click "Create Account" → Assert `POST /v1/auth/signup` called → Assert JWT in localStorage → Assert redirect to `/dashboard`
2. **New Series Wizard Flow**: Click "New Series" → Select Genre → Input Premise → Click "Fetch Trends" (Step 2) → Assert `/v1/wizard/trend-hunt` called → Select trend → Click "Check Compliance" → Assert `/v1/wizard/compliance-check` called → Click "Generate Series" → Assert `/v1/series` POST called → Assert new series card in Dashboard
3. **Episode Script Generation**: Click series card → Click "Script Studio" tab → Input AI prompt → Click "Synthesize Script" → Assert `POST /v1/ai/generate-script` called → Assert script scenes rendered
4. **OpenVideo Timeline Editing**: Click "Edit Episode" → Assert WebGL PIXI canvas mounts → Play/Pause playback → Trim a clip → Assert `core.execute()` command dispatched → Undo edit → Assert reverted
5. **Cloud Render Flow**: Click "Begin Cloud Render" → Assert `POST /v1/export/render` called → Assert background job started → Assert progress bar updates → Assert render complete

---

## 🔍 DEFINITION OF DONE (DoD)

1. `@openvideo/core`, `@openvideo/engine-pixi`, `@openvideo/timeline` fully instantiated in `EditPage.vue` (not mocked)
2. AI agent services (`scriptAgentService.ts`, `productionAgentService.ts`) ported from reference projects and calling real Vertex AI / Gemini APIs
3. Skill prompt `.md` files exist in `apps/shine/server/src/skills/` ported from Toonflow
4. Episode state machine (`pending → ready → video-readiness → generating → completed`) implemented in DB schema
5. Viral Trend Radar service (`trendService.ts`) fetching real regional trend data
6. All Pinia stores wired to live backend APIs (zero mock arrays)
7. `pnpm run check-i18n` passes with 100% key parity across 6 locales
8. `pnpm run build` compiles clean with zero errors
9. All 5 E2E interactive click flows pass with verified API calls and DB state changes
10. Zero features reported as "complete" when still using mock data
