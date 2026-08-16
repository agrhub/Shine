# Sprint 1 Implementation Plan: Foundation, Infrastructure & Core Setup

## Background

Sprint 1 covers FR-001 to FR-008, FR-074, FR-075, FR-107 to FR-113, FR-129, FR-130. The goal is to deliver the full foundation: 3 layout shells, multi-language i18n, auth suite, Series CRUD, and pluggable DB/AI infrastructure.

The existing codebase already has a partial foundation:
- ✅ Express server with auth/series/flowAccounts/contact routes
- ✅ SQLiteProvider + MongoDBProvider with `IDatabaseProvider` abstraction
- ✅ GeminiClient.ts + AIProviderRouter.ts + FlowSyncService.ts/FlowAdapter.ts/CaptchaService.ts
- ✅ Basic component library (`@/components/basic/` — FaButton, FaCard, FaInput, FaModal, etc.)
- ✅ Pinia auth store, Vue router, Tailwind CSS + dark mode

**What's missing / needs major work:**
- ❌ No `vue-i18n` — all text is hardcoded English
- ❌ No `src/locales/` (6 locale JSON files)
- ❌ No 5-layout shell architecture (DefaultLayout / HomeLayout / AuthLayout / AppLayout / StudioLayout)
- ❌ No proper public pages (Home uses old `src/components/ui/` — not `@/components/basic/`)
- ❌ No `src/pages/` pages for Signup, ForgotPassword, Terms, Privacy, Contact, Manual
- ❌ No Dashboard view with AppLayout + Series list using `FaCard`, `FaButton`
- ❌ No centralized Axios HTTP client (`src/utils/http.ts`)
- ❌ No i18n-bound LanguageSelect component in header
- ❌ No Playwright E2E test spec (`sprint-1-journey.spec.ts`)
- ❌ LoginView uses raw `fetch()` instead of Pinia store action + Axios
- ❌ Server standardized response format needs verification
- ❌ No `docs/reports/sprint-1-report.md`

---

## Open Questions

> [!IMPORTANT]
> **`vue-i18n` package not in `client/package.json`** — we need to install it. This will be done automatically via `npm install vue-i18n`.
>
> **`axios` package not in `client/package.json`** — we need to install it for the centralized HTTP client. Done via `npm install axios`.
>
> **Playwright** — `playwright.config.ts` exists at the root but `@playwright/test` needs to be installed. Will install as needed.
>
> **OAuth SSO (Google/GitHub):** The Express auth routes exist but OAuth redirect handlers are not fully wired. We will implement the SSO button UI and the backend redirect endpoints. Actual Google/GitHub OAuth app credentials won't be registered (env-level config), but the flow will be implemented.

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows around cards/buttons. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **ELEMENT PLUS COMPONENT MANDATE:** ALL pages MUST use native **Element Plus (`element-plus`)** components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
3. **GOOGLE STITCH MCP GROUND TRUTH & MANDATORY AUDIT:** Do NOT skip existing `.vue` pages! Use local design files in `docs/stitch_shine_app_design/` to inspect screen layouts, HTML code, and screenshot previews for Google Stitch local design assets in `docs/stitch_shine_app_design/`. If current code deviates from Google Stitch, YOU MUST REFACTOR THE PAGE TO MATCH STITCH EXACTLY.


