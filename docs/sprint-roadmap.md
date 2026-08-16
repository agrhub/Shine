# Shine Agile Sprint & Release Roadmap

This document outlines the Agile Sprint Framework for building, testing, and releasing **Shine - AI Micro-Drama Video Studio**.

> [!IMPORTANT]
> **Process Improvements from Sprint 7**: All sprints from Sprint 7 onwards follow the improved execution process documented in [`docs/process-improvements.md`](../docs/process-improvements.md). Key changes: Mandatory Pre-Read Gate, Checkpoint Gates between micro-sprints, Mock Data Linter (`pnpm run check-quality`), API Contract First, Skills Library, and Honest Completion Tracker.

> [!IMPORTANT]
> **Sprint 7 Tracker**: Live completion status tracked in [`docs/sprint-7-tracker.md`](../docs/sprint-7-tracker.md). Agent must update after each task with real evidence.

---

## Sprint Overview Matrix

| Sprint | Timeline | Main Focus | Target Release | Key DoD Verification |
|--------|----------|------------|----------------|----------------------|
| **Sprint 1** | Weeks 1–2 | Foundation, GCP Vertex AI & OpenVideo Setup | `v0.1 Internal Alpha` | Build passes, Vertex AI API connected |
| **Sprint 2** | Weeks 3–4 | AI Multi-Agent Script & Persona Studio | `v0.2 AI Script Beta` | Script XML/JSON parsing, Facial Anchor matching |
| **Sprint 3** | Weeks 5–6 | WebGL Editor & Dual Rendering Engine | `v0.5 Editor Beta` | Zero-render preview, Dual-render Parity SSIM > 0.999 |
| **Sprint 4** | Weeks 7–8 | AI Creative Features (Voice, Captions, Cliffhanger) | `v0.8 Feature Complete RC1` | Dubbing re-alignment, Cliffhanger stinger injection |
| **Sprint 5** | Weeks 9–10 | Real-Time WebSocket Patches & Code Guardrails | `v0.9 Enterprise RC2` | WebSocket patch broadcast < 50ms, Pre-commit guard PASS |
| **Sprint 6** | Weeks 11–12 | Smart Publishing, Growth Innovations & Launch | `v1.0 Production Launch` | E2E test suite PASS, Multi-platform publish verified |
| **Sprint 7** | Weeks 13–14 | Full Backend REST API Integration, Dynamic Pinia Binding, Real Error Handling & Interactive E2E Testing | `v1.1 Production-Ready Commercial` | Live API data connected, Zero mock arrays, Full interactive click E2E PASS |

---

## Detailed Sprint Specifications

### Sprint 1: Foundation, Infrastructure & Core Setup (Weeks 1–2)

#### Goals
Establish core backend architecture, GCP Vertex AI integration (`GeminiClient.ts`), MongoDB/SQLite databases, and base Vue 3 SPA shell.

#### Feature Tasks
- **Infrastructure & Pluggable Database Setup (FR-130):** Node.js Express server, MinIO S3 bucket setup, and `IDatabaseProvider` repository abstraction allowing users to switch primary DB between embedded SQLite (`better-sqlite3`) and MongoDB (`mongoose`) via `DB_PROVIDER` env variable.
- **GCP Vertex AI Auth & Integration:** Service Account & ADC auth wrappers (`GeminiClient.ts`), location routing (`us-central1` vs `global`).
- **Hybrid AI Provider Router & Google Flow Pool Integration (Proposal 31, FR-129):** Port `FlowAdapter.ts`, `FlowSyncService.ts`, and `CaptchaService.ts` from `AntStudio` to build a hybrid router dispatching free/draft generations to Google Flow account pool (`flowST` session tokens + reCAPTCHA solver) and commercial exports to paid Vertex AI.
- **Public Surfaces & Authentication Suite (FR-107 to FR-113):** Public Marketing Landing Page (`/`), Google/GitHub OAuth SSO & JWT Auth (`/auth/login`, `/auth/signup`), Password Reset Flow (`/auth/forgot-password`), Legal Pages (`/terms`, `/privacy`), Support Contact Form (`/contact`), Interactive User Manual (`/manual`), and Multi-Language System UI Localization Engine (`vue-i18n`, supporting 6 languages: `en`, `vi`, `zh`, `jp`, `es`, `fr`).

