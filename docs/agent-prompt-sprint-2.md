# TASK: RE-IMPLEMENT SPRINT 2 — Multi-Agent Script Pipeline, Persona Studio & Viral Trend Engine
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-2.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

Sprint 2 builds on Sprint 1. Before starting, CONFIRM Sprint 1 prerequisites are met:
- Client runs on `http://localhost:3000` ✅
- Server runs on `http://localhost:3001` ✅
- `src/utils/http.ts` (centralized Axios client) exists ✅
- `src/i18n.ts` + 6 locale files (`src/locales/`) exist ✅
- `AppLayout.vue` and `StudioLayout.vue` exist ✅
- `authStore.ts` and `seriesStore.ts` use Axios instead of raw `fetch()` ✅

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

Read the following documents in order using `view_file` BEFORE starting:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-2.md`. This is the detailed execution plan specifying exactly which files to create and modify.

2. **UI Component Catalog (READ BEFORE USING ANY COMPONENT):**
    For each component you plan to use, also read its `README.md` at `src/components/basic/<component-name>/README.md` for exact Props and Slots.

3. **AI Prompt Engineering Guide (FOR AGENT PIPELINE DESIGN):**
   Read `docs/ai-prompt-guide.md` (Sections 1–6, Section 11) — Director/Script/Supervision agent architecture.

4. **API Reference (STANDARDIZED ENDPOINTS):**
   Read `docs/api-document.md` — AI Script & Scene Generation section, `GET /ai/trends/viral-topics`.

5. **View the UI design mockups BEFORE coding any page:**
   - `/wizard` → `view_file` `docs/stitch_shine_app_design/shine_new_series_wizard_core_dna_step_1/screen.png`
   - `/script/*` → `view_file` `docs/stitch_shine_app_design/script_assembly_shadows_in_the_code/screen.png`
   - `/persona/*` → `view_file` `docs/stitch_shine_app_design/character_profile_modal_mara_vance/screen.png`

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

```bash
# Check current structure
ls apps/shine/client/src/stores/
ls apps/shine/client/src/pages/
ls apps/shine/server/src/routes/
ls apps/shine/server/src/lib/ai/

# Check if multi-agent pipeline exists
ls apps/shine/server/src/lib/ai/agents/ 2>/dev/null || echo "NOT FOUND — needs to be created"

# Check if routes are already registered
grep -n "aiRouter\|characterRouter" apps/shine/server/src/index.ts
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
Wizard step indicators, genre selection cards, persona anchor badges, and step progress bars MUST NOT have glowing purple borders. Page elements MUST use clean dark-slate palette (`#121218`, `#1a1b23`, `#2d2e3a`).
- `border: 2px solid purple`
- `box-shadow: 0 0 15px rgba(139, 92, 246, 0.5)`
- `background: linear-gradient(135deg, #7c3aed, #4f46e5)`
- Any Tailwind classes: `purple-*`, `violet-*`, `indigo-*`

Active wizard step MUST use: `background: var(--primary)` (white `oklch(0.922 0 0)`) with dark text — NOT purple gradients.

**Self-check after writing:**
```bash
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/pages/ \
  apps/shine/client/src/components/wizard/
# EXPECTED: 0 matches
```

### 🚫 GATE 2: MANDATORY BASIC UI COMPONENTS (`@/components/basic/`)
Before using any component, read its `README.md`:
```
view_file("apps/shine/client/src/components/basic/<component-name>/README.md")
```

Required component bindings for Sprint 2:
- `GenreWizard.vue` → `FaCard` (genre cards), `FaButton` (genre selection + navigation), `FaTag` (tone/style labels), `FaSelect` (region selector), `FaProgress` (step progress bar)
- `ScriptStudio.vue` → `FaPageHeader`, `FaCard` (scene cards), `FaTextarea` (scene editor), `FaButton` (Generate/Supervise/Export), `FaSelect` (episode picker), `FaAlert` (supervision feedback)
- `PersonaStudio.vue` → `FaCard` (character card), `FaImageUpload` (face reference upload), `FaProgress` (mesh match accuracy), `FaTag` (wardrobe outfit tags), `FaDrawer` (wardrobe details)

### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
- Client: `http://localhost:3000` — NEVER test on port `5173`
- Server: `http://localhost:3001`

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
All API calls from Vue pages MUST go through:
1. `useScriptStore.ts` → `scriptStore.generateScript(seriesId, config)`
2. `usePersonaStore.ts` → `personaStore.extractAnchors(characterId, imageFile)`
3. `useTrendStore.ts` → `trendStore.fetchViralTopics(region)`

The Axios client at `src/utils/http.ts` automatically attaches JWT Bearer tokens.

**Self-check after writing:**
```bash
grep -rn "fetch(" apps/shine/client/src/pages/ apps/shine/client/src/stores/
# EXPECTED: 0 matches
```

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS & AUTOMATED CHECK
Add key blocks to ALL 6 locale files: `wizard.*`, `script.*`, `persona.*`, `trends.*`, `toast.*`
- **MANDATORY AUTOMATED LINTER:** Run `pnpm run check-i18n` in `apps/shine/client`. If it finds any hardcoded toast strings or missing translation keys in any of the 6 locales, YOU MUST FIX THEM ALL BEFORE SUBMITTING.

Example structure (add to all 6 locales with translated values):
```json
{
  "wizard": {
    "title": "New Drama Series",
    "step1Title": "Choose Your Genre",
    "step2Title": "Select Viral Trend Topic",
    "step3Title": "Configure Series",
    "genreSuspense": "Suspense",
    "genreRomance": "Romance",
    "genreAction": "Action",
    "genreSatire": "Satire"
  },
  "script": {
    "generateBtn": "Generate Script",
    "superviseBtn": "Quality Check",
    "exportBtn": "Export Script"
  },
  "toast": {
    "scriptGenerated": "Script generated successfully!",
    "scriptGenerating": "Generating script with AI...",
    "anchorsExtracted": "Facial anchors extracted: 98.4% match"
  }
}
```

---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-2.md`)

### 3.1 Backend — Multi-Agent Pipeline (`apps/shine/server/`)

**CREATE:**
1. `server/src/lib/ai/agents/DirectorAgent.ts` — Orchestrates the full pipeline
2. `server/src/lib/ai/agents/StorySkeletonAgent.ts` — Generates narrative arc and episode outlines
3. `server/src/lib/ai/agents/AdaptationStrategyAgent.ts` — Maps synopsis chapters to episodes
4. `server/src/lib/ai/agents/ScriptAgent.ts` — Generates per-episode structured JSON script
5. `server/src/lib/ai/agents/SupervisionAgent.ts` — Audits script for quality and consistency
6. `server/src/routes/ai.ts` — REST endpoints: `POST /v1/ai/generate-script`, `GET /v1/ai/trends/viral-topics`, `POST /v1/ai/generate-outline`, `POST /v1/ai/supervise-script`
7. `server/src/routes/characters.ts` — REST endpoints: `GET /v1/characters`, `POST /v1/characters`, `POST /v1/characters/:id/anchors`, `POST /v1/characters/:id/wardrobe`

**MODIFY:**
8. `server/src/index.ts` — Register `aiRouter` at `/v1/ai` and `characterRouter` at `/v1/characters`

### 3.2 Frontend — TypeScript Contracts

**MODIFY:**
9. `client/src/types/api.ts` — Add interfaces: `Script`, `Scene`, `Storyboard`, `Character`, `Anchor`, `Wardrobe`, `ViralTopic`

### 3.3 Frontend — Pinia Stores

**CREATE:**
10. `client/src/stores/useScriptStore.ts` — Script generation, episode scripts, scene editing, supervision
11. `client/src/stores/usePersonaStore.ts` — Character bibles, 8-anchor face mesh state, wardrobe items
12. `client/src/stores/useTrendStore.ts` — Regional viral trends, hashtag velocity

### 3.4 Frontend — UI Components & Pages

**CREATE:**
13. `client/src/components/wizard/GenreWizard.vue` — 3-step onboarding wizard (NO purple gradients!)
14. `client/src/pages/wizard/WizardPage.vue` — Wrapper page inside StudioLayout
15. `client/src/pages/script/ScriptStudio.vue` — Multi-agent script studio workspace
16. `client/src/pages/persona/PersonaStudio.vue` — Character studio with face mesh extraction

**MODIFY:**
17. `client/src/router/index.ts` — Add routes: `/wizard`, `/script/:id`, `/persona` under StudioLayout


### 3.5 Locale Dictionaries

**MODIFY:**
18. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `wizard.*`, `script.*`, `persona.*`, `trends.*` key blocks

### 3.6 Testing

**CREATE:**
19. `tests/e2e/sprint-2-journey.spec.ts` — Interactive Playwright E2E test

---

## STEP 4: COMPONENT DESIGN RULES

### GenreWizard.vue — 3 STEPS (NO GRADIENTS, NO NEON — matches `drama-project-creating.png`)
```
STEP 1 — Genre Selection:
  - FaCard grid (2×2) for 4 genres: Suspense, Romance, Action, Satire
  - On selection: border changes to var(--primary) (white) — NOT purple
  - FaTag chips for sub-genres / visual style options
  - FaButton "Next: Pick Trend Topics" (with right arrow icon)

STEP 2 — Viral Trend Engine:
  - FaSelect for region (US, SEA_VN, CN, LATAM, JP_KR, EU)
  - FaCard list for trending topics (fetched from GET /v1/ai/trends/viral-topics)
  - FaButton "Select This Topic" + FaButton variant="ghost" "Refresh Trends"

STEP 3 — Series Configuration:
  - FaInput for series title
  - FaSelect for episode count (20 / 30 / 40 / 50)
  - FaTextarea for synopsis / description
  - FaButton "Create Series & Generate Script" (with :loading="isGenerating" prop)
```

### ScriptStudio.vue — WORKSPACE LAYOUT (matches `workspace-scripts.png`)
```
- FaPageHeader with series title and FaSelect episode picker (top)
- LEFT panel: Episode list as FaCard items with FaTag status badges (Draft/In Progress/Done)
- CENTER panel: Per-scene editor — FaCard per scene containing FaTextarea for dialogue
- RIGHT panel: AI Supervision feedback card with FaAlert items
- BOTTOM toolbar: FaButton "Generate Script" + FaButton "Quality Check" + FaButton "Export"
```

### PersonaStudio.vue — CHARACTER STUDIO (matches `workspace-characters-2.png`)
```
- FaPageHeader with character name and FaButton "Add Character"
- Character grid: FaCard per character with avatar thumbnail (FaAvatar), name, role FaTag
- Detail panel: FaImageUpload for face reference + FaProgress for mesh match accuracy
- Wardrobe section: FaCard grid of outfit items with FaTag labels
```

---

## STEP 5: BACKEND AGENT IMPLEMENTATION RULES

Every Agent class MUST follow this pattern using `GeminiClient.ts`:
```typescript
export class StorySkeletonAgent {
  constructor(private gemini: GeminiClient) {}

  async generateOutline(synopsis: string, genre: string, episodeCount: number): Promise<EpisodeOutline[]> {
    const result = await this.gemini.generateContent({
      model: 'gemini-2.5-flash',
      prompt: `[Prompt from docs/ai-prompt-guide.md Section 2]`,
      responseMimeType: 'application/json', // MUST use structured JSON output
    });
    return JSON.parse(result.text);
  }
}
```

All REST API endpoints MUST return the standardized format:
```json
{ "code": 200, "data": { ... }, "message": "Script generated successfully", "error": null }
```

---

## STEP 6: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

You CANNOT declare completion based solely on writing code. You MUST run and attach the real output of:

```bash
# 1. TypeScript check — MUST produce 0 errors
cd apps/shine/client && npx tsc --noEmit

# 2. Server TypeScript check
cd apps/shine/server && npx tsc --noEmit

# 3. Run Playwright E2E test
pnpm exec playwright test tests/e2e/sprint-2-journey.spec.ts --reporter=list

# 4. Verify no gradients or neon glows in new files
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/pages/wizard/ \
  apps/shine/client/src/pages/script/ \
  apps/shine/client/src/pages/persona/ \
  apps/shine/client/src/components/wizard/
# EXPECTED RESULT: 0 matches

# 5. Verify no raw fetch() calls
grep -rn "fetch(" apps/shine/client/src/pages/ apps/shine/client/src/stores/
# EXPECTED RESULT: 0 matches

# 6. Run automated i18n linter (MUST PASS WITH 0 ERRORS)
cd apps/shine/client && pnpm run check-i18n
# EXPECTED RESULT: 🎉 i18n AUDIT PASSED!

```

---

## STEP 7: MANDATORY COMPLETION REPORT

Save the report to `docs/reports/sprint-2-report.md` with all 5 required sections:

1. **Summary of Created/Modified Files** (grouped by Backend Agents / Backend Routes / Pinia Stores / UI Pages / Locales)
2. **Build & TypeCheck Results** (paste actual output of `npx tsc --noEmit` for both client and server)
3. **Playwright E2E Test Results** (paste actual output showing PASS/FAIL per test case)
4. **Real Browser Screenshots** of `/wizard` (each step), `/script/:id`, `/persona` — DO NOT use `generate_image` to fabricate mockups. Screenshots MUST be captured from the actual running browser at `http://localhost:3000`.
5. **FR Compliance Matrix** — Table with Pass/Fail for: FR-009 to FR-015, FR-074, FR-081
