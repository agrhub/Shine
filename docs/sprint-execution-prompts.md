# Ready-to-Use Master Execution Prompts for Shine (Sprint 1 to Sprint 6)

This document contains copy-pasteable execution prompts for Project Managers and Developers to delegate implementation tasks for each sprint to AI Coding Agents.

---

## �� Sprint 1 Master Execution Prompt: Foundation, Infrastructure & Core Setup

```markdown
# SPRINT 1 TASK: Foundation, Infrastructure, Pluggable DB, Vertex AI, Google Flow Pool Router & Project Hub Setup (FR-001 to FR-008, FR-074, FR-075, FR-107 to FR-113, FR-129, FR-130)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 1)
- SRS Requirements: `docs/requirements-document.md` (FR-001 to FR-008, FR-074, FR-075, FR-107 to FR-113, FR-129, FR-130)
- System Architecture: `docs/architecture-document.md` (Section 1 to Section 4, Section 17, Section 18, Section 21)
- UI Design System: `docs/design.md` & `packages/vue-element-plus`
- API Reference: `docs/api-document.md` (Auth, Public, Series & Flow Account endpoints)
- Test Plan: `docs/test-document.md` (TC-001 to TC-008)
- Safe Editing Guidelines: `docs/safe-code-editing-guidelines.md`

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `client/` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `server/` (Node.js Express API + `IDatabaseProvider` + Vertex AI & Flow Pool)

## Scope of Work
1. **Mandatory Element Plus UI Component & Stitch MCP Integration:**
   - **Step 1 (Google Stitch MCP Ground Truth):** All UI views and components MUST align with Google Stitch local design assets in `docs/stitch_shine_app_design/` using the local design files in `docs/stitch_shine_app_design/`.
   - **Step 2 (Element Plus Component Usage):** All pages and views MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
2. **Infrastructure & Pluggable Database Abstraction (FR-130):**
   - Configure Express server in `server/index.ts` with S3 client and `IDatabaseProvider` repository pattern (`server/lib/db/`).
   - Implement `SQLiteProvider` (`better-sqlite3` at `./data/shine.db`) and `MongoDBProvider` (`mongoose`), allowing dynamic database selection via `DB_PROVIDER=sqlite` or `DB_PROVIDER=mongodb`.
   - Setup Vertex AI SDK (`@google/genai` v2.16.0) in `server/lib/ai/GeminiClient.ts`.
3. **Hybrid AI Provider Router & Google Flow Pool Integration (Proposal 31, FR-129):**
   - Port `FlowAdapter.ts`, `FlowSyncService.ts`, and `CaptchaService.ts` from `AntStudio` into `server/lib/ai/providers/`.
   - Build `AIProviderRouter.ts` to route free/draft generations to Google Flow account pool (`flowST` session tokens + reCAPTCHA solver) and commercial exports to paid Vertex AI.
4. **Public Surfaces & Authentication Suite (FR-107 to FR-113):**
   - Build Marketing Landing Page (`src/pages/Home.vue`), Login/Signup Auth pages (`src/pages/auth/Login.vue`, `Signup.vue`) with Google/GitHub OAuth SSO & Password Reset, Legal pages (`Terms.vue`, `Privacy.vue`), Contact Form (`Contact.vue`), Interactive User Manual (`src/pages/Manual.vue`), and Multi-Language System UI Engine (`vue-i18n`, supporting 6 languages: `en`, `vi`, `zh`, `jp`, `es`, `fr`).
5. **Vertex AI Authentication & Location Routing:**
   - Implement Service Account & ADC auth. Route `gemini-2.5-*` to `us-central1` and `veo-3.1-*` to `global`.
6. **Series & Project Management CRUD & Dashboard UI:**
   - Implement REST endpoints: `GET /series`, `POST /series`, `GET /series/:id`, `POST /series/:id/episodes`.
   - Wire `src/views/dashboard/index.vue` with Series list/grid and New Series wizard shell using native Element Plus components.


## Safety Protocols (Mandatory)
- Use `view_file` to inspect target lines before calling `replace_file_content`.
- Scope edits to minimal 3–8 line targets with unique context anchors.

## MANDATORY NO-GRADIENT & NO-NEON-GLOW GATE (STRICT PROHIBITION OF PURPLE NEON & GRADIENTS!)
Look at the user feedback and screenshots: Sub-agents MUST NOT invent flashy purple gradients, neon glows, or bright purple borders!
1. **STRICT PROHIBITION OF PURPLE GRADIENTS & NEON GLOWS:**
   - NEVER add purple linear gradients (`background: linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`).
   - NEVER add neon box-shadow glows or bright purple active borders around cards, wizard steps, or buttons.
   - Flashy "đồng bóng" gradients and custom purple styling are STRICTLY FORBIDDEN.
2. **MANDATORY CLEAN DARK SLATE COLOR PALETTE:**
   - Backgrounds MUST use standard OKLCH dark slate `--background` (`#121218`).
   - Card surfaces MUST use standard OKLCH card background `--card` (`#1a1b23`).
   - Borders MUST use subtle dark slate `--border` (`#2d2e3a`).
   - Selection states MUST use clean highlight or subtle accent tokens matching the 15 PNG mockups in [`apps/shine/docs/stitch_shine_app_design/`](stitch_shine_app_design).
3. **MANDATORY USE OF BASIC COMPONENTS (`@/components/basic/`):**
   - ALL cards, forms, buttons, inputs, tabs, and modals MUST use native components from `@/components/basic/` (`FaCard`, `FaButton`, `FaInput`, `FaTabs`, `FaForm`). Custom inline CSS style overrides are strictly prohibited.