4. **PORT LOCK:** Client MUST run on `http://localhost:3000` (Vite `strictPort: true`). Server MUST run on `http://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS:** Raw `fetch()` is STRICTLY PROHIBITED. All API calls MUST go through Pinia store actions (`src/stores/`) + centralized Axios client (`src/utils/http.ts`).
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings MUST use `$t('...')` in templates and `i18n.global.t('...')` in TS/JS. ALL toast notifications MUST be internationalized across 6 locales (`en`, `vi`, `zh`, `jp`, `es`, `fr`). NEVER hardcode raw strings.

---

### Component 1: Package Installation

#### [MODIFY] client/package.json — Install `vue-i18n` and `axios`
Install via `npm install vue-i18n axios` in `apps/shine/client/`

---

### Component 2: Centralized HTTP Client & Updated Auth Store

#### [NEW] `client/src/utils/http.ts`
Centralized Axios instance with:
- Request interceptor: Attaches `Authorization: Bearer <token>` from `authStore`
- Response interceptor: Validates `res.data.code`, handles 401 redirects, toast errors

#### [MODIFY] `client/src/stores/useAuthStore.ts`
Add `login(credentials)` and `register(payload)` Pinia store actions that call `/v1/auth/login` and `/v1/auth/signup` via the Axios http client (replacing raw `fetch()`).

#### [NEW] `client/src/stores/useSeriesStore.ts`
Pinia store with `fetchSeriesList()`, `createSeries(data)`, `getSeriesById(id)` actions backed by the Axios http client.

---

### Component 3: i18n System

#### [NEW] `client/src/locales/en.json`
#### [NEW] `client/src/locales/vi.json`
#### [NEW] `client/src/locales/zh.json`
#### [NEW] `client/src/locales/jp.json`
#### [NEW] `client/src/locales/es.json`
#### [NEW] `client/src/locales/fr.json`
Full 6-language translation dictionaries covering keys: `nav.*`, `home.*`, `auth.*`, `dashboard.*`, `common.*`, `series.*`, `manual.*`, `legal.*`

#### [NEW] `client/src/i18n.ts`
Creates and exports the `vue-i18n` instance with auto-detected browser locale and fallback to `en`.

#### [MODIFY] `client/src/main.ts`
- Import and `app.use(i18n)`
- Ensure `.dark` class on `document.documentElement`
- Import OKLCH CSS variables

---

### Component 4: Shared Layout Components

#### [NEW] `client/src/layouts/DefaultLayout.vue`
- Clean footer
- `<router-view />` for content
- No sidebar

#### [NEW] `client/src/layouts/HomeLayout.vue`
- Marketing header: Logo, nav links (Features, Pricing, Use Cases, Blog), LanguageSelect, Sign In button, Get Started button
- Clean footer
- `<router-view />` for content
- No sidebar

#### [NEW] `client/src/layouts/AuthLayout.vue`
- Left column: Image/Video/Brand hero illustration (Shine branding)
- Right column: centered card with `<router-view />`

#### [NEW] `client/src/layouts/AppLayout.vue`
- `.g-sub-sidebar`: Collapsible menu (Series Dashboard, My Projects, Team Shared, Assets Library, Analytics); header menu is logo icon and footer is User Profile Menu (Profile, Settings, LanguageSelect, Dark/Light toggle and logout) and collapse button at the bottom 
- `.g-main-area`: Content area with `<router-view />`

#### [NEW] `client/src/layouts/StudioLayout.vue`
- `.g-header`: Logo with back to dashboard/my project/team shared button and tabs (Script, Editor, Characters, Library, Voice & Dubbing, Captions, Analytics, Export & Publish).
- `.g-main-area`: Content area with `<router-view />`

#### [NEW] `client/src/components/shared/LanguageSelect.vue`
Dropdown using `FaDropdown` or `FaSelect` to switch `$i18n.locale` between 6 languages. Updates localStorage and rerenders all `$t()` strings instantly.

---

### Component 5: Public Pages (`src/pages/`)

#### [NEW] `client/src/pages/Home.vue`
Full marketing landing page using `FaButton`, `FaCard`, `FaTag`:
- Hero section: animated headline, subtitle, CTA buttons ("Get Started Free", "Watch Demo")
- Features grid: 6 feature cards with icons and descriptions
- Social proof / stats row
- All text via `$t('home.*')` keys

#### [NEW] `client/src/pages/Manual.vue`
Interactive user manual with FaTabs for sections (Getting Started, Script Studio, Timeline, Publishing)

#### [NEW] `client/src/pages/Terms.vue`
Legal Terms of Service page

#### [NEW] `client/src/pages/Privacy.vue`
Privacy Policy page

#### [NEW] `client/src/pages/Contact.vue`
Contact form using `FaForm`, `FaInput`, `FaTextarea`, `FaButton` — submits to `POST /v1/contact`

---

### Component 6: Auth Pages (`src/pages/auth/`)

#### [NEW] `client/src/pages/auth/Login.vue`
- FaTabs for "Account & Password" / "SSO"
- FaInput email + password, Remember Me checkbox, Forgot password link
- Login CTA via `authStore.login()`
- Quick Demo Login buttons (admin/test)
- Google + GitHub SSO buttons

#### [NEW] `client/src/pages/auth/Signup.vue`
- FaForm with Email, Password, Confirm Password, Name, Terms checkbox
- Calls `authStore.register()`

#### [NEW] `client/src/pages/auth/ForgotPassword.vue`
- Email input, submit → `POST /v1/auth/forgot-password`

#### [NEW] `client/src/pages/auth/ResetPassword.vue`
- New password + confirm, token from URL query param

---

### Component 7: Dashboard (Admin Pages)

#### [NEW] `client/src/pages/dashboard/index.vue`
Series/Project Hub dashboard using `AdminLayout`:
- Stats row: FaCard metrics (Total Series, Episodes, Published, Drafts)
- Series list/grid using `FaTable` + `FaCard` grid toggle
- `FaButton` "New Series" → `FaModal` wizard
- New Series wizard shell: Name, Genre tag select, Description — calls `seriesStore.createSeries()`
- Series rows show title, episode count, `FaTag` status badge (Draft/Active/Published)

---

### Component 8: Router Restructure

#### [MODIFY] `client/src/router/index.ts`
Restructure with 5 layout shells:
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
/dashboard → AppLayout → dashboard/index.vue
/projects → AppLayout → ProjectsView.vue
/team → AppLayout → TeamSharedView.vue
/assets → AppLayout → AssetsLibraryView.vue
/analytics → AppLayout → AnalyticsView.vue
/wizard → StudioLayout → GenreWizard.vue
/script/* → StudioLayout → ScriptStudio.vue
/editor/* → StudioLayout → EditPage.vue
/persona/* → StudioLayout → PersonaStudio.vue
/dubbing/* → StudioLayout → VoiceDubbingPage.vue
/captions/* → StudioLayout → CaptionsPage.vue
/export/* → StudioLayout → PublishPage.vue
```
Auth guard: App and Studio routes require `isAuthenticated`; redirect to `/auth/login`


