# TASK: IMPLEMENT SPRINT 6 — Growth Innovations, Multi-Platform Publishing & Launch
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-6.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

**Sprint 6 is the final launch sprint. Confirm all Sprint 1–5 prerequisites are met:**
- All Sprint 1–5 routes registered and working ✅
- `timelineStore.ts`, `chatStore.ts`, `collaborationStore.ts` all exist ✅
- WebSocket PatchSyncService running on server ✅
- `GeminiClient.ts` + `MemoryEngine.ts` + all AI agent files exist ✅
- All 6 locale files have keys for sprints 1–5 ✅

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

Read the following documents using `view_file` BEFORE writing any code:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-6.md`.

2. **UI Component Catalog:**
    Key components this sprint:
   `FaTable` (admin user list), `FaProgress` (publish job progress / SSE), `FaSwitch` (platform toggle), `FaTag` (tier badges), `FaBadge` (credit count), `FaDrawer` (publish settings), `FaPagination` (marketplace grids).

3. **Product Market Strategy:**
   Read `docs/product-market-strategy.md` Proposals 17–30 — the 14 growth innovation features to implement.

4. **API Reference:**
   Read `docs/api-document.md` — `POST /publish/multi-platform`, `POST /export/c2pa-watermark`, Stripe billing, marketplace, growth innovation endpoints.

5. **View UI design mockups BEFORE coding any page:**
   - Analytics page → `view_file` `docs/stitch_shine_app_design/shine_ai_analytics_light_mode/screen.png`
   - Episode analytics → `view_file` `docs/stitch_shine_app_design/shine_project_analysis_aligned_light_mode/screen.png`
   - Asset library → `view_file` `docs/stitch_shine_app_design/shine_team_shared_workspace/screen.png`

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

```bash
# Check what publishing/billing files already exist
find apps/shine/client/src -name "*publish*" -o -name "*Publish*" -o -name "*billing*" 2>/dev/null
find apps/shine/server/src -name "*publish*" -o -name "*billing*" -o -name "*admin*" -o -name "*marketplace*" 2>/dev/null

# Check if stripe is installed
cat apps/shine/server/package.json | grep "stripe"

# Check existing routes registered on server
grep -n "Router\|router" apps/shine/server/src/index.ts | head -40
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
Publishing page, subscription tier cards, admin panels, and marketplace grids MUST NOT have purple gradients or neon effects. Page elements MUST use clean dark-slate palette (`#121218`, `#1a1b23`, `#2d2e3a`).

### 🚫 GATE 2: MANDATORY ELEMENT PLUS COMPONENTS (`element-plus`)
- ALL views and pages MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue`.
- Custom `Fa-Admin` components (`@/components/basic`) are deprecated. Switch completely to Element Plus for consistent design, UI layout, and colors.

**Self-check:**
```bash
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/views/workspace/PublishPage.vue \
  apps/shine/client/src/views/billing/ \
  apps/shine/client/src/views/admin/ \
  apps/shine/client/src/views/marketplace/