- **Series & Project Management:** Create Series/Episode/Scene CRUD endpoints (`POST /series`, `POST /series/:id/episodes`).
- **Dashboard UI:** Basic Project Hub dashboard, project list/grid, new series wizard shell.


#### Testing & QA
- `TC-001` ~ `TC-008` (Project Hub CRUD tests).
- Vertex AI connection verification script (`test-ai.ts`).

#### Deliverable & Release
- **Release Version:** `v0.1 Internal Alpha (Core Framework)`.

---

### Sprint 2: Multi-Agent Script Engine & Persona Studio (Weeks 3–4)

#### Goals
Implement the AI Director multi-agent script pipeline (Director, Skeleton, Adaptation, Script, Supervision) and Persona Studio character anchoring.

#### Feature Tasks
- **Genre Onboarding Wizard & Multi-Region Viral Trend Engine (FR-074):** 3-step genre selection (Suspense, Romance, Action, Satire), tone config mapping & Parallel MCP real-time viral trend scan by region (`US`, `SEA_VN`, `CN`, `LATAM`, `JP_KR`, `EU`).
- **Multi-Agent Script Pipeline:** Generate 20-50 episode series skeletons, per-episode structured scripts in JSON format.
- **Persona Studio (Proposal 1):** Character creation, 8 facial consistency anchor slots, outfit continuity locking, LoRA reference image injection.
- **Virtual Set Studio:** Text-to-environment generation, mood presets (Neo-Noir, Golden Hour).

#### Testing & QA
- `TC-009` ~ `TC-018` (Script & Scene Assembly functional tests).
- `TC-WRD-001` (AI Wardrobe & Prop Swap face mesh match 98.4%).

#### Deliverable & Release
- **Release Version:** `v0.2 AI Script & Storyboard Release`.

---

### Sprint 3: Timeline Video Editor & Dual Rendering Engine (Weeks 5–6)

#### Goals
Build the 9:16 vertical NLE timeline editor powered by OpenVideo (`Studio` WebGL + `@openvideo/core` Headless Node.js Compositor).

#### Feature Tasks
- **9:16 Canvas & Multi-Track Timeline:** VIDEO 1, AUDIO 1, SUBS tracks, playhead, clip snapping, split/trim controls.
- **OpenVideo Command-Driven Architecture:** Implement `Command` execution engine (`core.execute`) and inverse-patch undo/redo.
- **Zero-Render Preview & Serialization:** Implement `studio.exportToJSON()` and `studio.loadFromJSON()`.
- **Headless Node.js Cloud Compositor:** Server-side batch render worker (`Compositor.output()`) for multi-episode rendering.
- **AntV G6 Multi-Module Graph Suite (FR-114):** Integrate `@antv/g6` graph visualization across Interactive Branching Narrative Trees, Character Relationship & Social Lineage Graphs, Multi-Agent Workflow Monitors, 3D Spatial Audio Soundstages, and Asset Dependency Trees.
- **Dual-Rendering Parity Audit Engine (Proposal 6):** Pixel-by-pixel SSIM diff tool comparing WebGL Studio vs Headless Node.js output.


#### Testing & QA
- `TC-RND-001` (WebGL Client Preview), `TC-RND-003` (Headless Cloud Render).
- `TC-CMD-001` (Command Execution & Undo), `TC-PAR-001` (Dual-Render Parity SSIM > 0.999).

