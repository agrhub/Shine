# Shine (DramaFlowAI) Agile Sprint & Release Roadmap

This document outlines the 12-week Agile Sprint Framework (6 Sprints x 2-Week Sprints) for building, testing, and releasing **Shine (DramaFlowAI) - AI Micro-Drama Video Studio**.

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

---

## Detailed Sprint Specifications

### Sprint 1: Foundation, Infrastructure & Core Setup (Weeks 1–2)

#### Goals
Establish core backend architecture, GCP Vertex AI integration (`GeminiClient.ts`), MongoDB/SQLite databases, and base Vue 3 SPA shell.

#### Feature Tasks
- **Infrastructure Setup:** Node.js Express server, MongoDB atlas connection, SQLite local DB, MinIO S3 bucket setup.
- **GCP Vertex AI Auth & Integration:** Service Account & ADC auth wrappers (`GeminiClient.ts`), location routing (`us-central1` vs `global`).
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
- **Genre Onboarding Wizard:** 3-step genre selection (Suspense, Romance, Action, Satire) & tone config mapping.
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
