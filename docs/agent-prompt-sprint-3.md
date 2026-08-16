# TASK: IMPLEMENT SPRINT 3 — Timeline NLE Editor, AntV G6 Graph Suite & Cloud Compositor
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-3.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

**Sprint 3 builds on Sprint 1 & 2. Confirm prerequisites are met before starting:**
- Client runs on `http://localhost:3000` ✅
- Server runs on `http://localhost:3001` ✅
- `src/utils/http.ts` (centralized Axios client) exists ✅
- `src/i18n.ts` + 6 locale files (`src/locales/`) exist ✅
- `AppLayout.vue` and `StudioLayout.vue` exist ✅
- `scriptStore.ts` and `personaStore.ts` Pinia stores exist ✅

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

Read the following documents using `view_file` BEFORE writing any code:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-3.md`. This is the authoritative execution plan — implement exactly what it specifies, nothing more, nothing less.

2. **UI Component Catalog (READ BEFORE USING ANY COMPONENT):**
    For each component you plan to use, also read its `README.md` at `src/components/basic/<component-name>/README.md` for exact Props and Slots.
   Key components this sprint: `FaSlider`, `FaButton`, `FaDrawer`, `FaTooltip`, `FaProgress`, `FaSwitch`, `FaTag`.

3. **Architecture Document:**
   Read `docs/architecture-document.md` Sections 8, 12, 13.1, 14.1 — Timeline engine architecture, dual rendering, cloud compositor.

4. **API Reference:**
   Read `docs/api-document.md` Sections 4, 5, 6 — Export, Render, and Parity Check endpoints.

5. **View UI design mockups BEFORE coding any page:**
   - `/editor/*` → `view_file` `docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png`
   - Environment panel → `view_file` `docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png`

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

```bash
# Check what timeline-related files already exist
find apps/shine/client/src -name "*timeline*" -o -name "*editor*" -o -name "*Timeline*" 2>/dev/null
find apps/shine/client/src -name "*graph*" -o -name "*Graph*" 2>/dev/null
find apps/shine/server/src -name "*compositor*" -o -name "*export*" 2>/dev/null

# Check if packages are installed
cat apps/shine/client/package.json | grep -E "@antv/g6|splitpanes|openvideo"
cat apps/shine/server/package.json | grep -E "fluent-ffmpeg"

# Check router for existing editor route
grep -n "editor" apps/shine/client/src/router/index.ts
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
The Timeline NLE editor and AntV G6 graphs MUST NOT have any purple gradients or neon glows. Page elements MUST use clean dark-slate palette (`#121218`, `#1a1b23`, `#2d2e3a`).

### 🚫 GATE 2: MANDATORY ELEMENT PLUS COMPONENTS (`element-plus`)
- ALL views and pages MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
- Custom `Fa-Admin` components (`@/components/basic`) are deprecated. Switch completely to Element Plus for consistent design, UI layout, and colors.

Active/selected clips: `border-color: var(--primary)` (white) — NO colored glows.

**Self-check after writing:**
```bash
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/views/workspace/ \
  apps/shine/client/src/components/timeline/ \
  apps/shine/client/src/components/graph/
# EXPECTED: 0 matches
```

### 🚫 GATE 2: MANDATORY BASIC UI COMPONENTS (`@/components/basic/`)
Before using any component, read its README:
```bash
view_file("apps/shine/client/src/components/basic/<component-name>/README.md")
```

Required component bindings for Sprint 3:
- Transport controls (Play/Pause/Stop) → `FaButton` with `size="icon"` variant
- Playhead scrubber → `FaSlider`
- Track mute/solo toggles → `FaSwitch`
- Track type labels → `FaTag`
- Clip tooltips on hover → `FaTooltip`
- Clip inspector panel → `FaDrawer`
- Render progress → `FaProgress`
- Loading skeleton → `FaProgress` (indeterminate mode)

DO NOT build custom HTML sliders, custom toggle switches, or inline `<style>` overrides.

### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
- Client: `http://localhost:3000` — NEVER test on port `5173`
- Server: `http://localhost:3001`

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
All API calls from Vue pages MUST go through `timelineStore.ts` Pinia actions:
- `timelineStore.startRenderJob(seriesId, episodeId)` → calls `POST /v1/export/render-job`
- `timelineStore.pollRenderStatus(jobId)` → calls `GET /v1/export/render-job/:jobId/status`

**Self-check:**
```bash
grep -rn "fetch(" apps/shine/client/src/views/ apps/shine/client/src/components/
# EXPECTED: 0 matches
```

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS
Add key blocks to ALL 6 locale files: `editor.*`, `timeline.*`, `graph.*`, `render.*`, `toast.*`

Example (add translated values to each locale):
```json
{
  "editor": {
    "playBtn": "Play",
    "pauseBtn": "Pause",
    "splitClipBtn": "Split Clip",
    "undoBtn": "Undo",
    "redoBtn": "Redo",
    "renderBtn": "Render Episode"
  },
  "timeline": {
    "trackVideo": "VIDEO",
    "trackAudio": "AUDIO",
    "trackSubtitles": "SUBTITLES",
    "clipInspector": "Clip Inspector"
  },
  "render": {
    "jobQueued": "Render job queued",
    "jobComplete": "Render complete!"
  }
}
```

### 🚫 GATE 6: VERIFY PACKAGE AVAILABILITY BEFORE IMPLEMENTING
Before writing any timeline or graph code:
```bash
# Check if packages exist, install if missing
cd apps/shine/client && pnpm add @antv/g6 splitpanes
cd apps/shine/server && pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-3.md`)

### 3.1 Package Installation
```bash
cd apps/shine/client && pnpm add @antv/g6 splitpanes
cd apps/shine/server && pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

### 3.2 TypeScript Contracts

**CREATE:**
1. `client/src/types/timeline.ts` — Interfaces: `Clip`, `Track`, `TimelineCommand`, `TimelineState`

**MODIFY:**
2. `client/src/types/api.ts` — Add: `RenderJob`, `ParityCheckResult`, `CompositorPayload`

### 3.3 Pinia Store

**CREATE:**
3. `client/src/stores/timelineStore.ts` — Timeline command engine with:
   - `execute(cmd)`, `undo()`, `redo()`
   - `clipAdd()`, `clipUpdate()`, `clipRemove()`, `clipSplit()`
   - `exportToJSON()`, `loadFromJSON()`
   - `startRenderJob()`, `pollRenderStatus()`
   - All toasts via `i18n.global.t('toast.*')`

### 3.4 Timeline Editor UI

**CREATE:**
4. `client/src/views/workspace/EditPage.vue` — Main NLE editor (matches `workspace-editor.png`)
5. `client/src/components/timeline/TimelineTrack.vue` — Individual track row with draggable clips
6. `client/src/components/timeline/PreviewCanvas.vue` — 9:16 WebGL preview canvas with `<Suspense>` + `FaProgress`

**MODIFY:**
7. `client/src/router/index.ts` — Add `/editor/:seriesId/:episodeId` → StudioLayout → EditPage.vue
8. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `editor.*`, `timeline.*`, `render.*` keys

### 3.5 AntV G6 Graph Suite

**CREATE:**
9. `client/src/components/graph/NarrativeDagGraph.vue` — Branching story DAG tree
10. `client/src/components/graph/CharacterRelationshipGraph.vue` — Force-directed character graph
11. `client/src/components/graph/AgentWorkflowGraph.vue` — Multi-agent pipeline execution monitor

**MODIFY:**
12. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `graph.*` keys

### 3.6 Cloud Compositor Backend

**CREATE:**
13. `server/src/routes/export.ts` — REST routes:
    - `POST /v1/export/render-job`
    - `GET /v1/export/render-job/:jobId/status`
    - `POST /v1/export/parity-check`
14. `server/src/lib/compositor/CompositorWorker.ts` — ffmpeg-based cloud compositor

**MODIFY:**
15. `server/src/index.ts` — Register `exportRouter` at `/v1/export`

### 3.7 Testing

**CREATE:**
16. `tests/e2e/sprint-3-journey.spec.ts` — Playwright E2E test

---

## STEP 4: COMPONENT DESIGN RULES

### EditPage.vue — LAYOUT (matches `workspace-editor.png`)
```
splitpanes 3-panel layout:
  LEFT panel (20%): Clip library / asset browser
    - FaCard list of available clips with FaTag type badges
    - Drag clips from here onto timeline tracks

  CENTER panel (60%): Main workspace
    TOP half: 9:16 PreviewCanvas.vue (with FaProgress loading skeleton)
    BOTTOM half: Multi-track timeline
      - Transport bar: FaButton play/pause/stop + FaSlider playhead + timecode display
      - Track rows: VIDEO 1, AUDIO 1, SUBS (each using TimelineTrack.vue)
      - Each track: FaTag label + FaSwitch mute + FaSwitch solo + clip blocks

  RIGHT panel (20%): FaDrawer clip inspector
    - FaDescriptions for clip metadata (start time, duration, asset name)
    - FaSlider for clip opacity/volume
    - FaButton split, delete, detach
```

### TimelineTrack.vue — CLIP RENDERING
```
- Clips rendered as positioned <div> blocks with:
    background: var(--card)     (#1a1b23)
    border: 1px solid var(--border)   (#2d2e3a)
    border-radius: 4px
- Selected clip: border-color: var(--primary) (white) — NO neon glow
- Draggable trim handles on left/right edges
- Emits: clip:drag-trim, clip:split, clip:select
```

### AntV G6 Graph Components — STYLING
```
- Graph background: var(--background) (#121218)
- Node fill: var(--card) (#1a1b23)
- Node stroke: var(--border) (#2d2e3a)
- Active/selected node: stroke var(--primary) (white), strokeWidth 2
- Edge color: var(--muted-foreground)
- NO colored node fills, NO glowing edges, NO gradient node backgrounds
```

---

## STEP 5: BACKEND IMPLEMENTATION RULES

### export.ts — All endpoints return standardized format
```typescript
// POST /v1/export/render-job
res.json({ code: 200, data: { jobId: uuid(), status: 'queued' }, message: 'Render job queued', error: null });

// GET /v1/export/render-job/:jobId/status
res.json({ code: 200, data: { progress: 45, outputUrl: null }, message: 'Rendering...', error: null });

// POST /v1/export/parity-check
res.json({ code: 200, data: { ssim: 0.9993, passed: true }, message: 'Parity check complete', error: null });
```

### CompositorWorker.ts — Pattern
```typescript
export class CompositorWorker extends EventEmitter {
  async render(payload: CompositorPayload): Promise<string> {
    // Use fluent-ffmpeg to composite clips from payload.tracks
    // Emit progress events: this.emit('progress', { percent: N })
    // Return outputUrl (uploaded to S3)
  }
}
```

---

## STEP 6: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

```bash
# 1. TypeScript check — MUST produce 0 errors
cd apps/shine/client && npx tsc --noEmit
cd apps/shine/server && npx tsc --noEmit

# 2. Run Playwright E2E test
pnpm exec playwright test tests/e2e/sprint-3-journey.spec.ts --reporter=list

# 3. Verify no gradients or neon glows
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/views/workspace/ \
  apps/shine/client/src/components/timeline/ \
  apps/shine/client/src/components/graph/
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

Save the report to `docs/reports/sprint-3-report.md` with all 5 required sections:

1. **Summary of Created/Modified Files** (grouped by: TypeScript Types / Pinia Store / Timeline UI / Graph Suite / Cloud Compositor)
2. **Build & TypeCheck Results** (paste actual output of `npx tsc --noEmit` for both client and server)
3. **Playwright E2E Test Results** (paste actual test output with PASS/FAIL per step)
4. **Real Browser Screenshots** — Captured from `http://localhost:3000/editor/series-001/episode-001` showing: timeline loaded, clip trimmed, clip split, AntV G6 DAG graph open, character relationship graph. DO NOT use `generate_image`.
5. **FR Compliance Matrix** — Pass/Fail for: FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114. Include SSIM parity result (`TC-PAR-001`: ssim > 0.999).
