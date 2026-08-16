# Sprint 3 Implementation Plan: Timeline NLE Editor & Dual Rendering

## Background

Sprint 3 covers **FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114**. The goal is to deliver the OpenVideo Timeline NLE Editor, the AntV G6 Multi-Module Graph Suite (5 workspace modules), the OpenVideo Command Engine (with undo/redo), and the Cloud Compositor Worker for server-side rendering.

**What already exists in the codebase:**
- ✅ Express server framework with route module registration
- ✅ Vue 3 SPA with StudioLayout shell (`src/layouts/StudioLayout.vue`)
- ✅ Pinia auth/series/script stores
- ✅ Basic component library (`@/components/basic/` — FaButton, FaCard, FaSlider, etc.)
- ✅ Centralized Axios client (`src/utils/http.ts`)
- ✅ 6-locale i18n setup (`src/locales/`)

**What is missing / needs to be built:**
- ❌ No Timeline NLE Editor page (`src/views/workspace/EditPage.vue`)
- ❌ No `timelineStore.ts` Pinia store with `clip.add/update/remove/split` command engine
- ❌ No `TimelineTrack.vue` multi-track timeline component
- ❌ No `PreviewCanvas.vue` WebGL 9:16 vertical video canvas
- ❌ No `@antv/g6` graph integration (any of the 5 workspace modules)
- ❌ No Cloud Compositor Worker (`server/src/lib/compositor/CompositorWorker.ts`)
- ❌ No `POST /export/render-job` and `POST /export/parity-check` REST endpoints
- ❌ No `tests/e2e/sprint-3-journey.spec.ts`
- ❌ No `docs/reports/sprint-3-report.md`

---

## Open Questions

> [!IMPORTANT]
> **`@openvideo/timeline` package availability:** Verify that `@openvideo/timeline` and `@openvideo/engine-pixi` are available in the workspace `node_modules` or workspace package registry before implementing `EditPage.vue`. If missing, implement using `splitpanes` + custom timeline track rendering.
>
> **`@antv/g6` package version:** Install `@antv/g6` v5.x in `client/package.json` via `pnpm add @antv/g6`. Ensure tree-shaking config in `vite.config.ts` to exclude from dev server initial bundle.
>
> **WebGL Canvas Isolation:** The 9:16 preview canvas (`PreviewCanvas.vue`) runs heavy WebGL. Mount it inside a `<Suspense>` wrapper with a `FaProgress` skeleton loader to avoid blocking the timeline track panel render.

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **BASIC UI COMPONENT MANDATE:** ALL pages MUST use only the 44 native components in `@/components/basic/`.  and each component's `README.md` for exact props/slots before coding. Key components for this sprint: `FaSlider` (playhead scrubber), `FaButton` (track controls), `FaDrawer` (clip inspector), `FaTooltip` (timeline clip tooltips), `FaProgress` (render job progress).
3. **UI MOCKUP GROUND TRUTH:** Before coding `/editor/*`, call `view_file` on [`workspace-editor.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png). Before coding the environment panel, view [`workspace-eposode-scene-environment.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png).
4. **PORT LOCK:** Client MUST run on `http://localhost:3000` (Vite `strictPort: true`). Server MUST run on `http://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS:** Raw `fetch()` is STRICTLY PROHIBITED. All API calls MUST go through Pinia store actions (`src/stores/timelineStore.ts`) + centralized Axios client (`src/utils/http.ts`).
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings MUST use `$t('...')` in templates and `i18n.global.t('...')` in TS/JS. Add `timeline.*`, `editor.*`, `graph.*`, `render.*` keys to all 6 locale JSON files.

---

### Component 1: Package Installation

#### [MODIFY] `client/package.json` — Install timeline & graph packages
```bash
cd apps/shine/client
pnpm add @antv/g6 splitpanes
```

#### [MODIFY] `server/package.json` — Install compositor dependencies
```bash
cd apps/shine/server
pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

---

### Component 2: TypeScript Contracts

#### [NEW] `client/src/types/timeline.ts`
TypeScript interfaces for the OpenVideo command engine:
```typescript
interface Clip { id: string; trackId: string; startTime: number; duration: number; assetUrl: string; type: 'video' | 'audio' | 'subtitle' }
interface Track { id: string; type: 'video' | 'audio' | 'subtitle'; clips: Clip[]; muted: boolean }
interface TimelineCommand { type: 'clip.add' | 'clip.update' | 'clip.remove' | 'clip.split'; payload: any; inverse: any }
interface TimelineState { tracks: Track[]; playhead: number; undoStack: TimelineCommand[]; redoStack: TimelineCommand[] }
```

#### [MODIFY] `client/src/types/api.ts`
Add `RenderJob`, `ParityCheckResult`, `CompositorPayload` interfaces matching the server API contracts.

---

### Component 3: Pinia Store — Timeline Command Engine

#### [NEW] `client/src/stores/timelineStore.ts`
Pinia store managing the entire timeline state with:
- `execute(cmd: TimelineCommand)`: executes a command and pushes inverse to `undoStack`
- `undo()`: pops from `undoStack`, executes inverse, pushes to `redoStack`
- `redo()`: pops from `redoStack`, re-executes command
- `clipAdd(trackId, clip)`, `clipUpdate(id, patch)`, `clipRemove(id)`, `clipSplit(id, splitTime)`: typed command factories
- `exportToJSON()`: serializes full `TimelineState` to JSON string
- `loadFromJSON(json: string)`: restores `TimelineState` from JSON
- `startRenderJob(seriesId, episodeId)`: calls `POST /export/render-job` via Axios and polls `GET /export/render-job/:jobId/status`
- All toast notifications MUST use `i18n.global.t('toast.renderStarted')`, `i18n.global.t('toast.renderComplete')`

