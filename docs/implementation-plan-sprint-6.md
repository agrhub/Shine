# Sprint 6 Implementation Plan: Growth Innovations, Multi-Platform Publishing & Launch

## Background

Sprint 6 covers **FR-026 to FR-030, FR-090 to FR-093, FR-099, FR-101 to FR-128**. This is the final launch sprint delivering multi-platform social publishing, Stripe subscription billing, admin back-office portal, and 14 advanced growth innovation features (Proposals 17–30).

**What already exists in the codebase:**
- ✅ All Sprint 1–5 features: Auth, Dashboard, Script Studio, Persona Studio, Timeline NLE, Voice/Dubbing, Captions, WebSocket collaboration, AI Director Chatbot
- ✅ GeminiClient.ts + Vertex AI SDK — all AI generation capabilities ready
- ✅ Centralized Axios client, Pinia store architecture, i18n 6 locales
- ✅ S3/MinIO object storage for media assets

**What is missing / needs to be built:**
- ❌ No multi-platform publishing page (`src/views/workspace/PublishPage.vue`)
- ❌ No `publishStore.ts` or `billingStore.ts`
- ❌ No Stripe Checkout integration
- ❌ No admin back-office pages (`/admin/users`, `/admin/render-cluster`, `/admin/observability`)
- ❌ No creator template marketplace (`/marketplace/templates`)
- ❌ No AI virtual actor marketplace (`/marketplace/actors`)
- ❌ No 14 Growth Innovation feature endpoints (novel converter, live drama, cultural adapt, paywall doctor, etc.)
- ❌ No `checkTierLimit.ts` feature gating middleware
- ❌ No `tests/e2e/sprint-6-full-launch.spec.ts`
- ❌ No `docs/reports/sprint-6-report.md`

---

## Open Questions

> [!IMPORTANT]
> **Stripe Integration Keys:** Stripe Checkout requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`. For local dev, use Stripe test mode keys. Ensure `stripe` npm package is installed on the server.
>
> **TikTok & YouTube OAuth Credentials:** Multi-platform publishing (`POST /publish/multi-platform`) requires platform OAuth tokens. For local testing, implement mock publish that returns a synthetic `videoUrl`. Real credentials are configured via `TIKTOK_CLIENT_KEY`, `YOUTUBE_CLIENT_ID` in `.env`.
>
> **SSE Render Stream (`GET /api/v1/render/stream`):** Use `res.writeHead(200, { 'Content-Type': 'text/event-stream' })` with Node.js. Client reads via `EventSource` API in `publishStore.ts`. No additional packages needed.
>
> **C2PA Watermarking (`POST /export/c2pa-watermark`):** Use `@contentauth/sdk` for C2PA provenance. Google SynthID embedding requires a GCP SynthID API call. Stub both if API access is not available, returning the original asset URL.

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **BASIC UI COMPONENT MANDATE:** ALL pages MUST use only the 44 native components in `@/components/basic/`.  Key components: `FaTable` (admin user list), `FaProgress` (publish job progress / SSE render stream), `FaSwitch` (platform toggle), `FaTag` (tier label badges), `FaBadge` (credit count), `FaDrawer` (publish settings).
3. **UI MOCKUP GROUND TRUTH:** Before coding analytics pages, view [`analytics.png`](../docs/stitch_shine_app_design/shine_ai_analytics_light_mode/screen.png) and [`workspace-episode-analytic.png`](../docs/stitch_shine_app_design/shine_project_analysis_aligned_light_mode/screen.png). Before coding the asset library, view [`asset-library.png`](../docs/stitch_shine_app_design/shine_team_shared_workspace/screen.png).
4. **PORT LOCK:** Client MUST run on `http://localhost:3000`. Server MUST run on `http://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS:** Raw `fetch()` is STRICTLY PROHIBITED. All API calls MUST go through Pinia stores (`publishStore`, `billingStore`) + `src/utils/http.ts`.
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings MUST use `$t('...')` / `i18n.global.t('...')` across 6 locales. Add `publish.*`, `billing.*`, `admin.*`, `marketplace.*`, `analytics.*` key blocks to all locale files.

---

### Component 1: Package Installation