# EXPECTED: 0 matches
```

### 🚫 GATE 2: MANDATORY BASIC UI COMPONENTS (`@/components/basic/`)
Read README before using each component. Required bindings:
- Platform toggles → `FaSwitch` (one per platform: TikTok, YouTube, Instagram, Facebook, Douyin)
- Publish progress per platform → `FaProgress` (updated via SSE events)
- Admin user table → `FaTable` with sortable columns + `FaPagination`
- Subscription tier cards → `FaCard` with `FaButton` "Upgrade" + `FaTag` tier name
- Credit balance display → `FaProgress` (used-out-of-total style) + `FaBadge` count
- Marketplace template grid → `FaCard` + `FaPagination`
- Actor marketplace grid → `FaCard` + `FaPagination`

### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
NEVER test on port `5173`.

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
All API calls MUST go through Pinia stores:
- `publishStore.publishEpisode(episodeId, platforms[])` → `POST /v1/publish/multi-platform`
- `publishStore.generateViralCover(episodeId)` → `POST /v1/ai/viral-cover/generate`
- `billingStore.startCheckout(tier)` → `POST /v1/billing/checkout`
- `billingStore.fetchCreditBalance()` → `GET /v1/billing/tier`

SSE render progress: read via `EventSource` API inside `publishStore.ts`, NOT directly in components.

**Self-check:**
```bash
grep -rn "fetch(" apps/shine/client/src/views/ apps/shine/client/src/stores/
# EXPECTED: 0 matches
```

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS
Add key blocks to ALL 6 locale files: `publish.*`, `billing.*`, `admin.*`, `marketplace.*`, `analytics.*`

Example:
```json
{
  "publish": {
    "title": "Publish Episode",
    "selectPlatformsLabel": "Select Platforms",
    "publishAllBtn": "Publish All",
    "coverPickerTitle": "AI Cover Generator",
    "regenerateCoverBtn": "Regenerate",
    "platformTikTok": "TikTok",
    "platformYouTube": "YouTube Shorts",
    "platformInstagram": "Instagram Reels"
  },
  "billing": {
    "title": "Subscription & Billing",
    "freeTier": "Free",
    "creatorTier": "Creator",
    "studioTier": "Studio",
    "enterpriseTier": "Enterprise",
    "upgradeBtn": "Upgrade",
    "creditsRemaining": "{count} AI credits remaining"
  },
  "admin": {
    "usersTitle": "User Management",
    "renderClusterTitle": "Render Cluster",
    "observabilityTitle": "Observability"
  },
  "toast": {
    "publishStarted": "Publishing to {platform}...",
    "publishSuccess": "Published successfully to {count} platform(s)!",
    "subscriptionUpgraded": "Upgraded to {tier} plan!",
    "creditsLow": "AI credits running low — {count} remaining"
  }
}
```

---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-6.md`)

### 3.1 Package Installation
```bash
cd apps/shine/server && pnpm add stripe @contentauth/sdk
```

### 3.2 TypeScript Contracts

**MODIFY:**
1. `client/src/types/api.ts` — Add: `PublishJob`, `SubscriptionTier`, `MarketplaceTemplate`, `VirtualActor`, `PaywallRecommendation`

### 3.3 Pinia Stores

**CREATE:**
2. `client/src/stores/publishStore.ts` — `publishEpisode()`, `generateViralCover()`, SSE progress tracking
3. `client/src/stores/billingStore.ts` — `fetchTierInfo()`, `startCheckout()`, `fetchCreditBalance()`

### 3.4 Publishing UI

**CREATE:**
4. `client/src/views/workspace/PublishPage.vue` — Multi-platform publishing hub
5. `client/src/views/analytics/AnalyticsPage.vue` — Analytics dashboard (matches `analytics.png`)

### 3.5 Billing UI

**CREATE:**
6. `client/src/views/billing/BillingPage.vue` — Subscription tier cards + credit management

**MODIFY:**
7. `client/src/layouts/AppLayout.vue` & `client/src/layouts/StudioLayout.vue` — Add FaBadge credit count to header + FaAlert when < 10%

### 3.6 Admin Back-Office Pages

**CREATE:**
8. `client/src/views/admin/AdminUsersPage.vue` — User directory with FaTable
9. `client/src/views/admin/AdminRenderClusterPage.vue` — Render cluster dashboard
10. `client/src/views/admin/AdminObservabilityPage.vue` — Grafana iframe embed

### 3.7 Marketplace Pages

**CREATE:**
11. `client/src/views/marketplace/TemplateMarketplacePage.vue` — Creator template grid
12. `client/src/views/marketplace/ActorMarketplacePage.vue` — Virtual actor catalog

### 3.8 Router

**MODIFY:**
13. `client/src/router/index.ts` — Add `/publish/*` under StudioLayout; add `/analytics`, `/billing`, `/admin/*`, `/marketplace/*` routes under AppLayout with appropriate role guards

### 3.9 Backend — Core Publishing & Billing