## MANDATORY UI GROUND TRUTH MANDATE (`apps/shine/docs/stitch_shine_app_design/*.png` - STRICT PROHIBITION OF CUSTOM UI LAYOUTS!)
The absolute ground truth for all UI design, page layout, panel arrangements, colors, and control positioning is defined by the 15 PNG mockup files inside [`D:\Workspace\Gits\CamHub\openvideo\apps\shine\docs\UI`](stitch_shine_app_design):
1. **STRICT PROHIBITION OF CUSTOM UI LAYOUTS:** Agents MUST NOT invent custom layouts, arbitrary panel positions, or unapproved UI structures. All views MUST strictly follow the design mockups in `apps/shine/docs/stitch_shine_app_design/*.png`.
2. **MANDATORY VIEWING PROTOCOL:** Before coding any page component, developers and agents MUST open and inspect the target PNG design in `apps/shine/docs/stitch_shine_app_design/` using `view_file`:
   - `/dashboard` ➔ [`dashboard.png`](../docs/stitch_shine_app_design/project_hub_dashboard_light_mode/screen.png)
   - `/series/create` ➔ [`drama-project-creating.png`](../docs/stitch_shine_app_design/shine_new_series_wizard_core_dna_step_1/screen.png)
   - `/script/*` ➔ [`workspace-scripts.png`](../docs/stitch_shine_app_design/script_assembly_shadows_in_the_code/screen.png)
   - `/editor/*` ➔ [`workspace-editor.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png)
   - `/captions/*` ➔ [`workspace-captions.png`](../docs/stitch_shine_app_design/caption_management_shadows_in_the_code/screen.png)
   - `/export/*` ➔ [`workspace-episode-export.png`](../docs/stitch_shine_app_design/export_publish_shadows_in_the_code/screen.png)
   - `/dubbing/*` ➔ [`workspace-voice-dubbing.png`](../docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png)
   - `/persona/*` ➔ [`workspace-characters-2.png`](../docs/stitch_shine_app_design/character_profile_modal_mara_vance/screen.png)
   - `/analytics/*` ➔ [`analytics.png`](../docs/stitch_shine_app_design/shine_ai_analytics_light_mode/screen.png) & [`workspace-episode-analytic.png`](../docs/stitch_shine_app_design/shine_project_analysis_aligned_light_mode/screen.png)
   - `/audio/*` ➔ [`audio-mixing.png`](../docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png)
   - `/environment/*` ➔ [`workspace-eposode-scene-environment.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png)
   - `/reviews/*` ➔ [`workspace-reviews.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png)
   - `/library/*` ➔ [`asset-library.png`](../docs/stitch_shine_app_design/shine_team_shared_workspace/screen.png)

## MANDATORY PORT LOCK GATE (CLIENT: PORT 3000 | SERVER: PORT 3001 - STRICT PROHIBITION OF PORT 5173!)
To guarantee consistency across all developer environments, automated Playwright E2E tests, and screenshot scripts:
1. **CLIENT PORT BINDING (PORT 3000):** The Vite Frontend SPA MUST ALWAYS run on `http://localhost:3000`. Sub-agents, Playwright tests, and capture scripts are STRICTLY PROHIBITED from accessing or testing on port `5173` or any other arbitrary fallback port.
2. **SERVER PORT BINDING (PORT 3001):** The Express Backend API MUST ALWAYS run on `http://localhost:3001`.
3. **STRICT PORT ENFORCEMENT:** `apps/shine/client/vite.config.ts` enforces `server.strictPort: true` on port `3000`. If port 3000 is occupied, Vite will fail fast rather than silently incrementing to port 5173.

## MANDATORY STORE-DRIVEN API & CENTRALIZED AXIOS GATE (STRICT PROHIBITION OF RAW FETCH!)
To enforce enterprise architecture and centralized authentication session management:
1. **STRICT PROHIBITION OF RAW `fetch()`:** Agents MUST NOT write raw `fetch()` calls inside Vue page templates, view scripts, or component lifecycle hooks.
2. **STORE-DRIVEN API DATA FETCHING:** All network requests MUST be defined inside Pinia stores (`src/stores/` or `src/store/modules/`). Vue view components MUST trigger Pinia store actions (e.g. `authStore.login(credentials)`, `seriesStore.fetchSeriesList()`).
3. **CENTRALIZED AXIOS HTTP CLIENT (`src/utils/http.ts`):** All API calls MUST execute via the unified Axios client instance featuring:
   - **Request Interceptor:** Automatically attaches JWT Bearer token (`Authorization: Bearer <token>`) from storage to every outgoing request.
   - **Response Interceptor:** Automatically validates response envelope (`res.code`), handles business errors, triggers global 401 unauthorized redirects to `/login`, and handles toast error notifications.
4. **STANDARDIZED EXPRESS SERVER API RESPONSE FORMAT:** All Express backend REST APIs MUST return JSON payloads formatted strictly as:
   ```json
   {
     "code": 200,
     "data": { ... },
     "message": "Success",
     "error": null
   }
   ```

## MANDATORY MULTI-LANGUAGE (i18n) INTEGRATION GATE (STRICT PROHIBITION OF HARDCODED TEXT IN HTML & JS/TS!)
When implementing Vue 3 pages, components, Pinia stores, composables, or Axios interceptors, YOU MUST STRICTLY ENFORCE FULL MULTI-LANGUAGE SUPPORT (`vue-i18n`):
1. **STRICT PROHIBITION OF HARDCODED STRINGS:** NEVER hardcode raw text strings inside Vue template HTML OR inside TypeScript/JavaScript logic files (`.ts` / `.vue`).
2. **MANDATORY i18n IN TOAST MESSAGES & PINIA STORES:** ALL notification toasts (`toast.success()`, `toast.error()`), alert banners (`el-alert`), confirm dialogs, form validation messages, and Pinia store error states MUST be internationalized using `i18n.global.t('...')` or `useI18n().t('...')` (e.g. `toast.success(i18n.global.t('toast.seriesCreated'))`). NEVER write hardcoded string literals like `toast.success("Series created successfully")`.
3. **Mandatory `$t('...')` / `useI18n()` Key Binding:** ALL user-facing text, button labels, modal titles, form placeholders, table headers, error messages, and toast notifications MUST be bound to `vue-i18n` translation keys (e.g. `$t('home.heroTitle')`, `$t('dashboard.newSeriesBtn')`, `$t('auth.loginHeader')`).
4. **Populate 6 Locale Dictionary Files (`src/locales/`):** You MUST create and populate translation key-value pairs across all 6 supported locale JSON files:
   - `src/locales/en.json` (English)
   - `src/locales/vi.json` (Tiếng Việt)
   - `src/locales/zh.json` (Chinese Simplified)
   - `src/locales/jp.json` (Japanese)
   - `src/locales/es.json` (Spanish LatAm)
   - `src/locales/fr.json` (French)
5. **Header Language Switcher Component (`LanguageSelect.vue`):** Ensure the application header features an interactive Language Switcher dropdown. Changing the language dynamically updates the active `$i18n.locale` and re-renders all UI strings on screen instantly without page reload.
6. **Playwright i18n Verification Assertion:** Playwright E2E tests MUST physically click the Language Switcher to switch locales (e.g. English ➔ Tiếng Việt ➔ Chinese), capture browser screenshots showing localized UI text and toast messages in each language, and assert that DOM text matches the target locale dictionary!

## MANDATORY LAYOUT CONFORMANCE GATE (5 DISTINCT LAYOUT SHELLS)
You MUST implement and register 5 distinct layout shells in `src/router/index.ts`:
1. **`DefaultLayout.vue` (Simple Static Pages Shell):**
   - **Target Routes:** `/terms` (`Terms.vue`), `/privacy` (`Privacy.vue`), `/contact` (`Contact.vue`), `/manual` (`Manual.vue`).
   - **Design Rules:** Clean footer, `<router-view />` for content, no sidebar.
2. **`HomeLayout.vue` (Marketing Landing Page Shell):**
   - **Target Routes:** `/` (`Home.vue`).
   - **Design Rules:** Marketing header with Logo, nav links (Features, Pricing, Use Cases, Blog), LanguageSelect dropdown, Sign In button, Get Started button, clean footer, `<router-view />` for content, no sidebar.
3. **`AuthLayout.vue` (Authentication Shell):**
   - **Target Routes:** `/auth/login` (`Login.vue`), `/auth/signup` (`Signup.vue`), `/auth/forgot-password` (`ForgotPassword.vue`), `/auth/reset-password` (`ResetPassword.vue`).
   - **Design Rules:** 
     - **Left Column:** Image/Video/Brand hero illustration (Shine branding).
     - **Right Column:** Centered card with `<router-view />`.
4. **`AppLayout.vue` (Main Workspace Management Shell):**
   - **Target Routes:** `/dashboard` (`Dashboard.vue`), `/projects`, `/team`, `/assets`, `/analytics`.
   - **Design Rules:**
     - **Sub-Sidebar (`.g-sub-sidebar`):** Collapsible menu (Series Dashboard, My Projects, Team Shared, Assets Library, Analytics); top header menu is logo icon; bottom footer is User Profile Menu (Profile, Settings, LanguageSelect, Dark/Light toggle and logout) and collapse toggle button at the bottom.
     - **Main Content Container (`.g-main-area`):** Content area with `<router-view />`.
5. **`StudioLayout.vue` (Dedicated Production Studio Shell):**
   - **Target Routes:** `/wizard`, `/script/*`, `/editor/*`, `/persona/*`, `/dubbing/*`, `/captions/*`, `/audio/*`, `/environment/*`, `/reviews/*`, `/export/*` / `/publish/*`.
   - **Design Rules:**
     - **Header Toolbar (`.g-header`):** Logo with "Back to Dashboard / My Projects / Team Shared" button and tabs (Script, Editor, Characters, Library, Voice & Dubbing, Captions, Analytics, Export & Publish).
     - **Main Content Container (`.g-main-area`):** Content area with `<router-view />`.

## MANDATORY BASIC UI COMPONENT MANDATE (COMPONENTS AT SRC/COMPONENTS/BASIC)
Look at the native basic UI components inside `src/components/basic/` (`D:\Workspace\Gits\CamHub\openvideo\apps\shine\client\src\components\basic`):
- **STRICT PROHIBITION OF AD-HOC CSS/HTML:** You MUST NOT create custom ad-hoc HTML elements or write unstyled inline CSS rules.
- **MANDATORY BASIC UI COMPONENT BINDINGS:** You MUST use the basic components from `@/components/basic/`:
  - `FaButton` for all actions, submit buttons, and links.
  - `FaInput`, `FaForm`, `FaFormItem` for form fields and validation.
  - `FaCard` for all card surfaces, stats, and project panels.
  - `FaModal`, `FaDrawer` for popup dialogs.
  - `FaTabs` for segmented tab switchers.
  - `FaTable`, `FaPagination` for data grids.
  - `FaTag`, `FaBadge` for status badges.

- **Playwright Layout Assertion:** Playwright E2E tests MUST physically assert:
  - `/` (Home) renders `HomeLayout` without sidebar.
  - `/auth/login` renders `AuthLayout` with brand hero illustration.
  - `/dashboard` renders `AppLayout` with `.g-sub-sidebar` and `.g-main-area`.
  - `/editor/1/1` renders `StudioLayout` with `.g-header` and studio module tabs.

## MANDATORY AUTHENTICATION SUITE GATE (SIGNUP, LOGIN, FORGOT PASSWORD, JWT SESSION)
You MUST implement the full end-to-end authentication suite (FR-107 to FR-113) across both Express Backend (`server/routes/auth.ts`) and Vue 3 Frontend (`src/pages/auth/`):
1. **User Registration Page (`src/pages/auth/Signup.vue`):**
   - Full signup form with Email, Password, Confirm Password, Name, and Terms Checkbox.
   - Triggers `POST /v1/auth/signup`. Performs input validation and displays error alerts (`el-alert`).
2. **User Login Page & Modal (`src/pages/auth/Login.vue`):**
   - Login form with Email and Password inputs, Remember Me checkbox, and "Forgot Password?" link.
   - Triggers `POST /v1/auth/login`. On HTTP 200, stores JWT Bearer token in `authStore` (`localStorage`), updates `currentUser` session, and redirects to Dashboard (`/dashboard`).
3. **Password Reset Flow (`src/pages/auth/ForgotPassword.vue` & `ResetPassword.vue`):**
   - Forgot Password form triggering `POST /v1/auth/forgot-password` (sends reset email token link).
   - Reset Password form triggering `POST /v1/auth/reset-password` with new password validation.
4. **OAuth 2.0 SSO Buttons:**
   - Interactive "Sign in with Google" and "Sign in with GitHub" SSO buttons calling `/v1/auth/google` and `/v1/auth/github`.
5. **Playwright Auth E2E Test Assertion:**
   - Playwright test MUST physically fill out signup form ➔ submit login credentials ➔ receive JWT token HTTP 200 ➔ store session ➔ assert redirect to `/dashboard`. Capture screenshots for EACH auth step (`01_signup.png`, `02_login.png`, `03_forgot_password.png`).

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright interactive test script (`pnpm exec playwright test tests/e2e/sprint-1-journey.spec.ts`):
     - **Form Interactions:** Fill out signup form, submit login credentials, click "New Series" modal button.
     - **Full-Stack API Response Assertions:** Assert that clicking buttons triggers backend Express API calls (HTTP 200/201), mutates SQLite/MongoDB, and updates DOM elements.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH INTERACTION STEP (`01_landing.png` ➔ `02_login_modal.png` ➔ `03_dashboard_series_created.png`).
  3. Embed these step-by-step interactive workflow screenshots and Playwright assertion test logs into `sprint-1-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 1 as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-1-report.md` (and save a copy to `docs/reports/sprint-1-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** List of created/modified files, Vue components (`Home.vue`, `Login.vue`, `Dashboard.vue`), Express routes (`/series`, `/auth`, `/admin/flow-accounts`), and AI adapters (`GeminiClient.ts`, `AIProviderRouter.ts`, `FlowAdapter.ts`).
2. **Empirical Testing & Build Verification:**
   - Log output proof of `npx tsc --noEmit` (zero TypeScript errors).
   - Log output proof of Playwright Interactive E2E user journey tests (`sprint-1-journey.spec.ts`) & unit tests (`TC-001` ~ `TC-008`).
3. **UI/UX Visual Screenshots & Step-by-Step Workflow Audit Table:**
   - Embedded step-by-step captured Playwright browser PNG screenshots (`![Step 01](docs/reports/screenshots/01_landing.png)`, `![Step 02](docs/reports/screenshots/02_login.png)`, etc.) demonstrating actual functional user interactions.
   - Side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation** (Layout, Palette, Typography, Micro-animations, Responsiveness).
4. **Functional Requirements (FR) Compliance Matrix:**
   - Mapping table of assigned FR IDs (`FR-001` to `FR-008`, `FR-074`, `FR-075`, `FR-107` to `FR-113`, `FR-129`, `FR-130`), acceptance criteria status (Pass/Fail), and empirical proof link.
5. **Next Sprint Transition & Open Items Checklist.**
```

---

## �� Sprint 2 Master Execution Prompt: Multi-Agent Script & Persona Studio

```markdown
# SPRINT 2 TASK: Multi-Agent Script Pipeline, Persona Studio & Multi-Region Viral Trend Engine (FR-009 to FR-015, FR-074, FR-081)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 2)
- SRS Requirements: `docs/requirements-document.md` (FR-009 to FR-015, FR-074, FR-081)
- System Architecture: `docs/architecture-document.md` (Section 7, Section 11)
- UI Design System: `docs/design.md` & `packages/vue-element-plus`
- API Reference: `docs/api-document.md` (Section 3: AI Script & Scene Generation, `GET /ai/trends/viral-topics`)
- Test Plan: `docs/test-document.md` (TC-009 to TC-018, TC-WRD-001)
- Prompt Engineering Guide: `docs/ai-prompt-guide.md` (Section 1 to Section 6, Section 11)

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `apps/shine/client` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `server/` (Node.js Express API + Multi-Agent Pipeline)

## Scope of Work
1. **Genre Onboarding Wizard & Multi-Region Viral Trend Engine (`src/components/wizard/`, FR-074):**
   - 3-step genre selection (Suspense, Romance, Action, Satire) & tone config mapping.
   - Implement `GET /ai/trends/viral-topics?region=...` using Parallel MCP real-time scan filtered by country/region (`US`, `SEA_VN`, `CN`, `LATAM`, `JP_KR`, `EU`).
2. **Multi-Agent Script Pipeline:**
   - Implement Director Agent, Story Skeleton, Adaptation Strategy, Script Agent, Supervision Agent.
   - Endpoint: `POST /ai/generate-script`. Output structured JSON per-episode scenes.
3. **Persona Studio & Wardrobe Registry (Proposal 1):**
   - Endpoint: `POST /characters/:characterId/wardrobe`. Inject reference images in Veo calls while maintaining 98.4% face mesh match.

## MANDATORY FULL-STACK FRONTEND-BACKEND INTEGRATION PROTOCOL
To guarantee that the Vue 3 Frontend and Node.js Express Backend are 100% integrated and working together seamlessly:
1. **Shared TypeScript API Contracts (`src/types/api.ts`):** Both Frontend and Backend consume identical TypeScript interfaces. Run `npx tsc --noEmit`.
2. **Real Full-Stack Execution Environment (No Mocking):** Run backend API server (`PORT=3001`) and Vite dev server (`PORT=3000`) simultaneously using `npm run dev`.
3. **End-to-End Full-Stack Verification Assertion:** Playwright tests click UI elements, verify backend Express HTTP 200/201 responses, check DB mutations, and confirm DOM updates.

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright interactive test script (`pnpm exec playwright test tests/e2e/sprint-2-journey.spec.ts`):
     - **Interactive Wizard Steps:** Click Genre (Suspense) ➔ Click Tone ➔ Trigger "Generate Script" CTA and assert JSON scenes render.
     - **Persona Studio Interactions:** Upload character face, extract 8 anchors, lock outfit material, and assert 98.4% mesh match badge.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH INTERACTION STEP (`01_wizard_step1.png` ➔ `02_wizard_step2.png` ➔ `03_script_generated.png` ➔ `04_persona_anchors.png`).
  3. Embed step-by-step interactive workflow screenshots into `sprint-2-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 2 as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-2-report.md` (and save a copy to `docs/reports/sprint-2-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** List of created/modified files, Genre Onboarding Wizard components, Multi-Agent Script Pipeline agents, and Persona Studio 8-anchor face mesh extraction scripts.
2. **Empirical Testing & Build Verification:**
   - Log output proof of `pnpm build` (zero build errors).
   - Log output proof of Playwright Interactive E2E tests (`sprint-2-journey.spec.ts`) & unit tests (`TC-009` ~ `TC-018`, `TC-WRD-001`).
3. **UI/UX Visual Screenshots & Step-by-Step Workflow Audit Table:**
   - Embedded step-by-step captured Playwright browser PNG screenshots (`![Step 01](docs/reports/screenshots/01_wizard.png)`, etc.) demonstrating actual functional user interactions.
   - Side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation**.
4. **Functional Requirements (FR) Compliance Matrix:**
   - Mapping table of assigned FR IDs (`FR-009` to `FR-015`, `FR-074`, `FR-081`), acceptance criteria status (Pass/Fail), and empirical proof link.
5. **Next Sprint Transition & Open Items Checklist.**
```

---

## �� Sprint 3 Master Execution Prompt: Timeline NLE Editor & Dual Rendering

```markdown
# SPRINT 3 TASK: OpenVideo Timeline Editor, Dual Rendering & AntV G6 Graph Suite (FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 3)
- SRS Requirements: `docs/requirements-document.md` (FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114)
- System Architecture: `docs/architecture-document.md` (Section 8, Section 12, Section 13.1, Section 14.1)
- UI Design System: `docs/design.md` & `packages/vue-element-plus`
- API Reference: `docs/api-document.md` (Section 4, Section 5, Section 6)
- Test Plan: `docs/test-document.md` (TC-RND-001 to TC-RND-003, TC-CMD-001, TC-PAR-001)

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `apps/shine/client` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `apps/shine/server/` (Node.js Express API + Dual-Rendering Compositor Worker)

## Scope of Work
1. **Timeline Editor UI (`src/pages/workspace/EditPage.vue`):**
   - Multi-track timeline (VIDEO 1, AUDIO 1, SUBS) using `@openvideo/timeline` and `splitpanes` resizable panels.
   - 9:16 vertical preview canvas powered by `@openvideo/engine-pixi` / WebGL.
2. **AntV G6 Multi-Module Graph Suite (`@antv/g6`, FR-114):**
   - Integrate `@antv/g6` graph visualization across 5 workspace modules: Interactive Branching Narrative DAG Trees, Character Relationship & Social Lineage Graphs, Multi-Agent Workflow Execution Monitors, Spatial Audio 3D Soundstage Matrix, and Asset Dependency Lineage Graphs.
3. **OpenVideo Command Engine (`src/stores/timelineStore.ts`):**
   - Implement `core.execute(cmd)` for `clip.add`, `clip.update`, `clip.remove`, `clip.split`. Track inverse patches for 1-click Undo/Redo.
4. **Serialization & Zero-Render Preview:**
   - Implement `studio.exportToJSON()` and `studio.loadFromJSON()`.
5. **Cloud Compositor Worker:**
   - Node.js server worker executing `@openvideo/core` `Compositor.output()` from serialized JSON payloads.
6. **Dual-Rendering Parity Audit Engine (Proposal 6):**
   - Implement SSIM pixel-diff test runner (`POST /export/parity-check`).
To guarantee that the Vue 3 Frontend and Node.js Express Backend are 100% integrated and working together seamlessly:
1. **Shared TypeScript API Contracts (`src/types/api.ts`):** Both Frontend and Backend consume identical TypeScript interfaces. Run `npx tsc --noEmit`.
2. **Real Full-Stack Execution Environment (No Mocking):** Run backend API server (`PORT=3001`) and Vite dev server (`PORT=3000`) simultaneously using `npm run dev`.
3. **End-to-End Full-Stack Verification Assertion:** Playwright tests click UI elements, verify backend Express HTTP 200/201 responses, check DB mutations, and confirm DOM updates.

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright interactive test script (`pnpm exec playwright test tests/e2e/sprint-3-journey.spec.ts`):
     - **Timeline NLE Interactions:** Drag clip bounds to trim, click split clip, toggle track mute, scrub playhead across WebGL 9:16 canvas.
     - **AntV G6 Graph Interactions:** Click AntV G6 node to trigger story branch execution and open relationship graph.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH INTERACTION STEP (`01_timeline_loaded.png` ➔ `02_clip_split.png` ➔ `03_antv_g6_graph_open.png`).
  3. Embed step-by-step interactive workflow screenshots into `sprint-3-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 3 as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-3-report.md` (and save a copy to `docs/reports/sprint-3-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** List of created/modified files, OpenVideo Timeline Editor components, AntV G6 5-module graph integration, and Dual Rendering Cloud Compositor scripts.
2. **Empirical Testing & Build Verification:**
   - Log output proof of Playwright Interactive E2E tests (`sprint-3-journey.spec.ts`) & unit tests (`TC-RND-001`, `TC-CMD-001`, `TC-PAR-001` SSIM parity > 0.999).
3. **UI/UX Visual Screenshots & Step-by-Step Workflow Audit Table:**
   - Embedded step-by-step captured Playwright browser PNG screenshots (`![Step 01](docs/reports/screenshots/01_timeline.png)`, etc.) demonstrating actual functional user interactions.
   - Side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation**.
4. **Functional Requirements (FR) Compliance Matrix:**
   - Mapping table of assigned FR IDs (`FR-016` to `FR-021`, `FR-079`, `FR-080`, `FR-084`, `FR-088`, `FR-114`), acceptance criteria status (Pass/Fail), and empirical proof link.
5. **Next Sprint Transition & Open Items Checklist.**
```

---

## �� Sprint 4 Master Execution Prompt: AI Creative Studio (Voice, Captions, Cliffhanger & Dubbing)

```markdown
# SPRINT 4 TASK: AI Creative Studio (FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 4)
- SRS Requirements: `docs/requirements-document.md` (FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098)
- System Architecture: `docs/architecture-document.md` (Section 4, Section 5, Section 11, Section 15.1, Section 15.2)
- UI Design System: `docs/design.md` & `packages/vue-element-plus`
- API Reference: `docs/api-document.md` (Voice, Captions, Spatial Audio, Cliffhanger endpoints)
- Test Plan: `docs/test-document.md` (TC-CLF-001, TC-DUB-001, TC-KAP-001, TC-SPT-001)
- Prompt Engineering Guide: `docs/ai-prompt-guide.md` (Section 10, Section 12)

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `apps/shine/client` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `apps/shine/server/` (Node.js Express API + Voice/Caption Services)

## Scope of Work
1. **Voice & Dubbing Engine:** Neural TTS (30 voices), emotion tags, intensity control, lip-sync frame alignment.
2. **Multi-Market Dubbing Timeline Re-alignment (Proposal 4):**
   - Endpoint: `POST /voices/dubbing/re-align`. Calculate audio duration delta ($\Delta t_{\mu s}$) and re-align `VIDEO 1` clip bounds and OpenVideo `Caption` timing.
3. **Dynamic Kinetic Subtitle Engine (Proposal 13, FR-097):**
   - Endpoint: `POST /captions/kinetic-style`. Word-level karaoke pop-up text, bass-synced font bounce, and auto-generated sentiment emojis (`��`, `��`, `��`).
4. **Spatial Audio 3D Soundstage & Voice Coach (Proposal 14, FR-098):**
   - Endpoint: `POST /audio/spatial-mix`. 3D spatial audio panning matched to video camera motion and emotion-tuned TTS reverb.
5. **Dynamic Cliffhanger Hook Engine (Proposal 3):**
   - Endpoint: `POST /ai/cliffhanger/generate`. OpenVideo GLSL shader transitions (`glitch`, `flash`), keyframe zoom (`zoomIn`), 3s audio stinger WAV injection, CTA caption overlay.

## MANDATORY FULL-STACK FRONTEND-BACKEND INTEGRATION PROTOCOL
To guarantee that the Vue 3 Frontend and Node.js Express Backend are 100% integrated and working together seamlessly:
1. **Shared TypeScript API Contracts (`src/types/api.ts`):** Both Frontend and Backend consume identical TypeScript interfaces. Run `npx tsc --noEmit`.
2. **Real Full-Stack Execution Environment (No Mocking):** Run backend API server (`PORT=3001`) and Vite dev server (`PORT=3000`) simultaneously using `npm run dev`.
3. **End-to-End Full-Stack Verification Assertion:** Playwright tests click UI elements, verify backend Express HTTP 200/201 responses, check DB mutations, and confirm DOM updates.

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright interactive test script (`pnpm exec playwright test tests/e2e/sprint-4-journey.spec.ts`):
     - **Voice & Subtitle Interactions:** Click character voice preset, trigger TTS audio preview, change karaoke subtitle style, dynamic cliffhanger transition preview.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH INTERACTION STEP (`01_voice_selected.png` ➔ `02_subtitle_styled.png` ➔ `03_cliffhanger_applied.png`).
  3. Embed step-by-step interactive workflow screenshots into `sprint-4-report.md`.
```kflow screenshots into `sprint-4-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 4 as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-4-report.md` (and save a copy to `docs/reports/sprint-4-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** List of created/modified files, Voice & Dubbing components, Dynamic Kinetic Subtitle engine, Spatial Audio 3D soundstage, and Cliffhanger generator.
2. **Empirical Testing & Build Verification:**
   - Log output proof of test suites for `TC-CLF-001`, `TC-DUB-001`, `TC-KAP-001`, and `TC-SPT-001`.
3. **UI/UX Visual Screenshots & Design Audit Table:**
   - Embedded real captured browser PNG screenshots (`![Page Name](docs/reports/screenshots/page.png)`) of Neural TTS voice performance engine, Karaoke subtitle presets, Spatial Audio 3D mixer, and Cliffhanger CTA overlays.
   - Side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation**.
4. **Functional Requirements (FR) Compliance Matrix:**
   - Mapping table of assigned FR IDs (`FR-022` to `FR-025`, `FR-082`, `FR-083`, `FR-097`, `FR-098`), acceptance criteria status (Pass/Fail), and empirical proof link.
5. **Next Sprint Transition & Open Items Checklist.**
```

---

## �� Sprint 5 Master Execution Prompt: WebSocket Collaboration, AI Chatbot & Code Guardrails

```markdown
# SPRINT 5 TASK: Real-time WebSocket Collaboration, AI Chatbot & Guardrails (FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 5)
- SRS Requirements: `docs/requirements-document.md` (FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100)
- System Architecture: `docs/architecture-document.md` (Section 8, Section 9.1, Section 10, Section 13.2, Section 15.4)
- API Reference: `docs/api-document.md` (WebSocket events, `POST /ai/assistant/command-edit`, `GET /ai/assistant/memory/search`, `POST /ai/copilot/analyze`)
- Test Plan: `docs/test-document.md` (TC-PAT-001, TC-AIC-001, TC-AIC-002, TC-AIC-004, TC-AIC-005, TC-COP-001, TC-CST-001, TC-GRD-001)
- Chatbot Interaction Architecture: `docs/ai-chatbot-workspace-interaction.md`
- Chatbot Memory Architecture: `docs/ai-chatbot-memory-architecture.md`
- UI Design System: `docs/design.md` & `packages/vue-element-plus`

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `apps/shine/client/` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `apps/shine/server/` (Node.js Express API + WebSocket Collaboration)

## Scope of Work
1. **OpenVideo WebSocket Atomic Patch Sync:**
   - Real-time delta patch broadcasting (`patch:broadcast`, `patch:receive`) over WebSockets.
2. **Real-Time AI Director Assistant Chatbot (FR-086, FR-094, FR-095, FR-096):**
   - Endpoint: `POST /ai/assistant/command-edit`. Translates natural language chat prompts into OpenVideo `Command[]` JSON arrays executed via `core.executeMany()` across all workspace modules (Timeline, Script, Personas, Captions, Transitions, Render, Publish).
   - Implement 4-Tier Memory Engine (Sliding Window Session Memory, Vertex AI Vector Search RAG `text-embedding-004`, Series Knowledge Graph, and Context Token Compressor) via `GET /ai/assistant/memory/search`.
   - Implement Multimodal Inputs (Image drag-and-drop, Video samples, PDF/DOCX manuscripts, Microphone Voice Stream via `connectLive()`) & Context-Aware Dynamic Suggestion Chips.
   - Implement End-to-End Chat-Driven Creative Pipeline & 6 Advanced Intelligence Capabilities.
3. **Live Director Co-Pilot Mode (Proposal 16, FR-100):**
   - Endpoint: `POST /ai/copilot/analyze`. Renders non-blocking floating alert bubbles directly on the preview canvas pointing out live pacing delays, volume spikes, or visual framing issues.
4. **AI Resource & Cost Guardrails (Proposal 7):**
   - Endpoints: `GET/PUT /admin/cost-guardrails`. Enforce max compute budget ceiling ($3.50 cap) & low-res proxy preview mode.
5. **Automated Agent Pre-Commit Guard (Proposal 5):**
   - Setup Husky hooks + `eslint-plugin-agent-guard` blocking unverified stubs (`TODO`, `return null`).
To guarantee that the Vue 3 Frontend and Node.js Express Backend are 100% integrated and working together seamlessly:
1. **Shared TypeScript API Contracts (`src/types/api.ts`):** Both Frontend and Backend consume identical TypeScript interfaces. Run `npx tsc --noEmit`.
2. **Real Full-Stack Execution Environment (No Mocking):** Run backend API server (`PORT=3001`) and Vite dev server (`PORT=3000`) simultaneously using `npm run dev`.
3. **End-to-End Full-Stack Verification Assertion:** Playwright tests click UI elements, verify backend Express HTTP 200/201 responses, check DB mutations, and confirm DOM updates.

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright interactive test script (`pnpm exec playwright test tests/e2e/sprint-5-journey.spec.ts`):
     - **Chatbot & Collaboration Interactions:** Send natural language prompt to AI Director Chatbot, verify command execution (`Command[]`), test floating Co-Pilot alert bubbles, and test WebSocket atomic patch sync.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH INTERACTION STEP (`01_chatbot_prompt.png` ➔ `02_command_executed.png` ➔ `03_copilot_bubble.png`).
  3. Embed step-by-step interactive workflow screenshots into `sprint-5-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 5 as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-5-report.md` (and save a copy to `docs/reports/sprint-5-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** List of created/modified files, WebSocket atomic patch sync handlers, Real-Time AI Director Assistant Chatbot & 4-tier memory bank, Live Co-Pilot mode, and Cost guardrails.
2. **Empirical Testing & Build Verification:**
   - Log output proof of Playwright Interactive E2E tests (`sprint-5-journey.spec.ts`) & unit tests (`TC-PAT-001`, `TC-AIC-001`, `TC-AIC-002`, `TC-AIC-004`, `TC-AIC-005`, `TC-COP-001`, `TC-CST-001`, `TC-GRD-001`).
3. **UI/UX Visual Screenshots & Step-by-Step Workflow Audit Table:**
   - Embedded step-by-step captured Playwright browser PNG screenshots (`![Step 01](docs/reports/screenshots/01_chatbot.png)`, etc.) demonstrating actual functional user interactions.
   - Side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation**.
4. **Functional Requirements (FR) Compliance Matrix:**
   - Mapping table of assigned FR IDs (`FR-085`, `FR-086`, `FR-087`, `FR-089`, `FR-094` to `FR-096`, `FR-100`), acceptance criteria status (Pass/Fail), and empirical proof link.
5. **Next Sprint Transition & Open Items Checklist.**
```

---

## �� Sprint 6 Master Execution Prompt: Growth Innovations, Publishing & Launch

```markdown
# SPRINT 6 TASK: Multi-Platform Publishing, Strategic Growth Innovations, Technical Infrastructure & Launch (FR-026 to FR-030, FR-090 to FR-093, FR-099, FR-101 to FR-128)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 6)
- SRS Requirements: `docs/requirements-document.md` (FR-026 to FR-030, FR-090 to FR-093, FR-099, FR-101 to FR-128)
- System Architecture: `docs/architecture-document.md` (Section 13.3, Section 13.4, Section 14, Section 15.3, Section 16, Section 17, Section 18, Section 19, Section 20)
- UI Design System: `docs/design.md` & `packages/vue-element-plus`
- API Reference: `docs/api-document.md` (`POST /publish/multi-platform`, `POST /export/c2pa-watermark`, `POST /voices/steer-emotion`, `POST /export/platform-recut`, `GET /marketplace/templates`, `GET /api/v1/render/stream`, `POST /audio/copyright-verify`, `POST /billing/revenue-splits`, `POST /ai/convert-novel`, `POST /live/polling`, `GET /marketplace/actors`, `POST /ai/cultural-adapt`, `GET /analytics/paywall-recommendation`)
- Test Plan: `docs/test-document.md` (TC-BRN-001, TC-PPL-001, TC-OFF-001, TC-ABV-001, TC-CVR-001)
- UI/UX Proposals: `docs/ui-ux-design-proposals.md`
- Commercial Strategy: `docs/product-market-strategy.md` (Proposals 17 to 30)

## Decoupled Workspace Structure
- **Frontend SPA Workspace:** `apps/shine/client/` (Vue 3 + Vite + `packages/vue-element-plus` UI library)
- **Backend API Server Workspace:** `apps/shine/server/` (Node.js Express API + Multi-Platform Publishing)

## Scope of Work
1. **Export & Smart Publishing:** Multi-platform direct API publishing (TikTok, YouTube Shorts, Instagram Reels, Facebook Reels, Douyin via `POST /publish/multi-platform`), AI cover generator, viral hashtags.
2. **Growth Innovations, Compliance & Ecosystem (Proposals 17–30, FR-115 to FR-128):**
   - 1-Click Web Novel-to-Series Converter (`POST /ai/convert-novel`).
   - Interactive Live-Stream Drama Engine (`POST /live/polling`).
   - AI Virtual Actor Royalty Marketplace (`GET /marketplace/actors`).
   - Cultural Geo-Localization Engine (`POST /ai/cultural-adapt`).
   - Predictive Paywall Placement Doctor (`GET /analytics/paywall-recommendation`).
   - Cloud Pub/Sub Async Render Progress Stream over SSE/WebSockets (`GET /api/v1/render/stream`).
   - AI Copyright Audio Fingerprinting Scan (`POST /audio/copyright-verify`).
   - Virtual Canvas Viewport & Lazy Asset Memory Manager (5-clip WebGL windowing).
   - Touch-Optimized Tablet & Foldable Gesture Studio.
   - Smart Rights & Automated Revenue Sharing (`/billing/revenue-splits`).
   - C2PA Cryptographic Provenance & Google SynthID Invisible Watermarking (`POST /export/c2pa-watermark`).
   - Intra-Scene Vocal Affect Steering (`POST /voices/steer-emotion`).
   - AI Multi-Platform Recutter (`POST /export/platform-recut`).
   - Shine Creator Template Marketplace (`/marketplace/templates`).
3. **Subscription Tiers & Stripe Billing (FR-101, FR-102):** Stripe Checkout Integration, Feature Gating Middleware (`checkTierLimit.ts`), AI credit metering, and Free tier watermark compositing.
4. **Admin & Operations Back-Office Portal (FR-103 to FR-106):** User directory management (`/admin/users`), FinOps Cloud Run render cluster dashboard (`/admin/render-cluster`), Customer Supporter Session Impersonation (`/admin/impersonate`), and OpenTelemetry Grafana Observability (`/admin/observability`).
5. **AI Viral Cover Poster & A/B Hook Generator (Proposal 15, FR-099):** Scans video frames for face aesthetic scores, generates 3 viral cover variants with hook title overlays for social A/B testing.
6. **Viral A/B Hook & Multi-Ending Generator (Proposal 8):** Generate 3 ending variants, track 24h retention, auto-select winning arc.
7. **AI In-Video Product Placement (Proposal 10):** Composite 3D sponsored products onto visual layers using OpenVideo Chroma/Layering.
8. **Interactive Branching Drama Engine (Proposal 9):** Overlay choice buttons & render interactive AntV G6 (`@antv/g6`) story DAG tree graph.
9. **Offline-First Hybrid Sync Engine (Proposal 12):** IndexedDB patch caching & auto-reconnection bulk sync.

## MANDATORY FULL-STACK FRONTEND-BACKEND INTEGRATION PROTOCOL
To guarantee that the Vue 3 Frontend and Node.js Express Backend are 100% integrated and working together seamlessly:
1. **Shared TypeScript API Contracts (`src/types/api.ts`):** Both Frontend and Backend consume identical TypeScript interfaces. Run `npx tsc --noEmit`.
2. **Real Full-Stack Execution Environment (No Mocking):** Run backend API server (`PORT=3001`) and Vite dev server (`PORT=3000`) simultaneously using `npm run dev`.
3. **End-to-End Full-Stack Verification Assertion:** Playwright tests click UI elements, verify backend Express HTTP 200/201 responses, check DB mutations, and confirm DOM updates.

## MANDATORY VISUAL CSS STYLING INTEGRITY GATE (STRICT PROHIBITION OF UNSTYLED HTML!)
Look at your captured browser screenshot carefully before declaring success:
- **UNSTYLED HTML IS AN AUTOMATIC FAILURE (FAIL/BLOCKED)!** If the captured screenshot shows plain white background, default Times New Roman font, unstyled HTML inputs, or broken layouts, YOU HAVE FAILED AND MUST FIX THE CSS STYLING BEFORE MARKING FINISH!
- **CSS Import Verification:** You MUST ensure `src/style.css` or design system CSS tokens (Tailwind / UnoCSS / custom CSS) are imported in `main.ts` and Vite compiles CSS properly.
- **Playwright Computed Style Assertion:**
  - Playwright test MUST assert that body computed background color is NOT default browser white/transparent (`#ffffff` without theme tokens or `rgba(0, 0, 0, 0)`).
  - Playwright test MUST assert that font-family is a modern typography (Inter / Outfit / Roboto) and NOT default browser `Times New Roman`.
  - If any captured screenshot shows unstyled HTML, YOU MUST IMMEDIATELY FIX THE CSS IMPORTS AND DESIGN TOKENS BEFORE PASSING!

## CRITICAL RULE FOR REAL E2E UI FUNCTIONAL TESTING (DO NOT JUST TAKE STATIC SCREENSHOTS!)
- **NEVER use `generate_image` to create AI mockups!**
- **STATIC SCREENSHOTS ALONE ARE NOT ENOUGH! YOU MUST EXECUTE REAL INTERACTIVE PLAYWRIGHT E2E TESTS:**
  1. Start dev server: `npm run dev` (`http://localhost:3000`).
  2. Write & run Playwright full E2E user journey script (`pnpm exec playwright test tests/e2e/sprint-6-full-launch.spec.ts`):
     - **Complete End-to-End Workflow:** Novel Upload ➔ 50-Episode Script Gen ➔ Persona Anchors ➔ Timeline Edit ➔ Multi-Platform Publishing ➔ Paywall Doctor Analytics.
     - **Step-by-Step Workflow Screenshots:** Capture screenshots AT EACH CRITICAL USER STEP (`01_novel_upload.png` ➔ `02_script_generated.png` ➔ `03_publishing_success.png`).
  3. Embed step-by-step interactive workflow screenshots into `sprint-6-report.md`.

## Verification & Definition of Done (DoD) - MANDATORY REPORT DELIVERABLE
Before marking Sprint 6 (Final Launch) as completed, YOU MUST CREATE AND SAVE A SPRINT COMPLETION REPORT ARTIFACT at path:
`<appDataDir>\brain\<conversation-id>/sprint-6-report.md` (and save a copy to `docs/reports/sprint-6-report.md`).

The report MUST include the following 5 sections:
1. **Summary of Accomplished Work:** Full list of all features, 31 Proposals, and 130 FRs delivered across the entire platform.
2. **Empirical Testing & Build Verification:**
   - Log output proof of complete E2E Test Suite (`pnpm test`, `TC-BRN-001`, `TC-PPL-001`, `TC-OFF-001`, `TC-ABV-001`, 100% PASS).
3. **UI/UX Visual Screenshots & Comprehensive Design Audit:**
   - Embedded step-by-step captured Playwright browser PNG screenshots (`![Step 01](docs/reports/screenshots/01_novel.png)`, etc.) demonstrating actual functional user interactions.
   - Comprehensive side-by-side comparison table: **UI/UX Design Specification vs Actual Implementation**.
4. **Functional Requirements (FR) Full Compliance Matrix (FR-001 to FR-130):**
   - Final audit matrix verifying all 130 FRs are 100% Pass.
5. **Production Release Sign-off & Deployment Checklist.**
```