#### [MODIFY] `server/package.json` — Install publishing & billing packages
```bash
cd apps/shine/server
pnpm add stripe @contentauth/sdk
```

---

### Component 2: TypeScript Contracts

#### [MODIFY] `client/src/types/api.ts`
Add interfaces:
```typescript
interface PublishJob { id: string; platforms: ('tiktok'|'youtube'|'instagram'|'facebook'|'douyin')[]; status: 'queued'|'publishing'|'success'|'failed'; publishedUrls: Record<string, string> }
interface SubscriptionTier { tier: 'free'|'creator'|'studio'|'enterprise'; creditBalance: number; features: string[] }
interface MarketplaceTemplate { id: string; title: string; genre: string; previewUrl: string; price: number }
interface VirtualActor { id: string; name: string; thumbnailUrl: string; dailyRateUsd: number; sampleVideoUrl: string }
```

---

### Component 3: Pinia Stores

#### [NEW] `client/src/stores/publishStore.ts`
Pinia store for publishing:
- `publishEpisode(episodeId, platforms[])` — calls `POST /v1/publish/multi-platform`, polls publish job status via SSE `GET /api/v1/render/stream`
- `generateViralCover(episodeId)` — calls `POST /v1/ai/viral-cover/generate`, returns 3 cover variants
- `publishedJobs: PublishJob[]`
- All toasts: `i18n.global.t('toast.publishStarted')`, `i18n.global.t('toast.publishSuccess')`

#### [NEW] `client/src/stores/billingStore.ts`
Pinia store for subscription & billing:
- `currentTier: SubscriptionTier`
- `fetchTierInfo()` — calls `GET /v1/billing/tier`
- `startCheckout(tier)` — calls `POST /v1/billing/checkout` → redirects to Stripe Checkout URL
- `fetchCreditBalance()` — returns AI credit balance from server
- All toasts: `i18n.global.t('toast.subscriptionUpgraded')`, `i18n.global.t('toast.creditsLow')`

---

### Component 4: Publishing UI

#### [NEW] `client/src/views/workspace/PublishPage.vue`
Multi-platform publishing hub page:
- Platform toggle grid: `FaSwitch` for TikTok, YouTube Shorts, Instagram Reels, Facebook Reels, Douyin
- Cover image picker: 3 AI-generated cover variants in `FaCard` grid
- Hashtag input: `FaInput` with `FaTag` chips for viral hashtags
- `FaButton` "Publish All" → triggers `publishStore.publishEpisode()`
- `FaProgress` bar for each platform publish job status (via SSE)

#### [NEW] `client/src/views/analytics/AnalyticsPage.vue`
Analytics dashboard (matches `analytics.png` mockup):
- Stats summary cards using `FaCard` with `FaTrend` up/down arrows
- Episode performance table using `FaTable` with `FaPagination`
- Paywall placement recommendation via `FaBadge` highlight on episode row

---

### Component 5: Subscription & Billing UI

#### [NEW] `client/src/views/billing/BillingPage.vue`
Subscription tier selection and management:
- 4 tier cards (Free, Creator, Studio, Enterprise) using `FaCard`
- `FaTag` for current active tier badge
- `FaButton` "Upgrade" → triggers `billingStore.startCheckout(tier)`
- Credit balance meter using `FaProgress`

#### [MODIFY] `client/src/layouts/AppLayout.vue` & `client/src/layouts/StudioLayout.vue`
- Add `FaBadge` with credit count to header toolbar
- Show `FaAlert` warning when credits < 10% of monthly quota

---

### Component 6: Admin Back-Office Pages

#### [NEW] `client/src/views/admin/AdminUsersPage.vue`
User directory management:
- `FaTable` with columns: Avatar, Name, Email, Tier, Status, Actions
- `FaSearchBar` filter, `FaSelect` tier filter
- Row actions: Edit Role (`FaButton variant="ghost"`), Impersonate (`FaButton variant="outline"`)

#### [NEW] `client/src/views/admin/AdminRenderClusterPage.vue`
FinOps Cloud Run render cluster dashboard:
- Active render jobs table using `FaTable`
- Cluster health card using `FaCard` with `FaTrend` GPU utilization metrics
- Cost breakdown by series using `FaDescriptions`