#### Deliverable & Release
- **Release Version:** `v0.5 Interactive Edi### Sprint 4: AI Creative Studio (Voice, Captions, Cliffhanger & Dubbing) (Weeks 7–8)

#### Goals
Integrate voice synthesis, auto-captions, cliffhanger hook generation, multi-market dubbing auto-timeline re-alignment, kinetic subtitles, and 3D spatial audio.

#### Feature Tasks
- **Voice & Dubbing Engine:** Neural TTS (30 voices), emotion tags, intensity control, lip-sync frame alignment.
- **Multi-Market Dubbing Re-alignment (Proposal 4):** Auto-calculate audio duration delta ($\Delta t_{\mu s}$) and re-align `VIDEO 1` clip bounds and OpenVideo `Caption` timing.
- **Dynamic Kinetic Subtitle Engine (Proposal 13, FR-097):** Word-level karaoke pop-up highlight, bass-synced font bounce, and auto-generated sentiment emojis.
- **Spatial Audio 3D Soundstage & Voice Coach (Proposal 14, FR-098):** 3D spatial audio panning matched to camera motion and emotion-tuned TTS reverb.
- **Dynamic Cliffhanger Engine (Proposal 3):** OpenVideo GLSL shader transitions (`glitch`, `flash`), keyframe zoom (`zoomIn`), 3s audio stinger injection, CTA captions.

#### Testing & QA
- `TC-CLF-001` (Cliffhanger stinger & transition generation).
- `TC-DUB-001` (Dubbing auto-timeline re-alignment microsecond timing).
- `TC-KAP-001` (Kinetic karaoke subtitle highlight & bass bounce).
- `TC-SPT-001` (3D spatial audio panning & voice coach).

#### Deliverable & Release
- **Release Version:** `v0.8 Feature Complete Release Candidate (RC1)`.

---

### Sprint 5: Real-Time Collaboration, AI Chatbot & Code Guardrails (Weeks 9–10)

#### Goals
Enable multi-user real-time co-editing via WebSocket patches, in-editor AI Director Chatbot with Live Copilot canvas overlays, and code quality pre-commit guardrails.

#### Feature Tasks
- **OpenVideo WebSocket Atomic Patch Sync (Proposal/OpenVideo Integration):** Real-time delta patch broadcasting (`patch:broadcast`, `patch:receive`) over WebSockets.
- **Real-Time AI Director Assistant Chatbot (FR-086, FR-094, FR-095, FR-096):** Natural language chat panel executing JSON `Command[]` arrays across all workspace modules and enabling end-to-end chat-driven series creation. Supports Multimodal Inputs (Image, Video, PDF/DOCX Docs, Voice Stream via `connectLive()`) & surface-aware dynamic action chips. Implements 4-Tier Memory Engine (Sliding Window Session Memory, Vertex AI Vector Search RAG `text-embedding-004`, Series Knowledge Graph, and Context Token Compressor) & 6 Advanced Intelligence Capabilities.
- **Live Director Co-Pilot Mode (Proposal 16, FR-100):** Non-blocking live alert bubbles rendered directly on the video preview canvas highlighting pacing delays and audio loudness spikes.
- **AI Resource & Cost Guardrails (Proposal 7):** Admin compute budget caps per episode ($3.50 cap) & low-res proxy preview workflow.
- **Automated Agent Pre-Commit Guard (Proposal 5):** Husky hooks + `eslint-plugin-agent-guard` blocking unverified stubs.

#### Testing & QA
- `TC-PAT-001` (Atomic patch WebSocket broadcast < 50ms latency).
- `TC-AIC-001` (AI Assistant command execution loop across modules).
- `TC-AIC-002` (End-to-End Chat-Driven Series Creation Pipeline Test).
- `TC-AIC-004` (Multimodal Image, Video, Docs, Voice Input Processing Test).
- `TC-AIC-005` (Long-Term Vector Memory & Cross-Episode RAG Search Test).
- `TC-COP-001` (Live video canvas copilot alert bubble runtime).
- `TC-CST-001` (Vertex AI budget cap enforcement).
- `TC-GRD-001` (Git pre-commit stub rejection).

#### Deliverable & Release
- **Release Version:** `v0.9 Enterprise Readiness Release (RC2)`.

---

### Sprint 6: Growth Innovations, Monetization, E2E QA & Production Launch (Weeks 11–12)

#### Goals
Implement multi-platform publishing, AI viral cover poster generator, growth A/B testing, AI product placement, offline-first hybrid sync, and execute final launch.

#### Feature Tasks
- **Export & Smart Publishing:** Multi-platform API upload (TikTok, Instagram Reels, YouTube Shorts), AI cover generator, viral hashtags.
- **1-Click Web Novel-to-Series Converter Engine (Proposal 17, FR-115):** Ingest long-form manuscripts (PDF/TXT/EPUB), auto-parse chapter arcs, and generate 50-episode JSON scripts in 60s.
- **TikTok/Douyin Live-Stream Drama Engine (Proposal 18, FR-116):** Live WebSocket comment polling & AntV G6 dynamic scene branch switching.
- **AI Virtual Actor Royalty Marketplace (Proposal 19, FR-117):** Actor hub (`/marketplace/actors`) for licensing 8-anchor Personas & passive credit royalty distribution.
- **Cultural Geo-Localization & Idiom Adaptation Engine (Proposal 20, FR-118):** Cultural adaptation agent (`POST /ai/cultural-adapt`) re-writing slang, wardrobe, signs & regional TTS accents.
- **Predictive Paywall Placement & Monetization Doctor (Proposal 21, FR-119):** ML retention curve analyzer recommending paywall thresholds, coin pricing, and 30-day MRR.
- **Async Render Event Stream & Pub/Sub Queue (Proposal 22, FR-120):** SSE / WebSocket progress stream (`GET /api/v1/render/stream`) preventing HTTP 504 timeouts.
- **AI Copyright Safety & Audio Fingerprinting (Proposal 23, FR-121):** Audio fingerprinting scan (`POST /audio/copyright-verify`) auto-swapping unsafe background audio.
- **Virtual Canvas Viewport & Lazy Asset Streaming (Proposal 24, FR-122):** WebGL texture windowing loading 5 clips nearest to playhead to prevent browser memory crashes.
- **Tablet & Foldable Device Touch Gesture Studio (Proposal 25, FR-123):** Touch-optimized pinch-to-zoom timeline scaling & swipe gesture handles.
- **Automated Revenue Split & Smart Rights Engine (Proposal 26, FR-124):** Income sharing contracts (`/billing/revenue-splits`) auto-distributing earnings to team members.
- **C2PA AI Provenance & SynthID Watermarking (Proposal 27, FR-125):** Cryptographic C2PA metadata embedding & SynthID invisible watermarking (`POST /export/c2pa-watermark`).
- **Intra-Scene Vocal Affect Steering (Proposal 28, FR-126):** Mid-sentence SSML emotion affect steering (`POST /voices/steer-emotion`) for whispering, crying, laughing, shouting.
- **AI Multi-Platform Recutter (Proposal 29, FR-127):** Auto-generating platform-tailored edits (`POST /export/platform-recut`) for YouTube Shorts, TikTok, and IG Reels.
- **Shine Creator Template Marketplace (Proposal 30, FR-128):** Creator hub (`/marketplace/templates`) for buying, selling & sharing presets and AntV G6 story trees.
- **AI Viral Cover Poster & A/B Hook Generator (Proposal 15, FR-099):** Scans video frames for face aesthetic scores, generates 3 viral cover variants with hook title overlays for social A/B testing.
- **Viral A/B Hook & Multi-Ending Generator (Proposal 8):** Generate 3 hook variants for Episode 1, track 24h retention metrics, auto-select winning arc.
- **AI In-Video Product Placement (Proposal 10):** Composite 3D sponsored products onto scene visual layers using OpenVideo Chroma/Layering.
- **Interactive Branching Drama Engine (Proposal 9):** Choice button overlays & dynamic branch story graph execution.
- **Subscription Tiers & Stripe Billing (FR-101, FR-102):** Stripe Checkout Integration, Feature Gating Middleware (`checkTierLimit.ts`), AI credit metering, and Free tier watermark compositing.
- **Admin & Operations Back-Office Portal (FR-103 to FR-106):** User directory management (`/admin/users`), FinOps Cloud Run render cluster dashboard (`/admin/render-cluster`), Customer Supporter Session Impersonation (`/admin/impersonate`), and OpenTelemetry Grafana Observability (`/admin/observability`).
- **Offline-First Hybrid Sync Engine (Proposal 12):** IndexedDB local patch caching & auto-reconnection bulk sync.



#### Testing & QA
- Full End-to-End User Journey Tests (Flow 1 & Flow 2).
- Load & Stress Performance Testing (100 parallel rendering jobs).
- WCAG 2.1 AA Accessibility audit & security penetration check.

#### Deliverable & Release
- **Release Version:** `v1.0 Commercial Production Launch 🎉`.

---

### Sprint 7: OpenVideo Engine Integration, Full Backend REST API Services & Interactive E2E Testing (Weeks 13–14)

#### Goals
Instantiate the OpenVideo core libraries (`@openvideo/core`, `@openvideo/engine-pixi`, `@openvideo/timeline`) inside `EditPage.vue` to replace static HTML track bars with an active WebGL PIXI.js preview stage and interactive timeline. Connect all 19 Stitch UI surfaces dynamically to Express REST APIs (`/v1/*`) and Pinia stores with real backend services, error code handling (`400`, `401`, `403`, `422`, `500`), and full interactive click-sequence E2E testing.

#### Feature Tasks
- **OpenVideo Editor Integration (`EditPage.vue`):** Reference working implementation in `apps/vue-editor` (`src/lib/project.ts`, `src/components/editor/CanvasPanel.vue`, `src/components/editor/timeline/`) and OpenVideo docs (`https://docs.openvideo.dev/core/*`). Instantiate `createProjectStore()`, mount PIXI.js WebGL rendering stage (`@openvideo/engine-pixi`), and mount interactive `@openvideo/timeline` component for clip dragging, trimming, splitting, and undo/redo (`Ctrl+Z`).
- **Axios HTTP Client Interceptors:** Bearer JWT auth token injection, automatic `401` session cleanup, and `422/500` `ElMessage` error toasts.
- **Dynamic Pinia Store Rewiring:** Connect `useAuthStore`, `useSeriesStore`, `useScriptStore`, `usePersonaStore` to REST endpoints.
- **Auth Suite API Integration:** Signup (`POST /v1/auth/signup`), Login (`POST /v1/auth/login`), Password Reset flows.
- **Series Wizard & Dashboard Integration:** Live series list fetching, Trend Hunt API, Content Compliance API, and Series creation in database.
- **Studio Production & Server Media Services:** Dynamic script synthesis via Vertex AI (`@google/genai`), scene generation, audio dubbing, caption transcription, and headless OpenVideo / FFmpeg cloud rendering.
- **Interactive E2E User Journey Testing:** Full click-sequence verification from Signup -> Dashboard -> Series Wizard -> Episode Studio -> Export without URL navigation shortcuts.

#### Testing & QA
- OpenVideo PIXI WebGL canvas stage active & zero-render preview verified.
- `pnpm run check-i18n` with 100% key parity across 6 locales.
- `pnpm run build` production build PASS.
- Interactive user click flow E2E test PASS.

#### Deliverable & Release
- **Release Version:** `v1.1 Production-Ready Commercial App 🚀`.