---

### Component 9: Server — Standardized Response Format Verification

#### [MODIFY] `server/src/routes/auth.ts`
Verify all responses use `{ code, data, message, error }` envelope format.

#### [MODIFY] `server/src/routes/series.ts`
Verify all responses use standardized envelope format.

---

### Component 10: Playwright E2E Tests

#### [NEW] `tests/e2e/sprint-1-journey.spec.ts`
Interactive E2E test covering:
1. Landing page renders PublicLayout (no sidebar)
2. Auth flow: Navigate to `/auth/login`, fill form, login → redirect to `/dashboard`
3. Dashboard: Assert `.g-main-sidebar`, `.g-sub-sidebar`, `.g-header`
4. Series CRUD: Click "New Series" → fill modal → confirm → series appears in list
5. Language switcher: Switch en → vi → zh, assert DOM text updates
6. Screenshots: `01_landing.png`, `02_login.png`, `03_dashboard.png`, `04_new_series.png`, `05_i18n_vi.png`

---

## Verification Plan

### Automated Tests
- `cd apps/shine/client && npx tsc --noEmit` — zero TypeScript errors
- `pnpm exec playwright test tests/e2e/sprint-1-journey.spec.ts`

### Manual Verification
- Dev server: `npm run dev` (client on port 3000, server on port 3001)
- Verify 3 layout shells render correctly at `/`, `/auth/login`, `/dashboard`
- Verify language switcher toggles all 6 locales
- Verify auth flow stores JWT and redirects to dashboard
- Verify series list populates from `GET /v1/series`

### Report
- Create `docs/reports/sprint-1-report.md` with all 5 required sections + embedded screenshots