#### [NEW] `client/src/views/admin/AdminObservabilityPage.vue`
OpenTelemetry Grafana embedded dashboard:
- `<iframe>` embed of Grafana dashboard URL (configurable via env var)
- Fallback to raw metrics table using `FaTable` when Grafana not configured

#### [MODIFY] `client/src/router/index.ts`
Add all new routes under `AppLayout` and `StudioLayout` with appropriate role guards:
```
/publish/:seriesId/:episodeId → StudioLayout → PublishPage.vue
/analytics → AppLayout → AnalyticsPage.vue
/billing → AppLayout → BillingPage.vue
/admin/users → AppLayout (admin-only) → AdminUsersPage.vue
/admin/render-cluster → AppLayout (admin-only) → AdminRenderClusterPage.vue
/admin/observability → AppLayout (admin-only) → AdminObservabilityPage.vue
/marketplace/templates → AppLayout → TemplateMarketplacePage.vue
/marketplace/actors → AppLayout → ActorMarketplacePage.vue
```


---

### Component 7: Marketplace Pages

#### [NEW] `client/src/views/marketplace/TemplateMarketplacePage.vue`
Creator template marketplace:
- Grid of `FaCard` template cards with preview thumbnail, genre `FaTag`, price
- `FaSearchBar` + `FaSelect` genre filter + `FaPagination`
- Purchase button → `billingStore` deducts credits

#### [NEW] `client/src/views/marketplace/ActorMarketplacePage.vue`
AI virtual actor royalty marketplace:
- Grid of actor cards using `FaCard` with sample video embed, `FaTag` language/style badges, daily rate
- `FaButton` "License Actor" → calls `POST /v1/marketplace/actors/:id/license`

---

### Component 8: Backend — Publishing, Billing, Admin Routes

#### [NEW] `server/src/routes/publish.ts`
- `POST /v1/publish/multi-platform` — Queue platform publish jobs
- `GET /api/v1/render/stream` — SSE endpoint streaming render + publish progress events

#### [NEW] `server/src/routes/billing.ts`
- `GET /v1/billing/tier` — Return current user subscription tier and credit balance
- `POST /v1/billing/checkout` — Create Stripe Checkout session, return `{ url }` for client redirect
- `POST /v1/billing/webhook` — Handle Stripe webhook events (`checkout.session.completed`, `invoice.payment_failed`)
- `POST /v1/billing/revenue-splits` — Calculate and record creator revenue shares

#### [NEW] `server/src/routes/admin.ts`
- `GET /v1/admin/users` — Paginated user list with tier and status
- `PUT /v1/admin/users/:id/role` — Update user role
- `POST /v1/admin/impersonate` — Generate impersonation JWT for support
- `GET /v1/admin/render-cluster` — Return render job queue and GPU metrics
- `GET /v1/admin/observability` — Return metrics JSON (Prometheus format)

#### [NEW] `server/src/routes/marketplace.ts`
- `GET /v1/marketplace/templates` — Paginated template listing
- `POST /v1/marketplace/templates/:id/purchase` — Purchase template
- `GET /v1/marketplace/actors` — Virtual actor catalog
- `POST /v1/marketplace/actors/:id/license` — License actor for series use

#### [NEW] `server/src/middleware/checkTierLimit.ts`
Feature gating middleware:
```typescript
export function checkTierLimit(feature: string) {
  return (req, res, next) => {
    const userTier = req.user.subscriptionTier;
    if (!TIER_FEATURES[userTier]?.includes(feature)) {
      return res.status(403).json({ code: 403, data: null, message: i18n.t('errors.tierRequired'), error: { requiredTier: FEATURE_TIERS[feature] } });
    }
    next();
  };
}
```

---

### Component 9: Growth Innovation Backend Routes (Proposals 17–30)

#### [NEW] `server/src/routes/novel-converter.ts`
- `POST /v1/ai/convert-novel` — Upload PDF/DOCX, extract chapters, generate 20-50 episode series structure

#### [NEW] `server/src/routes/live-drama.ts`
- `POST /v1/live/polling` — Start interactive live-stream drama polling session, return poll options

