# Implementation Plan - Sprint 2: Multi-Agent Script Pipeline, Persona Studio & Multi-Region Viral Trend Engine

This plan covers **Sprint 2** of the Shine AI Micro-Drama Platform, targeting **FR-009 to FR-015, FR-074, and FR-081**.
Sprint 2 delivers the full AI story studio capabilities, including a 3-step Genre Onboarding Wizard with regional trend intelligence, a 5-agent AI script generation pipeline, and the Persona Studio for facial anchor locking and wardrobe registry.

---

## User Review Required

> [!IMPORTANT]
> **Gemini AI Integration Strategy:** Multi-agent script generation utilizes `@google/genai` (`GeminiClient.ts`) to request structured JSON output (`responseMimeType: 'application/json'`). If live GCP credentials or Gemini API keys are missing in the test environment, the agents fallback smoothly to realistic context-aware synthetic responses to maintain test execution stability.

> [!NOTE]
> **UI Components & Layout:** All new UI pages (`/wizard`, `/script/:id`, `/persona`) strictly utilize the established design system tokens and basic components from [`@/components/basic/`](../client/src/components/basic) inside the `StudioLayout` shell.

---

## Open Questions

- No blocking open questions. All requirements are documented in `sprint-execution-prompts.md` and SRS (`docs/requirements-document.md`).

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows around cards/wizard steps/buttons. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **BASIC UI COMPONENT MANDATE:** ALL pages and components MUST use only the 44 native components in `@/components/basic/` (`FaButton`, `FaCard`, `FaInput`, `FaForm`, `FaTabs`, `FaTable`, `FaModal`, `FaDrawer`, `FaSelect`, `FaTag`, `FaPagination`, etc.).  and each component's `README.md` for exact props/slots before coding.
3. **UI MOCKUP GROUND TRUTH:** Before coding any page, call `view_file` on the corresponding PNG in `apps/shine/docs/stitch_shine_app_design/`: `/wizard` ➔ `drama-project-creating.png`, `/script/*` ➔ `workspace-scripts.png`, `/persona/*` ➔ `workspace-characters-2.png`.
4. **PORT LOCK:** Client MUST run on `http://localhost:3000` (Vite `strictPort: true`). Server MUST run on `http://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS:** Raw `fetch()` is STRICTLY PROHIBITED. All API calls MUST go through Pinia store actions (`src/stores/`) + centralized Axios client (`src/utils/http.ts`).
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings MUST use `$t('...')` in templates and `i18n.global.t('...')` in TS/JS. ALL toast notifications MUST be internationalized across 6 locales (`en`, `vi`, `zh`, `jp`, `es`, `fr`). NEVER hardcode raw strings.

---

### Backend: Multi-Agent Pipeline & REST Endpoints (`apps/shine/server/`)


#### [NEW] [`server/src/lib/ai/agents/DirectorAgent.ts`](../server/src/lib/ai/agents/DirectorAgent.ts)
- Orchestrates multi-agent script execution workflow.
- Routes tasks across Story Skeleton Agent, Adaptation Strategy Agent, Script Agent, and Supervision Agent.

#### [NEW] [`server/src/lib/ai/agents/StorySkeletonAgent.ts`](../server/src/lib/ai/agents/StorySkeletonAgent.ts)
- Generates series-level narrative arcs and 20-50 episode outlines based on synopsis, genre, and target tone.

#### [NEW] [`server/src/lib/ai/agents/AdaptationStrategyAgent.ts`](../server/src/lib/ai/agents/AdaptationStrategyAgent.ts)
- Maps synopsis chapters to episodes and establishes emotional beats and cliffhanger targets per episode.

#### [NEW] [`server/src/lib/ai/agents/ScriptAgent.ts`](../server/src/lib/ai/agents/ScriptAgent.ts)
- Generates structured per-episode scripts containing multiple scenes in JSON format (`{ "scriptItem": { "episode": "EP XX", "scenes": [...] } }`).

#### [NEW] [`server/src/lib/ai/agents/SupervisionAgent.ts`](../server/src/lib/ai/agents/SupervisionAgent.ts)
- Audits generated scripts for character consistency, dialogue pacing, hook strength, and safety checks.

#### [NEW] [`server/src/routes/ai.ts`](../server/src/routes/ai.ts)
- Implement REST API endpoints:
  - `GET /v1/ai/trends/viral-topics?region=...` (FR-074 regional trend scanner for `US`, `SEA_VN`, `CN`, `LATAM`, `JP_KR`, `EU`).
  - `POST /v1/ai/generate-script` (Full multi-agent script pipeline).
  - `POST /v1/ai/generate-outline` (Series outline/skeleton generation).
  - `POST /v1/ai/supervise-script` (Script quality & consistency check).
  - `POST /v1/ai/generate-storyboard` (4-8s scene breakdown and visual frame descriptions).

#### [NEW] [`server/src/routes/characters.ts`](../server/src/routes/characters.ts)
- Implement Persona Studio REST API endpoints (FR-081, Proposal 1):
  - `GET /v1/characters` & `POST /v1/characters` (Persona creation and retrieval).
  - `POST /v1/characters/:characterId/anchors` (Extract & store 8 facial consistency anchor points).
  - `POST /v1/characters/:characterId/wardrobe` (Wardrobe registry for outfit locking & LoRA reference injection).

#### [MODIFY] [`server/src/index.ts`](../server/src/index.ts)
- Register `aiRouter` at `/v1/ai` and `characterRouter` at `/v1/characters`.

---

### Frontend: Types, Pinia Stores, Locale Dictionaries & Views (`apps/shine/client/`)

#### [MODIFY] [`client/src/types/api.ts`](../client/src/types/api.ts)
- Add TypeScript interfaces for Script, Scene, Storyboard, Character, Anchor, Wardrobe, and ViralTopic contracts.

#### [NEW] [`client/src/stores/useScriptStore.ts`](../client/src/stores/useScriptStore.ts)
- Pinia store managing script generation, active episode scripts, scene editing, and supervision feedback.

#### [NEW] [`client/src/stores/usePersonaStore.ts`](../client/src/stores/usePersonaStore.ts)
- Pinia store managing character bibles, 8-anchor face mesh state, outfit continuity locks, and wardrobe items.

#### [NEW] [`client/src/stores/useTrendStore.ts`](../client/src/stores/useTrendStore.ts)
- Pinia store managing regional viral trends, hashtag velocity, and competitor script hooks.

#### [MODIFY] [`client/src/locales/{en,vi,zh,jp,es,fr}.json`](../client/src/locales/en.json)
- Add translation key blocks: `wizard.*`, `script.*`, `persona.*`, `trends.*`.

#### [NEW] [`client/src/components/wizard/GenreWizard.vue`](../client/src/components/wizard/GenreWizard.vue)
- 3-step onboarding wizard component:
  1. Genre Selection (Suspense, Romance, Action, Satire) & Visual Style.
  2. Multi-Region Viral Trend Scanner & Topic Selection.
  3. AI Script Configuration & Series Creation.

#### [NEW] [`client/src/pages/wizard/WizardPage.vue`](../client/src/pages/wizard/WizardPage.vue)
- Standalone page wrapping `GenreWizard.vue` inside `StudioLayout`.

#### [NEW] [`client/src/pages/script/ScriptStudio.vue`](../client/src/pages/script/ScriptStudio.vue)
- Multi-Agent Script Studio workspace page featuring episode selector, story outline tree, structured JSON scene view, rich-text scene editor, and AI Supervision review card.

#### [NEW] [`client/src/pages/persona/PersonaStudio.vue`](../client/src/pages/persona/PersonaStudio.vue)
- Character Studio workspace page displaying 8-anchor face mesh extraction matrix, 98.4% mesh match badge, outfit lock controls, and wardrobe registry grid.

#### [MODIFY] [`client/src/router/index.ts`](../client/src/router/index.ts)
- Register routes `/wizard`, `/script/:id`, and `/persona` under `StudioLayout`.


---

### E2E Testing & Sprint DoD Report

#### [NEW] [`tests/e2e/sprint-2-journey.spec.ts`](../tests/e2e/sprint-2-journey.spec.ts)
- Interactive Playwright test covering:
  1. Onboarding wizard genre selection & viral trend filtering by region.
  2. Generating script outline & per-episode JSON scenes via multi-agent pipeline.
  3. Character anchor creation & wardrobe lock with 98.4% mesh match verification.
  4. i18n language switching & screenshot capture.

#### [NEW] [`docs/reports/sprint-2-report.md`](../docs/reports/sprint-2-report.md)
- Complete Sprint 2 DoD report covering summary of work, empirical test outputs, UI/UX audit screenshots, FR compliance matrix, and next sprint transition.

---

## Verification Plan

### Automated Tests
- `pnpm exec playwright test tests/e2e/sprint-2-journey.spec.ts` (Full E2E user flow verification)
- `npx tsc --noEmit` in `client/` and `server/` to verify zero TypeScript errors.

### Manual Verification
- Launch local full-stack server (`npm run dev` in client & server) and test interactive wizard, script studio, and persona studio UI in dark-mode OKLCH slate theme.
