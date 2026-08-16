# TASK: RE-IMPLEMENT SPRINT 1 — Foundation, Infrastructure, 3 Layout Shells, Auth Suite & i18n
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-1.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, layouts, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

You MUST read the following documents in order using `view_file` BEFORE starting:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-1.md`. This is the detailed execution plan with a specific list of files to create/modify. Do NOT work outside this scope.

2. **UI Design System (STRICT COMPLIANCE REQUIRED):**
   Read `docs/design.md` — all color, component, and style rules.

3. **UI Component Catalog (READ BEFORE USING ANY COMPONENT):**
   

4. **Architecture (CLIENT/SERVER DIRECTORY STRUCTURE):**
   Read `docs/architecture-document.md` — standard directory structure for `apps/shine/client/` and `apps/shine/server/`.

5. **API Reference (ENDPOINTS TO IMPLEMENT):**
   Read `docs/api-document.md` — Auth endpoints and Series endpoints sections.

6. **Safe Editing Protocol:**
   Read `docs/safe-code-editing-guidelines.md`.

7. **View the UI design mockups BEFORE coding any page:**
   - `/` (Home) → `view_file` `docs/stitch_shine_app_design/project_hub_dashboard_light_mode/screen.png`
   - `/auth/login` → `view_file` `docs/stitch_shine_app_design/login_shine_ai_studio/screen.png`
   - `/dashboard` → `view_file` `docs/stitch_shine_app_design/project_hub_dashboard_light_mode/screen.png`

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

Run the following audit commands and report the results before making any changes:

```bash
# Check current directory structure
ls apps/shine/client/src/views/
ls apps/shine/client/src/layouts/
ls apps/shine/client/src/stores/
ls apps/shine/client/src/locales/
ls apps/shine/client/src/utils/

# Check if vue-i18n and axios are already installed
cat apps/shine/client/package.json | grep -E "vue-i18n|axios|vue-router|pinia"

# Inspect existing router
cat apps/shine/client/src/router/index.ts
```

## STEP 2: MANDATORY ENFORCEMENT GATES — VIOLATING ANY GATE = AUTOMATIC FAILURE

### 🚫 GATE 0: MANDATORY GOOGLE STITCH MCP HTML CODE FETCH & ALIGNMENT
- **DO NOT GUESS OR INVENT LAYOUTS/TEXT:** Agent MUST NOT write generic dark templates or invent custom text.
- **MANDATORY FETCH WORKFLOW FOR EVERY PAGE:**
  1. Find the screen folder in `docs/stitch_shine_app_design/<screen_folder_name>`.
  2. Open and read the `code.html` template or `screen.png` image directly from that folder.
  3. Translate the local Stitch HTML layout, sections, headings, cards, text content, and color palette (`#006c45`, `#3ecf8e`, light/dark themes) 100% into the Vue `.vue` page using Element Plus (`element-plus`) components.


### 🚫 GATE 1: STRICT PROHIBITION OF GRADIENTS & NEON GLOWS
- ABSOLUTELY DO NOT write `background: linear-gradient(...)`, `purple-600`, `violet-500`, `box-shadow: 0 0 20px purple`, or any flashy styling.
- Page backgrounds MUST use: `--background: oklch(0.145 0 0)` (`#121218`)
- Card surfaces MUST use: `--card: oklch(0.205 0 0)` (`#1a1b23`)
- Borders MUST use: `--border: oklch(0.252 0 0)` (`#2d2e3a`)
- **Self-check:** After writing, run `grep` to ensure no `linear-gradient`, `purple`, `violet`, `neon`, or `glow` exists in your output files.

### 🚫 GATE 2: MANDATORY ELEMENT PLUS COMPONENTS (`element-plus`)
- ALL views and pages MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
- Custom `Fa-Admin` components (`@/components/basic`) are deprecated. Switch completely to Element Plus for consistent design, UI layout, and colors.


### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
- Client Vite MUST run on `http://localhost:3000` (`strictPort: true` is already set in `vite.config.ts`).
- Server Express MUST run on `http://localhost:3001`.
- STRICTLY PROHIBITED to test or take screenshots on port `5173` or any other port.

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
- ABSOLUTELY DO NOT write `fetch('/api/...')` directly inside any `.vue` file or component.
- All API calls MUST go through:
  1. A Pinia store action (e.g., `authStore.login(credentials)`, `seriesStore.createSeries(data)`)
  2. The centralized Axios client at `src/utils/http.ts`

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS & AUTOMATED CHECK
- ABSOLUTELY DO NOT hardcode English strings in HTML templates: NOT `<h1>Welcome</h1>`, it MUST be `<h1>{{ $t('auth.welcomeTitle') }}</h1>`.
- ABSOLUTELY DO NOT hardcode strings in Pinia stores or TypeScript: NOT `toast.success("Login successful")`, it MUST be `toast.success(i18n.global.t('toast.loginSuccess'))`.
- Every key MUST be added to ALL 6 locale JSON files: `en.json`, `vi.json`, `zh.json`, `jp.json`, `es.json`, `fr.json`.
- **MANDATORY AUTOMATED LINTER:** You MUST run `pnpm run check-i18n` in `apps/shine/client`. If it reports any hardcoded toast strings or missing keys, YOU MUST FIX THEM ALL BEFORE SUBMITTING.


---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-1.md`)

Implement EXACTLY the following list — no additions, no omissions.

### 3.1 Install packages (if not already installed)
```bash
cd apps/shine/client
pnpm add vue-i18n axios
```

### 3.2 Files to CREATE (in order)
1. `apps/shine/client/src/utils/http.ts` — Centralized Axios client with JWT interceptor + 401 redirect
2. `apps/shine/client/src/i18n.ts` — vue-i18n instance configured with 6 locales
3. `apps/shine/client/src/locales/en.json` — English translations
4. `apps/shine/client/src/locales/vi.json` — Vietnamese translations
5. `apps/shine/client/src/locales/zh.json` — Chinese Simplified translations
6. `apps/shine/client/src/locales/jp.json` — Japanese translations
7. `apps/shine/client/src/locales/es.json` — Spanish translations
8. `apps/shine/client/src/locales/fr.json` — French translations
9. `apps/shine/client/src/layouts/DefaultLayout.vue` — Simple static pages layout (Clean footer, <router-view />, no sidebar)
10. `apps/shine/client/src/layouts/HomeLayout.vue` — Marketing landing page layout (Logo, Nav Links, LanguageSelect, Sign In, Get Started, clean footer)
11. `apps/shine/client/src/layouts/AuthLayout.vue` — Auth layout (Left: Shine hero illustration, Right: centered form card)
12. `apps/shine/client/src/layouts/AppLayout.vue` — Main workspace management layout (.g-sub-sidebar collapsible menu + footer User Profile Menu + .g-main-area)
13. `apps/shine/client/src/layouts/StudioLayout.vue` — Production studio layout (.g-header with back button and studio module tabs + .g-main-area)
14. `apps/shine/client/src/components/shared/LanguageSelect.vue` — i18n language switcher dropdown
15. `apps/shine/client/src/pages/Home.vue` — Marketing landing page (use FaButton, FaCard, FaTag)
16. `apps/shine/client/src/pages/Manual.vue` — User manual with FaTabs for sections
17. `apps/shine/client/src/pages/Terms.vue` — Terms of Service page
18. `apps/shine/client/src/pages/Privacy.vue` — Privacy Policy page
19. `apps/shine/client/src/pages/Contact.vue` — Contact form (FaForm, FaInput, FaTextarea, FaButton)
20. `apps/shine/client/src/pages/auth/Login.vue` — Login page (FaTabs + FaInput + Remember Me + SSO buttons)
21. `apps/shine/client/src/pages/auth/Signup.vue` — Signup form
22. `apps/shine/client/src/pages/auth/ForgotPassword.vue` — Forgot password form
23. `apps/shine/client/src/pages/auth/ResetPassword.vue` — Reset password form with token from URL
24. `apps/shine/client/src/pages/dashboard/index.vue` — Dashboard with Series list (FaCard, FaTable, FaModal wizard)
25. `apps/shine/client/src/stores/useSeriesStore.ts` — Pinia store for Series CRUD via Axios
26. `tests/e2e/sprint-1-journey.spec.ts` — Playwright interactive E2E test

### 3.3 Files to MODIFY
1. `apps/shine/client/src/main.ts` — Add `app.use(i18n)`, add `.dark` class to `document.documentElement`, import OKLCH CSS variables
2. `apps/shine/client/src/stores/useAuthStore.ts` — Replace raw `fetch()` with Pinia store actions via Axios
3. `apps/shine/client/src/router/index.ts` — Restructure with 5 layout shells and auth route guards
4. `apps/shine/server/src/routes/auth.ts` — Verify all responses use `{ code, data, message, error }` format
5. `apps/shine/server/src/routes/series.ts` — Verify all responses use standardized envelope format

---

## STEP 4: COMPONENT DESIGN RULES

### AuthLayout.vue — IMPLEMENT EXACTLY MATCHING `docs/stitch_shine_app_design/login_shine_ai_studio/screen.png`
```
2-column layout:
- LEFT COLUMN (40%): Brand illustration / 3D character graphic
- RIGHT COLUMN (60%): Centered FaCard containing:
    - FaTabs with 2 tabs: "Account & Password" | "SSO"
    - Tab 1: FaInput (email) + FaInput (password) + FaCheckbox ("Remember me")
             + Link "Forgot password?" + FaButton "Login"
             + Quick Demo buttons (admin / test)
    - Tab 2: FaButton "Sign in with Google" + FaButton "Sign in with GitHub"