#### [NEW] `server/src/routes/cultural-adapt.ts`
- `POST /v1/ai/cultural-adapt` — Localize script dialogue for target cultural market

#### [NEW] `server/src/routes/analytics-paywall.ts`
- `GET /v1/analytics/paywall-recommendation` — Return AI-recommended paywall placement points per episode

#### [NEW] `server/src/routes/copyright.ts`
- `POST /v1/audio/copyright-verify` — Fingerprint audio track against copyright database

#### [NEW] `server/src/routes/viral-cover.ts`
- `POST /v1/ai/viral-cover/generate` — Scan video frames, score aesthetics, generate 3 viral cover variants with hook title overlays

#### [MODIFY] `server/src/index.ts`
Register all new route modules at `/v1` and `/api/v1`.

---

### Component 10: Locale Dictionaries

#### [MODIFY] `client/src/locales/{en,vi,zh,jp,es,fr}.json`
Add key blocks: `publish.*`, `billing.*`, `admin.*`, `marketplace.*`, `analytics.*`, `toast.publishStarted`, `toast.publishSuccess`, `toast.subscriptionUpgraded`, `toast.creditsLow`, `errors.tierRequired`

---

### Component 11: E2E Tests

#### [NEW] `tests/e2e/sprint-6-full-launch.spec.ts`
Complete Playwright E2E full launch journey:
1. Navigate to `/publish/series-001/episode-001` → assert PublishPage renders with platform toggles
2. Enable TikTok and YouTube Shorts → click "Publish All" → assert progress SSE bars animate
3. Assert publish success toast and published URLs appear
4. Navigate to `/analytics` → assert stats cards and episode performance table load
5. Navigate to `/billing` → assert subscription tier cards render, click "Upgrade to Creator"
6. Assert Stripe Checkout redirect URL returned
7. Navigate to `/admin/users` → assert user table loads, search for "test@example.com"
8. Navigate to `/marketplace/templates` → assert template grid loads, click "Use Template"
9. Navigate to `/marketplace/actors` → assert actor catalog loads
10. Screenshots: `01_publish_platforms.png` → `02_publish_progress.png` → `03_publish_success.png` → `04_analytics.png` → `05_billing_tiers.png` → `06_admin_users.png` → `07_template_marketplace.png` → `08_actor_marketplace.png`

Full regression: Run all sprint 1–6 E2E specs to verify no regressions:
```bash
pnpm exec playwright test tests/e2e/
```

---

## Verification Plan

### Automated Tests
- `cd apps/shine/client && npx tsc --noEmit` — zero TypeScript errors
- `cd apps/shine/server && npx tsc --noEmit` — zero TypeScript errors
- `pnpm exec playwright test tests/e2e/sprint-6-full-launch.spec.ts`
- Full regression suite: `pnpm exec playwright test tests/e2e/`
- Unit tests: `TC-BRN-001`, `TC-PPL-001`, `TC-OFF-001`, `TC-ABV-001`, `TC-CVR-001`

### Manual Verification
- Dev server: `npm run dev` (client port 3000, server port 3001)
- Open `/publish/*` — verify platform toggle grid, cover picker, publish progress bars
- Verify `/analytics` — assert `FaTrend` arrows and `FaTable` pagination match `analytics.png`
- Verify `/billing` — assert tier card UI matches design, Stripe redirect works
- Verify `/admin/users` — assert user table loads without purple gradients
- Verify `/marketplace/templates` and `/marketplace/actors` — assert grids render correctly

### Report
- Create `docs/reports/sprint-6-report.md` with all 5 required sections + embedded screenshots
- Final FR Compliance Matrix: Verify all **130 FRs** are ✅ PASS
- Production Release Sign-off Checklist:
  - [ ] All 6 Playwright E2E specs pass
  - [ ] Zero TypeScript errors in client & server
  - [ ] Stripe webhook endpoint tested with Stripe CLI
  - [ ] S3/MinIO bucket policies verified
  - [ ] Google Cloud service account scopes verified
  - [ ] All 6 locale translations complete (no missing keys)
  - [ ] UI matches all 15 PNG mockups in `docs/stitch_shine_app_design/`