**CREATE:**
14. `server/src/routes/publish.ts` — `POST /v1/publish/multi-platform`, `GET /api/v1/render/stream` (SSE)
15. `server/src/routes/billing.ts` — `GET /v1/billing/tier`, `POST /v1/billing/checkout`, `POST /v1/billing/webhook`, `POST /v1/billing/revenue-splits`
16. `server/src/routes/admin.ts` — `GET /v1/admin/users`, `PUT /v1/admin/users/:id/role`, `POST /v1/admin/impersonate`, `GET /v1/admin/render-cluster`
17. `server/src/routes/marketplace.ts` — `GET /v1/marketplace/templates`, `POST /v1/marketplace/templates/:id/purchase`, `GET /v1/marketplace/actors`, `POST /v1/marketplace/actors/:id/license`
18. `server/src/middleware/checkTierLimit.ts` — Feature gating middleware

### 3.10 Backend — Growth Innovation Routes (14 features)

**CREATE:**
19. `server/src/routes/novel-converter.ts` — `POST /v1/ai/convert-novel`
20. `server/src/routes/live-drama.ts` — `POST /v1/live/polling`
21. `server/src/routes/cultural-adapt.ts` — `POST /v1/ai/cultural-adapt`
22. `server/src/routes/analytics-paywall.ts` — `GET /v1/analytics/paywall-recommendation`
23. `server/src/routes/copyright.ts` — `POST /v1/audio/copyright-verify`
24. `server/src/routes/viral-cover.ts` — `POST /v1/ai/viral-cover/generate`

**MODIFY:**
25. `server/src/index.ts` — Register all new route modules at `/v1` and `/api/v1`

### 3.11 Locale Dictionaries

**MODIFY:**
26. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `publish.*`, `billing.*`, `admin.*`, `marketplace.*`, `analytics.*` keys

### 3.12 Testing

**CREATE:**
27. `tests/e2e/sprint-6-full-launch.spec.ts` — Full Playwright launch journey
28. Run full regression: all sprint E2E specs pass

---

## STEP 4: COMPONENT DESIGN RULES

### PublishPage.vue — LAYOUT
```
TOP SECTION — Platform Selection:
  - Row of platform toggle cards using FaCard + FaSwitch
  - Each platform: logo (FaAvatar or <img>) + platform name FaTag + FaSwitch
  - Selected platforms: border var(--primary) — NO neon glow

MIDDLE SECTION — AI Cover Generator:
  - 3 cover variant thumbnail cards using FaCard
  - Selected cover: border var(--primary)
  - FaButton "Regenerate Covers" (with :loading state)

BOTTOM SECTION — Publish Controls:
  - FaInput for viral caption/hashtags
  - FaButton "Publish All" (primary, with :loading state)
  - Per-platform FaProgress bars (0–100%, updated via SSE EventSource)
  - Success state: FaAlert variant="success" with published URLs
```

### BillingPage.vue — TIER CARDS
```
4-column grid of FaCard tier cards:
  - FREE: FaCard + "Free" FaTag + feature list (FaList) + FaButton "Current Plan" (disabled)
  - CREATOR: FaCard + "Creator" FaTag + feature list + FaButton "Upgrade"
  - STUDIO: FaCard + FaBadge "Most Popular" (standard, NO glow) + feature list + FaButton "Upgrade"
  - ENTERPRISE: FaCard + "Enterprise" FaTag + feature list + FaButton "Contact Sales"
Active tier card: border: 2px solid var(--primary)
```

### AdminUsersPage.vue — USER TABLE
```
- FaPageHeader title="User Management" + FaSearchBar
- FaSelect tier filter (Free / Creator / Studio / Enterprise)
- FaTable with columns:
    Avatar (FaAvatar, 40px) | Name | Email | Tier (FaTag) | Status (FaTag) | Actions (FaButton)
- Row actions: "Edit Role" (FaButton variant="ghost") | "Impersonate" (FaButton variant="outline")
- FaPagination at bottom
```

---

## STEP 5: BACKEND IMPLEMENTATION RULES