---

### Component 4: Timeline Editor UI

#### [NEW] `client/src/views/workspace/EditPage.vue`
Main Timeline NLE Editor workspace page (matches `workspace-editor.png` mockup) using `StudioLayout`:
- `splitpanes` layout: Left panel (clip library / asset browser), Center panel (9:16 preview canvas + timeline tracks), Right panel (FaDrawer clip inspector)
- Uses `FaButton` for transport controls (Play/Pause/Stop), `FaSlider` for playhead scrubber and zoom
- Uses `FaTag` for track type labels, `FaTooltip` on clip handles
- All track mute/solo controls via `FaSwitch`
- All text via `$t('editor.*')` keys

#### [NEW] `client/src/components/timeline/TimelineTrack.vue`
Individual track row component:
- Renders clips as draggable rectangles along the time axis
- Emits `clip:drag-trim`, `clip:split`, `clip:select` events
- Supports VIDEO 1, AUDIO 1, SUBS track types

#### [NEW] `client/src/components/timeline/PreviewCanvas.vue`
9:16 vertical WebGL preview canvas:
- Loads video clips using `@openvideo/engine-pixi` or `HTMLVideoElement` fallback
- Scrubs to playhead time from `timelineStore.playhead`
- Shows `FaProgress` skeleton during initial asset load

#### [MODIFY] `client/src/router/index.ts`
Add route:
```
/editor/:seriesId/:episodeId → StudioLayout → EditPage.vue
```

#### [MODIFY] `client/src/locales/{en,vi,zh,jp,es,fr}.json`
Add translation key blocks: `editor.*`, `timeline.*`, `render.*`

---

### Component 5: AntV G6 Multi-Module Graph Suite

#### [NEW] `client/src/components/graph/NarrativeDagGraph.vue`
Interactive Branching Narrative DAG Tree using `@antv/g6` Graph:
- Nodes represent story branch decision points; edges are conditional paths
- Click node to trigger next story branch execution via `scriptStore.branchTo(nodeId)`

#### [NEW] `client/src/components/graph/CharacterRelationshipGraph.vue`
Character Relationship & Social Lineage Graph:
- Circular force-directed layout showing character alliances, rivalries, and family ties
- Click character node to open persona drawer (`FaDrawer`)

#### [NEW] `client/src/components/graph/AgentWorkflowGraph.vue`
Multi-Agent Workflow Execution Monitor:
- DAG showing Director → StorySkeletonAgent → ScriptAgent → SupervisionAgent pipeline state
- Nodes update color in real-time via WebSocket events

#### [MODIFY] `client/src/locales/{en,vi,zh,jp,es,fr}.json`
Add `graph.*` translation keys.

---

### Component 6: Cloud Compositor Worker (Backend)

#### [NEW] `server/src/routes/export.ts`
REST routes:
- `POST /v1/export/render-job` — Queue a render job from serialized timeline JSON. Returns `{ jobId, status: 'queued' }`.
- `GET /v1/export/render-job/:jobId/status` — Poll render progress `{ progress: 0-100, outputUrl }`.
- `POST /v1/export/parity-check` — SSIM pixel-diff between WebGL preview frame and compositor output frame. Returns `{ ssim: 0.999, passed: true }`.

#### [NEW] `server/src/lib/compositor/CompositorWorker.ts`
Node.js worker executing `@openvideo/core` `Compositor.output()` from serialized JSON payloads:
- Accepts `CompositorPayload` (serialized `TimelineState`)
- Uses `fluent-ffmpeg` to composite video clips, audio tracks, and SRT subtitle overlays
- Emits progress events via EventEmitter → WebSocket `render:progress` broadcast

#### [MODIFY] `server/src/index.ts`
Register `exportRouter` at `/v1/export`.

---

### Component 7: E2E Tests

#### [NEW] `tests/e2e/sprint-3-journey.spec.ts`
Interactive Playwright E2E test covering:
1. Navigate to `/editor/series-001/episode-001` — assert Timeline NLE page renders inside `StudioLayout`
2. Drag clip right boundary to trim → assert clip duration changes in DOM
3. Click "Split Clip" button at playhead → assert clip splits into two segments
4. Click track mute toggle (`FaSwitch`) → assert muted state badge appears
5. Scrub playhead slider to 00:12 → assert preview canvas updates
6. Click AntV G6 narrative DAG node → assert story branch panel opens
7. Click character node in relationship graph → assert persona `FaDrawer` slides in
8. Screenshots: `01_timeline_loaded.png` → `02_clip_trimmed.png` → `03_clip_split.png` → `04_track_muted.png` → `05_dag_branch.png` → `06_character_graph.png`

---

## Verification Plan

### Automated Tests
- `cd apps/shine/client && npx tsc --noEmit` — zero TypeScript errors
- `cd apps/shine/server && npx tsc --noEmit` — zero TypeScript errors
- `pnpm exec playwright test tests/e2e/sprint-3-journey.spec.ts`
- SSIM parity check: assert `TC-PAR-001` returns `ssim > 0.999`

### Manual Verification
- Dev server: `npm run dev` (client on port 3000, server on port 3001)
- Open `/editor/series-001/episode-001` and verify timeline loads matching `workspace-editor.png`
- Verify AntV G6 graphs render without purple gradients or neon glows
- Verify render job queues and progress appears in `FaProgress` bar
- Verify SSIM parity check passes at `> 0.999`

### Report
- Create `docs/reports/sprint-3-report.md` with all 5 required sections + embedded screenshots