```

### AppLayout.vue — MAIN WORKSPACE MANAGEMENT LAYOUT (`docs/stitch_shine_app_design/project_hub_dashboard_light_mode/screen.png`)
```
- .g-sub-sidebar: Collapsible menu (Series Dashboard, My Projects, Team Shared, Assets Library, Analytics). Top header menu is logo icon; bottom footer is User Profile Menu (Profile, Settings, LanguageSelect, Dark/Light toggle, logout) and collapse toggle button at the bottom
- .g-main-area: Content area with <router-view />
```

### StudioLayout.vue — DEDICATED PRODUCTION STUDIO LAYOUT
```
- .g-header: Logo with back to dashboard/my project/team shared button and tabs (Script, Editor, Characters, Library, Voice & Dubbing, Captions, Analytics, Export & Publish)
- .g-main-area: Content area with <router-view />
```

### Router Structure (`src/router/index.ts`)
```
/ → HomeLayout → Home.vue
/manual → DefaultLayout → Manual.vue
/terms → DefaultLayout → Terms.vue
/privacy → DefaultLayout → Privacy.vue
/contact → DefaultLayout → Contact.vue
/auth/login → AuthLayout → auth/Login.vue
/auth/signup → AuthLayout → auth/Signup.vue
/auth/forgot-password → AuthLayout → auth/ForgotPassword.vue
/auth/reset-password → AuthLayout → auth/ResetPassword.vue
/dashboard → AppLayout (requiresAuth) → dashboard/index.vue
/projects → AppLayout (requiresAuth) → ProjectsView.vue
/team → AppLayout (requiresAuth) → TeamSharedView.vue
/assets → AppLayout (requiresAuth) → AssetsLibraryView.vue
/analytics → AppLayout (requiresAuth) → AnalyticsView.vue
/wizard → StudioLayout (requiresAuth) → GenreWizard.vue
/script/* → StudioLayout (requiresAuth) → ScriptStudio.vue
/editor/* → StudioLayout (requiresAuth) → EditPage.vue
/persona/* → StudioLayout (requiresAuth) → PersonaStudio.vue
```


---

## STEP 5: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

You CANNOT declare this task complete based solely on code edits. You MUST run and attach the real output of:

```bash
# 1. TypeScript check — MUST produce 0 errors
cd apps/shine/client && npx tsc --noEmit

# 2. Server TypeScript check
cd apps/shine/server && npx tsc --noEmit

# 3. Start dev servers: client on :3000, server on :3001
# (run concurrently, verify both start without errors)

# 4. Run Playwright E2E test
pnpm exec playwright test tests/e2e/sprint-1-journey.spec.ts --reporter=list

# 5. Verify no gradients or neon glows
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow" \
  apps/shine/client/src/pages/ \
  apps/shine/client/src/layouts/
# EXPECTED RESULT: 0 matches

# 6. Verify no raw fetch() calls
grep -rn "fetch(" apps/shine/client/src/pages/ apps/shine/client/src/stores/
# EXPECTED RESULT: 0 matches

# 7. Run automated i18n linter (MUST PASS WITH 0 ERRORS)
cd apps/shine/client && pnpm run check-i18n
# EXPECTED RESULT: 🎉 i18n AUDIT PASSED!

```

---

## STEP 6: MANDATORY COMPLETION REPORT

Save the report to `docs/reports/sprint-1-report.md` with all 5 required sections:

1. **Summary of Created/Modified Files** (grouped by component)
2. **Build & TypeCheck Results** (paste the actual output of `npx tsc --noEmit`)
3. **Playwright E2E Test Results** (paste actual output showing PASS/FAIL per test case)
4. **Real Browser Screenshots** of each page — DO NOT use `generate_image` to fabricate mockups. Screenshots must be captured from the actual running browser at `http://localhost:3000`.
5. **FR Compliance Matrix** — Table with Pass/Fail for: FR-001 to FR-008, FR-074, FR-075, FR-107 to FR-113, FR-129, FR-130