### checkTierLimit.ts — Feature gating middleware
```typescript
const TIER_FEATURES: Record<string, string[]> = {
  free: ['series.create', 'script.generate'],
  creator: ['series.create', 'script.generate', 'voice.tts', 'publish.single'],
  studio: ['series.create', 'script.generate', 'voice.tts', 'publish.multi', 'persona.advanced'],
  enterprise: ['*'], // all features
};

export function checkTierLimit(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = req.user?.subscriptionTier ?? 'free';
    const allowed = TIER_FEATURES[tier];
    if (!allowed.includes('*') && !allowed.includes(feature)) {
      return res.status(403).json({
        code: 403, data: null,
        message: `This feature requires a higher subscription tier`,
        error: { requiredTier: Object.keys(TIER_FEATURES).find(t => TIER_FEATURES[t].includes(feature)) }
      });
    }
    next();
  };
}
```

### publish.ts — SSE render/publish stream
```typescript
// GET /api/v1/render/stream?jobId=xxx
router.get('/render/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  // Subscribe to job progress events from CompositorWorker
  // emit: res.write(`data: ${JSON.stringify({ progress: N, platform: 'tiktok' })}\n\n`)
  req.on('close', () => { /* cleanup */ });
});
```

---

## STEP 6: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

```bash
# 1. TypeScript check
cd apps/shine/client && npx tsc --noEmit
cd apps/shine/server && npx tsc --noEmit

# 2. Run Sprint 6 E2E test
pnpm exec playwright test tests/e2e/sprint-6-full-launch.spec.ts --reporter=list

# 3. Run FULL regression suite (all sprints)
pnpm exec playwright test tests/e2e/ --reporter=list

# 4. Verify no gradients or neon glows in Sprint 6 files
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/views/workspace/PublishPage.vue \
  apps/shine/client/src/views/billing/ \
  apps/shine/client/src/views/admin/ \
  apps/shine/client/src/views/marketplace/
# EXPECTED: 0 matches

# 5. Verify no raw fetch()
grep -rn "fetch(" apps/shine/client/src/views/ apps/shine/client/src/stores/
# EXPECTED: 0 matches

# 6. Verify Stripe is wired (webhook route exists)
grep -n "billing/webhook\|stripe.webhooks" apps/shine/server/src/routes/billing.ts

# 7. Run automated i18n linter (MUST PASS WITH 0 ERRORS)
cd apps/shine/client && pnpm run check-i18n
# EXPECTED RESULT: 🎉 i18n AUDIT PASSED!

```

---

## STEP 7: MANDATORY COMPLETION REPORT

Save the report to `docs/reports/sprint-6-report.md` with all 5 required sections:

1. **Summary of All Work Delivered** — Full list of all 130 FRs across Sprint 1–6. Group by sprint and module.
2. **Build & TypeCheck Results** — Paste actual `npx tsc --noEmit` for both client and server.
3. **Full E2E Test Results** — Paste output of `pnpm exec playwright test tests/e2e/` showing all sprint tests passing (sprint-1-journey through sprint-6-full-launch).
4. **Real Browser Screenshots** — From `http://localhost:3000` showing: publish platform toggles, publish progress SSE, analytics dashboard, billing tier cards, admin user table, template marketplace, actor marketplace. DO NOT use `generate_image`.
5. **Full FR Compliance Matrix (FR-001 to FR-130)** — Final audit table: FR ID | Feature Name | Sprint | Status (✅ Pass / ❌ Fail). Plus Production Release Checklist:
   - [ ] All 6 Playwright E2E specs pass (0 failures)
   - [ ] Zero TypeScript errors in client & server
   - [ ] Stripe webhook tested with `stripe listen --forward-to localhost:3001/v1/billing/webhook`
   - [ ] All 6 locale files complete (no missing keys)
   - [ ] UI matches all relevant PNG mockups in `docs/stitch_shine_app_design/`
   - [ ] No `linear-gradient`, `purple-*`, `violet-*` in any source file
   - [ ] No raw `fetch()` in any client source file
